<template>
  <div class="login">
    <p class="header">
      <span @click="changeAppID(appid)" class="hint">AppID: {{ appid }}</span>
      <img @click="changeAppID(appid)" class="edit_logo" src="/image/edit.png" />
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
    <div>
      <ul :style="{ color: 'red' }">
        <li>账号注销后，将永久删除您的账号信息</li>
        <li>账号中的所有数据将被清除且无法恢复</li>
        <li>注销后将无法使用该账号登录</li>
      </ul>
    </div>
    <div @click="submit" class="loginBtn mt14">
      {{ sdkok ? '注销账户' : '加载中...' }}
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'delete',
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
    ...mapGetters('login', ['getShowLayerFlag', 'getLoginLog'])
  },

  watch: {},

  methods: {
    nameEnter() {
      this.$refs.password.focus();
    },

    getApp() {
      return this.$parent;
    },

    submit() {
      if (this.sdkok) {
        this.user.username = this.user.username.replace(/\s*/g, '');
        this.user.password = this.user.password.replace(/\s*/g, '');
        if (this.user.username && this.user.password) {
          this.getApp().deleteUser(this.user.username, this.user.password);
        } else {
          this.getApp().alert('用户名或密码不能为空');
        }
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
    }
  }
};
</script>

<style scoped></style>
