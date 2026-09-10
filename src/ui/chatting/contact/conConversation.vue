<template>
  <div class="contact-root conversation-root">
    <div class="contact-sticky-header conversation-sticky-header">
      <div class="contact-search-shell">
        <svg class="contact-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6"></circle>
          <path d="M20 20l-4.2-4.2"></path>
        </svg>
        <input :value="getSearchKeyword" @input="handleSearch" :placeholder="$t('搜索会话')" type="text" />
      </div>
    </div>
    <div class="l_conversation" ref="imgContainer" @scroll="handleScroll">
      <EmptyState
        v-if="!filteredConversationList.length"
        variant="conversation"
        :title="$t('这里还很安静')"
        :description="$t('发起你的第一条会话，或前往通讯录寻找想联系的人。')"
        :button-text="$t('+ 开始第一条会话')"
        compact
        @action="openContacts"
      />
      <template v-else>
        <div :style="virtualTopSpacerStyle" aria-hidden="true" class="conversation-virtual-spacer"></div>
        <div
          :data-conversation-index="item.index"
          :class="{ sel: getSid == item.conversation.sid }"
          @pointerdown="beginConversationInteraction"
          @click="handleConversationClick(item.conversation)"
          class="item"
          v-bind:key="item.conversation.sid"
          v-for="item in virtualConversationList"
        >
          <span
            v-if="item.conversation.unread > 0"
            :aria-label="item.conversation.muted ? $t('conversationNotifications.mutedUnread', { origin: '有未读消息' }) : null"
            :class="{ unread_dot: item.conversation.muted }"
            class="unread_number"
          >
            {{ item.conversation.muted ? '' : item.conversation.unread }}
          </span>

          <div v-if="item.conversation.sid === 0" class="conversation_identity">
            <img class="avatar" :src="systemRoster.avatar" />
            <div class="name">{{ systemRoster.name }}</div>
          </div>
          <div v-else class="conversation_identity">
            <img class="avatar" :src="item.conversation.avatar" />
            <div class="name">{{ item.conversation.name }}</div>
          </div>

          <div class="last_msg_time">
            {{ formatTimeString(item.conversation.timestamp) }}
          </div>
          <div class="last_msg">
            <span v-if="item.conversation.hasAt" class="at_tips">{{ $t('[有人@我]') }}</span>
            <span v-if="item.conversation.isDraft" class="draft_tips" :aria-label="$t('草稿')">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="draft_tips_icon">
                <path d="M4 17.5V20h2.5L17.8 8.7l-2.5-2.5L4 17.5z"></path>
                <path d="M14.6 6.2l2.5 2.5"></path>
                <path d="M13.8 4.4l1.8-1.8a1.4 1.4 0 0 1 2 0l1.8 1.8a1.4 1.4 0 0 1 0 2l-1.8 1.8"></path>
              </svg>
              <span>{{ $t('草稿') }}</span>
            </span>
            <span>{{ item.conversation.content }}</span>
          </div>
        </div>
        <div :style="virtualBottomSpacerStyle" aria-hidden="true" class="conversation-virtual-spacer"></div>
      </template>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import EmptyState from '../../components/emptyState';
import formatMessageTime from '../../utils/timeFormat';

const CONVERSATION_ROW_HEIGHT = 72;
const CONVERSATION_OVERSCAN = 16;
const CONVERSATION_SCROLL_REFRESH_DELAY = 1500;
const CONVERSATION_CLICK_REFRESH_DELAY = 1500;

export default {
  components: {
    EmptyState
  },
  data() {
    return {
      virtualScrollTop: 0,
      virtualViewportHeight: 0,
      scrollFrame: null,
      conversationInteractionActive: false,
      conversationInteractionTimer: null,
      conversationActivityActive: false,
      conversationActivityResumeAt: 0,
      conversationActivityReleaseTimer: null
    };
  },
  mounted() {
    this.$store.dispatch('contact/actionGetConversationList');
    this.ensureActiveConversation();
    this.$nextTick(() => {
      this.measureVirtualViewport();
      this.restoreScroll();
      this.ensureVisibleConversationData();
    });
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.endConversationInteraction();
    this.endConversationActivityPause();
  },

  computed: {
    ...mapGetters('contact', ['getConversationList', 'getConversationScroll', 'getSearchKeyword', 'getSkipConversationAutoSelectOnce']),
    ...mapGetters('content', ['getSid']),
    ...mapGetters('header', ['getHeaderStatus']),
    systemRoster() {
      return {
        name: this.$t('系统通知'),
        avatar: '/image/setting.png'
      };
    },
    filteredConversationList() {
      const keyword = (this.getSearchKeyword || '').trim().toLowerCase();
      if (!keyword) return this.getConversationList;
      return this.getConversationList.filter((conversation) => {
        const text = `${conversation.name || ''} ${conversation.content || ''}`.toLowerCase();
        return text.indexOf(keyword) > -1;
      });
    },
    virtualStartIndex() {
      const visibleCount = Math.max(1, Math.ceil(this.virtualViewportHeight / CONVERSATION_ROW_HEIGHT));
      const rawStart = Math.max(0, Math.floor(this.virtualScrollTop / CONVERSATION_ROW_HEIGHT) - CONVERSATION_OVERSCAN);
      const maxStart = Math.max(0, this.filteredConversationList.length - visibleCount - CONVERSATION_OVERSCAN * 2);
      return Math.min(rawStart, maxStart);
    },
    virtualEndIndex() {
      const visibleCount = Math.max(1, Math.ceil(this.virtualViewportHeight / CONVERSATION_ROW_HEIGHT));
      return Math.min(this.filteredConversationList.length, this.virtualStartIndex + visibleCount + CONVERSATION_OVERSCAN * 2);
    },
    virtualConversationList() {
      return this.filteredConversationList.slice(this.virtualStartIndex, this.virtualEndIndex).map((conversation, offset) => ({
        conversation,
        index: this.virtualStartIndex + offset
      }));
    },
    virtualTopSpacerStyle() {
      return { height: `${this.virtualStartIndex * CONVERSATION_ROW_HEIGHT}px` };
    },
    virtualBottomSpacerStyle() {
      return { height: `${Math.max(0, this.filteredConversationList.length - this.virtualEndIndex) * CONVERSATION_ROW_HEIGHT}px` };
    },
    token() {
      return this.$store.getters.im.userManage.getToken();
    }
  },

  watch: {
    getConversationList() {
      this.ensureActiveConversation();
      this.$nextTick(() => {
        this.measureVirtualViewport();
        this.ensureVisibleConversationData();
      });
    },
    getHeaderStatus(status) {
      if (status === 'conversation') {
        this.$store.dispatch('contact/actionGetConversationList', {
          skipMissingGroupInfoRequest: true
        });
        this.restoreScroll();
        this.ensureActiveConversation();
        this.$nextTick(() => {
          this.ensureVisibleConversationData();
        });
      }
    },
    getSid(newSid) {
      if (newSid === undefined || newSid === null || newSid === '' || newSid === -1) {
        this.ensureActiveConversation();
      }
    },
    getConversationScroll() {
      this.restoreScroll();
    },
    getSearchKeyword(keyword) {
      if (!keyword) {
        this.$nextTick(() => this.ensureVisibleConversationData());
        return;
      }
      this.$store.dispatch('contact/actionEnsureAllConversationPreviews');
      this.$nextTick(() => {
        const container = this.$refs.imgContainer;
        if (!container) return;
        container.scrollTop = 0;
        this.virtualScrollTop = 0;
        this.$store.dispatch('contact/actionSetConversationScroll', 0);
        this.ensureVisibleConversationData();
      });
    }
  },

  methods: {
    formatTimeString(timestamp) {
      return formatMessageTime(timestamp);
    },

    touchConversation(conversation) {
      this.$store.dispatch('contact/actionOpenConversation', conversation);
    },

    handleConversationClick(conversation) {
      this.markConversationActivity(CONVERSATION_CLICK_REFRESH_DELAY);
      this.touchConversation(conversation);
      this.scheduleEndConversationInteraction();
    },

    beginConversationInteraction(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      this.markConversationActivity(CONVERSATION_CLICK_REFRESH_DELAY);
      if (this.conversationInteractionTimer) {
        clearTimeout(this.conversationInteractionTimer);
        this.conversationInteractionTimer = null;
      }
      if (!this.conversationInteractionActive) {
        this.conversationInteractionActive = true;
        this.$store.dispatch('contact/actionSetConversationListInteractionActive', true);
      }
      window.addEventListener('pointerup', this.scheduleEndConversationInteraction);
      window.addEventListener('pointercancel', this.scheduleEndConversationInteraction);
    },

    scheduleEndConversationInteraction() {
      window.removeEventListener('pointerup', this.scheduleEndConversationInteraction);
      window.removeEventListener('pointercancel', this.scheduleEndConversationInteraction);
      if (this.conversationInteractionTimer) clearTimeout(this.conversationInteractionTimer);
      this.conversationInteractionTimer = setTimeout(() => {
        this.conversationInteractionTimer = null;
        this.endConversationInteraction();
      }, 0);
    },

    endConversationInteraction() {
      window.removeEventListener('pointerup', this.scheduleEndConversationInteraction);
      window.removeEventListener('pointercancel', this.scheduleEndConversationInteraction);
      if (this.conversationInteractionTimer) {
        clearTimeout(this.conversationInteractionTimer);
        this.conversationInteractionTimer = null;
      }
      if (!this.conversationInteractionActive) return;
      this.conversationInteractionActive = false;
      this.$store.dispatch('contact/actionSetConversationListInteractionActive', false);
    },

    markConversationActivity(delay) {
      this.conversationActivityResumeAt = Math.max(this.conversationActivityResumeAt, Date.now() + delay);
      if (!this.conversationActivityActive) {
        this.conversationActivityActive = true;
        this.$store.dispatch('contact/actionSetConversationListUserActive', true);
      }
      if (!this.conversationActivityReleaseTimer) {
        this.conversationActivityReleaseTimer = setTimeout(this.checkConversationActivityIdle, delay);
      }
    },

    checkConversationActivityIdle() {
      const remaining = this.conversationActivityResumeAt - Date.now();
      if (remaining > 0) {
        this.conversationActivityReleaseTimer = setTimeout(this.checkConversationActivityIdle, remaining);
        return;
      }
      this.conversationActivityReleaseTimer = null;
      this.conversationActivityResumeAt = 0;
      this.endConversationActivityPause();
    },

    endConversationActivityPause() {
      if (this.conversationActivityReleaseTimer) {
        clearTimeout(this.conversationActivityReleaseTimer);
        this.conversationActivityReleaseTimer = null;
      }
      if (!this.conversationActivityActive) return;
      this.conversationActivityActive = false;
      this.conversationActivityResumeAt = 0;
      this.$store.dispatch('contact/actionSetConversationListUserActive', false);
    },

    ensureActiveConversation() {
      this.$nextTick(() => {
        if (window.innerWidth <= 768) return;
        if (this.getHeaderStatus !== 'conversation') return;
        if (!Array.isArray(this.filteredConversationList) || !this.filteredConversationList.length) return;
        if (this.getSkipConversationAutoSelectOnce) {
          this.$store.dispatch('contact/actionSetSkipConversationAutoSelectOnce', false);
          return;
        }
        if (this.getSid !== -1 && this.getConversationList.find((item) => `${item.sid}` === `${this.getSid}`)) {
          return;
        }

        const lastActiveChat = window.localStorage.getItem('lastActiveChat');
        let index = 0;
        if (lastActiveChat !== null) {
          const matchedIndex = this.filteredConversationList.findIndex((item) => `${item.sid}` === `${lastActiveChat}`);
          if (matchedIndex >= 0) {
            index = matchedIndex;
          }
        }
        this.touchConversation(this.filteredConversationList[index]);
      });
    },
    handleSearch(e) {
      this.$store.dispatch('contact/actionSetSearchkeyword', e.target.value);
    },

    handleScroll() {
      this.markConversationActivity(CONVERSATION_SCROLL_REFRESH_DELAY);
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = null;
        const container = this.$refs.imgContainer;
        if (!container) return;
        this.virtualScrollTop = container.scrollTop;
        this.virtualViewportHeight = container.clientHeight;
        if (this.getConversationScroll !== container.scrollTop) {
          this.$store.dispatch('contact/actionSetConversationScroll', container.scrollTop);
        }
        this.ensureVisibleConversationData();
      });
    },

    handleResize() {
      this.$nextTick(() => {
        this.measureVirtualViewport();
        this.ensureVisibleConversationData();
      });
    },

    measureVirtualViewport() {
      const container = this.$refs.imgContainer;
      if (!container) return;
      this.virtualViewportHeight = container.clientHeight;
      this.virtualScrollTop = container.scrollTop;
    },

    restoreScroll() {
      this.$nextTick(() => {
        const container = this.$refs.imgContainer;
        if (!container) return;

        if (this.getConversationScroll != container.scrollTop) {
          container.scrollTop = this.getConversationScroll;
        }
        this.measureVirtualViewport();
      });
    },

    openContacts() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'contact');
    },

    ensureVisibleConversationData() {
      if (this.getHeaderStatus !== 'conversation') return;
      const visibleConversations = this.virtualConversationList.map((item) => item.conversation);
      this.$store.dispatch('contact/actionEnsureConversationPreviews', visibleConversations);
      const visibleGroups = visibleConversations
        .filter((conversation) => conversation.type === 'group')
        .map((conversation) => ({
          group_id: conversation.sid,
          name: conversation.name
        }));
      if (visibleGroups.length) {
        this.$store.dispatch('contact/actionEnsureVisibleConversationGroupData', visibleGroups);
      }
    }
  }
};
</script>

<style scoped></style>
