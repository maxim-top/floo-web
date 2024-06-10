<template>
  <div class="link_login">
    <div class="layer link_layer">
      <!--
      <div class="change_login" @click="switchLogin">
        <img class="interaction" src="/image/interaction.png" />
        <span v-if="qrLogin">蓝莺账号登录</span>
        <span v-if="!qrLogin">微信扫码登录</span>
      </div>
      -->
      <img class="close" @click="closePop" src="/image/close_no_circle.png" />
      <div class="link_panel">
        <div v-if="qrLogin">
          <div class="layer_content_wechat">
            <div class="layer_content">
              <div class="we_chat_tips">微信扫码登录</div>
              <div class="canvas">
                <canvas class="woa_canvas" ref="woa_canvas"></canvas>
                <div v-if="woaShowMaskLayer" class="woa_canvas_mask">
                  <span class="mask_tips">二维码已过期</span>
                  <span class="mask_click" @click="requestWoaLoginQr">刷新</span>
                </div>
              </div>
              <p class="we_chat_l_tips">扫码->关注->登录，未注册的微信号将创建蓝莺账号</p>
              <br />
              <br />
              <hr style="width: 100%; border-width: 0.5px" />
            </div>
          </div>
        </div>
        <div v-else>
          <div class="layer_header link_header">
            <span @click="changeAppID(appId)" class="hint">AppID: {{ appId }}</span>
            <!-- <img @click="changeAppID(appId)" class="edit_logo" src="/image/edit.png" /> -->
            <!-- <img @click="appQrSacnLogin()" v-if="!appQrLogin" class="link_qrcode" src="/image/qr.png" /> -->
          </div>
          <div v-if="appQrLogin">
            <div class="layer_content">
              <canvas class="canvas" ref="canvas"></canvas>
              <p class="tab">使用「蓝莺IM」App 扫码</p>
              <p class="tab">
                <intput>返回</intput>
                <span @click="appQrSacnLogin()" class="mr5 colorb">密码登录</span>
              </p>
            </div>
          </div>
          <div v-else>
            <div class="layer_content">
              <div class="logo">
                <img src="/image/logob.png" />
              </div>
              <div class="iptFrame mt21">
                <input @keyup.enter="nameEnter" autocomplete="false" placeholder="用户名" type="text" v-model="user.username" />
              </div>
              <div class="iptFrame mt14">
                <input @keyup.enter="submit" autocomplete="false" placeholder="密码" ref="password" type="password" v-model="user.password" />
              </div>
              <div @click="submit" class="loginBtn mt14">
                {{ '登录' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="tips">注册登录即代表同意《用户服务条款》《用户隐私协议》</div>
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
      }
    };
  },

  name: 'linkLogin',
  props: [],

  mounted() {
    this.getAppId();
  },

  watch: {},

  computed: {
    im() {
      return this.$store.state.im;
    }
  },

  methods: {
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
        this.getApp().alert('用户名或密码不能为空');
      }
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
            app_id: this.appId
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
                _this.getApp().alert('微信公众号登录异常: ' + err.code + ': ' + err.message);
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
              _this.getApp().alert('二维码状态错误: ' + err.code + ': ' + err.message);
            }
          } else {
            _this.clearWechatTimer();
            _this.getApp().alert('二维码状态未知错误');
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
