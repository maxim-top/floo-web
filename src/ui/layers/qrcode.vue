<template>
  <div class="add_friend_layer">
    <div class="layer">
      <div class="layer_header">
        {{ qrtitle }}
        <div @click="clickJoinGroupCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content">
        <canvas class="canvas" ref="canvas"></canvas>
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
      qrurl: ''
    };
  },
  name: 'QRcode',
  mounted() {
    if (this.getShowing === 'qrlogin') {
      this.requestLoginQr();
    } else if (this.getShowing === 'qrprofile') {
      const uid = 'R_' + this.im.userManage.getUid();
      QRCode.toCanvas(this.$refs.canvas, uid, { width: 180, margin: 0 }, function (/*err*/) {
        //
      });
    } else {
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
        return '扫码登录';
      } else if (this.getShowing === 'qrprofile') {
        return '我的二维码';
      } else {
        return '群二维码';
      }
    }
  },
  methods: {
    clickJoinGroupCloseHandler() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },
    search() {
      const group_id = this.group_id - 0;
      if (group_id <= 0) {
        alert('请输入');
        return;
      }
      this.$store.getters.im.groupManage.asyncGetInfo({ group_id }).then((res) => {
        this.searchObj = res;
      });
    },

    clickJoinHandler() {
      const group_id = this.group_id - 0;
      this.$store.getters.im.groupManage.asyncApply({ group_id, reason: '申请加入群' }).then(() => {
        alert('请求已发送成功!');
      });
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

    requestGroupQr() {
      this.im.sysManage.asyncQrcodeGroupsign({ group_id: this.getSid }).then((res) => {
        const { qr_info, expired } = res;
        this.expired = expired;
        QRCode.toCanvas(this.$refs.canvas, 'G_' + this.getSid + '_' + qr_info, { width: 200, margin: 0 }, function (/*err*/) {
          //
        });
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
    }

    //finish
  },
  beforeDestroy() {
    this.clearTimer();
  }
};
</script>

<style scoped></style>
