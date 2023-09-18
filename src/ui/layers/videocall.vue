<template>
  <div class="call_panel">
    <div>
      <p v-if="isGetThrough" class="call_time">{{ callTime }}</p>
    </div>
    <div class="info" :style="{ 'z-index': isGetThrough ? '4' : '6' }">
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
        <span v-if="mic" class="display_info">麦克风已开</span>
        <span v-if="!mic" class="display_info">麦克风关闭</span>
      </div>
      <div class="item">
        <button class="button" @click="speakerChangeStatus">
          <i :class="[speaker ? 'speaker_on' : 'speaker_off']"></i>
        </button>
        <span v-if="speaker" class="display_info">扬声器已开</span>
        <span v-if="!speaker" class="display_info">扬声器关闭</span>
      </div>
      <div class="item">
        <button class="button" @click="cameraChangeStatus">
          <i :class="[camera ? 'camera_on' : 'camera_off']"></i>
        </button>
        <span v-if="camera" class="display_info">摄像头已开</span>
        <span v-if="!camera" class="display_info">摄像头关闭</span>
      </div>
    </div>
    <div>
      <span v-if="caller" class="caller_layer">
        <button class="button" @click="hangupCall(true)">
          <i :class="['hangup']"></i>
        </button>
      </span>
    </div>
    <div>
      <video class="panel_remote" id="roster_remote_video" width="100%" height="100%" autoplay playsinline muted />
      <audio class="hide" id="roster_remote_audio" autoplay playsinline muted />
    </div>
    <div>
      <video class="panel_local" id="roster_local_video" width="100%" autoplay playsinline muted />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { toNumber } from '../third/tools';

export default {
  name: 'videocall',
  data() {
    return {
      userInfo: {},
      mic: true,
      speaker: true,
      camera: true,
      hangup: false,
      caller: true,
      isGetThrough: false,
      doHangup: false,
      callTime: ''
    };
  },
  mounted() {
    const app_id = this.$store.state.im.userManage.getAppid();
    const uid = this.$store.getters.im.userManage.getUid();
    const rInfo = this.$store.getters.im.rosterManage.getRosterInfo(uid);
    const info = this.getCallInviteInfo;
    if (info) {
      this.refreshUserInfo(info.initiator);
      this.$store.getters.im.rtcManage.joinRoom({
        server: this.$store.state.im.sysManage.getServers(app_id).rtc,
        id: this.$store.state.im.userManage.getUid(),
        roomId: info.roomId,
        caller: false,
        pin: info.pin,
        hasVideo: true,
        hasAudio: true,
        width: 360,
        height: 640,
        localVideo: document.getElementById('roster_local_video'),
        remoteVideo: document.getElementById('roster_remote_video'),
        remoteAudio: document.getElementById('roster_remote_audio'),
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
        hasVideo: true,
        hasAudio: true,
        width: 360,
        height: 640,
        localVideo: document.getElementById('roster_local_video'),
        remoteVideo: document.getElementById('roster_remote_video'),
        remoteAudio: document.getElementById('roster_remote_audio'),
        getThrough: this.getThrough,
        hangupCall: this.hangupCall
      });
      this.startPhoneRing();
    }
    document.getElementById('roster_remote_audio').muted = false;
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
      this.$store.getters.im.rtcManage.muteLocalAudio(!this.mic);
    },
    speakerChangeStatus() {
      this.speaker = !this.speaker;
    },
    cameraChangeStatus() {
      this.camera = !this.camera;
      this.$store.getters.im.rtcManage.muteLocalVideo(!this.camera);
    },
    hangupCall(active, timeout) {
      if (active) {
        let pickupTime = this.getCallPickupTime;
        let content = '';
        let pushlocKey = 'call_duration';
        let callTime = [0, 0];
        if (pickupTime) {
          content = (Date.now() - this.getCallPickupTime).toString();
          let intervalMsec = parseInt(content);
          let intervalSec = intervalMsec / 1000;
          callTime[0] = parseInt(intervalSec / 60);
          callTime[1] = parseInt(intervalSec - callTime[0] * 60);
        } else {
          if (timeout) {
            content = 'timeout';
            pushlocKey = 'callee_not_responding';
          } else {
            content = 'canceled';
            pushlocKey = 'call_canceled_by_caller';
          }
        }
        this.$store.getters.im.rtcManage.sendRTCMessage({
          uid: this.userInfo.user_id,
          content: content,
          config: JSON.stringify({
            action: 'hangup',
            callId: this.getCallId,
            initiator: toNumber(this.getCallId.split('_')[0]),
            pushMessageLocKey: pushlocKey,
            pushMessageLocArgs: callTime
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
    calculateDisplayTime() {
      let intervalMsec = Date.now() - this.getCallPickupTime;
      let intervalSec = intervalMsec / 1000;
      let day = parseInt(intervalSec / 3600 / 24);
      let hour = parseInt((intervalSec - day * 24 * 3600) / 3600);
      let min = parseInt((intervalSec - day * 24 * 3600 - hour * 3600) / 60);
      let sec = parseInt(intervalSec - day * 24 * 3600 - hour * 3600 - min * 60);
      this.callTime =
        (hour > 0 ? hour.toString() : '00') +
        ':' +
        (min >= 10 ? min.toString() : min > 0 ? '0' + min.toString() : '00') +
        ':' +
        (sec >= 10 ? sec.toString() : sec > 0 ? '0' + sec.toString() : '00');
    },
    getThrough() {
      this.isGetThrough = true;
      this.$store.getters.im.rtcManage.sendRTCMessage({
        uid: this.userInfo.user_id,
        content: '',
        config: JSON.stringify({
          action: 'pickup',
          callId: this.getCallId
        })
      });
      this.$store.dispatch('contact/actionSetCallPickupTime', Date.now());
      this.stopPhoneRing();
      setInterval(this.calculateDisplayTime, 1000);
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
      if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') == -1) {
        this.$store.dispatch('header/actionChangeSupportSafariAudio', true);
      }
    },
    stopPhoneRing() {
      const au = document.querySelector('#phone_ring_player');
      au.loop = false;
      au.pause();
      if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') == -1) {
        this.$store.dispatch('header/actionChangeSupportSafariAudio', true);
      }
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
