<template>
  <div class="login login-card">
    <div class="login_card_header">
      <div class="login_appid" role="presentation">{{ $t('AppID') }}: {{ appid }}</div>
    </div>
    <div class="logo login_brand">
      <img src="/image/logob.png" alt="LanyingIM" />
    </div>
    <h2 class="login_title">{{ $t('认证信息') }}</h2>
    <div class="verify_container">
      <div>{{ $t('本App（AppID：{appid}）服务提供方', { appid }) }}</div>
      <div class="verification_desc" :title="verification_description">{{ verification_description }}</div>
      <div class="verification_status">
        <span>{{ verification_status }}</span>
        <span :class="['auth_status_badge', 'auth_status_badge--' + verificationState]" aria-hidden="true">
          <svg v-if="verificationState === 'verified'" viewBox="0 0 24 24" class="auth_status_badge_icon">
            <path d="M12 3l7 3v5c0 4.5-2.7 7.9-7 10-4.3-2.1-7-5.5-7-10V6l7-3z"></path>
            <path d="M9.5 12.5l1.8 1.8 3.7-4"></path>
          </svg>
          <svg v-else-if="verificationState === 'failed'" viewBox="0 0 24 24" class="auth_status_badge_icon">
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
      </div>
      <div class="status-container">
        {{ $t('服务状态：') }}{{ appStatusName }}
        <el-tooltip v-if="app_status == 'normal'" :content="$t('服务器IP：') + (server_ip ? server_ip : $t('无'))" placement="top">
          <i class="el-icon-info status-icon"></i>
        </el-tooltip>
      </div>
    </div>
    <div class="login_footer_links login_footer_links--center">
      <button @click="switchLogin('login')" class="login_footer_link" type="button">{{ $t('已有账号，去登录') }}</button>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'verfiyInfo',
  props: ['sdkok', 'appid'],
  data() {
    return {
      verification_description: '', // 认证描述
      verification_status: '',
      verificationState: 'unknown',
      app_status: '',
      server_ip: ''
    };
  },
  computed: {
    appStatusName() {
      if (this.app_status == 'banned') {
        return this.$t('封禁');
      } else if (this.app_status == 'frozen') {
        return this.$t('冻结');
      } else if (this.app_status == 'revoked') {
        return this.$t('已失效');
      } else if (this.app_status == 'normal') {
        return this.$t('正常');
      } else {
        return '';
      }
    }
  },

  mounted() {
    this.initVerification();
  },

  watch: {
    '$localeState.locale'() {
      this.initVerification();
    }
  },

  methods: {
    initVerification() {
      this.verification_description = '';
      this.verification_status = this.$t('未认证');
      this.verificationState = 'unknown';
      const im = this.$store.getters.im;
      this.app_status = im.sysManage.getAppStatus(im.userManage.getAppid());
      this.server_ip = im.sysManage.getServerIp(im.userManage.getAppid());
      let accountVerification = im.sysManage.getAccountVerification(im.userManage.getAppid());
      if (accountVerification) {
        if (accountVerification.type && accountVerification.type == 'enterprise') {
          this.verification_description += accountVerification.name;
        } else {
          this.verification_description += this.$t('个人开发者：') + accountVerification.name;
        }
        if (accountVerification.status) {
          switch (accountVerification.status) {
            case 'unverified':
              this.verification_status = this.$t('未认证');
              this.verificationState = 'unverified';
              break;
            case 'verified':
              this.verification_status = this.$t('已认证');
              this.verificationState = 'verified';
              break;
            case 'expired':
              this.verification_status = this.$t('认证失败');
              this.verificationState = 'failed';
              break;
            default:
              this.verificationState = 'unknown';
              break;
          }
        }
      }
    },
    switchLogin(type) {
      this.$store.dispatch('login/actionChangeAppStatus', type);
    }
  }
};
</script>

<style scoped>
.verify_container {
  line-height: 1.5;
  padding-top: 4px;
  text-align: center;
}

.status-container {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 24px;
}

.status-icon {
  color: #a8abb2;
  font-size: 18px;
}

.verification_desc {
  font-weight: bold;
  margin-top: 24px;
  font-size: 16px;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
  max-width: 300px;
  word-break: break-all;
  white-space: normal;
}

.verification_status {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}

.verification_status span {
  font-size: 12px;
  white-space: nowrap;
  margin-top: 0;
  line-height: 20px;
}
</style>
