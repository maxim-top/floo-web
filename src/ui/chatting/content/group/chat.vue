<template>
  <div class="list" ref="listg" v-if="!forceRefresh" @scroll="handleListScroll" @touchstart="handlePullStart" @touchmove="handlePullMove" @touchend="handlePullEnd">
    <div class="message-history-slot">
      <div
        @click="requestHistory"
        id="roster_history_btn"
        class="message-history-trigger"
        :class="{ 'is-visible': showHistoryTrigger || queryingHistory || isPulling, 'is-pulling': isPulling, 'is-loading': queryingHistory }"
        :style="{ '--pull-distance': `${pullDistance}px` }"
      >
        <svg v-if="!queryingHistory" viewBox="0 0 24 24" aria-hidden="true" class="message-history-trigger__icon">
          <path d="M12 7v5l3 2"></path>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"></path>
          <path d="M4.5 5.5v3.5H8"></path>
        </svg>
        <span v-else class="message-history-trigger__spinner" aria-hidden="true"></span>
        <span>{{ queryingHistory ? $t('正在拉取历史消息') : $t('查看历史消息') }}</span>
      </div>
    </div>
    <div class="message-stream">
      <Message ref="vMessages" :message="message" v-bind:key="message.id" v-for="message in allMessages" />
    </div>
  </div>
</template>

<script>
// import Chat from "./chat.vue";
import Message from './renderMsg.vue';
import { numToString, toNumber } from '../../../third/tools';

import { mapGetters } from 'vuex';

export default {
  name: 'GroupChat',
  mounted() {
    this.requireMessage();
    this.scroll();
    this.$store.dispatch('forward/actionCancelForward', false);

    this.$store.getters.im.on('onGroupMessage', (message) => {
      this.reloadMessage(message);
    });

    this.$store.getters.im.on('onGroupMessageContentAppend', (message) => {
      if (this.$refs.vMessages) {
        this.$store.dispatch('content/actionUpdateMessage', {
          message,
          mid: message.id
        });
        let msg = this.$refs.vMessages.reverse().find((item) => item.message.id == message.id);
        if (msg) {
          msg.messageContentAppend(message);
          this.calculateScroll(message);
        }
      }
    });

    this.$store.getters.im.on('onGroupMessageReplace', (message) => {
      if (this.$refs.vMessages) {
        this.$store.dispatch('content/actionUpdateMessage', {
          message,
          mid: message.id
        });
        let msg = this.$refs.vMessages.reverse().find((item) => item.message.id == message.id);
        if (msg) {
          msg.messageReplace(message);
          this.scroll();
        }
      }
    });

    this.$store.getters.im.on('onReceiveHistoryMsg', ({ next }) => {
      this.queryingHistory = false;
      this.$store.dispatch('content/actionAppendMessage', {
        history: true,
        next
      });
      !this.getMessages.length && this.scroll();
    });

    this.$store.getters.im.on('onMessageStatusChanged', ({ mid }) => {
      console.log('Message status changed, mid: ', mid);
      if (!this.shouldRefreshMessageStatus(mid)) {
        return;
      }
      this.requireMessage();
    });

    this.$store.getters.im.on('onSendingMessageStatusChanged', ({ status, mid, message, errorCode, errorReason }) => {
      // this.requireMessage();
      if (status === 'sending') {
        console.log('Sending Message status changed to sending mid: ', mid);
        if (!this.isMessageInCurrentConv(message)) {
          return;
        }
        this.$store.dispatch('content/actionAppendMessage', {
          sendingMessages: [message]
        });
      } else if (status === 'sent') {
        console.log('Sending Message status changed to sent mid: ', mid);
        this.$store.dispatch('content/actionUpdateMessage', {
          message,
          mid
        });
      } else if (status === 'failed') {
        this.handleSendingMessageFailed({ mid, message, errorCode, errorReason });
      }
    });

    this.$store.getters.im.on('onMessageRecalled', ({ mid }) => {
      this.deleteMessage(mid);
    });

    this.$store.getters.im.on('onMessageDeleted', ({ mid }) => {
      this.deleteMessage(mid);
    });

    this.$store.getters.im.on('onMessageCanceled', (message) => {
      const uid = this.$store.getters.im.userManage.getUid();
      if (uid + '' === message.uid + '') {
        this.requireMessage();
      }
    });
  },

  destroyed() {
    const im = this.$store.getters.im;
    if (!im) return;

    im.off({
      onGroupMessage: '',
      onGroupMessageContentAppend: '',
      onGroupMessageReplace: '',
      onReceiveHistoryMsg: '',
      onMessageStatusChanged: '',
      onSendingMessageStatusChanged: '',
      onMessageRecalled: '',
      onMessageDeleted: '',
      onMessageCanceled: ''
    });
  },

  data() {
    return {
      queryingHistory: false,
      scrollTimer: null,
      reloadList: [],
      forceRefresh: false,
      showHistoryTrigger: false,
      isPulling: false,
      pullStartY: 0,
      pullDistance: 0
    };
  },

  components: {
    Message
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime', 'getScroll', 'getAutoReadSuppressed']),
    im() {
      return this.$store.state.im;
    },
    allMessages() {
      const msgs = this.getMessages || [];
      msgs.forEach((x) => {
        x.aid = numToString(x.id);
        const { config } = x;
        let content = x.content + '';
        if (config && config.mentionList && config.mentionList.length) {
          // 如果有mention的
          // const uid = im.userManage.getUid();
          const umaps = this.im.rosterManage.getAllRosterDetail();
          // const fromUid = toNumber(from.uid);
          // const hasIndex = sa.mentionList.findIndex(x => x + '' === uid + '');
          // if (hasIndex > -1) {
          //   fire('groupMention', { uid: fromUid });
          // }

          config.mentionList.forEach((sx) => {
            content = content.replace('{' + sx + '}', umaps[sx].nick_name || umaps[sx].username);
          });
          x.mentionStr = content;
        }
      });
      return msgs;
    }
  },
  watch: {
    getSid(a, b) {
      if (a !== b) {
        this.requireMessage();
        this.scroll();
      }
    },
    getScroll() {
      this.scroll();
    }
  },
  methods: {
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

    getFailedErrorInfo({ message, errorCode, errorReason }) {
      let reason = errorReason;
      const status = message && message.status;
      if (!reason && status && status.reason) {
        reason = status.reason;
      }

      const normalizedReason = (reason || '').toLowerCase().trim();
      let reasonText = reason;
      if (normalizedReason.indexOf('antispam') > -1) {
        reasonText = this.$t('消息包含敏感词，请修改后再发送');
      } else if (normalizedReason.indexOf('account_verify_needed') > -1 || normalizedReason.indexOf('verify_needed') > -1) {
        reasonText = this.$t('无法发送消息，您已被限制使用，请先完成实名认证。');
      } else if (normalizedReason.indexOf('you have been blocked by the recipient') > -1) {
        reasonText = this.$t('你已被对方加入黑名单，无法发送消息');
      } else if (normalizedReason.indexOf('your relation with target does not allow chat') > -1) {
        reasonText = this.$t('你与对方还不是好友，请先添加对方为好友后再聊天');
      }
      if (!reasonText) {
        reasonText = this.$t('消息发送失败');
      }
      return { errorCode, reason: reasonText, rawReason: reason };
    },

    handleSendingMessageFailed({ mid, message, errorCode, errorReason }) {
      const messages = this.getMessages || [];
      const oldMessage = messages.find((item) => item.id + '' === mid + '');
      if (!oldMessage) {
        return;
      }
      const { reason, rawReason } = this.getFailedErrorInfo({ message, errorCode, errorReason });
      const failedMessage = {
        ...(oldMessage || {}),
        sendFailed: true,
        sendFailedCode: errorCode,
        sendFailedRawReason: rawReason,
        sendFailedReason: reason
      };

      console.error('Sending Message status changed to failed mid: ', mid, 'code:', errorCode, 'reason:', rawReason || reason);
      this.$store.dispatch('content/actionUpdateMessage', {
        message: failedMessage,
        mid
      });
      this.$message.error(reason);
    },

    isMessageInCurrentConv(message) {
      const toUid = toNumber(message.to);
      const pid = this.getSid;
      const uid = this.$store.getters.im.userManage.getUid();
      return toUid === pid;
    },

    requireMessage() {
      setTimeout(() => {
        this.$store.dispatch('content/actionRequireMessage');
      }, 200);
    },

    deleteMessage(mid) {
      setTimeout(() => {
        this.$store.dispatch('content/actionDeleteMessage', mid);
        this.forceRefresh = true;
        this.$nextTick(() => {
          this.forceRefresh = false;
        });
      }, 200);

      !this.getMessages.length && this.scroll();
    },

    reloadMessage(message) {
      const toUid = toNumber(message.to);
      const pid = this.getSid;
      const uid = this.$store.getters.im.userManage.getUid();
      if (toUid === pid) {
        if (uid + '' !== message.from + '' && !this.getAutoReadSuppressed) {
          this.$store.getters.im.groupManage.readGroupMessage(this.getSid);
        }
        const ext = this.parseMessageExt(message);
        if (ext && ext.ai && ext.ai.stream) {
          this.$store.dispatch('content/actionAppendMessage', {
            messages: [message]
          });
          if (!ext.ai.finish) {
            this.calculateScroll(message);
          } else {
            this.scroll();
          }
        } else {
          this.requireMessage();
          this.scroll();
        }
      }
    },

    requestHistory() {
      if (this.queryingHistory) {
        return;
      }
      this.queryingHistory = true;
      this.queryHistoryTimer && clearTimeout(this.queryHistoryTimer);
      this.queryHistoryTimer = setTimeout(() => {
        this.queryingHistory = false;
      }, 15000);
      this.$store.dispatch('content/queryHistory');
    },

    handleListScroll() {
      const list = this.$refs.listg;
      if (!list) return;
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
      const list = this.$refs.listg;
      if (!list || list.scrollTop > 0) return;
      this.pullStartY = event.touches[0].clientY;
      this.pullDistance = 0;
      this.isPulling = true;
    },

    handlePullMove(event) {
      const list = this.$refs.listg;
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

    scroll() {
      let that = this;
      setTimeout(() => {
        that.$refs.listg && (that.$refs.listg.scrollTop = that.$refs.listg.scrollHeight);
        that.handleListScroll();
      }, 200);
    },

    calculateScroll(message) {
      if (message.ext) {
        let ext = {};
        try {
          ext = JSON.parse(message.ext);
        } catch (ex) {
          //
        }
        if (ext && ext.ai && ext.ai.stream) {
          this.scrollTimer && clearInterval(this.scrollTimer);
          let interval = ext.ai.stream_interval ? ext.ai.stream_interval : 3;
          let count = interval * 5;
          if (count) {
            let that = this;
            this.scrollTimer = setInterval(() => {
              that.$nextTick(() => {
                that.$refs.rlist && (that.$refs.rlist.scrollTop = that.$refs.rlist.scrollHeight);
              });
              if (count-- <= 0) {
                clearInterval(that.scrollTimer);
              }
            }, 200);
          }
        }
      }
    }
    //methods finish ...
  }
};
</script>

<style scoped></style>
