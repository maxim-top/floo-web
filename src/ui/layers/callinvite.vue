<template>
  <div class="call_invite_overlay is-ringing">
    <div class="call_invite_card">
      <div class="call_invite_avatar_wrap">
        <div class="call_invite_avatar_ring" aria-hidden="true"></div>
        <img :src="userInfo.avatar" class="call_invite_avatar" />
      </div>
      <div class="call_invite_name">{{ rosterName }}</div>
      <div class="call_invite_state">{{ inviteStateText }}</div>
      <div class="call_invite_actions">
        <button class="call_action_button is-decline" type="button" @click="hangupCall" :aria-label="$t('拒绝通话')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5.2 14.2c1.9-1.7 4.2-2.6 6.8-2.6s4.9.9 6.8 2.6l-1.9 2.1c-1.4-1.2-3.1-1.9-4.9-1.9s-3.5.7-4.9 1.9z"></path>
            <path d="M8.2 14.5l-2.3 3.1"></path>
            <path d="M15.8 14.5l2.3 3.1"></path>
          </svg>
        </button>
        <button class="call_action_button is-accept" type="button" @click="pickupCall" :aria-label="this.getCallInviteInfo.type ? $t('接受视频通话') : $t('接受语音通话')">
          <svg v-if="this.getCallInviteInfo.type" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="7" width="11" height="10" rx="2"></rect>
            <path d="M14 10.5l5-3v9l-5-3z"></path>
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5.2 14.2c1.9-1.7 4.2-2.6 6.8-2.6s4.9.9 6.8 2.6"></path>
            <path d="M7.2 12.8l1.6 4.3"></path>
            <path d="M16.8 12.8l-1.6 4.3"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { toNumber } from '../third/tools';

export default {
  name: 'callinvite',
  data() {
    return {
      userInfo: {}
    };
  },
  mounted() {
    const info = this.getCallInviteInfo;
    if (info && info.initiator) {
      this.refreshUserInfo(info.initiator);
    }
  },
  watch: {
    getCallInviteInfo(info) {
      if (info && info.initiator) {
        this.refreshUserInfo(info.initiator);
      }
    }
  },
  computed: {
    ...mapGetters('contact', ['getCallInviteInfo']),
    ...mapGetters('contact', ['getCallId']),
    inviteStateText() {
      return this.getCallInviteInfo.type ? this.$t('收到视频通话邀请...') : this.$t('收到语音通话邀请...');
    },
    rosterName() {
      return this.userInfo.alias || this.userInfo.nick_name || this.userInfo.username || this.userInfo.user_id;
    }
  },
  methods: {
    refreshUserInfo(newSid) {
      this.$store.getters.im.rosterManage.asyncSearchRosterById({ user_id: newSid }).then((res) => {
        res.avatar = this.$store.getters.im.sysManage.getImage({
          avatar: res.avatar,
          type: 'roster'
        });
        this.userInfo = res;
      });
    },
    stopPhoneRing() {
      const au = document.querySelector('#phone_ring_player');
      au.loop = false;
      au.pause();
      if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') == -1) {
        this.$store.dispatch('header/actionChangeSupportSafariAudio', true);
      }
    },
    pickupCall() {
      this.stopPhoneRing();
      if (this.getCallInviteInfo.type) {
        this.$store.dispatch('layer/actionSetShowing', 'videocall');
      } else {
        this.$store.dispatch('layer/actionSetShowing', 'audiocall');
      }
    },
    hangupCall() {
      this.$store.getters.im.rtcManage.sendRTCMessage({
        uid: this.userInfo.user_id,
        content: 'rejected',
        config: JSON.stringify({
          action: 'hangup',
          callId: this.getCallId,
          initiator: toNumber(this.getCallId.split('_')[0]),
          pushMessageLocKey: 'call_rejected_by_callee'
        })
      });
      this.stopPhoneRing();
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
      this.$store.dispatch('contact/actionSetCallInviteInfo', null);
      this.$store.dispatch('contact/actionSetCallId', '');
      this.$store.dispatch('contact/actionSetCallPickupTime', 0);
    }
  },
  beforeDestroy() {}
};
</script>

<style scoped></style>
