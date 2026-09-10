<template>
  <div class="ui-index">
    <base target="_blank" />
    <div class="layer_mask" v-if="getShowmask"></div>
    <div id="lanying-snackbar"></div>
    <Chatting v-if="getAppStatus == 'chatting'" />
    <Support v-else-if="getAppStatus == 'support'" />
    <Loading v-else-if="getAppStatus == 'loading'" />
    <Skipping v-else-if="getAppStatus == 'skipping'" />
    <Navigation v-else-if="getAppStatus == 'navigation'" />
    <Minimize v-else-if="getAppStatus == 'minimize'" />
    <Delete :appid="appid" :sdkok="sdkok" v-else-if="getAppStatus == 'delete'" />
    <Achieve :appid="appid" v-else-if="getAppStatus == 'achieve'" />
    <Login
      :appid="appid"
      :sdkok="sdkok"
      :isAppInfoReady="isAppInfoReady"
      :imInitLoading="imInitLoading"
      :loginAttemptState="loginAttemptState"
      :loginRetryCount="loginNetworkRetryTimes"
      :initRetryCount="initNetworkRetryTimes"
      v-else
    />
    <Layers />
  </div>
</template>

<script>
import Login from './login/index.vue';
import Chatting from './chatting/index.vue';
import Support from './support/index.vue';
import Loading from './support/loading/index.vue';
import Skipping from './support/skipping/index.vue';
import Navigation from './support/navigation/index.vue';
import Minimize from './support/minimize/index.vue';
import Delete from './delete/index.vue';
import Achieve from './delete/achieve.vue';
import Layers from './layers/index.vue';
import { mapGetters } from 'vuex';

// 您有两种方式使用 flooim：
// 1. script 模式，你可以直接 import 后，使用 window.flooIM()
// 这种方式主要为支持浏览器中使用 script 标签引用，但会存在初始化并发问题，所以要用 try-catch-retry，具体使用方法见下文。
// import '../sdk/index';
// 2. module 方式，import flooim 后，使用 flooim()
import flooim from '../sdk/index';
import CryptoJS from 'crypto-js';

const AUTO_LOGIN_DELAY = 2000; // ms
const AUTO_LOGIN_TIMES_MAX = 3;
const LOGIN_RATE_LIMIT_RETRY_DELAY = 30000;
let autoLoginTimes = 0;
const INIT_CHECK_TIMES_MAX = 20;
const INIT_LOCAL_STORE_KEY = 'vCcjfL6fTO27zqVi';
const NON_PASSWORD_LOGIN_MODES = ['regedit', 'verifyinfo', 'bindacc', 'bindreg', 'codelogin', 'qrlogin', 'bind'];

export default {
  name: 'index',
  components: {
    Login,
    Chatting,
    Support,
    Loading,
    Skipping,
    Navigation,
    Minimize,
    Delete,
    Achieve,
    Layers
  },
  data() {
    return {
      appid: '',
      sdkok: false,
      isAppInfoReady: false,
      intent: {},
      pendingSupportNavigation: false,
      autoSkip: true,
      officialUser: false,
      linkChangeAccount: false,
      delPass: '',
      wxmpLaunchUrl: '',
      wxmpLaunchLink: '',
      wxmpLaunchPromise: null,
      wxmpLaunchRequestId: 0,
      imInitAttemptId: 0,
      imInitLoading: false,
      pendingLoginMode: '',
      imListeners: null,
      autoLoginTimer: null,
      initNetworkRetryTimer: null,
      initNetworkRetryTimes: 0,
      initNetworkRetryExhausted: false,
      initNetworkRetryEligible: false,
      loginNetworkRetryTimer: null,
      loginNetworkRetryTimes: 0,
      loginNetworkRetryExhausted: false,
      loginNetworkRetryEligible: false,
      passwordLoginContext: null,
      passwordLoginInFlight: false,
      policyLoginRecoveryPending: false
    };
  },
  beforeMount() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('message', this.handleParentMessage);
      window.addEventListener('online', this.handleNetworkOnline);
    }
    this.loadIntent();
    if (this.intent.action === 'support') {
      this.applySupportEmbedShellTransparency();
    }
  },
  mounted() {
    setTimeout(() => {
      this.appid = this.retrieveAppId();
      this.$store.dispatch('actionChangeAppID', this.appid);
    }, 200);
  },
  beforeDestroy() {
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('message', this.handleParentMessage);
      window.removeEventListener('online', this.handleNetworkOnline);
    }
    this.clearInitNetworkRetry();
    this.clearLoginNetworkRetry();
    this.clearAutoLoginRetry();
    const im = this.getIM();
    if (im && im.off && this.imListeners) {
      im.off(this.imListeners);
    }
  },
  watch: {
    getAppIDState: {
      handler(appState) {
        const newAppID = appState && appState.appID ? appState.appID : '';
        this.setupIM(newAppID);
      },
      immediate: true
    },
    getAppStatus(status, previousStatus) {
      if (status !== previousStatus && NON_PASSWORD_LOGIN_MODES.includes(status)) {
        this.clearLoginNetworkRetry();
        this.clearAutoLoginRetry();
      }
    }
  },
  computed: {
    ...mapGetters('login', ['getAppStatus', 'getMobileSign', 'getSignMobile']),
    ...mapGetters('layer', ['getShowmask']),
    ...mapGetters(['getAppID', 'getAppIDState']),

    showLogin() {
      return this.getAppStatus != 'chatting';
    },

    showChatting() {
      return this.getAppStatus === 'chatting';
    },

    loginAttemptState() {
      if (this.loginNetworkRetryTimer || (this.passwordLoginInFlight && this.loginNetworkRetryTimes > 0)) {
        return 'retrying';
      }
      if (this.passwordLoginInFlight) {
        return 'submitting';
      }
      if (this.initNetworkRetryTimer) {
        return 'init_retrying';
      }
      if (this.imInitLoading) {
        return 'initializing';
      }
      return 'idle';
    }
  },
  methods: {
    handleParentMessage(event) {
      if (!event.data) {
        return;
      }
      let data = {};
      try {
        data = JSON.parse(event.data);
      } catch (ex) {
        return;
      }
      if (data.type === 'lanying_link_support_user') {
        if (data.link_mode === 'lanying-support') {
          this.intent.linkMode = 'lanying-support';
        } else {
          this.intent.linkMode = 'lanying-link';
          this.$store.dispatch('login/actionChangeAppStatus', 'loading');
          parent.postMessage(
            JSON.stringify({
              type: 'lanying_toggle_chat',
              size: 'large'
            }),
            '*'
          );
        }
        if (data.data) {
          try {
            let info = JSON.parse(data.data);
            this.saveLoginInfo({ username: info.username, password: info.password }, info.appid);
            this.officialUser = true;
          } catch (ex) {
            console.error('Can not parse info in lanying_link_support_user');
          }
        }
      } else if (data.type === 'lanying_link_toggle_chat' && data.size) {
        switch (data.size) {
          case 'minimize':
            this.$store.dispatch('login/actionChangeAppStatus', 'minimize');
            parent.postMessage(
              JSON.stringify({
                type: 'lanying_toggle_chat',
                size: 'minimize'
              }),
              '*'
            );
            break;
        }
      }
    },

    applySupportEmbedShellTransparency() {
      const html = document.documentElement;
      const body = document.body;
      const app = document.getElementById('app');
      const uiRoot = document.querySelector('.ui-index');

      html && html.style.setProperty('background', 'transparent', 'important');
      html && html.style.setProperty('background-color', 'transparent', 'important');
      body && body.style.setProperty('background', 'transparent', 'important');
      body && body.style.setProperty('background-color', 'transparent', 'important');
      app && app.style.setProperty('background', 'transparent', 'important');
      app && app.style.setProperty('background-color', 'transparent', 'important');
      uiRoot && uiRoot.style.setProperty('background', 'transparent', 'important');
      uiRoot && uiRoot.style.setProperty('background-color', 'transparent', 'important');
    },

    tryParseJson(value, fallback = null) {
      if (typeof value !== 'string') {
        return fallback;
      }
      const text = value.trim();
      if (!text) {
        return fallback;
      }
      const first = text.charAt(0);
      if (first !== '{' && first !== '[') {
        return fallback;
      }
      try {
        return JSON.parse(text);
      } catch (ex) {
        return fallback;
      }
    },
    getIM() {
      return this.$store.state.im;
    },

    retryDelay(retryIndex) {
      return retryIndex * AUTO_LOGIN_DELAY;
    },

    clearAutoLoginRetry() {
      if (this.autoLoginTimer) {
        clearTimeout(this.autoLoginTimer);
      }
      this.autoLoginTimer = null;
      autoLoginTimes = 0;
    },

    clearInitNetworkRetry() {
      if (this.initNetworkRetryTimer) {
        clearTimeout(this.initNetworkRetryTimer);
      }
      this.initNetworkRetryTimer = null;
      this.initNetworkRetryTimes = 0;
      this.initNetworkRetryExhausted = false;
      this.initNetworkRetryEligible = false;
    },

    clearLoginNetworkRetry(keepContext = false) {
      if (this.loginNetworkRetryTimer) {
        clearTimeout(this.loginNetworkRetryTimer);
      }
      this.loginNetworkRetryTimer = null;
      this.loginNetworkRetryTimes = 0;
      this.loginNetworkRetryExhausted = false;
      this.loginNetworkRetryEligible = false;
      this.passwordLoginInFlight = false;
      if (!keepContext) {
        this.passwordLoginContext = null;
      }
    },

    discardExhaustedLoginAttempts() {
      if (this.policyLoginRecoveryPending) {
        this.policyLoginRecoveryPending = false;
        this.getIM().logout({ linkLogin: true });
        this.clearLoginNetworkRetry();
      }
      if (this.initNetworkRetryExhausted && !this.imInitLoading && !this.initNetworkRetryTimer) {
        this.clearInitNetworkRetry();
      }
      if (this.loginNetworkRetryExhausted && !this.passwordLoginInFlight && !this.loginNetworkRetryTimer) {
        this.clearLoginNetworkRetry();
      }
    },

    isRetryableInitFailure(desc) {
      const reason = `${desc || ''}`.toLowerCase();
      return reason === 'noavailableendpoint' || reason.indexOf('network error') > -1 || reason.indexOf('timeout') > -1;
    },

    isRetryableLoginFailure(desc) {
      const reason = `${desc || ''}`.toLowerCase();
      return reason.indexOf('network error') > -1 || reason.indexOf('timeout') > -1 || reason.indexOf('econnaborted') > -1;
    },

    isRateLimitedLoginFailure(desc) {
      return `${desc || ''}`.toLowerCase().indexOf('rate limited') > -1;
    },

    isPasswordLoginPageVisible() {
      return this.getAppStatus === 'login';
    },

    scheduleInitNetworkRetry(reason) {
      this.initNetworkRetryEligible = true;
      if (this.sdkok || this.imInitLoading || this.initNetworkRetryTimer) {
        return true;
      }
      if (this.initNetworkRetryTimes >= AUTO_LOGIN_TIMES_MAX) {
        this.initNetworkRetryExhausted = true;
        console.warn('Floo IM init network retry exhausted:', reason);
        return false;
      }

      const retryIndex = this.initNetworkRetryTimes;
      const retryCount = retryIndex + 1;
      const delay = this.retryDelay(retryIndex);
      const retryAppID = this.appid;
      this.initNetworkRetryTimes = retryCount;
      this.initNetworkRetryExhausted = false;
      console.warn(`Floo IM init network retry ${retryCount}/${AUTO_LOGIN_TIMES_MAX} in ${delay} ms:`, reason);
      if (!this.isPasswordLoginPageVisible()) {
        this.$message({
          message: this.$t('login.initNetworkRetrying', {
            count: retryCount,
            origin: `网络异常，正在进行第${retryCount}次初始化重试`
          }),
          type: 'warning',
          duration: 1500
        });
      }
      this.initNetworkRetryTimer = setTimeout(() => {
        this.initNetworkRetryTimer = null;
        if (this.sdkok || this.imInitLoading || retryAppID !== this.appid) {
          return;
        }
        this.setupIM(retryAppID, { force: true, preserveInitNetworkRetry: true });
      }, delay);
      return true;
    },

    sendPasswordLogin(loginInfo, loginSource = loginInfo && loginInfo.loginSource) {
      if (!this.sdkok || !loginInfo || !loginInfo.username || `${loginInfo.app_id || ''}` !== `${this.appid || ''}`) {
        return false;
      }
      this.passwordLoginContext = {
        username: loginInfo.username,
        password: loginInfo.password,
        app_id: loginInfo.app_id,
        loginSource: loginSource || 'password'
      };
      this.passwordLoginInFlight = true;
      this.getIM().login({
        name: loginInfo.username,
        password: loginInfo.password
      });
      return true;
    },

    startPasswordLogin(loginInfo, preserveAutoLoginRetry = false) {
      if (!preserveAutoLoginRetry) {
        this.clearAutoLoginRetry();
      }
      this.clearLoginNetworkRetry();
      return this.sendPasswordLogin(loginInfo, preserveAutoLoginRetry ? 'token_relogin' : 'password');
    },

    scheduleLoginNetworkRetry(reason) {
      this.passwordLoginInFlight = false;
      this.loginNetworkRetryEligible = true;
      if (!this.sdkok || !this.passwordLoginContext || this.loginNetworkRetryTimer) {
        return false;
      }
      if (this.loginNetworkRetryTimes >= AUTO_LOGIN_TIMES_MAX) {
        this.loginNetworkRetryExhausted = true;
        console.warn('Password login network retry exhausted:', reason);
        return false;
      }

      const retryIndex = this.loginNetworkRetryTimes;
      const retryCount = retryIndex + 1;
      const delay = this.retryDelay(retryIndex);
      this.loginNetworkRetryTimes = retryCount;
      this.loginNetworkRetryExhausted = false;
      console.warn(`Password login network retry ${retryCount}/${AUTO_LOGIN_TIMES_MAX} in ${delay} ms:`, reason);
      if (!this.isPasswordLoginPageVisible()) {
        this.$message({
          message: this.$t('login.networkRetrying', {
            count: retryCount,
            origin: `网络异常，正在进行第${retryCount}次登录重试`
          }),
          type: 'warning',
          duration: 1500
        });
      }
      this.loginNetworkRetryTimer = setTimeout(() => {
        this.loginNetworkRetryTimer = null;
        if (!this.sdkok || this.passwordLoginInFlight || !this.passwordLoginContext) {
          return;
        }
        this.sendPasswordLogin(this.passwordLoginContext);
      }, delay);
      return true;
    },

    scheduleRateLimitedTokenRelogin() {
      if (!this.sdkok || !this.passwordLoginContext || this.passwordLoginContext.loginSource !== 'token_relogin') {
        return false;
      }
      this.passwordLoginInFlight = false;
      this.loginNetworkRetryEligible = true;
      this.loginNetworkRetryExhausted = false;
      this.loginNetworkRetryTimer = setTimeout(() => {
        this.loginNetworkRetryTimer = null;
        if (!this.sdkok || this.passwordLoginInFlight || !this.passwordLoginContext) {
          return;
        }
        this.sendPasswordLogin(this.passwordLoginContext);
      }, LOGIN_RATE_LIMIT_RETRY_DELAY);
      return true;
    },

    handleSocketLoginPolicyFailure() {
      const initialLoginFailure = !['chatting', 'support'].includes(this.getAppStatus);
      this.passwordLoginInFlight = false;
      if (initialLoginFailure) {
        this.policyLoginRecoveryPending = true;
      }
    },

    handleNetworkOnline() {
      if (this.initNetworkRetryEligible && this.initNetworkRetryExhausted && !this.sdkok && !this.imInitLoading && !this.initNetworkRetryTimer) {
        console.log('Network online, restart Floo IM init retry');
        this.initNetworkRetryTimes = 0;
        this.initNetworkRetryExhausted = false;
        this.scheduleInitNetworkRetry('online');
        return;
      }
      if (
        this.loginNetworkRetryEligible &&
        this.loginNetworkRetryExhausted &&
        this.sdkok &&
        !this.passwordLoginInFlight &&
        !this.loginNetworkRetryTimer &&
        this.passwordLoginContext
      ) {
        console.log('Network online, restart password login retry');
        this.loginNetworkRetryTimes = 0;
        this.loginNetworkRetryExhausted = false;
        this.scheduleLoginNetworkRetry('online');
      }
    },

    getDnsErrorReason(desc) {
      if (desc === 'NoAvailableEndpoint') {
        return this.$t('error.noAvailableEndpoint');
      }
      return desc;
    },

    finishIMInit(attemptId = this.imInitAttemptId) {
      if (attemptId !== this.imInitAttemptId) {
        return;
      }
      this.imInitLoading = false;
    },

    retryIMInit(reason = 'manual_retry') {
      const targetAppID = `${this.appid || this.retrieveAppId() || ''}`.trim();
      if (!targetAppID || this.sdkok || this.imInitLoading) {
        return false;
      }
      console.log('retry floo IM init', reason, targetAppID);
      this.clearInitNetworkRetry();
      this.setupIM(targetAppID, { force: true });
      return true;
    },

    openLoginMode(mode) {
      if (this.sdkok) {
        this.$store.dispatch('login/actionChangeAppStatus', mode);
        return;
      }
      if (this.imInitLoading) {
        this.$message({
          message: this.$t('login.initializing'),
          type: 'warning',
          duration: 2000
        });
        return;
      }

      this.pendingLoginMode = mode;
      if (this.retryIMInit(`open_${mode}`)) {
        this.$message({
          message: this.$t('login.initializing'),
          type: 'warning',
          duration: 2000
        });
        return;
      }

      this.pendingLoginMode = '';
      this.$message({
        message: this.$t('login.unavailableUntilReady'),
        type: 'warning',
        duration: 2000
      });
    },

    setupIM(newAppID, { force = false, preserveInitNetworkRetry = false } = {}) {
      if (newAppID && this.imInitLoading && newAppID === this.appid) {
        console.log('Floo IM init is still loading for app:', newAppID);
        return;
      }
      // not prepare for same appid except the previous preparation is aborted;
      if (newAppID && (force || newAppID !== this.appid || !this.sdkok)) {
        const previousAppID = this.appid;
        if (!preserveInitNetworkRetry) {
          this.clearInitNetworkRetry();
        }
        if (newAppID !== previousAppID) {
          this.clearAutoLoginRetry();
          this.clearLoginNetworkRetry();
        }
        this.imInitAttemptId += 1;
        this.imInitLoading = true;
        this.sdkok = false;
        this.isAppInfoReady = false;
        this.appid = newAppID;
        if (newAppID !== previousAppID) {
          this.pendingLoginMode = '';
        }
        this.saveAppId(this.appid);

        const im = this.getIM();
        if (im && im.logout && newAppID !== previousAppID) {
          im.logout({ quitAllWeb: false });
        }

        this.initFlooIM();
        this.waitForFlooReadyAndLogin(0, this.imInitAttemptId);
      } else {
        console.log('Invalid AppID', newAppID);
      }
    },

    waitForFlooReadyAndLogin(times, attemptId = this.imInitAttemptId) {
      if (attemptId !== this.imInitAttemptId) {
        return;
      }
      if (!this.imInitLoading && !this.sdkok) {
        return;
      }
      const im = this.getIM();
      //通常来讲，初始化过程会非常快，但由于涉及网络调用，这个时间并无法保证；如果你的业务非常依赖初始化成功，请等待；
      if (im && im.isAppInfoReady && im.isAppInfoReady()) {
        if (!this.isAppInfoReady) {
          this.saveAppIdHistory(this.appid);
        }
        this.isAppInfoReady = true;
      }
      if (im && im.isReady && im.isReady()) {
        console.log('flooim 初始化成功 ', times);
        this.finishIMInit(attemptId);
        this.clearInitNetworkRetry();
        this.sdkok = true;
        if (autoLoginTimes && !this.autoLoginTimer && !this.passwordLoginInFlight) {
          const loginInfo = this.getLoginInfo();
          if (this.startPasswordLogin(loginInfo, true)) {
            console.log('SDK初始化完成，继续Token自动登录');
            return;
          }
        }
        const pendingLoginMode = this.pendingLoginMode;
        this.pendingLoginMode = '';
        if (pendingLoginMode) {
          this.$store.dispatch('login/actionChangeAppStatus', pendingLoginMode);
        } else if (this.intent.link && !this.intent.hasParseLink) {
          this.parseLink();
        } else {
          if (this.intent.code) {
            this.codeLogin();
          } else {
            this.imLogin();
          }
        }
        return;
      }
      if (times < INIT_CHECK_TIMES_MAX) {
        let that = this;
        setTimeout(() => {
          that.waitForFlooReadyAndLogin(times + 1, attemptId);
        }, 1000);
      } else {
        console.error('flooim 初始化失败，请重新初始化');
        this.finishIMInit(attemptId);
        if (!this.scheduleInitNetworkRetry('init timeout')) {
          this.alert(this.$t('error.initTimeout'));
        }
      }
    },

    initFlooIM() {
      const logLevel = process.env.NODE_ENV === 'production' ? 'off' : 'debug'; // debug|info|warn|error|off
      const config = {
        // dnsServer: "https://dns.lanyingim.com/v2/app_dns",
        appid: this.appid,
        ws: false, // uniapp版需要设置为true, web版需要设置为false
        autoLogin: this.intent.code || this.intent.link || this.pendingLoginMode ? false : true,
        logLevel: logLevel
      };
      console.log('Init floo IM for ', this.appid);

      // 1. 使用 flooim script 方式
      // try {
      //   // const im = new window.flooIM(config);
      //   this.$store.dispatch("actionSaveIm", im);
      //   this.sdkok = true;
      // } catch (ex) {
      //   // sdk not ready, should retry later
      //   console.log(ex);
      //   setTimeout(() => {
      //     this.initFlooIM();
      //   }, 500);
      // }

      // 2. 使用 flooim module 模式
      const im = flooim(config);
      this.$store.dispatch('actionSaveIm', im);
      this.addIMListeners();
    },

    flooFailError(desc) {
      const normalizedDesc = typeof desc === 'string' ? desc.toLowerCase().trim() : '';
      switch (desc) {
        case 'exceed recall time limit':
          this.alert(this.$t('当前消息已经超出允许撤回时间'));
          break;
        default:
          if (normalizedDesc.indexOf('account_verify_needed') > -1 || normalizedDesc.indexOf('verify_needed') > -1) {
            this.alert(this.$t('无法发送消息，您已被限制使用，请先完成实名认证。'));
          } else {
            this.alert(this.$t('error.operationWithReason', { reason: desc }));
          }
      }
      console.log('Floo Error: FAIL ' + desc);
    },

    addIMListeners() {
      const im = this.getIM();
      if (!im) {
        return;
      }
      if (!this.imListeners) {
        let that = this;
        this.imListeners = {
          loginSuccess: () => {
            that.policyLoginRecoveryPending = false;
            that.clearAutoLoginRetry();
            that.clearLoginNetworkRetry();
            that.clearWXMPLaunchState();
            that.$store.dispatch('login/actionChangeLoginStatus', true);
            if (that.intent.action === 'support') {
              if (that.intent.linkMode === 'lanying-support') {
                if (!that.linkChangeAccount) {
                  that.pendingSupportNavigation = !that.checkMobile();
                  that.$store.dispatch('login/actionChangeAppStatus', 'minimize');
                  parent.postMessage(
                    JSON.stringify({
                      type: 'lanying_toggle_chat',
                      size: 'minimize'
                    }),
                    '*'
                  );
                } else {
                  that.pendingSupportNavigation = false;
                  that.$store.dispatch('login/actionChangeAppStatus', 'support');
                  parent.postMessage(
                    JSON.stringify({
                      type: 'lanying_toggle_chat',
                      size: 'large'
                    }),
                    '*'
                  );
                }
              } else {
                that.pendingSupportNavigation = false;
                that.$store.dispatch('login/actionChangeAppStatus', 'support');
                parent.postMessage(
                  JSON.stringify({
                    type: 'lanying_toggle_chat',
                    size: 'large'
                  }),
                  '*'
                );
              }
            } else if (that.intent.action === 'delete') {
              that.pendingSupportNavigation = false;
              that.asyncDeleteUser();
            } else {
              that.pendingSupportNavigation = false;
              that.$store.dispatch('login/actionChangeAppStatus', 'chatting');
            }
            that.maybeRedirectToIntentPage();
            that.maybeFeedbackLoginUser();
            //that.maybeLaunchWXMP();
            let info = that.getLoginInfo();
            info.user_id = that.getIM().userManage.getUid();
            that.saveLoginInfoList(info);
            // this.bindDeviceToken( device_token, notifier_name );
          },
          loginFail: (msg) => {
            that.passwordLoginInFlight = false;
            console.log('autoLoginTimes = ' + autoLoginTimes);
            if (msg === 'socket_failure' && that.autoLoginTimer) {
              console.warn('Socket login failed, waiting for the scheduled token relogin');
              return;
            }
            if (that.passwordLoginContext && that.isRateLimitedLoginFailure(msg)) {
              that.clearAutoLoginRetry();
              if (!that.scheduleRateLimitedTokenRelogin()) {
                that.clearLoginNetworkRetry();
              }
              that.$message({
                message: that.$t('login.rateLimitedStatus', {
                  origin: '请求过于频繁，请稍后再试'
                }),
                type: 'warning',
                duration: 5000,
                showClose: true
              });
              return;
            }
            if (that.passwordLoginContext && that.isRetryableLoginFailure(msg)) {
              if (that.scheduleLoginNetworkRetry(msg)) {
                return;
              }
              that.loginNetworkRetryExhausted = true;
              that.$message({
                message: that.$t('login.networkRetryFailedStatus', {
                  origin: '网络连接失败，请检查网络后重试'
                }),
                type: 'error',
                duration: 5000,
                showClose: true
              });
              return;
            }

            const tokenReloginFailed = that.passwordLoginContext && that.passwordLoginContext.loginSource === 'token_relogin';
            const sessionRecoveryFailed = msg === 'socket_failure' && ['chatting', 'support'].includes(that.getAppStatus);
            that.clearAutoLoginRetry();
            that.clearLoginNetworkRetry();
            if (msg.includes('Operation rejected')) {
              that.alert(that.$t('登陆失败, 请检查用户名/密码/AppID是否正确'));
            } else if (msg !== 'socket_failure') {
              that.alert(that.$t('login.loginFailedWithError', { message: msg }));
            }
            if (sessionRecoveryFailed) {
              if (that.intent.action === 'support') {
                that.imLogout(true);
              } else {
                that.$store.dispatch('login/actionChangeLoginStatus', false);
                that.$store.dispatch('login/actionChangeAppStatus', 'login');
              }
            }
            if (tokenReloginFailed && !(sessionRecoveryFailed && that.intent.action === 'support')) {
              setTimeout(() => {
                that.imLogout(that.intent.action === 'support');
              }, 0);
            }
          },
          flooNotice: (msg) => {
            const { category, desc } = msg;
            console.log('Floo Notice: ' + category + ' : ' + desc);
            switch (category) {
              case 'action':
                if ('relogin' == desc) {
                  console.log('Token失效，尝试自动登录中');
                  const info = that.getLoginInfo();
                  if (that.autoLoginTimer) {
                    console.log('Token自动登录重试已在等待中');
                  } else if (info.username && autoLoginTimes < AUTO_LOGIN_TIMES_MAX) {
                    console.log('Token失效，尝试自动登录中:', autoLoginTimes);
                    if (autoLoginTimes) {
                      that.$message({
                        message: that.$t('login.retrying', { count: autoLoginTimes }),
                        type: 'warning',
                        duration: 1500
                      });
                    }
                    that.autoLoginTimer = setTimeout(() => {
                      that.autoLoginTimer = null;
                      that.startPasswordLogin(info, true);
                    }, autoLoginTimes * AUTO_LOGIN_DELAY);
                    autoLoginTimes++;
                  } else {
                    that.clearAutoLoginRetry();
                    if (!that.linkChangeAccount) {
                      console.log('自动登录失败次数过多，请手工登录。');
                      setTimeout(() => {
                        that.alert(that.$t('自动登录失败次数过多,请重新手工登录'));
                      }, 500);
                    }
                    if (that.intent.action === 'support') {
                      that.imLogout(true);
                      if (that.linkChangeAccount) {
                        setTimeout(() => {
                          that.imLogin();
                        }, 500);
                      }
                    } else if (that.intent.action === 'delete') {
                      // do nothing.
                    } else {
                      that.imLogout();
                    }
                  }
                } else if ('relogin_manually' == desc) {
                  if (that.intent.action === 'delete') {
                    // do nothing.
                  } else {
                    if (that.intent.action === 'support') {
                      that.imLogout(true);
                    } else {
                      that.alert(that.$t('请重新登录'));
                      that.imLogout();
                    }
                  }
                } else {
                  console.log('Floo Notice: unknown action ', desc);
                }
                break;
              case 'userNotice':
                console.log('Floo Notice: 收到用户/设备通知 : ', desc);
                break;
              case 'loginMessage':
                that.$store.dispatch('login/actionAddLoginLog', desc);
                break;
              case 'conversation_deleted':
                console.log('Floo Notice: 会话被删除：', desc.toString());
                break;
              default:
                console.log('Floo Notice: unknown category ' + category);
            }
          },
          flooError: (msg) => {
            const { category, desc, code } = msg;
            const initError = that.imInitLoading && !that.sdkok;
            if (initError) {
              that.finishIMInit();
            }
            switch (category) {
              case 'USER_BANNED':
                that.alert(that.$t('error.userWithReason', { reason: desc }));
                break;
              case 'DNS_FAILED':
                if (code && (code === 99998 || code === 99997)) {
                  that.pendingLoginMode = '';
                  that.clearInitNetworkRetry();
                  if (that.intent && that.intent.action === 'support') {
                    that.alert(that.$t('DNS错误: 无效AppID，重置为默认AppID'));
                    setTimeout(() => {
                      that.$store.dispatch('actionChangeAppID', 'welovemaxim');
                    }, 500);
                    let currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.delete('code');
                    currentUrl.searchParams.set('link', '3qur4g');
                    window.history.replaceState({}, document.title, currentUrl.toString());
                  } else {
                    if (that.intent.link && !that.intent.hasParseLink) {
                      that.maybeChangeLinkAppId();
                    } else {
                      that.alert(that.$t('DNS错误: 无效AppID'));
                    }
                  }
                } else {
                  if (initError && that.isRetryableInitFailure(desc)) {
                    if (that.scheduleInitNetworkRetry(desc)) {
                      break;
                    }
                  } else {
                    that.pendingLoginMode = '';
                  }
                  if (that.intent.link && !that.intent.hasParseLink) {
                    that.maybeChangeLinkAppId();
                  } else {
                    that.alert(that.$t('error.dnsWithReason', { reason: that.getDnsErrorReason(desc) }));
                  }
                }
                break;
              case 'APP_BANNED':
                that.pendingLoginMode = '';
                that.clearInitNetworkRetry();
                that.alert(that.$t('APP已被封禁！'));
                if (this.intent.link && !this.intent.hasParseLink) {
                  this.maybeChangeLinkAppId();
                }
                break;
              case 'APP_FROZEN':
                if (!initError) {
                  that.handleSocketLoginPolicyFailure();
                }
                that.pendingLoginMode = '';
                that.clearInitNetworkRetry();
                that.alert(that.$t('APP已被冻结！'));
                if (this.intent.link && !this.intent.hasParseLink) {
                  this.maybeChangeLinkAppId();
                }
                break;
              case 'APP_REVOKED':
                that.pendingLoginMode = '';
                that.clearInitNetworkRetry();
                that.alert(that.$t('AppID已失效！'));
                if (this.intent.link && !this.intent.hasParseLink) {
                  this.maybeChangeLinkAppId();
                }
                break;
              case 'LICENSE':
                that.handleSocketLoginPolicyFailure();
                that.alert(that.$t('error.serviceRenewal', { reason: desc }));
                break;
              case 'FAIL':
                that.flooFailError(desc);
                break;
              default:
                console.log('Floo Error：' + category + ' : ' + desc);
            }
          }
        };
      }
      if (im.off) {
        im.off(this.imListeners);
      }
      im.on(this.imListeners);
    },

    //如果你在原生App中集成Web版，尤其是Uniapp这样的场景，你才可能需要绑定 DeviceToken 以利用厂商推送通道。
    //其中 notifier_name 为证书名称，也即在蓝莺IM控制台内上传证书时候设置的名称。
    bindDeviceToken(device_token, notifier_name) {
      const imUser = this.getIM().userManage;
      const device_sn = imUser.getDeviceSN();
      let that = this;
      imUser
        .asyncBindDeviceToken({
          device_sn,
          device_token,
          notifier_name
        })
        .then(() => {
          that.alert(that.$t('error.bindDeviceSuccess', { sn: device_sn }));
        })
        .catch((err) => {
          that.alert(that.$t('error.bindDeviceFailed', { code: err.code, message: err.message }));
        });
    },

    unbindDeviceToken() {
      const imUser = this.getIM().userManage;
      const device_sn = imUser.getDeviceSN();
      let that = this;
      imUser
        .asyncUnbindDeviceToken({
          deviceSn: device_sn
        })
        .then(() => {
          that.alert(that.$t('error.unbindDeviceSuccess', { sn: device_sn }));
        })
        .catch((err) => {
          that.alert(that.$t('error.unbindDeviceFailed', { code: err.code, message: err.message }));
        });
    },

    parseLink() {
      const im = this.getIM();
      let that = this;
      im.sysManage
        .aysncParseLinkV2(this.intent.link)
        .then((res) => {
          that.intent.app_id = res.app_id;
          that.intent.uid = parseInt(res.uid);
          that.intent.text = res.text;
          that.intent.type = res.type;
          that.intent.hasParseLink = true;
          if (that.intent.app_id == that.appid) {
            if (that.intent.code) {
              that.codeLogin();
            } else {
              that.imLogin();
            }
          } else {
            that.$store.dispatch('actionChangeAppID', that.intent.app_id);
          }
        })
        .catch((err) => {
          that.alert(that.$t('error.invalidLink', { code: err.code, message: err.message }));
          let currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('code');
          currentUrl.searchParams.set('link', '3qur4g');
          window.history.replaceState({}, document.title, currentUrl.toString());
          window.location.replace(currentUrl.toString());
        });
    },

    maybeChangeLinkAppId() {
      const im = this.getIM();
      let that = this;
      im.sysManage
        .aysncParseLinkV2(this.intent.link)
        .then((res) => {
          that.intent.app_id = res.app_id;
          that.intent.uid = parseInt(res.uid);
          that.intent.text = res.text;
          that.intent.type = res.type;
          that.intent.hasParseLink = true;
          if (that.intent.app_id != that.appid) {
            that.$store.dispatch('actionChangeAppID', that.intent.app_id);
          } else {
            if (this.getAppStatus == 'loading') {
              this.$store.dispatch('login/actionChangeAppStatus', 'login');
            }
          }
        })
        .catch((err) => {});
    },

    codeLogin() {
      const im = this.getIM();
      let that = this;
      setTimeout(() => {
        im.userManage
          .asyncSendSecretInfo({
            code: this.intent.code
          })
          .then((res) => {
            try {
              const info = JSON.parse(res.secret_text);
              const targetAppId = `${info.app_id || that.intent.app_id || that.appid || ''}`.trim();
              that.intent.app_id = targetAppId;
              that.saveLoginInfo(info, targetAppId);
              that.intent.code = '';
              let currentUrl = new URL(window.location.href);
              currentUrl.searchParams.delete('code');
              window.history.replaceState({}, document.title, currentUrl.toString());
              if (targetAppId && targetAppId !== that.appid) {
                that.$store.dispatch('actionChangeAppID', targetAppId);
              } else {
                that.imLogin();
              }
            } catch (ex) {
              console.error('Can not parse res secret_text', ex);
              that.alert(that.$t('登录失败, 登录信息无效'));
            }
          })
          .catch((err) => {
            that.alert(that.$t('error.loginCodeInvalid', { code: err.code, message: err.message }));
          });
      }, 100);
    },

    imLogin() {
      if (!this.sdkok) {
        this.retryIMInit('im_login');
        return;
      }
      const im = this.getIM();
      if (!this.isIMLogin()) {
        const loginInfo = this.getLoginInfo();

        console.log('GOT USER: ', JSON.stringify(loginInfo));
        if (loginInfo && loginInfo.username && loginInfo.app_id == this.appid) {
          this.startPasswordLogin(loginInfo);
        } else if (loginInfo && loginInfo.user_id && loginInfo.app_id == this.appid) {
          im.idLogin({
            user_id: loginInfo.user_id,
            password: loginInfo.password
          });
        } else if (loginInfo && loginInfo.user_id && loginInfo.token && loginInfo.app_id == this.appid) {
          im.tokenLogin({
            user_id: loginInfo.user_id,
            token: loginInfo.token
          });
        } else if (this.intent.action) {
          if (this.intent.action !== 'delete') {
            this.autoRegisterAndLogin();
          }
        } else {
          console.log('没有用户信息不能登录');
        }
      }
    },

    switchLogin(info, linkLogin = false) {
      const targetAppId = info.app_id || this.appid;
      this.imLogout(linkLogin);
      this.saveLoginInfo(
        {
          username: info.username,
          password: info.password
        },
        targetAppId
      );
      if (targetAppId !== this.appid) {
        this.$store.dispatch('actionChangeAppID', targetAppId);
        return;
      }
      if (!linkLogin) {
        return;
      }
      this.imLogin();
    },

    imLogout(linkLogin = false, quitAllWeb = false) {
      this.policyLoginRecoveryPending = false;
      this.clearInitNetworkRetry();
      this.clearLoginNetworkRetry();
      this.clearAutoLoginRetry();
      this.clearWXMPLaunchState();
      if (this.intent.action === 'delete') {
        this.$store.dispatch('login/actionChangeAppStatus', 'achieve');
        this.getIM().logout({ deleteUser: true });
        this.removeLoginInfo();
      } else {
        if (!linkLogin) {
          let currentUrl = new URL(window.location.href);
          currentUrl.search = '';
          window.history.replaceState({}, document.title, currentUrl.toString());
        }
        this.getIM().logout({ quitAllWeb, linkLogin });
        this.removeLoginInfo();
        if (!linkLogin) {
          this.$store.dispatch('login/actionChangeAppStatus', 'login');
        } else {
          this.linkChangeAccount = true;
          this.$store.dispatch('layer/actionSetShowing', '');
          this.$store.dispatch('layer/actionSetShowmask', false);
          this.$store.dispatch('login/actionChangeAppStatus', 'minimize');
          parent.postMessage(
            JSON.stringify({
              type: 'lanying_toggle_chat',
              size: 'minimize'
            }),
            '*'
          );
        }
      }
    },

    isIMLogin() {
      const im = this.getIM();
      return im && im.isLogin && im.isLogin();
    },
    cryptoEncrypt(str) {
      return CryptoJS.AES.encrypt(str, INIT_LOCAL_STORE_KEY).toString();
    },

    cryptoDecrypt(str) {
      return CryptoJS.AES.decrypt(str, INIT_LOCAL_STORE_KEY).toString(CryptoJS.enc.Utf8);
    },

    saveLoginInfo(info, appid) {
      // const {name, password} = info;
      info.app_id = appid;
      info.username = info.username.replace(/\s*/g, '');
      info.password = info.password.replace(/\s*/g, '');
      let data = this.cryptoEncrypt(JSON.stringify(info));
      window.localStorage.setItem('lanying_im_logininfo', data);
      window.sessionStorage.setItem('lanying_im_logininfo', data);
    },
    getLoginInfo() {
      let info = {};
      const encryptInfo = window.sessionStorage.getItem('lanying_im_logininfo') || window.localStorage.getItem('lanying_im_logininfo') || '';
      if (encryptInfo) {
        let info_str = '';
        try {
          info_str = this.cryptoDecrypt(encryptInfo);
        } catch (ex) {
          info_str = encryptInfo;
        }

        const parsedInfo = this.tryParseJson(info_str, null);
        if (parsedInfo && typeof parsedInfo === 'object') {
          info = parsedInfo;
        } else {
          console.error('Can not parse json, remove login info: ', info_str);
          this.removeLoginInfo();
        }
      }
      return info;
    },
    removeLoginInfo() {
      window.localStorage.removeItem('lanying_im_logininfo');
      window.sessionStorage.removeItem('lanying_im_logininfo');
    },
    saveLoginInfoList(info) {
      let infoList = this.getLoginInfoList();
      try {
        if (info && info.app_id && info.username) {
          if (infoList.length) {
            infoList = infoList.filter((item) => {
              return item.app_id !== info.app_id || item.username !== info.username;
            });
          }
          infoList.unshift(info);
          let data = this.cryptoEncrypt(JSON.stringify(infoList));
          window.localStorage.setItem('lanying_im_logininfo_list', data);
        }
      } catch (ex) {
        console.error('Can not parse info list json: ');
        this.removeLoginInfoList();
      }
    },
    getLoginInfoList() {
      let infoList = [];
      const encryptInfo = window.localStorage.getItem('lanying_im_logininfo_list') || '';
      if (encryptInfo) {
        let list = '';
        try {
          list = this.cryptoDecrypt(encryptInfo);
        } catch (ex) {
          list = encryptInfo;
        }
        const parsedList = this.tryParseJson(list, null);
        if (Array.isArray(parsedList)) {
          infoList = parsedList;
        } else if (list.length) {
          console.error('Can not parse info list json: ', list);
          this.removeLoginInfoList();
        }
      }
      return infoList;
    },
    removeLoginInfoList() {
      window.localStorage.removeItem('lanying_im_logininfo_list');
    },
    saveAppId(appid) {
      const appIdValue = `${appid || ''}`.trim();
      if (!appIdValue) {
        return;
      }
      window.localStorage.setItem('lanying_im_appid', appIdValue);
      window.sessionStorage.setItem('lanying_im_appid', appIdValue);
    },
    saveAppIdHistory(appid) {
      const appIdValue = `${appid || ''}`.trim();
      if (!appIdValue) {
        return;
      }
      const appIdHistoryKey = 'lanying_im_appid_history';
      let appIdHistory = [];
      const savedHistory = window.localStorage.getItem(appIdHistoryKey) || '';
      if (savedHistory) {
        const parsedHistory = this.tryParseJson(savedHistory, []);
        if (Array.isArray(parsedHistory)) {
          appIdHistory = parsedHistory;
        }
      }
      appIdHistory = appIdHistory.filter((item) => `${item || ''}`.trim() && item !== appIdValue);
      appIdHistory.unshift(appIdValue);
      if (appIdHistory.length > 10) {
        appIdHistory = appIdHistory.slice(0, 10);
      }
      window.localStorage.setItem(appIdHistoryKey, JSON.stringify(appIdHistory));
    },
    retrieveAppId() {
      return this.intent.app_id || window.sessionStorage.getItem('lanying_im_appid') || window.localStorage.getItem('lanying_im_appid') || 'welovemaxim';
    },
    deleteUser(username, password) {
      const im = this.getIM();
      this.saveLoginInfo({ username, password }, this.appid);
      this.delPass = password;
      im.login({
        name: username,
        password: password
      });
    },
    asyncDeleteUser() {
      let that = this;
      const im = this.getIM();
      im.userManage
        .asyncDeleteUser({
          password: this.delPass
        })
        .then(() => {
          that.delPass = '';
          that.imLogout();
        })
        .catch((err) => {
          console.log('删除用户失败 code = ' + err.code + ' : ' + err.message);
          that.alert(that.$t('注销账户失败，请联系管理员'));
        });
    },
    autoRegisterAndLogin() {
      const im = this.getIM();
      var username = 'anon_';
      let password = this.generateStrongPassword(24);
      let cid = this.intent.uid;
      let that = this;
      im.userManage
        .asyncRegisterAnonymous({ username, password, cid })
        .then((res) => {
          username = res.username;
          that.saveLoginInfo({ username, password }, that.appid);
          im.login({
            name: username,
            password: password
          });
        })
        .catch((err) => {
          if (err && err.code) {
            console.log('用户注册失败 code = ' + err.code + ' : ' + err.message);
            if (err.code === 40002) {
              that.$store.dispatch('login/actionChangeAppStatus', that.intent.action === 'support' ? 'support' : 'chatting');
              this.alert(this.$t('当前APP用户数已达上限，请使用已有账号登录或联系管理员开通商业版'));
            }
          } else {
            console.log('asyncRegisterAnonymous request error, please retry later: ', err);
          }
        });
    },
    generateStrongPassword(length = 16) {
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lower = 'abcdefghijklmnopqrstuvwxyz';
      const digit = '0123456789';
      const all = upper + lower + digit;

      let password = upper[Math.floor(Math.random() * upper.length)] + lower[Math.floor(Math.random() * lower.length)] + digit[Math.floor(Math.random() * digit.length)];

      for (let i = password.length; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
      }

      return password
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');
    },
    loadIntent() {
      let params = new URL(document.location).searchParams;
      const wxmpAutoRedirectParam = params.get('wxmp_auto_redirect');
      if (wxmpAutoRedirectParam !== null) {
        const value = wxmpAutoRedirectParam.toLowerCase();
        this.autoSkip = value !== 'false' && value !== '0';
      }
      if (params.get('action') == 'chat' || params.get('action') == 'support' || params.get('action') == 'delete') {
        this.intent = {
          app_id: params.get('app_id'),
          uid: parseInt(params.get('uid')),
          text: params.get('text'),
          action: params.get('action')
        };
      }
      if (params.get('code')) {
        this.intent.code = params.get('code');
      }
      if (params.get('link')) {
        this.intent.link = params.get('link');
        this.intent.hasParseLink = false;
        this.intent.action = this.intent.action ? this.intent.action : 'support';
      }
      if (this.intent.action === 'delete') {
        this.$store.dispatch('login/actionChangeAppStatus', 'delete');
      }
      if (this.intent.action === 'support') {
        this.$store.dispatch('login/actionChangeAppStatus', 'minimize');
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_toggle_chat',
            size: 'minimize'
          }),
          '*'
        );
      }
      if (params.get('action') !== 'chat' && params.get('action') !== 'delete') {
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_link_fetch_user'
          }),
          '*'
        );
      }
    },
    maybeRedirectToIntentPage() {
      if (this.intent.action === 'chat' || this.intent.action === 'support') {
        this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
        this.$store.dispatch('content/actionSetType', {
          sid: this.intent.uid,
          type: 'rosterchat'
        });
        this.$store.dispatch('content/actionSetIntentMessage', this.intent.text);
      }
    },
    maybeFeedbackLoginUser() {
      if (this.intent.action !== 'chat' && this.intent.action !== 'delete') {
        const loginInfo = this.getLoginInfo();
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_link_feedback_support_user',
            data: JSON.stringify({
              username: loginInfo.username,
              password: loginInfo.password,
              appid: loginInfo.app_id
            })
          }),
          '*'
        );
      }
    },
    checkMobile() {
      let u = navigator.userAgent;
      let isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1;
      let isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
      if (isAndroid || isIOS || (document.body.clientHeight > document.body.clientWidth && document.body.clientWidth < 500)) {
        return true;
      } else {
        return false;
      }
    },
    needLaunch() {
      /*
      if (/(Mobi|iPhone|iPod|iPad|Android|MicroMessenger)/i.test(navigator.userAgent)) {
        bLaunch = true;
      }
      if (navigator.userAgentData && navigator.userAgentData.mobile) {
        bLaunch = true;
      }
      if (/Android|iPhone|iPad|iPod/i.test(navigator.platform)) {
        bLaunch = true;
      }*/

      let isWechat = /microMessenger/i.test(navigator.userAgent.toLowerCase()) || typeof navigator.wxuserAgent !== 'undefined';
      let isMobile = /mobile/i.test(navigator.userAgent.toLowerCase());
      return isWechat && isMobile;
    },
    maybeLaunchWXMP() {
      if (this.needLaunch() && this.autoSkip && parent) {
        this.$store.dispatch('login/actionChangeAppStatus', 'skipping');
      }
    },

    setAutoSkip(auto = false) {
      this.autoSkip = auto;
    },

    shouldAutoExpandSupportNavigation() {
      return this.pendingSupportNavigation;
    },

    consumeAutoExpandSupportNavigation() {
      this.pendingSupportNavigation = false;
    },

    getLinkUid() {
      return this.intent.uid;
    },

    clearWXMPLaunchState() {
      this.wxmpLaunchRequestId += 1;
      this.wxmpLaunchUrl = '';
      this.wxmpLaunchLink = '';
      this.wxmpLaunchPromise = null;
    },

    getWXMPEnvVersion(targetLink = '') {
      let envVersion = '';
      try {
        const pageParams = new URL(document.location).searchParams;
        envVersion = `${pageParams.get('wxmp_env') || ''}`.trim().toLowerCase();
      } catch (err) {
        console.log('Failed to parse wxmp env from page url:', err);
      }

      if (!envVersion && targetLink) {
        try {
          const linkParams = new URL(targetLink).searchParams;
          envVersion = `${linkParams.get('wxmp_env') || ''}`.trim().toLowerCase();
        } catch (err) {
          console.log('Failed to parse wxmp env from target link:', err);
        }
      }

      if (envVersion === 'trial' || envVersion === 'develop') {
        return envVersion;
      }
      return '';
    },

    launchWXMPByUrl(url) {
      this.clearWXMPLaunchState();
      if (this.shouldWakeupParent()) {
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_link_wakeup',
            data: url
          }),
          '*'
        );
      } else {
        window.location.href = url;
      }
    },

    prepareWXMPLaunch() {
      const targetLink = this.intent.link;
      if (!targetLink) {
        return Promise.reject(new Error('wxmp_launch_link_missing'));
      }
      if (this.wxmpLaunchUrl && this.wxmpLaunchLink === targetLink) {
        return Promise.resolve(this.wxmpLaunchUrl);
      }
      if (this.wxmpLaunchPromise && this.wxmpLaunchLink === targetLink) {
        return this.wxmpLaunchPromise;
      }

      const loginInfo = this.getLoginInfo();
      if (!loginInfo || !loginInfo.username || !loginInfo.password) {
        return Promise.reject(new Error('wxmp_launch_login_missing'));
      }
      const im = this.getIM();
      const envVersion = this.getWXMPEnvVersion(targetLink);
      const requestId = this.wxmpLaunchRequestId + 1;
      this.wxmpLaunchRequestId = requestId;
      this.wxmpLaunchUrl = '';
      this.wxmpLaunchLink = targetLink;
      this.wxmpLaunchPromise = im.userManage
        .asyncGenerateSecretInfo({
          expire_seconds: 60,
          secret_text: JSON.stringify({
            username: loginInfo.username,
            password: loginInfo.password
          })
        })
        .then((res) => {
          return im.userManage.aysncGenerateWXUrlLink({
            path: 'pages/profile/index',
            query: 'link=' + targetLink + '&code=' + res.code,
            ...(envVersion ? { envVersion } : {})
          });
        })
        .then((res) => {
          if (this.wxmpLaunchRequestId !== requestId || this.intent.link !== targetLink) {
            return '';
          }
          this.wxmpLaunchUrl = res.url_link;
          return res.url_link;
        })
        .catch((err) => {
          if (this.wxmpLaunchRequestId === requestId) {
            this.clearWXMPLaunchState();
          }
          throw err;
        })
        .finally(() => {
          if (this.wxmpLaunchRequestId === requestId) {
            this.wxmpLaunchPromise = null;
          }
        });
      return this.wxmpLaunchPromise;
    },

    fallbackFromWXMPSkipping(err, stage) {
      const code = err && typeof err.code !== 'undefined' ? err.code : 'unknown';
      const message = err && err.message ? err.message : err;
      console.log('微信小程序跳转失败，返回 support 页面: stage ' + stage + ', code ' + code + ' : ' + message);
      this.clearWXMPLaunchState();
      this.setAutoSkip(false);
      if (this.getAppStatus === 'skipping') {
        this.$store.dispatch('login/actionChangeAppStatus', 'support');
      }
    },

    shouldWakeupParent() {
      if (typeof parent === 'undefined' || !parent || parent === window) {
        return false;
      }
      return this.intent.linkMode === 'lanying-link' || this.intent.linkMode === 'lanying-support';
    },

    linkLaunchWXMP() {
      const targetLink = this.intent.link;
      this.prepareWXMPLaunch()
        .then((url) => {
          if (!url || this.intent.link !== targetLink) {
            return;
          }
          this.launchWXMPByUrl(url);
        })
        .catch((err) => {
          const code = err && typeof err.code !== 'undefined' ? err.code : 'unknown';
          const message = err && err.message ? err.message : err;
          console.log('微信小程序跳转异常: code ' + code + ' : ' + message);
        });
    },
    alert(msg) {
      const translated = this.$translateText(msg);
      if (this.intent.action === 'support') {
        this.showSnackbar(translated);
      } else {
        window.alert(translated);
      }
    },
    showSnackbar(msg) {
      var x = document.getElementById('lanying-snackbar');
      x.className = 'show';
      x.innerHTML = this.$translateText(msg);
      setTimeout(function () {
        x.className = x.className.replace('show', '');
      }, 2500);
    }
  }
};
</script>

<style scoped></style>
