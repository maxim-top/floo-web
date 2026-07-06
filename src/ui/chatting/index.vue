<template>
  <div
    :class="{
      'chat-index': true,
      'app-shell': true,
      'is-mobile': isMobile,
      'mobile-pane-chat': isMobile && mobileShowsChat,
      'mobile-pane-immersive': isMobile && mobileHidesTopbar,
      'mobile-pane-list': isMobile && !mobileShowsChat,
      'desktop-no-sidebar': desktopNoSidebar
    }"
  >
    <audio id="phone_ring_player" src="/audio/phone_ring.mp3" class="hide" autoplay playsinline muted />
    <Header class="app-topbar" @open-global-drawer="openGlobalDrawer" />
    <div class="app-body">
      <div class="app-sidebar">
        <Contact />
      </div>
      <div class="app-main">
        <Content />
      </div>
    </div>
    <ForwardTargetPanel />
    <nav class="mobile-tab-bar" v-if="isMobile && !mobileShowsChat">
      <button :class="{ 'mobile-tab-bar__item': true, active: getHeaderStatus === 'conversation' }" type="button" @click="selectDrawerTab('conversation')">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="mobile-tab-bar__icon">
          <path d="M5 6.5h14v8H8l-3 3v-11z"></path>
        </svg>
        <span>{{ $t('会话') }}</span>
      </button>
      <button :class="{ 'mobile-tab-bar__item': true, active: getHeaderStatus === 'contact' }" type="button" @click="selectDrawerTab('contact')">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="mobile-tab-bar__icon">
          <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path>
          <path d="M5 20a7 7 0 0 1 14 0"></path>
        </svg>
        <span>{{ $t('通讯录') }}</span>
      </button>
      <button :class="{ 'mobile-tab-bar__item': true, active: getHeaderStatus === 'setting' }" type="button" @click="selectDrawerTab('setting')">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="mobile-tab-bar__icon">
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"></path>
          <path
            d="M19 12l2 1-2 3-2-.5a7.8 7.8 0 0 1-1.5 1L15 19h-6l-.5-2.5a7.8 7.8 0 0 1-1.5-1L5 16 3 13l2-1v-2L3 9l2-3 2 .5a7.8 7.8 0 0 1 1.5-1L9 3h6l.5 2.5a7.8 7.8 0 0 1 1.5 1L19 6l2 3-2 1v2z"
          ></path>
        </svg>
        <span>{{ $t('设置') }}</span>
      </button>
    </nav>
  </div>
</template>

<script>
import Header from './header';
import Contact from './contact';
import Content from './content';
import ForwardTargetPanel from './content/components/forwardTargetPanel.vue';
import { toNumber } from '../third/tools';
import { mapGetters } from 'vuex';

// import { mapActions, mapState, mapGetters } from "vuex";

export default {
  name: 'HelloWorld',
  components: {
    Header,
    Contact,
    Content,
    ForwardTargetPanel
  },
  data() {
    return {
      callMap: new Map(),
      isMobile: false,
      showGlobalDrawer: false
    };
  },
  mounted() {
    {
      const au = document.getElementById('phone_ring_player');
      au.muted = false;
      au.loop = false;
      au.pause();
    }

    this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
    this.handleResize();
    window.addEventListener('resize', this.handleResize);

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
      let that = this;
      const { config, isHistory, isNative } = message;
      const fromUid = toNumber(message.from);
      const toUid = toNumber(message.to);
      const uid = this.$store.state.im.userManage.getUid();
      const au = document.querySelector('#phone_ring_player');
      const callStatus = this.$store.state.im.rtcManage.getInCallStatus();

      if (!isHistory && config && !isNative) {
        if (config.action && config.action === 'call' && config.initiator) {
          if (callStatus == false) {
            this.callMap.set(
              config.callId,
              setTimeout(function () {
                if (config.initiator !== uid && toUid === uid) {
                  that.$store.dispatch('contact/actionSetCallInviteInfo', config);
                  that.$store.dispatch('contact/actionSetCallId', config.callId);
                  that.$store.dispatch('layer/actionSetShowmask', 'true');
                  that.$store.dispatch('layer/actionSetShowing', 'callinvite');
                  au.loop = true;
                  au.play();
                } else {
                  // current user other device launch call，just display message and do nothing.
                }
              }, 1000)
            );
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
          this.removeDelayCall(config.callId);
          this.stopPhoneRing();
          if (fromUid === uid) {
            // current use other device pickup call.
            this.$store.dispatch('layer/actionSetShowing', '');
            this.$store.dispatch('layer/actionSetShowmask', false);
            this.$store.dispatch('contact/actionSetCallInviteInfo', null);
            this.$store.dispatch('contact/actionSetCallId', '');
            this.$store.dispatch('contact/actionSetCallPickupTime', 0);
          } else {
            this.$store.getters.im.rtcManage.joinRoom();
          }
        } else if (config.action && config.action == 'hangup') {
          this.removeDelayCall(config.callId);
          this.stopPhoneRing();
          this.$store.dispatch('layer/actionSetShowing', '');
          this.$store.dispatch('layer/actionSetShowmask', false);
          this.$store.dispatch('contact/actionSetCallInviteInfo', null);
          this.$store.dispatch('contact/actionSetCallId', '');
          this.$store.dispatch('contact/actionSetCallPickupTime', 0);
        } else if (config.action && config.action == 'record') {
          this.removeDelayCall(config.callId);
          this.stopPhoneRing();
          if (fromUid === uid) {
            // current user other device hangup call. just display message and do nothing.
          } else {
            if (callStatus == true) {
              this.$store.state.im.rosterManage.readRosterMessage(fromUid, message.id);
            }
          }
        }
      }
    });
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
  computed: {
    ...mapGetters('content', ['getViewType']),
    ...mapGetters('header', ['getHeaderStatus']),
    mobileShowsChat() {
      if (!this.isMobile) return true;
      if (this.getHeaderStatus === 'contact') {
        return ['rosterinfo', 'groupinfo', 'rosterNotice', 'systemNotice', 'groupInviteNotice', 'grpupApplyNotice'].includes(this.getViewType);
      }
      return !!this.getViewType;
    },
    mobileHidesTopbar() {
      if (!this.isMobile) return false;
      return ['rosterchat', 'groupchat'].includes(this.getViewType);
    },
    desktopNoSidebar() {
      if (this.isMobile) return false;
      return this.getViewType === 'setting' || this.getViewType === 'verification' || this.getHeaderStatus === 'setting' || this.getHeaderStatus === 'about_us';
    }
  },
  methods: {
    handleResize() {
      this.isMobile = window.innerWidth <= 768;
      if (!this.isMobile) {
        this.showGlobalDrawer = false;
      }
    },
    openGlobalDrawer() {
      if (this.isMobile) {
        this.showGlobalDrawer = true;
      }
    },
    closeGlobalDrawer() {
      this.showGlobalDrawer = false;
    },
    selectDrawerTab(tab) {
      this.closeGlobalDrawer();
      if (tab === 'conversation') {
        this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      } else if (tab === 'contact') {
        this.$store.dispatch('header/actionChangeHeaderStatus', 'contact');
        this.$store.dispatch('content/actionSetType', { sid: undefined });
      } else if (tab === 'setting') {
        this.$store.dispatch('header/actionChangeHeaderStatus', 'setting');
        this.$store.dispatch('content/actionSetType', { type: 'setting' });
      } else if (tab === 'about') {
        this.$store.dispatch('header/actionChangeHeaderStatus', 'about_us');
        this.$store.dispatch('content/actionSetType', { type: 'verification' });
      }
    },
    removeDelayCall(callId) {
      if (this.callMap.has(callId)) {
        clearTimeout(this.callMap.get(callId));
        this.callMap.delete(callId);
      }
    },

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
