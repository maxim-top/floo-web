<template>
  <div class="login">
    <p class="header">
      <span class="hint">AppID: {{ appid }}</span>
    </p>
    <div class="logo">
      <img src="/image/logo4.png" />
    </div>
    <p class="tab">绑定已有账户</p>
    <div class="iptFrame mt21">
      <input autocomplete="false" placeholder="用户名" type="text" v-model="user.username" />
    </div>

    <div class="iptFrame mt14">
      <input @keyup.enter="submit" autocomplete="false" placeholder="密码" ref="password" type="password" v-model="user.password" />
    </div>
    <div @click="submit" class="loginBtn mt14">绑定</div>
    <p class="tab">
      <span @click="switchLogin('bindreg')" class="mr5 colorb">注册并绑定</span>
    </p>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

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
      if (!this.user.username || !this.user.password) {
        this.$message.error('请输入用户名或密码');
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
            if (err.code === 40002) {
              this.getApp().alert('当前APP用户数已达上限，请使用已有账号登录或联系管理员开通商业版');
            } else {
              this.serr(err);
              im.login({
                name: this.user.username,
                password: this.user.password
              });
            }
          } else {
            this.serr(err);
            im.login({
              name: this.user.username,
              password: this.user.password
            });
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
