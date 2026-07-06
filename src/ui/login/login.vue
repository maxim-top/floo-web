<template>
  <div class="login login-card login-card--primary">
    <div class="login_card_header">
      <button @click="changeAppID(appid)" class="login_appid" type="button">
        <span>AppID: {{ appid }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="login_appid_icon">
          <path d="M4 20h4l10-10-4-4L4 16v4z"></path>
          <path d="M13 7l4 4"></path>
        </svg>
      </button>
      <button @click="switchLogin('qrlogin')" class="login_header_icon" type="button" :aria-label="$t('扫码登录')">
        <img class="qrcode" src="/image/qr.png" :title="$t('扫码登录')" />
      </button>
    </div>
    <div class="logo login_brand">
      <img src="/image/logob.png" alt="LanyingIM" />
    </div>
    <h2 class="login_title">{{ $t('欢迎回来') }}</h2>
    <div class="field-group">
      <label class="field-label">{{ $t('用户名') }}</label>
      <div class="iptFrame">
        <input @keyup.enter="nameEnter" autocomplete="false" :placeholder="$t('请输入用户名')" type="text" v-model="user.username" />
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">{{ $t('密码') }}</label>
      <div class="iptFrame">
        <input @keyup.enter="submit" autocomplete="false" :placeholder="$t('请输入密码')" ref="password" type="password" v-model="user.password" />
      </div>
    </div>
    <button @click="submit" class="loginBtn" type="button">
      {{ sdkok || isAppInfoReady ? $t('登录') : $t('加载中...') }}
    </button>
    <div class="login_footer_links">
      <button @click="switchLogin('codelogin')" class="login_footer_link" type="button">{{ $t('手机验证码登录') }}</button>
      <button @click="switchLogin('regedit')" class="login_footer_link" type="button">{{ $t('注册') }}</button>
    </div>
    <p class="tab verify" v-if="isAppInfoReady && verifyInfo && verifyInfo.length">
      <span :class="['auth_status_badge', 'auth_status_badge--' + verifyState]" v-if="isAppInfoReady" aria-hidden="true">
        <svg v-if="verifyState === 'verified'" viewBox="0 0 24 24" class="auth_status_badge_icon">
          <path d="M12 3l7 3v5c0 4.5-2.7 7.9-7 10-4.3-2.1-7-5.5-7-10V6l7-3z"></path>
          <path d="M9.5 12.5l1.8 1.8 3.7-4"></path>
        </svg>
        <svg v-else-if="verifyState === 'failed'" viewBox="0 0 24 24" class="auth_status_badge_icon">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M9 9l6 6"></path>
          <path d="M15 9l-6 6"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" class="auth_status_badge_icon">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      </span>
      <span @click="switchLogin('verifyinfo')" class="verify_info">{{ verifyInfo }}</span>
    </p>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'login',
  props: ['sdkok', 'appid', 'isAppInfoReady'],
  data() {
    return {
      user: {
        username: '',
        password: ''
      },
      verifyInfo: '',
      verifyState: 'unknown',
      appStatus: ''
    };
  },

  mounted() {
    this.initVerify();
    this.initAppStatus();
  },

  computed: {
    ...mapGetters('login', ['getShowLayerFlag', 'getLoginLog'])
  },
  watch: {
    isAppInfoReady(val) {
      this.initVerify();
      this.initAppStatus();
    },
    '$localeState.locale'() {
      this.initVerify();
    }
  },
  methods: {
    initVerify() {
      this.verifyInfo = '';
      this.verifyState = 'unknown';
      if (this.isAppInfoReady) {
        const im = this.$store.getters.im;
        let accountVerification = im.sysManage.getAccountVerification(this.appid);
        if (accountVerification) {
          if (accountVerification.type && accountVerification.type == 'enterprise') {
            //
          } else {
            this.verifyInfo += this.$t('个人开发者：').replace(/：$/, ' ');
          }
          if (accountVerification.status) {
            switch (accountVerification.status) {
              case 'unverified': {
                if (accountVerification.type && accountVerification.type == 'enterprise' && !accountVerification.name) {
                  this.verifyInfo += `${this.$translateText('公司')} `;
                }
                this.verifyState = 'unverified';
                break;
              }
              case 'verified':
                this.verifyState = 'verified';
                break;
              case 'expired':
                this.verifyState = 'failed';
                break;
              default:
                this.verifyState = 'unknown';
                break;
            }
          }
          this.verifyInfo += accountVerification.name;
        }
      }
    },
    initAppStatus() {
      if (this.isAppInfoReady) {
        const im = this.$store.getters.im;
        this.appStatus = im.sysManage.getAppStatus(this.appid);
      }
    },
    nameEnter() {
      this.$refs.password.focus();
    },
    getApp() {
      return this.$parent.$parent;
    },
    submit() {
      if (this.sdkok) {
        this.user.username = this.user.username.replace(/\s*/g, '');
        this.user.password = this.user.password.replace(/\s*/g, '');
        this.getApp().saveLoginInfo(this.user, this.appid);
        this.getApp().imLogin();
      } else if (this.appStatus == 'banned') {
        this.$message({
          message: this.$t('APP已被封禁！'),
          type: 'error',
          duration: 2000
        });
      } else if (this.appStatus == 'frozen') {
        this.$message({
          message: this.$t('APP已被冻结！'),
          type: 'error',
          duration: 2000
        });
      } else if (this.appStatus == 'revoked') {
        this.$message({
          message: this.$t('AppID已失效！'),
          type: 'error',
          duration: 2000
        });
      } else {
        this.$message({
          message: this.$t('初始化异常,请检查 appid 是否正确！'),
          type: 'warning',
          duration: 2000
        });
      }
    },

    changeAppID(presentAppID) {
      this.$store.dispatch('layer/actionSetAppID', presentAppID);
      this.$store.dispatch('layer/actionSetShowing', 'changeappid');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },

    switchLogin(type) {
      if (this.isAppInfoReady) {
        this.$store.dispatch('login/actionChangeAppStatus', type);
      }
    }
  }
};
</script>

<style scoped></style>
