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
    <Login :appid="appid" :sdkok="sdkok" :isAppInfoReady="isAppInfoReady" v-else />
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
let autoLoginTimes = 0;
const INIT_CHECK_TIMES_MAX = 20;
const INIT_LOCAL_STORE_KEY = 'vCcjfL6fTO27zqVi';

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
      wxmpLaunchRequestId: 0
    };
  },
  beforeMount() {
    window.addEventListener('message', this.handleParentMessage);
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
    window.removeEventListener('message', this.handleParentMessage);
  },
  watch: {
    getAppID: {
      handler(newAppID) {
        this.setupIM(newAppID);
      },
      immediate: true
    }
  },
  computed: {
    ...mapGetters('login', ['getAppStatus', 'getMobileSign', 'getSignMobile']),
    ...mapGetters('layer', ['getShowmask']),
    ...mapGetters(['getAppID']),

    showLogin() {
      return this.getAppStatus != 'chatting';
    },

    showChatting() {
      return this.getAppStatus === 'chatting';
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

    setupIM(newAppID) {
      // not prepare for same appid except the previous preparation is aborted;
      if (newAppID && (newAppID !== this.appid || !this.sdkok)) {
        this.sdkok = false;
        this.isAppInfoReady = false;
        this.appid = newAppID;
        this.saveAppId(this.appid);

        const im = this.getIM();
        im && im.logout && im.logout({ quitAllWeb: false });

        this.initFlooIM();
        this.waitForFlooReadyAndLogin(0);
      } else {
        console.log('Invalid AppID', newAppID);
      }
    },

    waitForFlooReadyAndLogin(times) {
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
        this.sdkok = true;
        if (this.intent.link && !this.intent.hasParseLink) {
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
          that.waitForFlooReadyAndLogin(times + 1);
        }, 1000);
      } else {
        console.error('flooim 初始化失败，请重新初始化');
      }
    },

    initFlooIM() {
      const logLevel = process.env.NODE_ENV === 'production' ? 'off' : 'debug'; // debug|info|warn|error|off
      const config = {
        // dnsServer: "https://dns.lanyingim.com/v2/app_dns",
        appid: this.appid,
        ws: false, // uniapp版需要设置为true, web版需要设置为false
        autoLogin: this.intent.code || this.intent.link ? false : true,
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
      let that = this;
      this.getIM().on({
        loginSuccess: () => {
          autoLoginTimes = 0;
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
          console.log('autoLoginTimes = ' + autoLoginTimes);
          if (autoLoginTimes) {
            console.log('登陆失败, error: ' + msg);
          } else if (msg.includes('Operation rejected')) {
            that.alert(that.$t('登陆失败, 请检查用户名/密码/AppID是否正确'));
          } else {
            that.alert(that.$t('login.loginFailedWithError', { message: msg }));
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
                if (info.username && autoLoginTimes < AUTO_LOGIN_TIMES_MAX) {
                  console.log('Token失效，尝试自动登录中:', autoLoginTimes);
                  if (autoLoginTimes) {
                    that.$message({
                      message: that.$t('login.retrying', { count: autoLoginTimes }),
                      type: 'warning',
                      duration: 1500
                    });
                  }
                  setTimeout(() => {
                    that.getIM().login({
                      name: info.username,
                      password: info.password
                    });
                  }, autoLoginTimes * AUTO_LOGIN_DELAY);
                  autoLoginTimes++;
                } else {
                  autoLoginTimes = 0;
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
          switch (category) {
            case 'USER_BANNED':
              that.alert(that.$t('error.userWithReason', { reason: desc }));
              break;
            case 'DNS_FAILED':
              if (code && (code === 99998 || code === 99997)) {
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
                if (that.intent.link && !that.intent.hasParseLink) {
                  that.maybeChangeLinkAppId();
                } else {
                  that.alert(that.$t('error.dnsWithReason', { reason: desc }));
                }
              }
              break;
            case 'APP_BANNED':
              that.alert(that.$t('APP已被封禁！'));
              if (this.intent.link && !this.intent.hasParseLink) {
                this.maybeChangeLinkAppId();
              }
              break;
            case 'APP_FROZEN':
              that.alert(that.$t('APP已被冻结！'));
              if (this.intent.link && !this.intent.hasParseLink) {
                this.maybeChangeLinkAppId();
              }
              break;
            case 'APP_REVOKED':
              that.alert(that.$t('AppID已失效！'));
              if (this.intent.link && !this.intent.hasParseLink) {
                this.maybeChangeLinkAppId();
              }
              break;
            case 'LICENSE':
              that.alert(that.$t('error.serviceRenewal', { reason: desc }));
              break;
            case 'FAIL':
              that.flooFailError(desc);
              break;
            default:
              console.log('Floo Error：' + category + ' : ' + desc);
          }
        }
      });
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
      const im = this.getIM();
      if (!this.isIMLogin()) {
        const loginInfo = this.getLoginInfo();

        console.log('GOT USER: ', JSON.stringify(loginInfo));
        if (loginInfo && loginInfo.username && loginInfo.app_id == this.appid) {
          im.login({
            //TODO: change name to username
            name: loginInfo.username,
            password: loginInfo.password
          });
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
