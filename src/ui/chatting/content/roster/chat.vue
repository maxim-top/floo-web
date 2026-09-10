<template>
  <div class="list" ref="rlist" @scroll="handleListScroll" @touchstart="handlePullStart" @touchmove="handlePullMove" @touchend="handlePullEnd">
    <div class="message-history-slot">
      <div
        @click="requestHistory"
        id="roster_history_btn"
        class="message-history-trigger"
        :class="{
          'is-visible': showHistoryTrigger || queryingHistory || isPulling || historyBlocked || historyExhausted,
          'is-pulling': isPulling,
          'is-loading': queryingHistory,
          'is-disabled': historyBlocked
        }"
        :aria-disabled="historyBlocked ? 'true' : 'false'"
        :style="{ '--pull-distance': `${pullDistance}px` }"
      >
        <svg v-if="!queryingHistory" viewBox="0 0 24 24" aria-hidden="true" class="message-history-trigger__icon">
          <path d="M12 7v5l3 2"></path>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"></path>
          <path d="M4.5 5.5v3.5H8"></path>
        </svg>
        <span v-else class="message-history-trigger__spinner" aria-hidden="true"></span>
        <span>
          {{
            historyBlocked
              ? $t('messageHistory.waitingReconnect', { origin: '等待重新连接' })
              : queryingHistory
              ? $t('正在拉取历史消息')
              : historyExhausted
              ? $t('messageHistory.noMore', { origin: '没有更多历史消息' })
              : $t('查看历史消息')
          }}
        </span>
      </div>
    </div>
    <VirtualMessageList
      :key="getSid"
      ref="virtualList"
      :session-id="getSid"
      :messages="allMessages"
      :message-component="Message"
      :follow-latest="followLatest"
      :initial-viewport="historyState.viewport"
      :measurement-cache="historyState.measurements"
      :measurement-cache-width="historyState.measurementWidth"
      @viewport-change="saveViewport"
      @measurements-change="saveMeasurements"
    />
  </div>
</template>

<script>
// import Chat from "./chat.vue";
import Message from './renderMsg.vue';
import VirtualMessageList from '../../../components/VirtualMessageList.vue';
import { toNumber } from '../../../third/tools';

import { mapGetters } from 'vuex';

export default {
  name: 'RosterChat',
  mounted() {
    this.requireMessage();
    this.followLatest = !(this.historyState.viewport && this.historyState.viewport.followLatest === false);
    this.$store.dispatch('forward/actionCancelForward', false);

    const im = this.$store.getters.im;
    if (!im) return;

    im.on('onRosterMessage', (message) => {
      this.reloadMessage(message);
    });

    im.on('onRosterMessageContentAppend', (message) => {
      this.prepareIncomingMessageFollow();
      this.$store.dispatch('content/actionUpdateMessage', { message: { ...message, skipStreamReplayOnMount: true }, mid: message.id });
      const msg = this.$refs.virtualList && this.$refs.virtualList.findRenderedMessage(message.id);
      if (msg) {
        msg.messageContentAppend(message);
      }
    });

    im.on('onRosterMessageReplace', (message) => {
      this.prepareIncomingMessageFollow();
      this.$store.dispatch('content/actionUpdateMessage', { message: { ...message, skipStreamReplayOnMount: true }, mid: message.id });
      const msg = this.$refs.virtualList && this.$refs.virtualList.findRenderedMessage(message.id);
      if (msg) {
        msg.messageReplace(message);
      }
    });

    im.on('onMessageStatusChanged', ({ mid }) => {
      console.log('Message status changed, mid: ', mid);
      if (!this.shouldRefreshMessageStatus(mid)) {
        return;
      }
      this.requireMessage();
    });

    this.rosterSendingMessageStatusListener = (event) => this.handleSendingMessageStarted(event);
    this.$store.getters.im.on('onSendingMessageStatusChanged', this.rosterSendingMessageStatusListener);

    im.on('onMessageRecalled', ({ uid, mid }) => {
      this.deleteMessage(mid, uid);
    });

    im.on('onMessageDeleted', ({ uid, mid }) => {
      this.deleteMessage(mid, uid);
    });

    im.on('onMessageCanceled', (message) => {
      const uid = this.$store.getters.im.userManage.getUid();
      if (uid + '' === message.uid + '') {
        this.requireMessage();
      }
    });
  },

  destroyed() {
    if (this.requireMessageTimer) {
      clearTimeout(this.requireMessageTimer);
      this.requireMessageTimer = null;
    }
    const im = this.$store.getters.im;
    if (!im) return;

    if (this.rosterSendingMessageStatusListener) {
      im.off('onSendingMessageStatusChanged', this.rosterSendingMessageStatusListener);
    }

    im.off({
      onRosterMessage: '',
      onRosterMessageContentAppend: '',
      onRosterMessageReplace: '',
      onMessageStatusChanged: '',
      onMessageRecalled: '',
      onMessageDeleted: '',
      onMessageCanceled: ''
    });
  },

  data() {
    return {
      reloadList: [],
      showHistoryTrigger: false,
      followLatest: true,
      lastScrollTop: 0,
      isPulling: false,
      pullStartY: 0,
      pullDistance: 0,
      requireMessageTimer: null
    };
  },

  components: {
    VirtualMessageList
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime', 'getAutoReadSuppressed', 'getHistoryState']),
    Message() {
      return Message;
    },
    historyState() {
      return this.getHistoryState || {};
    },
    queryingHistory() {
      return !!this.historyState.historyLoading;
    },
    historyBlocked() {
      return !!this.historyState.historyBlockedUntilReconnect;
    },
    historyExhausted() {
      return !!this.historyState.historyExhausted && !(this.historyState.cachedHistoryMessages || []).length;
    },
    allMessages() {
      return this.getMessages || [];
    }
  },
  watch: {
    getSid(a, b) {
      if (a !== b) {
        this.followLatest = !(this.historyState.viewport && this.historyState.viewport.followLatest === false);
        this.requireMessage();
      }
    }
  },
  methods: {
    handleSendingMessageStarted({ status, mid, message }) {
      if (status !== 'sending') return;
      console.log('Sending Message status changed to sending mid: ', mid);
      if (!this.isMessageInCurrentConv(message)) return;
      this.$store.dispatch('content/actionAppendMessage', {
        sendingMessages: [{ ...message, isSending: true }]
      });
      this.$nextTick(() => this.scrollToBottom(true));
    },
    parseMessageExt(message) {
      if (!message || !message.ext) {
        return {};
      }
      try {
        return typeof message.ext === 'string' ? JSON.parse(message.ext) : message.ext;
      } catch (ex) {
        return {};
      }
    },

    isAiStreamMessage(message) {
      const ext = this.parseMessageExt(message);
      return !!(ext && ext.ai && ext.ai.stream);
    },

    shouldRefreshMessageStatus(mid) {
      const messages = this.getMessages || [];
      const currentMessage = messages.find((item) => `${item.id}` === `${mid}`);
      if (currentMessage && this.isAiStreamMessage(currentMessage)) {
        return false;
      }
      return true;
    },

    isMessageInCurrentConv(message) {
      const uid = this.$store.getters.im.userManage.getUid();
      const toUid = toNumber(message.to);
      const fromUid = toNumber(message.from);
      const pid = this.getSid;
      return (uid === toUid && fromUid === pid) || (uid === fromUid && toUid === pid);
    },

    requireMessage() {
      const sid = `${this.getSid}`;
      const viewType = this.$store.getters['content/getViewType'];
      if (this.requireMessageTimer) clearTimeout(this.requireMessageTimer);
      this.requireMessageTimer = setTimeout(() => {
        this.requireMessageTimer = null;
        if (`${this.getSid}` !== sid || this.$store.getters['content/getViewType'] !== viewType) return;
        this.$store.dispatch('content/actionRequireMessage');
      }, 200);
    },

    deleteMessage(mid, sid) {
      this.$store.dispatch('content/actionDeleteMessage', typeof sid === 'undefined' ? mid : { mid, sid });
    },

    reloadMessage(message) {
      if (message && message.isHistory) return;
      const uid = this.$store.getters.im.userManage.getUid();
      const toUid = toNumber(message.to);
      const fromUid = toNumber(message.from);
      const isSystemMessage = message && (message.is_system === true || message.is_system === 'true' || message.is_system === 1 || message.is_system === '1');
      const shouldAutoRead = (fromUid !== uid && fromUid > 0) || (isSystemMessage && fromUid === 0);
      const pid = this.getSid;
      if ((uid === toUid && fromUid === pid) || (uid === fromUid && toUid === pid)) {
        this.prepareIncomingMessageFollow();
        if (shouldAutoRead && !this.getAutoReadSuppressed) {
          //do not read message sent by oneself
          this.$store.getters.im.rosterManage.readRosterMessage(this.getSid, message.id);
        }
        const ext = this.parseMessageExt(message);
        if (ext && ext.ai && ext.ai.stream) {
          this.$store.dispatch('content/actionAppendMessage', {
            messages: [message]
          });
        } else {
          this.requireMessage();
        }
      }
    },

    requestHistory() {
      if (this.queryingHistory || this.historyBlocked) return;
      const list = this.$refs.rlist;
      const virtualList = this.$refs.virtualList;
      const wasFollowing = this.followLatest;
      if (virtualList) virtualList.prepareHistoryPrepend();
      this.setFollowLatest(false);
      this.$store.dispatch('content/queryHistory', { retryExhausted: this.historyExhausted }).then((accepted) => {
        if (accepted === false) {
          if (virtualList) virtualList.cancelHistoryPrepend();
          this.setFollowLatest(wasFollowing);
        }
      });
    },

    saveViewport(viewport) {
      this.$store.dispatch('content/actionSaveMessageViewport', viewport);
    },

    saveMeasurements(payload) {
      this.$store.dispatch('content/actionSaveMessageMeasurements', payload);
    },

    handleListScroll() {
      const list = this.$refs.rlist;
      if (!list) return;
      const isProgrammaticScroll = typeof list.virtualMessageListIsProgrammaticScroll === 'function' && list.virtualMessageListIsProgrammaticScroll();
      if (!isProgrammaticScroll) {
        if (list.scrollTop < this.lastScrollTop) {
          this.setFollowLatest(false);
        } else if (this.isAtBottom(list)) {
          this.setFollowLatest(true);
        }
      }
      this.lastScrollTop = list.scrollTop;
      if (this.isPulling) return;
      const showThreshold = 10;
      const hideThreshold = 28;
      if (this.showHistoryTrigger || this.isPulling || this.queryingHistory) {
        this.showHistoryTrigger = list.scrollTop <= hideThreshold;
      } else {
        this.showHistoryTrigger = list.scrollTop <= showThreshold;
      }
      if (list.scrollTop > hideThreshold && !this.queryingHistory) {
        this.pullDistance = 0;
        this.isPulling = false;
      }
    },

    handlePullStart(event) {
      const list = this.$refs.rlist;
      if (!list || list.scrollTop > 0) return;
      this.pullStartY = event.touches[0].clientY;
      this.pullDistance = 0;
      this.isPulling = true;
    },

    handlePullMove(event) {
      const list = this.$refs.rlist;
      if (!list || list.scrollTop > 0 || !this.pullStartY) return;
      const delta = event.touches[0].clientY - this.pullStartY;
      if (delta <= 0) {
        this.pullDistance = 0;
        return;
      }
      this.pullDistance = Math.min(delta * 0.6, 84);
    },

    handlePullEnd() {
      if (this.pullDistance >= 56 && !this.queryingHistory) {
        this.requestHistory();
      }
      this.pullStartY = 0;
      this.pullDistance = 0;
      if (!this.queryingHistory) {
        this.isPulling = false;
      }
    },

    isAtBottom(list) {
      return list.scrollHeight - (list.scrollTop + list.clientHeight) <= 2;
    },

    prepareIncomingMessageFollow() {
      const list = this.$refs.rlist;
      if (this.followLatest || (list && this.isAtBottom(list))) this.setFollowLatest(true);
    },

    setFollowLatest(followLatest) {
      this.followLatest = followLatest;
    },

    scrollToBottom(force = false) {
      const list = this.$refs.rlist;
      if (!list || (!force && !this.followLatest)) return;
      if (this.$refs.virtualList) this.$refs.virtualList.scrollToBottom(force);
      else list.scrollTop = list.scrollHeight;
      this.lastScrollTop = list.scrollTop;
      this.setFollowLatest(true);
      this.handleListScroll();
    }

    //methods finish ...
  }
};
</script>

<style scoped></style>
