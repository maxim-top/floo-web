<template>
  <div class="login login-card">
    <div class="login_card_header">
      <button @click="changeAppID(appid)" class="login_appid" type="button">
        <span>AppID: {{ appid }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="login_appid_icon">
          <path d="M4 20h4l10-10-4-4L4 16v4z"></path>
          <path d="M13 7l4 4"></path>
        </svg>
      </button>
    </div>
    <div class="logo login_brand">
      <img src="/image/logob.png" alt="LanyingIM" />
    </div>
    <h2 class="login_title">{{ $t('使用蓝莺IM扫码登录') }}</h2>
    <div class="layer_content login_qr_content">
      <canvas class="canvas" ref="canvas"></canvas>
    </div>
    <div class="login_footer_links">
      <button @click="switchLogin('login')" class="login_footer_link" type="button">{{ $t('密码登录') }}</button>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode';

export default {
  data() {
    return {
      timer: undefined,
      qrtimer: undefined,
      qrcode: '',
      expired: 0,
      qrurl: ''
    };
  },
  name: 'QRcodeLogin',
  props: ['sdkok', 'appid'],
  mounted() {
    this.requestLoginQr();
  },

  computed: {
    token() {
      return this.im.userManage.getToken();
    },
    im() {
      return this.$store.state.im;
    }
  },
  methods: {
    changeAppID(presentAppID) {
      this.$store.dispatch('layer/actionSetAppID', presentAppID);
      this.$store.dispatch('layer/actionSetShowing', 'changeappid');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },

    requestLoginQr() {
      this.im.sysManage.asyncQrcode().then((res) => {
        const { qr_code, url, expired } = res;
        this.expired = expired;
        this.qrcode = qr_code;
        this.qrurl = url;
        const info = {
          info: {
            qrcode: qr_code,
            qrcode_app_id: this.appid
          },
          action: 'login',
          source: 'web'
        };
        QRCode.toCanvas(this.$refs.canvas, JSON.stringify(info), { width: 200, margin: 0 }, function (/*err*/) {});
        this.timerLogin();
        this.expTimer();
      });
    },

    timerLogin() {
      const _this = this;
      this.im.sysManage
        .asyncQrlogin({ qr_code: this.qrcode })
        .then((res) => {
          const { password, username } = res;
          if (!password || !username) {
            console.log('QR login not completed yet, continue polling');
            this.timer = setTimeout(function () {
              _this.timerLogin();
            }, 1000);
          } else {
            console.log('QR login completed');
            _this.im.login({ password, name: username });
          }
        })
        .catch(() => {
          this.timer = setTimeout(() => {
            _this.timerLogin();
          }, 2500);
        });
    },
    expTimer() {
      const now = new Date().getTime();
      const _this = this;
      if (this.getShowing === 'qrlogin') {
        if (now > this.expired) {
          console.log('QR code expired, requesting a new one');
          this.clearTimer();
          this.requestLoginQr();
        } else {
          this.qrtimer = setTimeout(function () {
            _this.expTimer();
            console.log('QR code still valid, continue checking');
          }, 1000);
        }
      }

      if (this.getShowing === 'qrgroup') {
        if (now > this.expired) {
          console.log('Group QR code expired, requesting a new one');
          this.clearTimer();
          this.requestGroupQr();
        } else {
          this.qrtimer = setTimeout(function () {
            _this.expTimer();
            console.log('Group QR code still valid, continue checking');
          }, 1000);
        }
      }
    },

    clearTimer() {
      console.log('Clearing QR login timers');
      this.timer && clearTimeout(this.timer);
      this.qrtimer && clearTimeout(this.qrtimer);
    },
    switchLogin(type) {
      this.$store.dispatch('login/actionChangeAppStatus', type);
    }

    //finish
  },
  beforeDestroy() {
    this.clearTimer();
  }
};
</script>

<style scoped></style>
