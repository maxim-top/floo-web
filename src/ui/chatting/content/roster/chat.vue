<template>
  <div class="list" ref="rlist" v-if="!forceRefresh">
    <div @click="requestHistory" id="roster_history_btn">
      {{ queryingHistory ? '正在拉取历史消息，请稍候' : '点击拉取历史消息' }}
    </div>
    <div>
      <Message ref="vMessages" :message="message" v-bind:key="aid" v-for="(message, aid) in allMessages" />
    </div>
  </div>
</template>

<script>
// import Chat from "./chat.vue";
import Message from './renderMsg.vue';
import { numToString, toNumber } from '../../../third/tools';

import { mapGetters } from 'vuex';
var JSONBigString = require('json-bigint');

export default {
  name: 'RosterChat',
  mounted() {
    this.requireMessage();
    this.scroll();

    const im = this.$store.getters.im;
    if (!im) return;

    im.on('onRosterMessage', (message) => {
      this.reloadMessage(message);
    });

    im.on('onRosterMessageContentAppend', (message) => {
      if (this.$refs.vMessages) {
        let msg = this.$refs.vMessages.reverse().find((item) => item.message.id == message.id);
        if (msg) {
          msg.messageContentAppend(message);
          this.calculateScroll(message);
        }
      }
    });

    im.on('onRosterMessageReplace', (message) => {
      if (this.$refs.vMessages) {
        let msg = this.$refs.vMessages.reverse().find((item) => item.message.id == message.id);
        if (msg) {
          msg.messageReplace(message);
          setTimeout(() => {
            this.calculateScroll(message, msg.getLastSliceStreamTime());
          }, 200);
        }
      }
    });

    im.on('onReceiveHistoryMsg', ({ next }) => {
      this.queryingHistory = false;
      this.$store.dispatch('content/actionAppendMessage', {
        history: true,
        next
      });
      this.scroll();
    });

    im.on('onMessageStatusChanged', ({ mid }) => {
      console.log('Message status changed, mid: ', mid);
      this.requireMessage();
    });

    this.$store.getters.im.on('onSendingMessageStatusChanged', ({ status, mid }) => {
      console.log('Sending Message status changed to ', status, ' mid: ', mid);
      // this.requireMessage();
    });

    im.on('onMessageRecalled', ({ mid }) => {
      this.deleteMessage(mid);
    });

    im.on('onMessageDeleted', ({ mid }) => {
      this.deleteMessage(mid);
    });

    im.on('onMessageCanceled', (message) => {
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
      onRosterMessage: '',
      onRosterMessageContentAppend: '',
      onRosterMessageReplace: '',
      onReceiveHistoryMsg: '',
      onMessageStatusChanged: '',
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
      forceRefresh: false
    };
  },

  components: {
    Message
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime', 'getScroll']),
    allMessages() {
      let msgs = this.getMessages || [];
      msgs = msgs.filter((item) => {
        const { type, config, ext } = item;
        if (type == 'rtc' && config && config.action && config.action !== 'record') {
          return false;
        }
        if (ext) {
          const sext = JSON.parse(ext);
          if (type == 'rtc' && sext && sext.callId) {
            return false;
          } else if (sext && sext.input_status) {
            return false;
          }
        }
        return true;
      });
      msgs.forEach((x) => {
        x.aid = numToString(x.id);
      });
      if (msgs.length > 1 && msgs[0]) {
        this.reloadFirstMessage(msgs[0]);
      }
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
    reloadFirstMessage(message) {
      const fromUid = toNumber(message.from);
      const toUid = toNumber(message.to);
      const uid = this.$store.getters.im.userManage.getUid();
      const cid = fromUid === uid ? toUid : fromUid;

      let needReload = true;
      for (let i = 0; i < this.reloadList.length; i++) {
        if (this.reloadList[i] === cid) {
          needReload = false;
          break;
        }
      }

      if (this.$refs.vMessages && needReload) {
        let msg = this.$refs.vMessages[0];
        if (msg) {
          this.reloadList.unshift(cid);
          msg.messageReplace(message);
        }
      }
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
      const uid = this.$store.getters.im.userManage.getUid();
      const toUid = toNumber(message.to);
      const fromUid = toNumber(message.from);
      const pid = this.getSid;
      if ((uid === toUid && fromUid === pid) || (uid === fromUid && toUid === pid)) {
        if (fromUid !== uid) {
          //do not read message sent by oneself
          this.$store.getters.im.rosterManage.readRosterMessage(this.getSid, message.id);
        }
        this.requireMessage();
        if (message.ext && !message.isHistory) {
          let ext = JSONBigString.parse(message.ext);
          if (ext && ext.ai && ext.ai.stream && !ext.ai.finish) {
            this.calculateScroll(message);
          } else {
            this.scroll();
          }
        } else {
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
      }, 10000);
      this.$store.dispatch('content/queryHistory');
    },

    scroll() {
      let that = this;
      setTimeout(() => {
        that.$refs.rlist && (that.$refs.rlist.scrollTop = that.$refs.rlist.scrollHeight);
      }, 200);
    },

    calculateScroll(message, maxInterval = 0) {
      if (message.ext) {
        let ext = JSONBigString.parse(message.ext);
        if (ext && ext.ai && ext.ai.stream) {
          this.scrollTimer && clearInterval(this.scrollTimer);
          let count = ext.ai.stream_interval * 5;
          if (maxInterval > ext.ai.stream_interval) {
            count = maxInterval * 5;
          }
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
