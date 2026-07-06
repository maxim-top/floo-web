<template>
  <div class="login login-card">
    <div class="login_card_header">
      <div class="login_appid" role="presentation">{{ $t('AppID') }}: {{ appid }}</div>
    </div>
    <div class="logo login_brand">
      <img src="/image/logob.png" alt="LanyingIM" />
    </div>
    <h2 class="login_title">{{ $t('注册并绑定') }}</h2>
    <div class="field-group">
      <label class="field-label">{{ $t('用户名') }}</label>
      <div class="iptFrame">
        <input autocomplete="false" :placeholder="$t('请输入用户名')" type="text" v-model="user.username" />
      </div>
    </div>

    <div class="field-group">
      <label class="field-label">{{ $t('密码') }}</label>
      <div class="iptFrame pwd-wrap">
        <input
          @keyup.enter="submit"
          autocomplete="false"
          @focus="showPwdRule = true"
          @input="showPwdRule = true"
          @blur="hidePwdRule"
          :placeholder="$t('密码')"
          ref="password"
          type="password"
          v-model="user.password"
        />
        <div v-show="showPwdRule" class="password-tips">
          <ul>
            <li>{{ $t('密码长度至少 8 位') }}</li>
            <li>{{ $t('需包含字母、数字或标点符号中至少 2 种') }}</li>
          </ul>
        </div>
      </div>
    </div>
    <button @click="submit" class="loginBtn" type="button">{{ $t('注册') }}</button>
    <div class="login_footer_links">
      <button @click="switchLogin('bindacc')" class="login_footer_link" type="button">{{ $t('已有账户，直接绑定') }}</button>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { canLoginAfterRegisterError, getRegisterErrorMessage } from './registerError';

export default {
  name: 'bingreg',
  props: ['sdkok', 'appid'],
  data() {
    return {
      user: {
        username: '',
        password: ''
      },
      showPwdRule: false
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
    hidePwdRule() {
      setTimeout(() => {
        this.showPwdRule = false;
      }, 150);
    },
    submit() {
      this.user.username = this.user.username.replace(/\s*/g, '');
      this.user.password = this.user.password.replace(/\s*/g, '');
      if (!this.user.username || !this.user.password) {
        this.$message.error(this.$t('请输入用户名或密码'));
        return;
      }
      let pwd = this.user.password;
      if (!/^[\x20-\x7E]+$/.test(pwd)) {
        this.$message.error(this.$t('密码仅支持英文、数字及英文标点符号'));
        return;
      }

      if (pwd.length < 8) {
        this.$message.error(this.$t('密码长度至少 8 位'));
        return;
      }

      let count = 0;
      if (/[A-Za-z]/.test(pwd)) count++;
      if (/\d/.test(pwd)) count++;
      if (/[^A-Za-z0-9]/.test(pwd)) count++;

      if (count < 2) {
        this.$message.error(this.$t('密码需包含字母、数字或标点符号中至少 2 种。'));
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .asyncRegister(this.user)
        .then(() => {
          this.getApp().saveLoginInfo(this.user, this.appid);
          im.login({
            name: this.user.username,
            password: this.user.password
          });
        })
        .catch((err) => {
          if (err && err.code) {
            console.log('用户注册失败 code = ' + err.code + ' : ' + err.message);
            if (canLoginAfterRegisterError(err)) {
              this.getApp().saveLoginInfo(this.user, this.appid);
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

<style scoped>
.pwd-wrap {
  position: relative;
}

.password-tips {
  position: absolute;
  bottom: 100%; /* 关键：贴着 input 上方 */
  left: 0;
  margin-bottom: 6px;

  width: 250px;
  padding: 6px 8px;

  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 11px;
  line-height: 16px;

  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  z-index: 99;

  animation: tipsFadeInUp 0.15s ease-out;
}

/* 小三角箭头（朝下，指向输入框） */
.password-tips::before {
  content: '';
  position: absolute;
  bottom: -6px; /* 关键：箭头在底部 */
  left: 16px;

  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(0, 0, 0, 0.85);
}

.password-tips ul {
  padding-left: 10px;
}

.password-tips li {
  color: #eee;
}

/* 从下往上淡入，更符合“上方提示”直觉 */
@keyframes tipsFadeInUp {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
