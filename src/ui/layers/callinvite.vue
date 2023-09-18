<template>
  <div class="call_invite_panel">
    <div class="info">
      <div class="avatar">
        <img :src="userInfo.avatar" class="av" />
      </div>
      <div class="title">
        <p>{{ rosterName }}</p>
        <span v-if="this.getCallInviteInfo.type">您收到一个视频通话请求</span>
        <span v-if="!this.getCallInviteInfo.type">您收到一个语音通话请求</span>
      </div>
    </div>
    <div class="layer">
      <div class="item">
        <button class="button" @click="hangupCall">
          <i :class="['hangup']"></i>
        </button>
      </div>
      <div class="item">
        <button class="button" @click="pickupCall">
          <i :class="['pickup']"></i>
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
    rosterName() {
      return this.userInfo.nick_name || this.userInfo.username;
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
      this.$store.dispatch('setting/actionSetCallStatus', true);
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
      this.$store.dispatch('setting/actionSetCallStatus', false);
    }
  },
  beforeDestroy() {}
};
</script>

<style scoped></style>
