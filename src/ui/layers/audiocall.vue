<template>
  <div class="call_panel">
    <div class="info">
      <div class="avatar">
        <img :src="userInfo.avatar" class="av" />
      </div>
      <div>
        <p>{{ rosterName }}</p>
        <p :style="{ display: isGetThrough ? 'none' : 'block' }">正在等待对方接受邀请...</p>
      </div>
    </div>
    <div class="layer">
      <div class="item">
        <button class="button" @click="micChangeStatus">
          <i :class="[mic ? 'mic_on' : 'mic_off']"></i>
        </button>
        <span v-if="mic">麦克风已开</span>
        <span v-if="!mic">麦克风关闭</span>
      </div>
      <div class="item">
        <button class="button" @click="hangupCall(true)">
          <i :class="['hangup']"></i>
        </button>
        <span>挂断</span>
      </div>
      <div class="item">
        <button class="button" @click="speakerChangeStatus">
          <i :class="[speaker ? 'speaker_on' : 'speaker_off']"></i>
        </button>
        <span v-if="speaker">扬声器已开</span>
        <span v-if="!speaker">扬声器关闭</span>
      </div>
    </div>
    <div>
      <audio class="hide" id="roster_remote_only_audio" autoplay playsinline muted />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { toNumber } from '../third/tools';

export default {
  name: 'audiocall',
  data() {
    return {
      userInfo: {},
      mic: true,
      speaker: true,
      hangup: false,
      caller: true,
      isGetThrough: false,
      doHangup: false
    };
  },
  mounted() {
    const app_id = this.$store.state.im.userManage.getAppid();
    const uid = this.$store.state.im.userManage.getUid();
    const rInfo = this.$store.state.im.rosterManage.getRosterInfo(uid);
    const info = this.getCallInviteInfo;
    if (info) {
      this.refreshUserInfo(info.initiator);
      this.$store.getters.im.rtcManage.joinRoom({
        server: this.$store.state.im.sysManage.getServers(app_id).rtc,
        id: this.$store.state.im.userManage.getUid(),
        roomId: info.roomId,
        caller: false,
        pin: info.pin,
        hasVideo: false,
        hasAudio: true,
        remoteAudio: document.getElementById('roster_remote_only_audio'),
        getThrough: this.getThrough,
        hangupCall: this.hangupCall
      });
    } else {
      this.refreshUserInfo(this.getSid);
      this.$store.getters.im.rtcManage.initRTCEngine({
        server: this.$store.state.im.sysManage.getServers(app_id).rtc,
        id: this.$store.state.im.userManage.getUid(),
        name: rInfo.nick_name || rInfo.username,
        receiver: this.getSid,
        caller: true,
        callId: this.getCallId,
        secret: this.randomString(8),
        pin: this.randomString(8),
        hasVideo: false,
        hasAudio: true,
        remoteAudio: document.getElementById('roster_remote_only_audio'),
        getThrough: this.getThrough,
        hangupCall: this.hangupCall
      });
      this.startPhoneRing();
    }
  },
  watch: {
    getSid(newSid) {
      this.refreshUserInfo(newSid);
    }
  },
  computed: {
    ...mapGetters('content', ['getSid']),
    ...mapGetters('contact', ['getCallInviteInfo']),
    ...mapGetters('contact', ['getCallPickupTime']),
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
    micChangeStatus() {
      this.mic = !this.mic;
      console.log('micChangeStatus ' + this.mic);
      this.$store.getters.im.rtcManage.muteLocalAudio(!this.mic);
    },
    speakerChangeStatus() {
      this.speaker = !this.speaker;
    },
    hangupCall(active, timeout) {
      if (active) {
        let pickupTime = this.getCallPickupTime;
        let content = '';
        if (pickupTime) {
          content = (Date.now() - this.getCallPickupTime).toString();
        } else {
          if (timeout) {
            content = 'timeout';
          } else {
            content = 'canceled';
          }
        }
        this.$store.getters.im.rtcManage.sendRTCMessage({
          uid: this.userInfo.user_id,
          content: content,
          config: JSON.stringify({
            action: 'hangup',
            callId: this.getCallId,
            initiator: toNumber(this.getCallId.split('_')[0])
          })
        });
      }
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
      this.$store.dispatch('contact/actionSetCallInviteInfo', null);
      this.$store.dispatch('contact/actionSetCallId', '');
      this.$store.dispatch('contact/actionSetCallPickupTime', 0);
      this.$store.dispatch('setting/actionSetCallStatus', false);
      this.$store.getters.im.rtcManage.leaveRoom();
      this.doHangup = true;
      this.stopPhoneRing();
    },
    getHangUpStatus() {
      return this.doHangup;
    },
    getThrough() {
      this.isGetThrough = true;
      this.$store.getters.im.rtcManage.sendRTCMessage({
        uid: this.userInfo.user_id,
        content: '设备' + this.$store.getters.im.userManage.getDeviceSN() + '接通呼叫',
        config: JSON.stringify({
          action: 'pickup',
          callId: this.getCallId
        })
      });
      this.$store.dispatch('contact/actionSetCallPickupTime', Date.now());
    },
    randomString(len) {
      let charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let randomString = '';
      for (let i = 0; i < len; i++) {
        let randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.charAt(randomPoz);
      }
      return randomString;
    },
    startPhoneRing() {
      const au = document.querySelector('#phone_ring_player');
      au.loop = true;
      au.play();
    },
    stopPhoneRing() {
      const au = document.querySelector('#phone_ring_player');
      au.loop = false;
      au.pause();
    }
  },
  beforeDestroy() {
    if (!this.doHangup) {
      this.hangupCall(false);
    }
    this.$store.getters.im.rtcManage.destroy();
  }
};
</script>

<style scoped>
.closer {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 34px;
  font-weight: bold;
  color: white;
}
</style>
