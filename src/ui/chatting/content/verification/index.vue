<template>
  <div class="user_setting verification_panel">
    <div class="verify_container verification_panel_card">
      <div class="verification_panel_intro">{{ $t('当前应用服务提供方') }}</div>
      <div class="verification_panel_branding">
        <div :class="['verification_status_badge', verificationStatusClass]">
          <span class="verification_status_badge_icon" aria-hidden="true">
            <svg v-if="verificationStatusClass === 'is-verified'" viewBox="0 0 24 24">
              <path d="M12 3l6 2.5V11c0 4.2-2.7 8.1-6 10-3.3-1.9-6-5.8-6-10V5.5L12 3z"></path>
              <path d="M9.5 12.3l1.7 1.8 3.6-4"></path>
            </svg>
            <svg v-else-if="verificationStatusClass === 'is-failed'" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M9 9l6 6M15 9l-6 6"></path>
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 8v5"></path>
              <path d="M12 16h.01"></path>
            </svg>
          </span>
          <span>{{ verification_status }}</span>
        </div>
        <div class="verification_provider" :title="verification_description">{{ verification_description }}</div>
        <div class="verification_provider_type">{{ verificationTypeLabel }}</div>
      </div>
      <div class="verification_panel_metrics">
        <div class="verification_metric_card">
          <div class="verification_metric_label">App ID</div>
          <div class="verification_metric_value">{{ appid }}</div>
        </div>
        <div class="verification_metric_card">
          <div class="verification_metric_label">{{ $t('服务状态') }}</div>
          <div class="verification_metric_value verification_metric_value--status">
            <span :class="['verification_status_dot', appStatusClass]"></span>
            <span>{{ appStatusName || $t('未知') }}</span>
          </div>
        </div>
      </div>
      <div class="verification_panel_note">
        <div class="verification_panel_note_label">{{ $t('说明') }}</div>
        <div class="verification_panel_note_text">{{ $t('这里重点展示当前应用由谁提供服务、是否完成主体认证，以及当前服务状态是否正常。') }}</div>
      </div>
      <div class="status-container">
        <span class="status-container_label">{{ $t('服务状态详情') }}</span>
        <span class="status-container_value">{{ appStatusName || $t('未知') }}</span>
        <el-tooltip v-if="app_status == 'normal'" :content="serverIpText" placement="top">
          <i class="el-icon-info status-icon"></i>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'verificationInfo',
  data() {
    return {
      verification_description: '', // 认证描述
      verification_status: '',
      verification_state: 'unverified',
      app_status: '',
      server_ip: '',
      verification_type: ''
    };
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
      this.verification_status = '';
      this.verification_state = 'unverified';
      this.verification_type = '';
      const im = this.$store.getters.im;
      this.app_status = im.sysManage.getAppStatus(im.userManage.getAppid());
      this.server_ip = im.sysManage.getServerIp(im.userManage.getAppid());
      let accountVerification = im.sysManage.getAccountVerification(im.userManage.getAppid());
      if (accountVerification) {
        this.verification_type = accountVerification.type || '';
        if (accountVerification.type && accountVerification.type == 'enterprise') {
          this.verification_description += accountVerification.name;
        } else {
          this.verification_description += this.$translateText('个人开发者：') + accountVerification.name;
        }
        if (accountVerification.status) {
          switch (accountVerification.status) {
            case 'unverified':
              this.verification_status = this.$translateText('未认证');
              this.verification_state = 'unverified';
              break;
            case 'verified':
              this.verification_status = this.$translateText('已认证');
              this.verification_state = 'verified';
              break;
            case 'expired':
              this.verification_status = this.$translateText('认证失败');
              this.verification_state = 'failed';
              break;
            default:
              this.verification_state = 'unverified';
              break;
          }
        }
      }
    }
  },
  components: {},
  computed: {
    appid() {
      return this.$store.state.im.userManage.getAppid();
    },
    serverIpText() {
      return this.$translateText('服务器IP：') + (this.server_ip ? this.server_ip : this.$translateText('无'));
    },
    appStatusName() {
      if (this.app_status == 'banned') {
        return this.$translateText('封禁');
      } else if (this.app_status == 'frozen') {
        return this.$translateText('冻结');
      } else if (this.app_status == 'revoked') {
        return this.$translateText('已失效');
      } else if (this.app_status == 'normal') {
        return this.$translateText('正常');
      } else {
        return '';
      }
    },
    verificationTypeLabel() {
      if (this.verification_type === 'enterprise') {
        return this.$translateText('企业主体认证');
      }
      if (this.verification_description) {
        return this.$translateText('个人主体认证');
      }
      return this.$translateText('尚未提交认证信息');
    },
    verificationStatusClass() {
      if (this.verification_state === 'verified') {
        return 'is-verified';
      }
      if (this.verification_state === 'failed') {
        return 'is-failed';
      }
      return 'is-pending';
    },
    appStatusClass() {
      if (this.app_status === 'normal') {
        return 'is-normal';
      }
      if (this.app_status === 'frozen') {
        return 'is-frozen';
      }
      if (this.app_status === 'banned' || this.app_status === 'revoked') {
        return 'is-disabled';
      }
      return 'is-unknown';
    }
  }
};
</script>

<style scoped>
.verification_panel {
  width: 100%;
  height: 100%;
  padding: 40px 48px;
  box-sizing: border-box;
  background: #f7f8fa;
  overflow-y: auto;
  overflow-x: hidden;
}

.verification_panel_card {
  max-width: 560px;
  margin: 10vh auto;
  padding: 36px 32px;
  background: var(--ly-bg-white);
  border: 1px solid rgba(193, 198, 200, 0.7);
  border-radius: 24px;
  box-shadow: 0 20px 56px rgba(19, 41, 75, 0.1);
  box-sizing: border-box;
}

.verify_container {
  line-height: 1.2;
  text-align: left;
}

.verification_panel_intro {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ly-text-muted);
}

.verification_panel_branding {
  margin-top: 20px;
}

.verification_provider {
  margin-top: 18px;
  font-size: 28px;
  line-height: 1.24;
  font-weight: 700;
  color: var(--ly-text-dark);
  word-break: break-word;
}

.verification_provider_type {
  margin-top: 10px;
  font-size: 14px;
  color: var(--ly-text-muted);
}

.verification_status_badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.verification_status_badge.is-verified {
  background: rgba(32, 184, 112, 0.12);
  color: #137a4b;
}

.verification_status_badge.is-failed {
  background: rgba(214, 74, 74, 0.12);
  color: #b03030;
}

.verification_status_badge.is-pending {
  background: rgba(124, 135, 142, 0.12);
  color: #5a6570;
}

.verification_status_badge_icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
}

.verification_status_badge_icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.verification_panel_metrics {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.verification_metric_card {
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(243, 246, 249, 0.92));
  border: 1px solid rgba(193, 198, 200, 0.55);
}

.verification_metric_label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ly-text-muted);
}

.verification_metric_value {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--ly-text-dark);
  word-break: break-word;
}

.verification_metric_value--status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.verification_status_dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
  background: #cbd5e1;
}

.verification_status_dot.is-normal {
  background: #20b870;
  box-shadow: 0 0 0 4px rgba(32, 184, 112, 0.12);
}

.verification_status_dot.is-frozen {
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.12);
}

.verification_status_dot.is-disabled {
  background: #e85d5d;
  box-shadow: 0 0 0 4px rgba(232, 93, 93, 0.12);
}

.verification_status_dot.is-unknown {
  background: #94a3b8;
}

.verification_panel_note {
  margin-top: 24px;
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(19, 41, 75, 0.04);
  border: 1px solid rgba(193, 198, 200, 0.45);
}

.verification_panel_note_label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ly-text-muted);
}

.verification_panel_note_text {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ly-text-main);
}

.status-container {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 22px;
  color: var(--ly-text-muted);
  font-size: 13px;
}

.status-container_label {
  font-weight: 600;
}

.status-container_value {
  color: var(--ly-text-dark);
}

.status-icon {
  color: #a8abb2;
  font-size: 16px;
}

@media (max-width: 768px) {
  .verification_panel {
    padding: 0;
    background: var(--ly-bg-white);
  }

  .verification_panel_card {
    margin: 0;
    max-width: 100%;
    min-height: 100%;
    padding: 24px 16px 32px;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .verification_provider {
    font-size: 24px;
  }

  .verification_panel_metrics {
    grid-template-columns: 1fr;
  }
}
</style>
