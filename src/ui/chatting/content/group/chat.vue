<template>
  <div class="list" ref="listg">
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

    this.$store.getters.im.on('onGroupMessage', (message) => {
      this.reloadMessage(message);
    });

    this.$store.getters.im.on('onGroupMessageContentAppend', (message) => {
      if (this.$refs.vMessages) {
        let msg = this.$refs.vMessages.reverse().find((item) => item.message.id == message.id);
        if (msg) {
          msg.messageContentAppend(message);
          this.calculateScroll(message);
        }
      }
    });

    this.$store.getters.im.on('onGroupMessageReplace', (message) => {
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
      this.requireMessage();
    });

    this.$store.getters.im.on('onSendingMessageStatusChanged', ({ status, mid }) => {
      console.log('Sending Message status changed to ', status, ' mid: ', mid);
      // this.requireMessage();
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
      scrollTimer: null
    };
  },

  components: {
    Message
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime', 'getScroll']),
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
            content = content.replace('{' + sx + '}', umaps[sx].alias || umaps[sx].username);
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
    requireMessage() {
      setTimeout(() => {
        this.$store.dispatch('content/actionRequireMessage');
      }, 200);
    },

    deleteMessage(mid) {
      setTimeout(() => {
        this.$store.dispatch('content/actionDeleteMessage', mid);
      }, 200);

      !this.getMessages.length && this.scroll();
    },

    reloadMessage(message) {
      const toUid = toNumber(message.to);
      const pid = this.getSid;
      const uid = this.$store.getters.im.userManage.getUid();
      if (toUid === pid) {
        if (uid + '' !== message.from + '') {
          this.$store.getters.im.groupManage.readGroupMessage(this.getSid);
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
        that.$refs.listg && (that.$refs.listg.scrollTop = that.$refs.listg.scrollHeight);
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
