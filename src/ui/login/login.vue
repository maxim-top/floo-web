<template>
  <div class="login">
    <p class="header">
      <span @click="changeAppID(appid)" class="hint">AppID: {{ appid }}</span>
      <img @click="changeAppID(appid)" class="edit_logo" src="/image/edit.png" />
      <img @click="switchLogin('qrlogin')" class="qrcode" src="/image/qr.png" title="扫码登录" />
    </p>
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
      {{ sdkok ? '登录' : '加载中...' }}
    </div>
    <p class="tab">
      <span @click="switchLogin('codelogin')" class="mr5 colorb">手机验证码登录</span>
      |
      <span @click="switchLogin('regedit')" class="ml5">注册</span>
    </p>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'login',
  props: ['sdkok', 'appid'],
  data() {
    return {
      user: {
        username: '',
        password: ''
      }
    };
  },

  computed: {
    ...mapGetters('login', ['getShowLayerFlag', 'getLoginLog'])
  },
  methods: {
    nameEnter() {
      this.$refs.password.focus();
    },
    getApp() {
      return this.$parent.$parent;
    },
    submit() {
      if (this.sdkok) {
        this.getApp().saveLoginInfo(this.user, this.appid);
        this.getApp().imLogin();
      } else {
        this.$message({
          message: '初始化异常,请检查 appid 是否正确！',
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
      if (this.sdkok) {
        this.$store.dispatch('login/actionChangeAppStatus', type);
      }
    }
  }
};
</script>

<style scoped></style>
