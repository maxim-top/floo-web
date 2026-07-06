<template>
  <div class="login login-card">
    <div class="login_card_header">
      <div class="login_appid" role="presentation">{{ $t('AppID') }}: {{ appid }}</div>
    </div>
    <div class="logo login_brand">
      <img src="/image/logob.png" alt="LanyingIM" />
    </div>
    <h2 class="login_title">{{ $t('绑定已有账户') }}</h2>
    <div class="field-group">
      <label class="field-label">{{ $t('用户名') }}</label>
      <div class="iptFrame">
        <input autocomplete="false" :placeholder="$t('请输入用户名')" type="text" v-model="user.username" />
      </div>
    </div>

    <div class="field-group">
      <label class="field-label">{{ $t('密码') }}</label>
      <div class="iptFrame">
        <input @keyup.enter="submit" autocomplete="false" :placeholder="$t('请输入密码')" ref="password" type="password" v-model="user.password" />
      </div>
    </div>
    <button @click="submit" class="loginBtn" type="button">{{ $t('绑定') }}</button>
    <div class="login_footer_links">
      <button @click="switchLogin('bindreg')" class="login_footer_link" type="button">{{ $t('注册并绑定') }}</button>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { canLoginAfterRegisterError, getRegisterErrorMessage } from './registerError';

export default {
  name: 'bindacc',
  props: ['sdkok', 'appid'],
  data() {
    return {
      user: {
        username: '',
        password: ''
      }
    };
  },
  mounted() {},

  computed: {
    ...mapGetters('login', ['getMobileSign', 'getSignMobile'])
  },
  methods: {
    nameEnter() {
      this.$refs.password.focus();
    },
    getApp() {
      return this.$parent.$parent;
    },
    submit() {
      this.user.username = this.user.username.replace(/\s*/g, '');
      this.user.password = this.user.password.replace(/\s*/g, '');
      if (!this.user.username || !this.user.password) {
        this.$message.error(this.$t('请输入用户名或密码'));
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .asyncRegister(this.user)
        .then(() => {
          im.userManage
            .asyncUserMobileBindSign({
              mobile: this.getSignMobile,
              sign: this.getMobileSign
            })
            .then(() => {
              im.login({
                name: this.user.username,
                password: this.user.password
              });
            });
        })
        .catch((err) => {
          if (err && err.code) {
            console.log('用户注册失败 code = ' + err.code + ' : ' + err.message);
            if (canLoginAfterRegisterError(err)) {
              this.serr(err);
              im.login({
                name: this.user.username,
                password: this.user.password
              });
            } else {
              this.getApp().alert(getRegisterErrorMessage(err));
            }
          } else {
            console.log('asyncRegister request error, please retry later: ', err);
            this.getApp().alert(getRegisterErrorMessage(err));
          }
        });
    },
    switchLogin(type) {
      this.$store.dispatch('login/actionChangeAppStatus', type);
    }
  }
};
</script>

<style scoped></style>
