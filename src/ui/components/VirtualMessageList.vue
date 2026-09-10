<template>
  <div class="message-stream virtual-message-stream" :class="{ 'is-initializing': !initialPositioned }">
    <div class="virtual-message-spacer" :style="{ height: `${topSpacer}px` }" aria-hidden="true"></div>
    <div v-for="item in visibleItems" :key="item.key" ref="rows" class="virtual-message-row" :data-message-id="item.key">
      <component :is="messageComponent" ref="messageComponents" :message="item.message" :show-time="item.showTime" @content-resize="handleMessageContentResize" />
    </div>
    <div class="virtual-message-spacer" :style="{ height: `${bottomSpacer}px` }" aria-hidden="true"></div>
  </div>
</template>

<script>
import { toNumber } from '../third/tools';
import { canRestoreMeasurements, findIndexAtOffset, messageKey } from '../utils/messageSessions';

const ESTIMATED_HEIGHT = 88;
const WINDOW_SIZE = 240;
const WINDOW_EDGE_BUFFER = 60;
const SCROLL_IDLE_DELAY = 140;
const PROGRAMMATIC_SCROLL_TIMEOUT = 500;

export default {
  name: 'VirtualMessageList',
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    sessionId: {
      required: true
    },
    messageComponent: {
      required: true
    },
    followLatest: {
      type: Boolean,
      default: true
    },
    initialViewport: {
      type: Object,
      default: null
    },
    measurementCache: {
      type: Object,
      default: null
    },
    measurementCacheWidth: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      startIndex: 0,
      endIndex: 0,
      heights: Object.create(null),
      prefixHeights: [0],
      totalHeight: 0,
      scrollElement: null,
      frame: 0,
      pendingCallbacks: [],
      pendingHistoryPrepend: false,
      preserveListStartAfterHistory: false,
      resizeObserver: null,
      previousWidth: 0,
      scrollRevision: 0,
      scrolling: false,
      scrollIdleTimer: null,
      pendingIdleAnchor: null,
      programmaticScrollTarget: null,
      programmaticScrollTimer: null,
      initialPositioned: false,
      initialPositionRevision: 0
    };
  },
  computed: {
    visibleItems() {
      return this.messages.slice(this.startIndex, this.endIndex).map((message, offset) => {
        const index = this.startIndex + offset;
        const previous = index > 0 ? this.messages[index - 1] : null;
        return {
          key: messageKey(message),
          message,
          showTime: !previous || toNumber(message.timestamp) - toNumber(previous.timestamp) > 5 * 60 * 1000
        };
      });
    },
    topSpacer() {
      return this.prefixHeights[this.startIndex] || 0;
    },
    bottomSpacer() {
      return Math.max(0, this.totalHeight - (this.prefixHeights[this.endIndex] || 0));
    }
  },
  watch: {
    messages(newMessages, oldMessages) {
      this.pendingIdleAnchor = null;
      const receivedInitialMessages = (!oldMessages || !oldMessages.length) && newMessages.length;
      if ((!this.initialPositioned || receivedInitialMessages) && this.followLatest) {
        this.positionInitialMessages();
        return;
      }
      if (newMessages === oldMessages && this.prefixHeights.length === newMessages.length + 1) {
        this.scheduleUpdate(this.measureRows);
        return;
      }
      const sameMessageWindow =
        oldMessages && newMessages.length === oldMessages.length && newMessages.every((message, index) => messageKey(message) === messageKey(oldMessages[index]));
      if (sameMessageWindow && this.prefixHeights.length === newMessages.length + 1) {
        this.scheduleUpdate(this.measureRows);
        return;
      }
      const previousFirstKey = oldMessages && oldMessages.length ? messageKey(oldMessages[0]) : '';
      const previousFirstIndex = previousFirstKey ? newMessages.findIndex((message) => messageKey(message) === previousFirstKey) : -1;
      const showHistoryStart = this.pendingHistoryPrepend && previousFirstIndex > 0;
      if (this.pendingHistoryPrepend) this.pendingHistoryPrepend = false;
      if (showHistoryStart) {
        this.preserveListStartAfterHistory = true;
        this.scrollRevision += 1;
      }
      const preserveListStart = showHistoryStart || this.preserveListStartAfterHistory;
      const anchor = preserveListStart ? null : this.captureRenderedViewport() || this.captureViewport(oldMessages);
      const scrollRevision = this.scrollRevision;
      this.rebuildPrefixHeights();
      this.scheduleUpdate(() => {
        if (preserveListStart) {
          if (this.preserveListStartAfterHistory) this.scrollToListStart();
        } else if (!this.followLatest && anchor && this.scrollRevision === scrollRevision) this.restoreViewport(anchor);
        else if (this.followLatest) {
          this.measureRows(false);
          this.scrollToBottom(true);
          return;
        }
        this.measureRows();
      });
    }
  },
  mounted() {
    this.scrollElement = this.$el.parentElement;
    if (!this.scrollElement) return;
    this.scrollElement.virtualMessageListSetScrollTop = this.setProgrammaticScrollTop;
    this.scrollElement.virtualMessageListIsProgrammaticScroll = this.isProgrammaticScroll;
    this.previousWidth = this.scrollElement.clientWidth;
    if (canRestoreMeasurements(this.measurementCacheWidth, this.previousWidth)) {
      this.heights = Object.assign(Object.create(null), this.measurementCache || {});
    } else if (this.measurementCache && Object.keys(this.measurementCache).length) {
      this.$emit('measurements-change', { sid: `${this.sessionId}`, measurements: {}, width: this.previousWidth, reset: true });
    }
    this.scrollElement.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('copy', this.onCopy);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.initialPositioned && !this.scrolling) this.scheduleUpdate(this.measureRows);
      });
    }
    this.positionInitialMessages();
  },
  updated() {
    this.observeRows();
    if (this.initialPositioned && !this.scrolling) this.scheduleUpdate(this.measureRows);
  },
  beforeDestroy() {
    const viewport = this.getViewportState();
    if (this.scrollElement) this.scrollElement.removeEventListener('scroll', this.onScroll);
    if (this.scrollElement && this.scrollElement.virtualMessageListSetScrollTop === this.setProgrammaticScrollTop) {
      delete this.scrollElement.virtualMessageListSetScrollTop;
    }
    if (this.scrollElement && this.scrollElement.virtualMessageListIsProgrammaticScroll === this.isProgrammaticScroll) {
      delete this.scrollElement.virtualMessageListIsProgrammaticScroll;
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('copy', this.onCopy);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.scrollIdleTimer) clearTimeout(this.scrollIdleTimer);
    if (this.programmaticScrollTimer) clearTimeout(this.programmaticScrollTimer);
    this.emitViewport(viewport);
  },
  methods: {
    positionInitialMessages() {
      if (!this.scrollElement) return;
      const revision = ++this.initialPositionRevision;
      this.initialPositioned = false;
      this.rebuildPrefixHeights();
      const shouldRestoreViewport = this.initialViewport && this.initialViewport.messageId && (this.initialViewport.followLatest === false || !this.followLatest);
      if (shouldRestoreViewport) {
        const initialIndex = this.messages.findIndex((message) => messageKey(message) === `${this.initialViewport.messageId}`);
        this.setWindowAroundIndex(initialIndex >= 0 ? initialIndex : this.messages.length - 1, true);
      } else if (this.followLatest) {
        this.setWindowAroundIndex(this.messages.length - 1, true);
      } else {
        this.updateWindow();
      }
      this.$nextTick(() => {
        if (revision !== this.initialPositionRevision) return;
        this.observeRows();
        this.measureRows(false);
        this.$nextTick(() => {
          if (revision !== this.initialPositionRevision) return;
          if (shouldRestoreViewport) this.restoreViewport(this.initialViewport);
          else if (this.followLatest) {
            this.setProgrammaticScrollTop(this.scrollElement.scrollHeight);
            this.updateWindow();
          }
          this.initialPositioned = true;
        });
      });
    },
    prepareHistoryPrepend() {
      this.pendingHistoryPrepend = true;
    },
    cancelHistoryPrepend() {
      this.pendingHistoryPrepend = false;
    },
    scheduleUpdate(callback) {
      if (callback && !this.pendingCallbacks.includes(callback)) this.pendingCallbacks.push(callback);
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        const pendingCallbacks = this.pendingCallbacks.splice(0);
        pendingCallbacks.forEach((pendingCallback) => pendingCallback());
        const idleAnchor = this.pendingIdleAnchor;
        this.pendingIdleAnchor = null;
        const windowChanged = this.updateWindow();
        if (idleAnchor) this.finishScrollIdle(idleAnchor, windowChanged);
      });
    },
    rebuildPrefixHeights() {
      const prefix = [0];
      this.messages.forEach((message, index) => {
        prefix[index + 1] = prefix[index] + (this.heights[messageKey(message)] || ESTIMATED_HEIGHT);
      });
      this.prefixHeights = prefix;
      this.totalHeight = prefix[prefix.length - 1] || 0;
    },
    indexAtOffset(offset) {
      return findIndexAtOffset(this.prefixHeights, this.messages.length, offset);
    },
    setWindowAroundIndex(index, force = false) {
      if (!this.messages.length) {
        this.startIndex = 0;
        this.endIndex = 0;
        return;
      }
      const normalizedIndex = Math.max(0, Math.min(this.messages.length - 1, index));
      const edgeBuffer = Math.min(WINDOW_EDGE_BUFFER, Math.max(12, Math.floor(WINDOW_SIZE / 4)));
      if (!force && this.endIndex > this.startIndex && normalizedIndex >= this.startIndex + edgeBuffer && normalizedIndex < this.endIndex - edgeBuffer) {
        return;
      }
      const maxStart = Math.max(0, this.messages.length - WINDOW_SIZE);
      const start = Math.max(0, Math.min(maxStart, normalizedIndex - Math.floor(WINDOW_SIZE / 2)));
      this.startIndex = start;
      this.endIndex = Math.min(this.messages.length, start + WINDOW_SIZE);
    },
    updateWindow() {
      if (!this.scrollElement || !this.messages.length) {
        const changed = this.startIndex !== 0 || this.endIndex !== 0;
        this.startIndex = 0;
        this.endIndex = 0;
        return changed;
      }
      const previousStartIndex = this.startIndex;
      const previousEndIndex = this.endIndex;
      if (this.preserveListStartAfterHistory) {
        this.setWindowAroundIndex(0, true);
        if (this.scrollElement.scrollTop !== 0) this.setProgrammaticScrollTop(0);
        return this.startIndex !== previousStartIndex || this.endIndex !== previousEndIndex;
      }
      const streamTop = this.streamOffsetTop();
      const contentScrollTop = Math.max(0, this.scrollElement.scrollTop - streamTop);
      const viewportStart = this.indexAtOffset(contentScrollTop);
      const viewportEnd = this.indexAtOffset(contentScrollTop + this.scrollElement.clientHeight);
      const viewportOutsideWindow = viewportStart < this.startIndex || viewportEnd >= this.endIndex;
      if (this.scrolling && !viewportOutsideWindow) return false;
      const edgeBuffer = Math.min(WINDOW_EDGE_BUFFER, Math.max(12, Math.floor(WINDOW_SIZE / 4)));
      if (this.endIndex <= this.startIndex || viewportStart < this.startIndex + edgeBuffer || viewportEnd >= this.endIndex - edgeBuffer) {
        this.setWindowAroundIndex(Math.floor((viewportStart + viewportEnd) / 2), true);
      }
      return this.startIndex !== previousStartIndex || this.endIndex !== previousEndIndex;
    },
    observeRows() {
      if (!this.resizeObserver) return;
      this.resizeObserver.disconnect();
      const rows = Array.isArray(this.$refs.rows) ? this.$refs.rows : this.$refs.rows ? [this.$refs.rows] : [];
      rows.forEach((row) => this.resizeObserver.observe(row));
    },
    measureRows(restoreAfterMeasure = true) {
      if (this.scrolling) return;
      const preserveListStart = this.preserveListStartAfterHistory;
      const viewport = !preserveListStart && !this.followLatest ? this.captureRenderedViewport() || this.captureViewport(this.messages) : null;
      const scrollRevision = this.scrollRevision;
      const rows = Array.isArray(this.$refs.rows) ? this.$refs.rows : this.$refs.rows ? [this.$refs.rows] : [];
      let changed = false;
      const measurements = {};
      rows.forEach((row) => {
        const id = row.dataset.messageId;
        const height = row.getBoundingClientRect().height;
        if (id && height > 0 && Math.abs((this.heights[id] || 0) - height) > 0.5) {
          this.heights[id] = height;
          measurements[id] = height;
          changed = true;
        }
      });
      if (changed) {
        this.rebuildPrefixHeights();
        this.$emit('measurements-change', { sid: `${this.sessionId}`, measurements, width: this.previousWidth });
        if (!restoreAfterMeasure) return;
        if (preserveListStart) {
          this.$nextTick(() => {
            if (this.preserveListStartAfterHistory) this.scrollToListStart();
          });
        } else if (viewport) {
          this.$nextTick(() => {
            if (this.scrollRevision === scrollRevision) this.restoreViewport(viewport);
          });
        } else if (this.followLatest) this.scrollToBottom();
      }
    },
    setProgrammaticScrollTop(scrollTop) {
      if (!this.scrollElement) return;
      this.scrollElement.scrollTop = scrollTop;
      this.programmaticScrollTarget = this.scrollElement.scrollTop;
      if (this.programmaticScrollTimer) clearTimeout(this.programmaticScrollTimer);
      this.programmaticScrollTimer = setTimeout(() => {
        this.programmaticScrollTimer = null;
        this.programmaticScrollTarget = null;
      }, PROGRAMMATIC_SCROLL_TIMEOUT);
    },
    isProgrammaticScroll() {
      return this.programmaticScrollTarget !== null && this.scrollElement && Math.abs(this.scrollElement.scrollTop - this.programmaticScrollTarget) <= 0.5;
    },
    clearProgrammaticScrollTarget() {
      this.programmaticScrollTarget = null;
      if (this.programmaticScrollTimer) {
        clearTimeout(this.programmaticScrollTimer);
        this.programmaticScrollTimer = null;
      }
    },
    onScroll() {
      const isProgrammatic = this.isProgrammaticScroll();
      if (isProgrammatic) {
        this.scheduleUpdate();
        return;
      }
      this.clearProgrammaticScrollTarget();
      this.pendingIdleAnchor = null;
      this.scrollRevision += 1;
      if (this.scrollElement) {
        const hasScrollableContent = this.scrollElement.scrollHeight - this.scrollElement.clientHeight > 1;
        this.preserveListStartAfterHistory = hasScrollableContent && this.scrollElement.scrollTop <= 0;
      }
      this.scrolling = true;
      this.scheduleUpdate();
      if (this.scrollIdleTimer) clearTimeout(this.scrollIdleTimer);
      this.scrollIdleTimer = setTimeout(() => this.onScrollIdle(), SCROLL_IDLE_DELAY);
    },
    onScrollIdle() {
      this.scrollIdleTimer = null;
      this.scrolling = false;
      this.pendingCallbacks = this.pendingCallbacks.filter((pendingCallback) => pendingCallback !== this.measureRows);
      this.pendingIdleAnchor = {
        viewport: this.preserveListStartAfterHistory ? null : this.captureRenderedViewport() || this.captureViewport(this.messages),
        scrollRevision: this.scrollRevision
      };
      this.scheduleUpdate();
    },
    finishScrollIdle(idleAnchor, windowChanged) {
      const isCurrent = () => !this.scrolling && idleAnchor.scrollRevision === this.scrollRevision;
      if (!windowChanged || !idleAnchor.viewport) {
        this.measureRows();
        this.$nextTick(() => {
          if (isCurrent()) this.emitViewport();
        });
        return;
      }
      this.$nextTick(() => {
        if (!isCurrent()) return;
        this.measureRows(false);
        this.$nextTick(() => {
          if (!isCurrent()) return;
          this.alignViewport(idleAnchor.viewport);
          this.emitViewport();
        });
      });
    },
    onResize() {
      if (!this.scrollElement) return;
      const width = this.scrollElement.clientWidth;
      if (Math.abs(width - this.previousWidth) > 1) {
        this.pendingIdleAnchor = null;
        this.scrollRevision += 1;
        this.previousWidth = width;
        this.heights = Object.create(null);
        this.$emit('measurements-change', { sid: `${this.sessionId}`, measurements: {}, width, reset: true });
        this.rebuildPrefixHeights();
      }
      this.scheduleUpdate(this.measureRows);
    },
    handleMessageContentResize() {
      this.$nextTick(() => {
        if (!this.scrollElement) return;
        if (this.followLatest) {
          this.measureRows(false);
          this.setProgrammaticScrollTop(this.scrollElement.scrollHeight);
          this.updateWindow();
        } else {
          this.scheduleUpdate(this.measureRows);
        }
      });
    },
    streamOffsetTop() {
      if (!this.scrollElement || !this.$el) return 0;
      const streamRect = this.$el.getBoundingClientRect();
      const scrollRect = this.scrollElement.getBoundingClientRect();
      return streamRect.top - scrollRect.top + this.scrollElement.scrollTop;
    },
    captureViewport(messages = this.messages) {
      if (!this.scrollElement || !messages || !messages.length) return null;
      const contentScrollTop = Math.max(0, this.scrollElement.scrollTop - this.streamOffsetTop());
      const index = findIndexAtOffset(this.prefixHeights, messages.length, contentScrollTop);
      const message = messages[index];
      return message
        ? {
            messageId: messageKey(message),
            offset: contentScrollTop - (this.prefixHeights[index] || 0),
            followLatest: this.followLatest
          }
        : null;
    },
    captureRenderedViewport() {
      if (!this.scrollElement) return null;
      const rows = Array.isArray(this.$refs.rows) ? this.$refs.rows : this.$refs.rows ? [this.$refs.rows] : [];
      if (!rows.length) return null;
      const containerRect = this.scrollElement.getBoundingClientRect();
      let low = 0;
      let high = rows.length - 1;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (rows[middle].getBoundingClientRect().bottom <= containerRect.top) low = middle + 1;
        else high = middle;
      }
      const row = rows[low];
      const rowRect = row.getBoundingClientRect();
      const messageId = row.dataset.messageId;
      if (!messageId || rowRect.bottom <= containerRect.top || rowRect.top >= containerRect.bottom) return null;
      return {
        messageId,
        offset: containerRect.top - rowRect.top,
        followLatest: this.followLatest
      };
    },
    getViewportState() {
      return this.captureRenderedViewport() || this.captureViewport(this.messages);
    },
    emitViewport(viewport = this.getViewportState()) {
      this.$emit('viewport-change', {
        sid: `${this.sessionId}`,
        viewport
      });
    },
    alignRenderedViewport(viewport) {
      const aligned = this.alignViewport(viewport);
      if (aligned) this.updateWindow();
      return aligned;
    },
    alignViewport(viewport) {
      if (!this.scrollElement || !viewport || !viewport.messageId) return false;
      const rows = Array.isArray(this.$refs.rows) ? this.$refs.rows : this.$refs.rows ? [this.$refs.rows] : [];
      const row = rows.find((item) => item.dataset.messageId === `${viewport.messageId}`);
      if (!row) return false;
      const containerRect = this.scrollElement.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const targetTop = containerRect.top - (viewport.offset || 0);
      const delta = rowRect.top - targetTop;
      if (Math.abs(delta) > 0.5) this.setProgrammaticScrollTop(this.scrollElement.scrollTop + delta);
      return true;
    },
    restoreViewport(viewport) {
      if (!this.scrollElement || !viewport || !viewport.messageId) return false;
      const index = this.messages.findIndex((message) => messageKey(message) === `${viewport.messageId}`);
      if (index < 0) return false;
      this.setWindowAroundIndex(index, true);
      this.setProgrammaticScrollTop(this.streamOffsetTop() + (this.prefixHeights[index] || 0) + (viewport.offset || 0));
      this.updateWindow();
      this.$nextTick(() => this.alignRenderedViewport(viewport));
      return true;
    },
    scrollToListStart() {
      if (!this.scrollElement) return false;
      this.setProgrammaticScrollTop(0);
      this.updateWindow();
      return true;
    },
    scrollToBottom(force = false) {
      if (!this.scrollElement || (!force && !this.followLatest)) return;
      this.$nextTick(() => {
        this.setProgrammaticScrollTop(this.scrollElement.scrollHeight);
        this.updateWindow();
      });
    },
    findRenderedMessage(mid) {
      const components = Array.isArray(this.$refs.messageComponents) ? this.$refs.messageComponents : this.$refs.messageComponents ? [this.$refs.messageComponents] : [];
      return components.find((component) => component.message && messageKey(component.message) === `${mid}`);
    },
    onCopy(event) {
      if (navigator.userAgent.indexOf('Safari') < 0 || navigator.userAgent.indexOf('Chrome') >= 0) return;
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !this.$el.contains(selection.anchorNode)) return;
      const div = document.createElement('div');
      div.appendChild(selection.getRangeAt(0).cloneContents());
      const text = div.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
      event.clipboardData.setData('text/html', text);
      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
    }
  }
};
</script>

<style scoped>
.virtual-message-spacer {
  width: 1px;
  pointer-events: none;
}

.virtual-message-stream {
  overflow-anchor: none;
}

.virtual-message-stream.is-initializing {
  visibility: hidden;
}
</style>
