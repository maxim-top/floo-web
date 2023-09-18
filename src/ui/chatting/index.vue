<template>
  <div class="chat-index">
    <audio id="phone_ring_player" src="/audio/phone_ring.mp3" class="hide" autoplay playsinline muted />
    <Header />
    <Contact />
    <Content />
  </div>
</template>

<script>
import Header from './header';
import Contact from './contact';
import Content from './content';
import { toNumber } from '../third/tools';
import { mapGetters } from 'vuex';

// import { mapActions, mapState, mapGetters } from "vuex";

export default {
  name: 'HelloWorld',
  components: {
    Header,
    Contact,
    Content
  },
  data() {
    return {
      weakUpId: null,
      callId: ''
    };
  },
  mounted() {
    {
      const au = document.getElementById('phone_ring_player');
      au.muted = false;
      au.loop = false;
      au.pause();
    }

    this.$store.getters.im.on('onRosterListUpdate', () => {
      this.$store.dispatch('contact/actionClearRosterList');
      this.$store.dispatch('contact/actionLazyGetRosterList');
    });

    this.$store.getters.im.on('onGroupListUpdate', () => {
      this.$store.dispatch('contact/actionClearGroupList');
      this.$store.dispatch('contact/actionLazyGetGroupList');
    });

    this.$store.getters.im.on('recentlistUpdate', () => {
      this.$store.dispatch('contact/actionGetConversationList');
    });

    this.$store.getters.im.on('onUnreadChange', () => {
      this.$store.dispatch('contact/actionGetConversationList');
    });

    this.$store.getters.im.on('onRosterInfoUpdate', () => {
      this.$store.dispatch('contact/actionGetConversationList');
    });

    this.$store.getters.im.on('onRosterRTCMessage', (message) => {
      const { config, isHistory } = message;
      const fromUid = toNumber(message.from);
      const toUid = toNumber(message.to);
      const uid = this.$store.state.im.userManage.getUid();
      const au = document.querySelector('#phone_ring_player');
      const callStatus = this.getCallStatus;

      if (!isHistory && config) {
        if (config.action && config.action === 'call' && config.initiator) {
          if (callStatus == false) {
            if (config.initiator !== uid && toUid === uid) {
              this.$store.dispatch('contact/actionSetCallInviteInfo', config);
              this.$store.dispatch('contact/actionSetCallId', config.callId);
              this.$store.dispatch('layer/actionSetShowmask', 'true');
              this.$store.dispatch('layer/actionSetShowing', 'callinvite');
              au.loop = true;
              au.play();
            } else {
              // current user other device launch call，just display message and do nothing.
            }
          } else {
            if (config.initiator !== uid && toUid === uid) {
              this.$store.getters.im.rtcManage.sendRTCMessage({
                uid: fromUid,
                content: 'busy',
                config: JSON.stringify({
                  action: 'hangup',
                  callId: config.callId,
                  initiator: config.initiator,
                  pushMessageLocKey: 'callee_busy'
                })
              });
            } else {
              // should not come here.
            }
          }
        } else if (config.action && config.action == 'pickup') {
          this.stopPhoneRing();
          if (fromUid === uid) {
            // current use other device pickup call.
            this.$store.dispatch('layer/actionSetShowing', '');
            this.$store.dispatch('layer/actionSetShowmask', false);
            this.$store.dispatch('contact/actionSetCallInviteInfo', null);
            this.$store.dispatch('contact/actionSetCallId', '');
            this.$store.dispatch('contact/actionSetCallPickupTime', 0);
          } else {
            this.$store.dispatch('contact/actionSetCallPickupTime', Date.now());
          }
          this.$store.dispatch('setting/actionSetCallStatus', true);
        } else if (config.action && config.action == 'hangup') {
          this.stopPhoneRing();
          if (fromUid === uid) {
            // current user other device hangup call. just display message and do nothing.
          } else {
            if (callStatus == true) {
              this.$store.state.im.rosterManage.readRosterMessage(fromUid, message.id);
            }
          }
          this.$store.dispatch('layer/actionSetShowing', '');
          this.$store.dispatch('layer/actionSetShowmask', false);
          this.$store.dispatch('contact/actionSetCallInviteInfo', null);
          this.$store.dispatch('contact/actionSetCallId', '');
          this.$store.dispatch('contact/actionSetCallPickupTime', 0);
          this.$store.dispatch('setting/actionSetCallStatus', false);
        }
      }
    });
  },
  computed: {
    ...mapGetters('setting', ['getCallStatus'])
  },
  methods: {
    stopPhoneRing() {
      const au = document.querySelector('#phone_ring_player');
      au.loop = false;
      au.pause();
    }
    // clickA() {
    //   // this.$store.dispatch("test/invokePushItems", "hello");
    // }
    // ...mapActions("login", ["alertName"])
  }
};
</script>

<style scoped></style>
