<template>
  <div class="user_setting" :style="{ height: '140px' }">
    <p :style="{ 'line-height': '2.2' }">
      <span>本APP（APPID：{{ appid }}）由</span>
      <br />
      <span class="span-lines">{{ verification_description }}</span>
      <span>{{ verification_status }}</span>
      <img :src="verification_img" class="verify" />
      <br />
      <span>提供服务</span>
    </p>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'verificationInfo',
  data() {
    return {
      verification_description: '', // 认证描述
      verification_img: '/image/unverified.png', // 认证图片
      verification_status: '（？未认证）'
    };
  },
  mounted() {
    const im = this.$store.getters.im;
    let appConfig = im.sysManage.getAppConfig(im.userManage.getAppid());
    if (appConfig) {
      if (appConfig.account_verification_type && appConfig.account_verification_type == 'enterprise') {
        this.verification_description += '「' + appConfig.account_verification_name + '」';
      } else {
        this.verification_description += '「个人开发者：' + appConfig.account_verification_name + '」';
      }
      if (appConfig.account_verification_status) {
        switch (appConfig.account_verification_status) {
          case 'unverified':
            this.verification_status = '（？未认证）';
            this.verification_img = '/image/unverified.png';
            break;
          case 'verified':
            this.verification_status = '（v已认证）';
            this.verification_img = '/image/verifyed.png';
            break;
          case 'expired':
            this.verification_status = '（！认证失败）';
            this.verification_img = '/image/verify_failed.png';
            break;
          default:
            break;
        }
      }
    }
  },
  components: {},
  computed: {
    appid() {
      return this.$store.state.im.userManage.getAppid();
    }
  },
  methods: {}
};
</script>

<style scoped></style>
