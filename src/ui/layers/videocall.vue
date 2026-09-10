<template>
  <div :class="['call_video_panel', callStateClass]" @mousemove="handleActivity" @touchstart.passive="handleActivity">
    <video v-show="remoteVideoElementVisible" id="remote-video" ref="remoteVideo" autoplay playsinline class="call_video_remote"></video>
    <div v-show="!remoteVideoVisible" :class="['call_video_remote_placeholder', { 'is-camera-closed': peerCameraClose }]">
      <div v-if="peerCameraClose" class="call_video_remote_backdrop" :style="remoteAvatarStyle"></div>
      <div class="call_video_remote_identity">
        <div v-if="peerCameraClose" class="call_video_remote_avatar_shell">
          <img :src="remoteAvatar" class="call_video_remote_avatar" />
        </div>
        <div class="call_video_remote_name">{{ rosterName }}</div>
        <div v-if="!isGetThrough" class="call_video_remote_dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div v-else class="call_video_remote_subtitle">
          {{ remotePlaceholderStatusText }}
        </div>
      </div>
    </div>
    <video v-show="camera" id="local-video" ref="localVideo" autoplay playsinline muted class="call_video_local"></video>
    <div v-show="!camera" class="call_video_local_placeholder">
      <img :src="localAvatar" class="call_video_local_avatar" />
    </div>
    <audio ref="remoteAudio" id="video-call-remote-audio" class="hide" autoplay playsinline></audio>

    <div class="call_video_scrim"></div>
    <div class="call_video_status">
      <template v-if="remoteVideoVisible">
        <div class="call_video_name">{{ rosterName }}</div>
        <div class="call_video_state">{{ statusText }}</div>
      </template>
      <div v-if="isGetThrough" class="call_video_timer">{{ callTime }}</div>
    </div>

    <div :class="['call_video_controls', { 'is-visible': controlsVisible }]">
      <button
        class="call_action_button call_control_button"
        type="button"
        @click="micChangeStatus"
        :disabled="micToggleCoolingDown"
        :aria-label="mic ? $t('关闭麦克风') : $t('打开麦克风')"
      >
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
      <button
        class="call_action_button call_control_button"
        type="button"
        @click="cameraChangeStatus"
        :disabled="cameraToggleCoolingDown"
        :aria-label="camera ? $t('关闭摄像头') : $t('打开摄像头')"
      >
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
import {
  getStoredVideoProfileKey,
  findVideoProfileOption,
  adaptiveVideoEnabled,
  getStartupVideoProfileOption,
  getHigherVideoProfileOption,
  getLowerVideoProfileOption
} from '../third/rtcVideoProfiles';

const ADAPTIVE_RECOVERY_MS = 15000;
const REMOTE_VIDEO_FRAME_STALL_MS = 1500;
const REMOTE_VIDEO_FRAME_POLL_MS = 300;
const MEDIA_TOGGLE_COOLDOWN_MS = 800;

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
      peerVideoActive: false,
      peerVideoFlowing: false,
      callTime: '',
      timerRef: null,
      controlsVisible: true,
      controlsTimer: null,
      videoProfileKey: '',
      adaptiveResolutionEnabled: true,
      runtimeProfileKey: '',
      adaptiveRecoveryTimer: null,
      micToggleCoolingDown: false,
      cameraToggleCoolingDown: false,
      micToggleCooldownTimer: null,
      cameraToggleCooldownTimer: null,
      remoteVideoMonitorVersion: 0,
      remoteVideoFrameCallbackId: null,
      remoteVideoFramePollTimer: null,
      remoteVideoFrameStallTimer: null,
      remoteVideoLastCurrentTime: 0
    };
  },
  mounted() {
    this.videoProfileKey = getStoredVideoProfileKey();
    this.adaptiveResolutionEnabled = adaptiveVideoEnabled();
    const startupResolution = getStartupVideoProfileOption(this.videoProfileKey);
    this.runtimeProfileKey = startupResolution.key;
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
      width: startupResolution.width,
      height: startupResolution.height,
      getThrough: this.getThrough,
      hangupCall: this.hangupCall,
      getHangUpStatus: this.getHangUpStatus,
      attachStream: this.attachStream,
      updateTrackState: this.updateTrackState,
      onSlowLink: this.handleSlowLink
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
    ...mapGetters('header', ['getUserProfile']),
    callStateClass() {
      return this.isGetThrough ? 'is-connected' : 'is-calling';
    },
    currentResolutionOption() {
      const option = findVideoProfileOption(this.videoProfileKey);
      return {
        ...option,
        label: this.$t(option.labelKey)
      };
    },
    remoteVideoVisible() {
      return this.isGetThrough && this.peerVideoFlowing && !this.peerCameraClose;
    },
    remoteVideoElementVisible() {
      return this.isGetThrough && !this.peerCameraClose && (this.peerVideoActive || this.peerVideoFlowing);
    },
    remoteAvatar() {
      return this.userInfo.avatar || this.defaultAvatar();
    },
    localAvatar() {
      const profile = this.getUserProfile || {};
      return this.$store.getters.im.sysManage.getImage({
        avatar: profile.avatar,
        type: 'roster'
      });
    },
    remoteAvatarStyle() {
      return {
        backgroundImage: `url(${this.remoteAvatar})`
      };
    },
    runtimeResolutionOption() {
      const option = findVideoProfileOption(this.runtimeProfileKey || this.videoProfileKey);
      return {
        ...option,
        label: this.$t(option.labelKey)
      };
    },
    rosterName() {
      return this.userInfo.alias || this.userInfo.nick_name || this.userInfo.username || this.userInfo.user_id;
    },
    statusText() {
      if (this.isGetThrough) {
        return this.$t('视频通话已接通');
      }
      return this.caller ? this.$t('正在呼叫...') : this.$t('正在连接视频通话...');
    },
    remotePlaceholderStatusText() {
      if (!this.isGetThrough) {
        return this.statusText;
      }
      if (this.peerCameraClose) {
        return this.$t('对方已关闭摄像头');
      }
      return this.$t('视频连接中...');
    }
  },
  methods: {
    defaultAvatar() {
      return this.$store.getters.im.sysManage.getImage({
        avatar: '',
        type: 'roster'
      });
    },
    getActiveResolutionOption() {
      if (this.adaptiveResolutionEnabled) {
        return findVideoProfileOption(this.runtimeProfileKey || this.videoProfileKey);
      }
      return findVideoProfileOption(this.videoProfileKey);
    },
    syncRuntimeProfile(profileKey) {
      this.runtimeProfileKey = profileKey;
      if (!this.adaptiveResolutionEnabled) {
        return;
      }
      if (this.adaptiveRecoveryTimer) {
        clearTimeout(this.adaptiveRecoveryTimer);
      }
      this.adaptiveRecoveryTimer = window.setTimeout(() => {
        this.tryRecoverAdaptiveResolution();
      }, ADAPTIVE_RECOVERY_MS);
    },
    tryRecoverAdaptiveResolution() {
      if (!this.adaptiveResolutionEnabled || !this.isGetThrough || !this.camera) {
        return;
      }
      const nextOption = getHigherVideoProfileOption(this.runtimeProfileKey || this.videoProfileKey);
      if (nextOption.key === this.runtimeProfileKey) {
        return;
      }
      this.runtimeProfileKey = nextOption.key;
      this.startLocalRender(true);
      this.$store.getters.im.rtcManage.updateVideoProfile(nextOption.width, nextOption.height);
      this.syncRuntimeProfile(nextOption.key);
    },
    handleSlowLink({ uplink }) {
      if (!this.adaptiveResolutionEnabled || !uplink || !this.isGetThrough || !this.camera) {
        return;
      }
      const currentKey = this.runtimeProfileKey || this.videoProfileKey;
      const nextOption = getLowerVideoProfileOption(currentKey);
      if (nextOption.key === currentKey) {
        this.syncRuntimeProfile(currentKey);
        return;
      }
      this.runtimeProfileKey = nextOption.key;
      this.startLocalRender(true);
      this.$store.getters.im.rtcManage.updateVideoProfile(nextOption.width, nextOption.height);
      this.syncRuntimeProfile(nextOption.key);
    },
    refreshUserInfo(newSid) {
      this.$store.getters.im.rosterManage.asyncSearchRosterById({ user_id: newSid }).then((res) => {
        res.avatar = this.$store.getters.im.sysManage.getImage({
          avatar: res.avatar,
          type: 'roster'
        });
        this.userInfo = res;
      });
    },
    startMediaToggleCooldown(toggleType) {
      const timerKey = toggleType + 'ToggleCooldownTimer';
      const flagKey = toggleType + 'ToggleCoolingDown';
      if (this[timerKey]) {
        clearTimeout(this[timerKey]);
      }
      this[flagKey] = true;
      this[timerKey] = window.setTimeout(() => {
        this[flagKey] = false;
        this[timerKey] = null;
      }, MEDIA_TOGGLE_COOLDOWN_MS);
    },
    micChangeStatus() {
      if (!this.isGetThrough || this.micToggleCoolingDown) {
        return;
      }
      this.startMediaToggleCooldown('mic');
      this.mic = !this.mic;
      this.$store.getters.im.rtcManage.muteLocalAudio(!this.mic);
    },
    speakerChangeStatus() {
      if (this.isGetThrough) {
        this.speaker = !this.speaker;
      }
    },
    cameraChangeStatus() {
      if (!this.isGetThrough || this.cameraToggleCoolingDown) {
        return;
      }
      this.startMediaToggleCooldown('camera');
      const activeResolution = this.getActiveResolutionOption();
      this.camera = !this.camera;
      if (this.camera) {
        this.startLocalRender(true);
        if (this.adaptiveResolutionEnabled) {
          this.syncRuntimeProfile(this.runtimeProfileKey || this.videoProfileKey);
        }
      } else {
        this.stopPreviewStream();
      }
      this.$store.getters.im.rtcManage.setLocalVideoEnabled(this.camera, activeResolution.width, activeResolution.height);
    },
    startLocalRender(forceRestart = false) {
      if (!this.camera || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        return;
      }
      const lVideo = this.$refs.localVideo;
      if (!lVideo) {
        return;
      }
      if (!forceRestart && lVideo.srcObject && lVideo.srcObject !== this.previewStream) {
        return;
      }
      if (forceRestart) {
        this.stopPreviewStream();
      }
      const { width, height } = this.getActiveResolutionOption();
      navigator.mediaDevices
        .getUserMedia({ audio: false, video: { width, height } })
        .then((stream) => {
          this.stopPreviewStream();
          this.previewStream = stream;
          lVideo.srcObject = stream;
          lVideo.play().catch(() => {});
        })
        .catch(() => {});
    },
    stopPreviewStream() {
      const previewStream = this.previewStream;
      if (this.previewStream) {
        this.stopTracks(this.previewStream);
        this.previewStream = null;
      }
      const lVideo = this.$refs.localVideo;
      if (lVideo && lVideo.srcObject === previewStream) {
        lVideo.srcObject = null;
      }
    },
    markRemoteVideoFrameFlow() {
      if (this.peerCameraClose) {
        return;
      }
      this.peerVideoFlowing = true;
      if (this.remoteVideoFrameStallTimer) {
        clearTimeout(this.remoteVideoFrameStallTimer);
      }
      this.remoteVideoFrameStallTimer = window.setTimeout(() => {
        this.peerVideoFlowing = false;
      }, REMOTE_VIDEO_FRAME_STALL_MS);
    },
    stopRemoteVideoMonitor(resetFlow = true) {
      this.remoteVideoMonitorVersion += 1;
      const rVideo = this.$refs.remoteVideo;
      if (rVideo && this.remoteVideoFrameCallbackId != null && typeof rVideo.cancelVideoFrameCallback === 'function') {
        try {
          rVideo.cancelVideoFrameCallback(this.remoteVideoFrameCallbackId);
        } catch (e) {
          // The callback may already have been released with the video element.
        }
      }
      this.remoteVideoFrameCallbackId = null;
      if (this.remoteVideoFramePollTimer) {
        clearInterval(this.remoteVideoFramePollTimer);
        this.remoteVideoFramePollTimer = null;
      }
      if (this.remoteVideoFrameStallTimer) {
        clearTimeout(this.remoteVideoFrameStallTimer);
        this.remoteVideoFrameStallTimer = null;
      }
      this.remoteVideoLastCurrentTime = 0;
      if (resetFlow) {
        this.peerVideoFlowing = false;
      }
    },
    startRemoteVideoMonitor() {
      const rVideo = this.$refs.remoteVideo;
      if (!rVideo) {
        return;
      }
      this.stopRemoteVideoMonitor(false);
      const monitorVersion = this.remoteVideoMonitorVersion;
      const pollFrame = () => {
        if (monitorVersion !== this.remoteVideoMonitorVersion) {
          return;
        }
        const currentVideo = this.$refs.remoteVideo;
        if (!currentVideo || currentVideo.readyState < 2 || currentVideo.paused || currentVideo.ended) {
          return;
        }
        if (currentVideo.currentTime !== this.remoteVideoLastCurrentTime) {
          this.remoteVideoLastCurrentTime = currentVideo.currentTime;
          this.markRemoteVideoFrameFlow();
        }
      };
      if (typeof rVideo.requestVideoFrameCallback === 'function') {
        const onFrame = () => {
          if (monitorVersion !== this.remoteVideoMonitorVersion) {
            return;
          }
          this.markRemoteVideoFrameFlow();
          this.remoteVideoFrameCallbackId = rVideo.requestVideoFrameCallback(onFrame);
        };
        this.remoteVideoFrameCallbackId = rVideo.requestVideoFrameCallback(onFrame);
      }
      this.remoteVideoFramePollTimer = window.setInterval(pollFrame, REMOTE_VIDEO_FRAME_POLL_MS);
    },
    clearRemoteVideo() {
      this.stopRemoteVideoMonitor();
      const rVideo = this.$refs.remoteVideo;
      if (rVideo) {
        rVideo.srcObject = null;
      }
    },
    cleanupMediaElements() {
      this.stopPreviewStream();
      this.clearRemoteVideo();
      const lVideo = this.$refs.localVideo;
      if (lVideo) {
        if (lVideo.srcObject) {
          this.stopTracks(lVideo.srcObject);
        }
        lVideo.srcObject = null;
      }
      const rAudio = this.$refs.remoteAudio;
      if (rAudio) {
        if (rAudio.srcObject) {
          this.stopTracks(rAudio.srcObject);
        }
        rAudio.srcObject = null;
      }
    },
    updateTrackState({ type, isLocal, active, cameraClosed = null }) {
      if (type !== 'video') {
        return;
      }
      if (isLocal) {
        if (active && this.previewStream) {
          this.stopPreviewStream();
        }
      } else {
        this.peerVideoActive = active;
        if (cameraClosed === true) {
          this.peerCameraClose = true;
          this.peerVideoFlowing = false;
          this.clearRemoteVideo();
          return;
        }
        if (active) {
          this.peerCameraClose = false;
        } else {
          if (cameraClosed === false) {
            this.peerCameraClose = false;
          }
          this.peerVideoFlowing = false;
        }
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
      this.doHangup = true;
      this.cleanupMediaElements();
      this.$store.getters.im.rtcManage.leaveRoom();
      this.$store.getters.im.rtcManage.destroy();
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
        if (this.adaptiveResolutionEnabled) {
          this.syncRuntimeProfile(this.runtimeProfileKey || this.videoProfileKey);
        }
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
        if (rAudio) {
          rAudio.srcObject = stream;
          rAudio.play().catch(() => {});
        }
      } else if (type === 'video') {
        if (isLocal) {
          let lVideo = this.$refs.localVideo;
          if (lVideo.srcObject && lVideo.srcObject !== this.previewStream) {
            this.stopTracks(lVideo.srcObject);
          }
          this.stopPreviewStream();
          lVideo.srcObject = stream;
          lVideo.play().catch(() => {});
        } else {
          let rVideo = this.$refs.remoteVideo;
          this.peerVideoActive = true;
          this.peerCameraClose = false;
          this.peerVideoFlowing = false;
          if (rVideo) {
            rVideo.srcObject = stream;
            this.startRemoteVideoMonitor();
            rVideo.play().catch(() => {});
          }
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
    if (this.adaptiveRecoveryTimer) {
      clearTimeout(this.adaptiveRecoveryTimer);
      this.adaptiveRecoveryTimer = null;
    }
    if (this.micToggleCooldownTimer) {
      clearTimeout(this.micToggleCooldownTimer);
      this.micToggleCooldownTimer = null;
    }
    if (this.cameraToggleCooldownTimer) {
      clearTimeout(this.cameraToggleCooldownTimer);
      this.cameraToggleCooldownTimer = null;
    }
    this.stopRemoteVideoMonitor();
    this.cleanupMediaElements();
    if (!this.doHangup) {
      this.hangupCall(false);
    }
  }
};
</script>

<style scoped></style>
