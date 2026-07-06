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
      <div
        v-else
        :class="{ sel: getSid == conversation.sid }"
        @click="touchConversation(index)"
        class="item"
        v-bind:key="conversation.sid"
        v-for="(conversation, index) in filteredConversationList"
      >
        <span :class="{ none: conversation.unread === 0 }" class="unread_number">{{ conversation.unread }}</span>

        <div v-if="conversation.sid === 0">
          <img class="avatar" :src="systemRoster.avatar" />
          <div class="name">{{ systemRoster.name }}</div>
        </div>
        <div v-else>
          <img class="avatar" :src="conversation.avatar" />
          <div class="name">{{ conversation.name }}</div>
        </div>

        <div class="last_msg_time">
          {{ formatTimeString(conversation.timestamp) }}
        </div>
        <div class="last_msg">
          <span v-if="conversation.hasAt" class="at_tips">{{ $t('[有人@我]') }}</span>
          <span v-if="conversation.isDraft" class="draft_tips" :aria-label="$t('草稿')">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="draft_tips_icon">
              <path d="M4 17.5V20h2.5L17.8 8.7l-2.5-2.5L4 17.5z"></path>
              <path d="M14.6 6.2l2.5 2.5"></path>
              <path d="M13.8 4.4l1.8-1.8a1.4 1.4 0 0 1 2 0l1.8 1.8a1.4 1.4 0 0 1 0 2l-1.8 1.8"></path>
            </svg>
            <span>{{ $t('草稿') }}</span>
          </span>
          <span>{{ conversation.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import EmptyState from '../../components/emptyState';
import formatMessageTime from '../../utils/timeFormat';

export default {
  components: {
    EmptyState
  },
  mounted() {
    this.$store.dispatch('contact/actionGetConversationList');
    this.restoreScroll();
    this.ensureActiveConversation();
  },

  computed: {
    ...mapGetters('contact', ['getConversationList', 'getConversationScroll', 'getSearchKeyword', 'getSkipConversationAutoSelectOnce']),
    ...mapGetters('content', ['getSid']),
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
    token() {
      return this.$store.getters.im.userManage.getToken();
    }
  },

  watch: {
    getConversationList() {
      this.ensureActiveConversation();
    },
    getSid(newSid) {
      if (newSid === undefined || newSid === null || newSid === '' || newSid === -1) {
        this.ensureActiveConversation();
      }
    },
    getConversationScroll() {
      this.restoreScroll();
    }
  },

  methods: {
    formatTimeString(timestamp) {
      return formatMessageTime(timestamp);
    },

    touchConversation(index) {
      let conversation = this.filteredConversationList[index];
      if (!conversation) return;
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('content/actionSetType', {
        sid: conversation.sid,
        type: conversation.type === 'group' ? 'groupchat' : 'rosterchat'
      });
      window.localStorage.setItem('lastActiveChat', conversation.sid);
      if (conversation.type === 'group' && conversation.hasAt) {
        this.$store.state.im.groupManage.consumeGroupAtStatus(conversation.sid);
      }
    },

    ensureActiveConversation() {
      this.$nextTick(() => {
        if (window.innerWidth <= 768) return;
        if (!Array.isArray(this.filteredConversationList) || !this.filteredConversationList.length) return;
        if (this.getSkipConversationAutoSelectOnce) {
          this.$store.dispatch('contact/actionSetSkipConversationAutoSelectOnce', false);
          return;
        }
        if (this.getSid !== -1 && this.filteredConversationList.find((item) => item.sid === this.getSid)) {
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
        this.touchConversation(index);
      });
    },
    handleSearch(e) {
      this.$store.dispatch('contact/actionSetSearchkeyword', e.target.value);
    },

    handleScroll() {
      const container = this.$refs.imgContainer;
      if (!container) return;
      this.$store.dispatch('contact/actionSetConversationScroll', container.scrollTop);
    },

    restoreScroll() {
      this.$nextTick(() => {
        const container = this.$refs.imgContainer;
        if (!container) return;

        if (this.getConversationScroll != container.scrollTop) {
          container.scrollTop = this.getConversationScroll;
        }
      });
    },

    openContacts() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'contact');
    }
  }
};
</script>

<style scoped></style>
