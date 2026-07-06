<template>
  <div class="add_friend_layer">
    <div class="layer">
      <div class="layer_header">
        {{ qrtitle }}
        <div @click="clickJoinGroupCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content qrcode_content" :style="{ height: '200px' }">
        <canvas class="canvas" ref="canvas"></canvas>
        <div v-if="wxmpShowMaskLayer" class="wxmp_mask">
          <span class="mask_tips">{{ $t('二维码已过期') }}</span>
          <span class="mask_click" @click="requestWXMPQr">{{ $t('刷新') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import QRCode from 'qrcode';

export default {
  data() {
    return {
      timer: undefined,
      qrtimer: undefined,
      qrcode: '',
      expired: 0,
      qrurl: '',
      wxmp: false,
      wxmpShowMaskLayer: false
    };
  },
  name: 'QRcode',
  mounted() {
    if (this.getShowing === 'qrlogin') {
      this.wxmp = false;
      this.requestLoginQr();
    } else if (this.getShowing === 'qrprofile') {
      this.wxmp = false;
      const info = {
        info: {
          uid: this.im.userManage.getUid()
        },
        action: 'profile',
        source: 'web'
      };
      QRCode.toCanvas(this.$refs.canvas, JSON.stringify(info), { width: 180, margin: 0 }, function (/*err*/) {
        //
      });
    } else if (this.getShowing === 'qrwxmp') {
      this.wxmp = true;
      this.requestWXMPQr();
    } else {
      this.wxmp = false;
      this.requestGroupQr();
    }
  },

  computed: {
    ...mapGetters('layer', ['getShowing']),
    ...mapGetters('content', ['getSid']),
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    im() {
      return this.$store.state.im;
    },
    qrtitle() {
      if (this.getShowing === 'qrlogin') {
        return this.$t('扫码登录');
      } else if (this.getShowing === 'qrprofile') {
        return this.$t('我的二维码');
      } else if (this.getShowing === 'qrwxmp') {
        return this.$t('微信小程序二维码');
      } else {
        return this.$t('群二维码');
      }
    }
  },
  methods: {
    getApp() {
      return this.$parent.$parent;
    },

    clickJoinGroupCloseHandler() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },
    search() {
      const group_id = this.group_id - 0;
      if (group_id <= 0) {
        alert(this.$t('请输入'));
        return;
      }
      this.$store.getters.im.groupManage.asyncGetInfo({ group_id }).then((res) => {
        this.searchObj = res;
      });
    },

    clickJoinHandler() {
      const group_id = this.group_id - 0;
      this.$store.getters.im.groupManage.asyncApply({ group_id, reason: this.$t('申请加入群') }).then(() => {
        alert(this.$t('请求已发送成功!'));
      });
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
            qrcode_app_id: this.im.userManage.getAppid()
          },
          action: 'login',
          source: 'web'
        };
        QRCode.toCanvas(this.$refs.canvas, JSON.stringify(info), { width: 200, margin: 0 }, function (/*err*/) {});
        this.timerLogin();
        this.expTimer();
      });
    },

    requestGroupQr() {
      this.im.sysManage.asyncQrcodeGroupsign({ group_id: this.getSid }).then((res) => {
        const { qr_info, expired } = res;
        this.expired = expired;
        const info = {
          info: {
            info: qr_info,
            group_id: this.getSid
          },
          action: 'group',
          source: 'web'
        };
        QRCode.toCanvas(this.$refs.canvas, JSON.stringify(info), { width: 200, margin: 0 }, function (/*err*/) {
          //
        });
        this.expTimer();
      });
    },

    requestWXMPQr() {
      const loginInfo = this.getApp().getLoginInfo();
      let that = this;
      const now = new Date().getTime();
      this.wxmpShowMaskLayer = false;
      this.expired = now + 60 * 1000;
      this.im.userManage
        .asyncGenerateSecretInfo({
          expire_seconds: 60,
          secret_text: JSON.stringify({
            username: loginInfo.username,
            password: loginInfo.password
          })
        })
        .then((res) => {
          let query = 'link=' + that.getApp().intent.link + '&code=' + res.code;
          that.im.userManage
            .aysncGenerateWXUrlLink({
              path: 'pages/profile/index',
              query: query
            })
            .then((res) => {
              QRCode.toCanvas(this.$refs.canvas, res.url_link, { width: 200, margin: 0 }, function (/*err*/) {});
              that.expTimer();
            })
            .catch((err) => {
              console.log('生成微信 url link 异常: code ' + err.code + ' : ' + err.message);
            });
        })
        .catch((err) => {
          console.log('获取登录凭证 code 异常: code ' + err.code + ' : ' + err.message);
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

      if (this.getShowing === 'qrwxmp') {
        if (now > this.expired) {
          this.clearTimer();
          this.wxmpShowMaskLayer = true;
          console.log('Mini program QR code expired, waiting for manual refresh');
        } else {
          this.qrtimer = setTimeout(function () {
            _this.expTimer();
            console.log('Mini program QR code still valid, continue checking');
          }, 1000);
        }
      }
    },

    clearTimer() {
      console.log('Clearing QR timers');
      this.timer && clearTimeout(this.timer);
      this.qrtimer && clearTimeout(this.qrtimer);
    }

    //finish
  },
  beforeDestroy() {
    this.clearTimer();
  }
};
</script>

<style scoped></style>
