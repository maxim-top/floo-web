<template>
  <div class="list" ref="rlist">
    <div @click="requestHistory" id="roster_history_btn">
      {{ queryingHistory ? '正在拉取历史消息，请稍候' : '点击拉取历史消息' }}
    </div>
    <Message :message="message" v-bind:key="aid" v-for="(message, aid) in allMessages" />
  </div>
</template>

<script>
// import Chat from "./chat.vue";
import Message from './renderMsg.vue';
import { numToString, toNumber } from '../../../third/tools';

import { mapGetters } from 'vuex';

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
      onReceiveHistoryMsg: '',
      onMessageStatusChanged: '',
      onMessageRecalled: '',
      onMessageDeleted: '',
      onMessageCanceled: ''
    });
  },

  data() {
    return {
      queryingHistory: false
    };
  },

  components: {
    Message
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime', 'getScroll']),
    allMessages() {
      const msgs = this.getMessages || [];
      msgs.forEach((x) => {
        x.aid = numToString(x.id);
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
        this.scroll();
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
      setTimeout(() => {
        this.$refs.rlist && (this.$refs.rlist.scrollTop = this.$refs.rlist.scrollHeight);
      }, 200);
    }
    //methods finish ...
  }
};
</script>

<style scoped></style>
