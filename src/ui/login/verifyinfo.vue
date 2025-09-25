<template>
  <div class="login">
    <p class="header">
      <span class="hint">AppID: {{ appid }}</span>
    </p>
    <div class="verify_container">
      <div>本App（AppID：{{ appid }}）服务提供方</div>
      <div class="verification_desc" :title="verification_description">{{ verification_description }}</div>
      <div class="verification_status">
        <img :src="verification_img" />
        <span>{{ verification_status }}</span>
      </div>
      <div class="status-container">
        服务状态：{{ appStatusName }}
        <el-tooltip v-if="app_status == 'normal'" :content="'服务器IP：' + (server_ip ? server_ip : '无')" placement="top">
          <i class="el-icon-info status-icon"></i>
        </el-tooltip>
      </div>
    </div>
    <div class="login-button">
      <span @click="switchLogin('login')" class="mr5 colorb">已有账号，去登录</span>
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
      verification_img: '/image/unverified.png', // 认证图片
      verification_status: '未认证',
      app_status: '',
      server_ip: ''
    };
  },
  computed: {
    appStatusName() {
      if (this.app_status == 'banned') {
        return '封禁';
      } else if (this.app_status == 'frozen') {
        return '冻结';
      } else if (this.app_status == 'revoked') {
        return '已失效';
      } else if (this.app_status == 'normal') {
        return '正常';
      } else {
        return '';
      }
    }
  },

  mounted() {
    const im = this.$store.getters.im;
    this.app_status = im.sysManage.getAppStatus(im.userManage.getAppid());
    this.server_ip = im.sysManage.getServerIp(im.userManage.getAppid());
    let accountVerification = im.sysManage.getAccountVerification(im.userManage.getAppid());
    if (accountVerification) {
      if (accountVerification.type && accountVerification.type == 'enterprise') {
        this.verification_description += accountVerification.name;
      } else {
        this.verification_description += '个人开发者：' + accountVerification.name;
      }
      if (accountVerification.status) {
        switch (accountVerification.status) {
          case 'unverified':
            this.verification_status = '未认证';
            this.verification_img = '/image/unverified.png';
            break;
          case 'verified':
            this.verification_status = '已认证';
            this.verification_img = '/image/verifyed.png';
            break;
          case 'expired':
            this.verification_status = '认证失败';
            this.verification_img = '/image/verify_failed.png';
            break;
          default:
            break;
        }
      }
    }
  },

  methods: {
    switchLogin(type) {
      this.$store.dispatch('login/actionChangeAppStatus', type);
    }
  }
};
</script>

<style scoped>
.status-container {
  display: inline-flex;
  align-items: center; /* 垂直居中 */
  gap: 4px; /* 图标与文字间距 */
  margin-top: 30px;
}
.status-icon {
  color: #a8abb2;
  font-size: 18px;
}
.verification_desc {
  font-weight: bold;
  margin-top: 30px;
  font-size: 16px;
  text-align: center;
  margin-left: 5%;
  margin-right: 5%;
  word-break: break-all; /* 长字符串强制换行 */
  white-space: normal; /* 允许自动换行 */
}

.verify_container {
  line-height: 1.2;
  padding-top: 30px;
  text-align: center;
}

.verification_status img {
  width: 20px;
  height: 20px;
  margin: 0 6px 0 0;
  padding: 0;
  display: block;
}

.verification_status {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 5px;
}

.verification_status span {
  font-size: 12px;
  white-space: nowrap;
  margin-top: 0;
  line-height: 20px;
}

.login-button {
  line-height: 20px;
  font-size: 14px;
  text-align: center;
  margin-top: 30px;
}
</style>
