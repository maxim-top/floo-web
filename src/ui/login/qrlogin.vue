<template>
  <div class="login">
    <p class="header">
      <span @click="changeAppID(appid)" class="hint">AppID: {{ appid }}</span>
      <img @click="changeAppID(appid)" class="edit_logo" src="/image/edit.png" />
    </p>
    <div class="layer_content">
      <canvas class="canvas" ref="canvas"></canvas>
    </div>
    <p class="tab">使用「蓝莺IM」App 扫码</p>
    <p class="tab">
      <intput>返回</intput>
      <span @click="switchLogin('login')" class="mr5 colorb">密码登录</span>
    </p>
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
        QRCode.toCanvas(this.$refs.canvas, 'L_' + qr_code, { width: 200, margin: 0 }, function (/*err*/) {});
        this.timerLogin();
        this.expTimer();
      });
    },

    timerLogin() {
      const _this = this;
      this.im.sysManage
        .asyncQrlogin({ qr_code: this.qrcode })
        .then((res) => {
          const { password, user_id } = res;
          if (!password || !user_id) {
            console.log('没登录，继续');
            this.timer = setTimeout(function () {
              _this.timerLogin();
            }, 1000);
          } else {
            console.log('登录了....');
            _this.im.qrlogin({ password, user_id });
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
          console.log('过期，请求新的。。。');
          this.clearTimer();
          this.requestLoginQr();
        } else {
          this.qrtimer = setTimeout(function () {
            _this.expTimer();
            console.log('未过期，会继续检测');
          }, 1000);
        }
      }

      if (this.getShowing === 'qrgroup') {
        if (now > this.expired) {
          console.log('过期，请求新的。。。');
          this.clearTimer();
          this.requestGroupQr();
        } else {
          this.qrtimer = setTimeout(function () {
            _this.expTimer();
            console.log('未过期，会继续检测');
          }, 1000);
        }
      }
    },

    clearTimer() {
      console.log('clear =============....');
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
