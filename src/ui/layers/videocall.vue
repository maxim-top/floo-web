<template>
  <div :class="['call_video_panel', callStateClass]" @mousemove="handleActivity" @touchstart.passive="handleActivity">
    <video id="remote-video" ref="remoteVideo" autoplay playsinline class="call_video_remote"></video>
    <video id="local-video" ref="localVideo" autoplay playsinline muted class="call_video_local"></video>
    <audio ref="remoteAudio" id="video-call-remote-audio" class="hide" autoplay playsinline></audio>

    <div class="call_video_scrim"></div>
    <div class="call_video_status">
      <div class="call_video_name">{{ rosterName }}</div>
      <div class="call_video_state">{{ statusText }}</div>
      <div v-if="isGetThrough" class="call_video_timer">{{ callTime }}</div>
      <div v-if="peerCameraClose && isGetThrough" class="call_video_peer_notice">{{ $t('对方已关闭摄像头') }}</div>
    </div>

    <div :class="['call_video_controls', { 'is-visible': controlsVisible }]">
      <button class="call_action_button call_control_button" type="button" @click="micChangeStatus" :aria-label="mic ? $t('关闭麦克风') : $t('打开麦克风')">
        <svg v-if="mic" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="4" width="6" height="10" rx="3"></rect>
          <path d="M6 11a6 6 0 0 0 12 0"></path>
          <path d="M12 17v3"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="4" width="6" height="10" rx="3"></rect>
          <path d="M6 11a6 6 0 0 0 12 0"></path>
          <path d="M12 17v3"></path>
          <path d="M5 5l14 14"></path>
        </svg>
      </button>
      <button class="call_action_button call_control_button" type="button" @click="speakerChangeStatus" :aria-label="speaker ? $t('关闭扬声器') : $t('打开扬声器')">
        <svg v-if="speaker" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 14h4l5 4V6L9 10H5z"></path>
          <path d="M17 9a4 4 0 0 1 0 6"></path>
          <path d="M18.8 6.5a7 7 0 0 1 0 11"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 14h4l5 4V6L9 10H5z"></path>
          <path d="M17 9a4 4 0 0 1 0 6"></path>
          <path d="M5 5l14 14"></path>
        </svg>
      </button>
      <button class="call_action_button call_control_button" type="button" @click="cameraChangeStatus" :aria-label="camera ? $t('关闭摄像头') : $t('打开摄像头')">
        <svg v-if="camera" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="7" width="11" height="10" rx="2"></rect>
          <path d="M14 10.5l5-3v9l-5-3z"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="7" width="11" height="10" rx="2"></rect>
          <path d="M14 10.5l5-3v9l-5-3z"></path>
          <path d="M4 5l16 14"></path>
        </svg>
      </button>
      <button class="call_action_button is-decline" type="button" @click="hangupCall(true)" :aria-label="$t('结束通话')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.2 14.2c1.9-1.7 4.2-2.6 6.8-2.6s4.9.9 6.8 2.6l-1.9 2.1c-1.4-1.2-3.1-1.9-4.9-1.9s-3.5.7-4.9 1.9z"></path>
          <path d="M8.2 14.5l-2.3 3.1"></path>
          <path d="M15.8 14.5l2.3 3.1"></path>
        </svg>
      </button>
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
      peerCameraClose: false,
      hangup: false,
      caller: true,
      isGetThrough: false,
      doHangup: false,
      callTime: '',
      timerRef: null,
      controlsVisible: true,
      controlsTimer: null
    };
  },
  mounted() {
    const app_id = this.$store.state.im.userManage.getAppid();
    const info = this.getCallInviteInfo;
    if (info) {
      this.caller = false;
      this.refreshUserInfo(info.initiator);
    } else {
      this.caller = true;
      this.refreshUserInfo(this.getSid);
      this.startPhoneRing();
    }
    if (this.$refs.remoteAudio) {
      this.$refs.remoteAudio.muted = false;
    }
    this.$store.getters.im.rtcManage.initRTCEngine({
      server: this.$store.state.im.sysManage.getServers(app_id).rtc,
      id: this.$store.state.im.userManage.getUid(),
      caller: this.caller,
      receiver: this.caller ? this.getSid : info.initiator,
      roomId: this.caller ? 0 : info.roomId,
      secret: this.caller ? this.randomString(8) : '',
      callId: this.getCallId,
      pin: this.caller ? this.randomString(8) : info.pin,
      hasVideo: true,
      hasAudio: true,
      width: 360,
      height: 640,
      getThrough: this.getThrough,
      hangupCall: this.hangupCall,
      getHangUpStatus: this.getHangUpStatus,
      attachStream: this.attachStream
    });

    this.$store.getters.im.on('onRosterRTCMessage', (message) => {
      const { ext, isHistory } = message;
      const callStatus = this.$store.state.im.rtcManage.getInCallStatus();
      if (!isHistory && callStatus && ext && message.from != this.$store.state.im.userManage.getUid()) {
        let sext = {};
        try {
          sext = JSON.parse(ext);
        } catch (ex) {
          //
        }
        if (sext && sext.callId === this.getCallId && Object.prototype.hasOwnProperty.call(sext, 'mute_video')) {
          this.peerCameraClose = sext.mute_video;
        }
      }
    });

    this.startLocalRender();
    this.handleActivity();
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
    callStateClass() {
      return this.isGetThrough ? 'is-connected' : 'is-calling';
    },
    rosterName() {
      return this.userInfo.alias || this.userInfo.nick_name || this.userInfo.username || this.userInfo.user_id;
    },
    statusText() {
      if (this.isGetThrough) {
        return this.$t('视频通话已接通');
      }
      return this.caller ? this.$t('正在呼叫...') : this.$t('正在连接视频通话...');
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
      if (this.isGetThrough) {
        this.mic = !this.mic;
        this.$store.getters.im.rtcManage.muteLocalAudio(!this.mic);
      }
    },
    speakerChangeStatus() {
      if (this.isGetThrough) {
        this.speaker = !this.speaker;
      }
    },
    cameraChangeStatus() {
      if (this.isGetThrough) {
        this.camera = !this.camera;
        this.$store.getters.im.rtcManage.muteLocalVideo(!this.camera);
        this.$store.getters.im.rtcManage.sendRTCMessage({
          uid: this.userInfo.user_id,
          content: '',
          ext: JSON.stringify({
            callId: this.getCallId,
            mute_video: !this.camera
          })
        });
      }
    },
    startLocalRender() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: false, video: { width: 360, height: 640 } })
          .then((stream) => {
            let lVideo = this.$refs.localVideo;
            lVideo.srcObject = stream;
            lVideo.play().catch(() => {});
          })
          .catch(() => {});
      }
    },
    hangupCall(active, timeout = false, peerDrop = false) {
      if (active) {
        let pickupTime = this.getCallPickupTime;
        let content = '';
        let pushlocKey = 'call_duration';
        let callArgs = [0, 0];
        if (pickupTime) {
          content = (Date.now() - this.getCallPickupTime).toString();
          let intervalMsec = parseInt(content);
          let intervalSec = intervalMsec / 1000;
          callArgs[0] = parseInt(intervalSec / 60);
          callArgs[1] = parseInt(intervalSec - callArgs[0] * 60);
        } else if (timeout) {
          content = 'timeout';
          pushlocKey = 'callee_not_responding';
        } else {
          content = 'canceled';
          pushlocKey = 'call_canceled_by_caller';
        }
        this.$store.getters.im.rtcManage.sendRTCMessage({
          uid: this.userInfo.user_id,
          content: content,
          config: JSON.stringify({
            action: 'hangup',
            callId: this.getCallId,
            initiator: toNumber(this.getCallId.split('_')[0]),
            peerDrop: peerDrop,
            pushMessageLocKey: pushlocKey,
            pushMessageLocArgs: callArgs
          })
        });
      }
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
      this.$store.dispatch('contact/actionSetCallInviteInfo', null);
      this.$store.dispatch('contact/actionSetCallId', '');
      this.$store.dispatch('contact/actionSetCallPickupTime', 0);
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
      if (!this.isGetThrough) {
        this.isGetThrough = true;
        this.$store.dispatch('contact/actionSetCallPickupTime', Date.now());
        this.stopPhoneRing();
        this.calculateDisplayTime();
        this.timerRef = window.setInterval(this.calculateDisplayTime, 1000);
      }
    },
    stopTracks(stream) {
      if (stream) {
        let tracks = stream.getTracks();
        for (let mst of tracks) {
          if (mst && mst.dontStop !== true) {
            mst.stop();
          }
        }
      }
    },
    attachStream(stream, type, isLocal = false) {
      if (type === 'audio') {
        let rAudio = this.$refs.remoteAudio;
        rAudio.srcObject = stream;
        rAudio.play().catch(() => {});
      } else if (type === 'video') {
        if (isLocal) {
          let lVideo = this.$refs.localVideo;
          this.stopTracks(lVideo.srcObject);
          lVideo.srcObject = stream;
          lVideo.play().catch(() => {});
        } else {
          let rVideo = this.$refs.remoteVideo;
          rVideo.srcObject = stream;
          rVideo.play().catch(() => {});
        }
      }
    },
    handleActivity() {
      this.controlsVisible = true;
      if (this.controlsTimer) {
        clearTimeout(this.controlsTimer);
      }
      this.controlsTimer = window.setTimeout(() => {
        this.controlsVisible = false;
      }, 3000);
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
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer);
      this.controlsTimer = null;
    }
    if (!this.doHangup) {
      this.hangupCall(false);
    }
    this.$store.getters.im.rtcManage.destroy();
  }
};
</script>

<style scoped></style>
