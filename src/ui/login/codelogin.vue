<template>
  <div class="login">
    <p class="header">
      <span @click="changeAppID(appid)" class="hint">AppID: {{ appid }}</span>
      <img @click="changeAppID(appid)" class="edit_logo" src="/image/edit.png" />
      <img @click="switchLogin('qrlogin')" class="qrcode" src="/image/qr.png" title="扫码登录" />
    </p>
    <div class="logo">
      <img src="/image/logob.png" />
    </div>
    <div class="iptFrame mt21">
      <input @keyup.enter="nameEnter" autocomplete="false" placeholder="手机号" type="text" v-model="user.mobile" />
    </div>

    <div class="cframe mt14">
      <div class="ipframe">
        <input @keyup.enter="submit" autocomplete="false" placeholder="图片验证码" type="text" v-model="user.captcha" />
      </div>
      <img :src="codeImageSrc" @click="timerImage" class="vm ml15 w150 h45 pointer" v-if="codeImageSrc" />
    </div>

    <div class="cframe mt14">
      <div class="ipframe">
        <input @keyup.enter="submit" autocomplete="false" placeholder="手机验证码" type="text" v-model="user.code" />
      </div>
      <div @click="sendSms" class="smallbtn">{{ checkText }}</div>
    </div>

    <div @click="submit" class="loginBtn mt14">登录</div>
    <!-- <div class="log">
      <p v-for="(txt, index) in getLoginLog" :key="index">{{txt}}</p>
    </div> -->
    <p class="tab">
      <span @click="switchLogin('login')" class="mr5 colorb">密码登录</span>
      |
      <span @click="switchLogin('regedit')" class="ml5">注册</span>
    </p>
  </div>
</template>

<script>
// import { mapGetters } from "vuex";

export default {
  name: 'codelogin',
  props: ['sdkok', 'appid'],
  data() {
    return {
      checkCodeTime: 0,
      checkCodeTimer: null,
      user: {
        mobile: '',
        captcha: '',
        code: '',
        checkCodeTime: 0,
        checkCodeTimer: null
      }
    };
  },
  mounted() {
    this.timerImage();
  },

  computed: {
    codeImageSrc() {
      const image_id = this.user['image_captcha_id'];
      if (!image_id) return '';

      const app_id = this.$store.state.im.userManage.getAppid();
      const url = this.$store.state.im.sysManage.getServers(app_id).ratel + '/app/captcha/image';
      return url + '?image_id=' + image_id + '&app_id=' + app_id;
    },
    checkText() {
      if (this.checkCodeTime > 0) {
        return `${this.checkCodeTime} 秒`;
      }
      return '获取验证码';
    }
  },
  methods: {
    changeAppID(presentAppID) {
      this.$store.dispatch('layer/actionSetAppID', presentAppID);
      this.$store.dispatch('layer/actionSetShowing', 'changeappid');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },
    submit() {
      if (!this.user.code || !this.user.mobile) {
        alert('请输入手机号和验证码');
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .asyncUserMobileLogin({
          captcha: this.user.code,
          mobile: this.user.mobile
        })
        .then((res) => {
          if (res.username) {
            im.login({
              name: res.username,
              password: res.password
            });
          } else if (res.sign) {
            this.$store.dispatch('login/actionSetMobileSign', res.sign);
            this.$store.dispatch('login/actionSetSignMobile', this.user.mobile);
            this.$store.dispatch('login/actionChangeAppStatus', 'bindreg');
          }
        });
    },

    switchLogin(type) {
      this.$store.dispatch('login/actionChangeAppStatus', type);
    },
    getImageCode() {
      this.$store.state.im.userManage.asyncCaptchaImagePost().then((res) => {
        const obj = Object.assign({}, this.user, { image_captcha_id: res });
        this.user = obj;
      });
    },
    timerImage() {
      this.imageTimer && clearInterval(this.timerImage);
      this.getImageCode();
      this.imageTimer = setInterval(() => {
        this.getImageCode();
      }, 3 * 60 * 1000);
    },
    sendSms() {
      if (!this.user.mobile) {
        this.$message.error('请输入手机号');
        return;
      }

      this.checkCodeTime = 60;
      this.checkCodeTimer = setInterval(() => {
        this.checkCodeTime -= 1;
        if (this.checkCodeTime == 0) {
          clearInterval(this.checkCodeTimer);
        }
      }, 1000);

      this.$store.state.im.userManage
        .asyncCaptchaSms({
          captcha: this.user.captcha,
          image_id: this.user.image_captcha_id,
          mobile: this.user.mobile
        })
        .then(() => {
          this.checkCodeTime = 60;
          this.checkCodeTimer = setInterval(() => {
            this.checkCodeTime -= 1;
            if (this.checkCodeTime == 0) {
              clearInterval(this.checkCodeTimer);
            }
          }, 1000);
        });
    }
    //
  }
};
</script>

<style scoped></style>
