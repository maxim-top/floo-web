<template>
  <div class="call_panel">
    <div>
      <p v-if="isGetThrough" class="call_time">{{ callTime }}</p>
    </div>
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
      doHangup: false,
      callTime: ''
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
    document.getElementById('roster_remote_only_audio').muted = false;
    this.$store.getters.im.rtcManage.initRTCEngine({
      server: this.$store.state.im.sysManage.getServers(app_id).rtc,
      id: this.$store.state.im.userManage.getUid(),
      caller: this.caller,
      receiver: this.caller ? this.getSid : info.initiator,
      roomId: this.caller ? 0 : info.roomId,
      secret: this.caller ? this.randomString(8) : '',
      callId: this.getCallId,
      pin: this.caller ? this.randomString(8) : info.pin,
      hasVideo: false,
      hasAudio: true,
      getThrough: this.getThrough,
      hangupCall: this.hangupCall,
      getHangUpStatus: this.getHangUpStatus,
      attachStream: this.attachStream
    });
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
    hangupCall(active, timeout = false, peerDrop = false) {
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
            peerDrop: peerDrop,
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
        setInterval(this.calculateDisplayTime, 1000);
      }
    },
    attachStream(stream, type, isLocal = false) {
      if (type === 'audio') {
        let rAudio = document.getElementById('roster_remote_only_audio');
        rAudio.srcObject = stream;
        rAudio.play();
      }
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
