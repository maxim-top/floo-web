<template>
  <div class="link_login" @click.self="closePop">
    <div class="layer link_layer">
      <img class="close" @click="closePop" src="/image/close_no_circle.png" />
      <div class="link_panel">
        <div v-if="qrLogin">
          <div class="layer_content_wechat">
            <div class="layer_content">
              <div class="we_chat_tips">{{ $t('微信扫码登录') }}</div>
              <div class="canvas">
                <canvas class="woa_canvas" ref="woa_canvas"></canvas>
                <div v-if="woaShowMaskLayer" class="woa_canvas_mask">
                  <span class="mask_tips">{{ $t('二维码已过期') }}</span>
                  <span class="mask_click" @click="requestWoaLoginQr">{{ $t('刷新') }}</span>
                </div>
              </div>
              <p class="we_chat_l_tips">{{ $t('扫码->关注->登录，未注册的微信号将创建蓝莺账号') }}</p>
              <br />
              <br />
              <hr style="width: 100%; border-width: 0.5px" />
            </div>
          </div>
        </div>
        <div v-else>
          <div class="layer_header link_header">
            <span @click="changeAppID(appId)" class="hint">{{ $t('AppID') }}: {{ appId }}</span>
            <!-- <img @click="changeAppID(appId)" class="edit_logo" src="/image/edit.png" /> -->
            <!-- <img @click="appQrSacnLogin()" v-if="!appQrLogin" class="link_qrcode" src="/image/qr.png" /> -->
          </div>
          <div v-if="appQrLogin">
            <div class="layer_content">
              <canvas class="canvas" ref="canvas"></canvas>
              <p class="tab">{{ $t('使用「蓝莺IM」App 扫码') }}</p>
              <p class="tab">
                <intput>{{ $t('返回') }}</intput>
                <span @click="appQrSacnLogin()" class="mr5 colorb">{{ $t('密码登录') }}</span>
              </p>
            </div>
          </div>
          <div v-else>
            <div class="layer_content">
              <div class="logo">
                <img src="/image/logob.png" alt="LanyingIM" />
              </div>
              <template v-if="loginMode === 'password'">
                <div class="iptFrame mt21">
                  <input @keyup.enter="nameEnter" autocomplete="false" :placeholder="$t('用户名')" type="text" v-model="user.username" />
                </div>
                <div class="iptFrame mt14">
                  <input @keyup.enter="submit" autocomplete="false" :placeholder="$t('密码')" ref="password" type="password" v-model="user.password" />
                </div>
                <div @click="submit" class="loginBtn mt14">{{ $t('登录') }}</div>
              </template>
              <template v-else>
                <div class="iptFrame mt21">
                  <input @keyup.enter="sendSms" autocomplete="false" :placeholder="$t('请输入手机号')" type="text" v-model="mobileUser.mobile" />
                </div>
                <div class="cframe mt14">
                  <div class="ipframe">
                    <input @keyup.enter="sendSms" autocomplete="false" :placeholder="$t('图片验证码')" type="text" v-model="mobileUser.captcha" />
                  </div>
                  <img :src="codeImageSrc" @click="timerImage" class="captchaImage" v-if="codeImageSrc" />
                </div>
                <div class="cframe mt14">
                  <div class="ipframe">
                    <input @keyup.enter="submitMobile" autocomplete="false" :placeholder="$t('手机验证码')" type="text" v-model="mobileUser.code" />
                  </div>
                  <button @click="sendSms" class="smallbtn" type="button" :disabled="checkCodeTime > 0">
                    {{ checkText }}
                  </button>
                </div>
                <div @click="submitMobile" class="loginBtn mt14">{{ $t('登录') }}</div>
              </template>
              <div class="link_login_actions">
                <button v-if="loginMode === 'password'" @click="switchMode('mobile')" class="link_login_action" type="button">{{ $t('手机验证码登录') }}</button>
                <button v-else @click="switchMode('password')" class="link_login_action" type="button">{{ $t('密码登录') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="tips">
        {{ $t('注册登录即代表同意') }}{{ agreementSpacer }}
        <a :href="termsUrl" target="_blank" rel="noopener noreferrer">{{ $t('《用户服务条款》') }}</a>
        <span v-if="agreementSpacer">{{ agreementSpacer }}</span>
        <a :href="privacyUrl" target="_blank" rel="noopener noreferrer">{{ $t('《用户隐私协议》') }}</a>
      </div>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode';

export default {
  data() {
    return {
      qrLogin: false,
      appId: '',
      appQrLogin: false,

      appTimer: undefined,
      appQrTimer: undefined,
      appQrcode: '',
      appExpired: 0,
      appQrurl: '',

      woaTimer: undefined,
      woaQrTimer: undefined,
      woaQrcode: '',
      woaExpired: 0,
      woaQrurl: '',
      woaShowMaskLayer: false,

      user: {
        username: '',
        password: ''
      },
      mobileUser: {
        mobile: '',
        captcha: '',
        code: '',
        image_captcha_id: ''
      },
      loginMode: 'password',
      checkCodeTime: 0,
      checkCodeTimer: null,
      imageTimer: null
    };
  },

  name: 'linkLogin',
  props: [],

  mounted() {
    this.getAppId();
  },

  beforeDestroy() {
    this.clearAppTimer();
    this.clearWechatTimer();
    this.checkCodeTimer && clearInterval(this.checkCodeTimer);
    this.imageTimer && clearInterval(this.imageTimer);
  },

  watch: {},

  computed: {
    im() {
      return this.$store.state.im;
    },
    isEnglishLocale() {
      return this.$i18n && this.$i18n.locale === 'en-US';
    },
    termsUrl() {
      return this.isEnglishLocale ? 'https://www.lanyingim.com/en/terms/' : 'https://www.lanyingim.com/terms/';
    },
    privacyUrl() {
      return this.isEnglishLocale ? 'https://www.lanyingim.com/en/privacy/' : 'https://www.lanyingim.com/privacy/';
    },
    agreementSpacer() {
      return this.isEnglishLocale ? ' ' : '';
    },
    codeImageSrc() {
      const image_id = this.mobileUser.image_captcha_id;
      if (!image_id) return '';
      const app_id = this.appId || this.im.userManage.getAppid();
      const url = this.im.sysManage.getServers(app_id).ratel + '/app/captcha/image';
      return url + '?image_id=' + image_id + '&app_id=' + app_id;
    },
    checkText() {
      if (this.checkCodeTime > 0) {
        return this.$t('common.seconds', { count: this.checkCodeTime });
      }
      return this.$t('获取验证码');
    }
  },

  methods: {
    switchMode(mode) {
      this.loginMode = mode;
      if (mode === 'mobile') {
        this.timerImage();
      }
    },
    switchLogin() {
      this.qrLogin = !this.qrLogin;
      if (this.qrLogin) {
        this.requestWoaLoginQr();
        this.clearAppTimer();
      } else {
        if (this.appQrLogin) {
          this.requestAppLoginQr();
        } else {
          this.clearAppTimer();
        }
        this.clearWechatTimer();
      }
    },

    appQrSacnLogin() {
      this.appQrLogin = !this.appQrLogin;
      if (this.appQrLogin) {
        this.requestAppLoginQr();
      } else {
        this.clearAppTimer();
      }
    },

    closePop() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },

    getAppId() {
      this.appId = this.im.userManage.getAppid();
    },

    changeAppID() {},

    nameEnter() {
      this.$refs.password.focus();
    },

    getApp() {
      return this.$parent.$parent;
    },

    submit() {
      if (this.user.username && this.user.password) {
        this.getApp().switchLogin(
          {
            username: this.user.username,
            password: this.user.password,
            app_id: this.appId
          },
          true
        );
      } else {
        this.getApp().alert(this.$t('用户名或密码不能为空'));
      }
    },

    submitMobile() {
      if (!this.mobileUser.code || !this.mobileUser.mobile) {
        this.getApp().alert(this.$t('请输入手机号和验证码'));
        return;
      }
      this.im.userManage
        .asyncUserMobileLogin({
          captcha: this.mobileUser.code,
          mobile: this.mobileUser.mobile
        })
        .then((res) => {
          if (res.username && res.password) {
            this.getApp().switchLogin(
              {
                username: res.username,
                password: res.password,
                app_id: this.appId
              },
              true
            );
          } else if (res.sign) {
            this.getApp().alert(this.$t('该手机号未绑定蓝莺账号，请先在主登录页完成注册或绑定'));
          }
        });
    },

    getImageCode() {
      this.im.userManage.asyncCaptchaImagePost().then((res) => {
        this.mobileUser = Object.assign({}, this.mobileUser, { image_captcha_id: res });
      });
    },

    timerImage() {
      this.imageTimer && clearInterval(this.imageTimer);
      this.getImageCode();
      this.imageTimer = setInterval(() => {
        this.getImageCode();
      }, 3 * 60 * 1000);
    },

    sendSms() {
      if (this.checkCodeTime > 0) {
        return;
      }
      if (!this.mobileUser.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.mobileUser.captcha || !this.mobileUser.image_captcha_id) {
        this.$message.error(this.$t('请输入图片验证码'));
        return;
      }
      this.im.userManage
        .asyncCaptchaSms({
          captcha: this.mobileUser.captcha,
          image_id: this.mobileUser.image_captcha_id,
          mobile: this.mobileUser.mobile
        })
        .then(() => {
          this.checkCodeTime = 60;
          this.checkCodeTimer && clearInterval(this.checkCodeTimer);
          this.checkCodeTimer = setInterval(() => {
            this.checkCodeTime -= 1;
            if (this.checkCodeTime <= 0) {
              this.checkCodeTime = 0;
              clearInterval(this.checkCodeTimer);
            }
          }, 1000);
        });
    },

    requestAppLoginQr() {
      this.im.sysManage.asyncQrcode().then((res) => {
        const { qr_code, url, expired } = res;
        this.appExpired = expired;
        this.appQrcode = qr_code;
        this.appQrurl = url;
        const info = {
          info: {
            qrcode: qr_code,
            qrcode_app_id: this.appId
          },
          action: 'login',
          source: 'web'
        };
        QRCode.toCanvas(this.$refs.canvas, JSON.stringify(info), { width: 160, margin: 0 }, function (/*err*/) {});
        this.appTimerLogin();
        this.expAppTimer();
      });
    },

    appTimerLogin() {
      const _this = this;
      this.im.sysManage
        .asyncQrlogin({ qr_code: this.appQrcode })
        .then((res) => {
          const { password, username } = res;
          if (!password || !username) {
            console.log('Not logged in, continue');
            this.appTimer = setTimeout(function () {
              _this.appTimerLogin();
            }, 1000);
          } else {
            console.log('login....');
            _this.getApp().switchLogin(
              {
                username: username,
                password: password,
                app_id: _this.appId
              },
              true
            );
          }
        })
        .catch(() => {
          _this.appTimer = setTimeout(() => {
            _this.appTimerLogin();
          }, 2500);
        });
    },

    expAppTimer() {
      const now = new Date().getTime();
      const _this = this;
      if (now > this.appExpired) {
        console.log('Expired, request a new QR code...');
        this.clearAppTimer();
        this.requestAppLoginQr();
      } else {
        this.appQrTimer = setTimeout(function () {
          _this.expAppTimer();
          console.log('Not expired, will continue to detect...');
        }, 1000);
      }
    },

    clearAppTimer() {
      console.log('clear app login qr =============....');
      this.appTimer && clearTimeout(this.appTimer);
      this.appQrTimer && clearTimeout(this.appQrTimer);
    },

    requestWoaLoginQr() {
      const _this = this;
      this.im.sysManage.asyncQrcode().then((res) => {
        const { qrcode_id, url, expired } = res;
        this.woaExpired = expired;
        _this.woaShowMaskLayer = false;
        _this.woaQrcode = qrcode_id;
        _this.woaQrurl = url;
        QRCode.toCanvas(_this.$refs.woa_canvas, url, { width: 160, margin: 0 }, function (/*err*/) {});
        _this.woaTimerLogin();
        _this.expwoaTimer();
      });
    },

    woaTimerLogin() {
      const _this = this;
      this.im.sysManage
        .asyncWoaQrcodeStatus({ qrcode_id: this.woaQrcode })
        .then((res) => {
          const { code } = res;
          if (code) {
            _this.im.sysManage
              .asyncWoaQrlogin({ code })
              .then((res) => {
                const { openid, user_id, username, password } = res;
                console.log('weixin woa login...');
                _this.getApp().switchLogin(
                  {
                    username: username,
                    password: password,
                    app_id: _this.appId
                  },
                  true
                );
              })
              .catch((err) => {
                _this.clearWechatTimer();
                _this.getApp().alert(_this.$t('error.wechatLogin', { code: err.code, message: err.message }));
              });
          }
        })
        .catch((err) => {
          if (err && err.code) {
            if (err.code === 11022) {
              _this.woaTimer = setTimeout(function () {
                _this.woaTimerLogin();
              }, 2500);
            } else {
              _this.clearWechatTimer();
              _this.getApp().alert(_this.$t('error.qrcodeStatus', { code: err.code, message: err.message }));
            }
          } else {
            _this.clearWechatTimer();
            _this.getApp().alert(_this.$t('二维码状态未知错误'));
          }
        });
    },

    expwoaTimer() {
      // 超时处理，需要特别处理点击刷新二维码的情况
      const now = new Date().getTime();
      const _this = this;
      if (now > this.woaExpired) {
        //先停止 timer 然后在 canvas 之前添加一个透明涂层（透明涂层中间加上超时两个字）
        this.clearWechatTimer();
        this.woaShowMaskLayer = true;
      } else {
        this.woaQrTimer = setTimeout(() => {
          _this.expwoaTimer();
          console.log('woa not expired, will continue to detect...');
        }, 1000);
      }
    },

    clearWechatTimer() {
      console.log('clear woa login qr =============....');
      this.woaTimer && clearTimeout(this.woaTimer);
      this.woaQrTimer && clearTimeout(this.woaQrTimer);
    }
  }
};
</script>

<style scoped></style>
