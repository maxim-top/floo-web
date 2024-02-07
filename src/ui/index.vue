<template>
  <div class="ui-index">
    <base target="_blank" />
    <div class="layer_mask" v-if="getShowmask"></div>
    <div id="lanying-snackbar"></div>
    <Chatting v-if="getAppStatus == 'chatting'" />
    <Support v-else-if="getAppStatus == 'support'" />
    <Login :appid="appid" :sdkok="sdkok" v-else />
    <Layers />
  </div>
</template>

<script>
import Login from './login/index.vue';
import Chatting from './chatting/index.vue';
import Support from './support/index.vue';
import Layers from './layers/index.vue';
import { mapGetters } from 'vuex';
var JSONBigString = require('json-bigint');

// 您有两种方式使用 flooim：
// 1. script 模式，你可以直接 import 后，使用 window.flooIM()
// 这种方式主要为支持浏览器中使用 script 标签引用，但会存在初始化并发问题，所以要用 try-catch-retry，具体使用方法见下文。
// import '../sdk/index';
// 2. module 方式，import flooim 后，使用 flooim()
import flooim from '../sdk/index';

const AUTO_LOGIN_DELAY = 2000; // ms
const AUTO_LOGIN_TIMES_MAX = 3;
let autoLoginTimes = 0;
const INIT_CHECK_TIMES_MAX = 20;

export default {
  name: 'index',
  components: {
    Login,
    Chatting,
    Support,
    Layers
  },
  data() {
    return {
      appid: '',
      sdkok: false,
      intent: {}
    };
  },
  mounted() {
    let that = this;
    window.addEventListener('message', function (event) {
      if (event.origin.startsWith('https://www.lanyingim.com') || event.origin.startsWith('https://lanying.link') || event.origin.startsWith('https://link.lanyingim.com')) {
        if (event.data) {
          let data = JSON.parse(event.data);
          if (data.type === 'lanying_link_support_user' && data.data) {
            try {
              let info = JSON.parse(data.data);
              that.saveLoginInfo({ username: info.username, password: info.password }, info.appid);
            } catch (ex) {
              console.error('Can not parse info in lanying_link_support_user');
            }
          }
        }
      }
    });
    setTimeout(() => {
      this.loadIntent();
      setTimeout(() => {
        this.appid = this.retrieveAppId();
        this.$store.dispatch('actionChangeAppID', this.appid);
      }, 200);
    }, 100);
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
    getIM() {
      return this.$store.state.im;
    },

    setupIM(newAppID) {
      // not prepare for same appid except the previous preparation is aborted;
      if (newAppID && (newAppID !== this.appid || !this.sdkok)) {
        this.sdkok = false;
        this.appid = newAppID;
        this.saveAppId(this.appid);

        const im = this.getIM();
        im && im.logout && im.logout();

        this.initFlooIM();
        this.waitForFlooReadyAndLogin(0);
      } else {
        console.log('Invalid AppID', newAppID);
      }
    },

    waitForFlooReadyAndLogin(times) {
      const im = this.getIM();
      //通常来讲，初始化过程会非常快，但由于涉及网络调用，这个时间并无法保证；如果你的业务非常依赖初始化成功，请等待；
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

    addIMListeners() {
      let that = this;
      this.getIM().on({
        loginSuccess: () => {
          that.$store.dispatch('login/actionChangeAppStatus', that.intent.action === 'support' ? 'support' : 'chatting');
          that.maybeRedirectToIntentPage();
          that.maybeFeedbackLoginUser();
          that.maybeLaunchWXMP();
          let info = that.getLoginInfo();
          info.user_id = that.getIM().userManage.getUid();
          that.saveLoginInfoList(info);
          // this.bindDeviceToken( device_token, notifier_name );
        },
        loginFail: (msg) => {
          that.alert('登陆失败, error: ' + msg);
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
                  setTimeout(() => {
                    that.getIM().login({
                      name: info.username,
                      password: info.password
                    });
                  }, autoLoginTimes * AUTO_LOGIN_DELAY);
                  autoLoginTimes++;
                } else {
                  console.log('自动登录失败次数过多，请手工登录。');
                  autoLoginTimes = 0;
                  that.alert('请重新登录');
                  that.imLogout();
                }
              } else if ('relogin_manually' == desc) {
                that.alert('请重新登录');
                that.imLogout();
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
          const { category, desc } = msg;
          switch (category) {
            case 'USER_BANNED':
              that.alert('用户错误: ' + desc);
              break;
            case 'DNS_FAILED':
              that.alert('DNS错误: 无法访问 ' + desc);
              break;
            case 'LICENSE':
              that.alert('服务需要续费: ' + desc);
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
          that.alert('设备绑定成功: ' + device_sn);
        })
        .catch((err) => {
          that.alert('设备绑定失败: ' + err.code + ':' + err.message);
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
          that.alert('设备解绑成功: ' + device_sn);
        })
        .catch((err) => {
          that.alert('设备解绑失败: ' + err.code + ':' + err.message);
        });
    },

    parseLink() {
      const im = this.getIM();
      const linkServer = im.sysManage.getLinkServer();
      let that = this;
      im.sysManage
        .aysncParseLink(linkServer, {
          link: this.intent.link
        })
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
          that.alert('Link无效： ' + err.code + ':' + err.message);
        });
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
            const info = JSON.parse(res.secret_text);
            that.saveLoginInfo(info, that.intent.app_id);
            let currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('code');
            window.history.replaceState({}, document.title, currentUrl.toString());
            that.imLogin();
          })
          .catch((err) => {
            that.alert('登录失败, code无效 : ' + err.code + ' ' + err.message);
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
          this.autoRegisterAndLogin();
        } else {
          console.log('没有用户信息不能登录');
        }
      }
    },

    switchLogin(info) {
      this.imLogout();
      this.saveLoginInfo(
        {
          username: info.username,
          password: info.password
        },
        info.app_id
      );
      this.$store.dispatch('actionChangeAppID', info.app_id);
    },

    imLogout() {
      let currentUrl = new URL(window.location.href);
      currentUrl.search = '';
      window.history.replaceState({}, document.title, currentUrl.toString());
      this.getIM().logout();
      this.removeLoginInfo();
      this.$store.dispatch('login/actionChangeAppStatus', 'login');
    },

    isIMLogin() {
      const im = this.getIM();
      return im && im.isLogin && im.isLogin();
    },
    saveLoginInfo(info, appid) {
      // const {name, password} = info;
      info.app_id = appid;
      window.localStorage.setItem('lanying_im_logininfo', JSON.stringify(info));
    },
    getLoginInfo() {
      const info_str = window.localStorage.getItem('lanying_im_logininfo') || {};
      let info = {};
      try {
        info = JSONBigString.parse(info_str);
      } catch (ex) {
        console.error('Can not parse json, remove login info: ', info_str);
        this.removeLoginInfo();
      }
      return info;
    },
    removeLoginInfo() {
      window.localStorage.removeItem('lanying_im_logininfo');
    },
    saveLoginInfoList(info) {
      const list = window.localStorage.getItem('lanying_im_logininfo_list') || '';
      let infoList = [];
      try {
        if (info && info.app_id && info.username) {
          if (list.length) {
            infoList = JSONBigString.parse(list);
          }
          if (infoList.length) {
            infoList = infoList.filter((item) => {
              return item.app_id !== info.app_id || item.username !== info.username;
            });
          }
          infoList.unshift(info);
          window.localStorage.setItem('lanying_im_logininfo_list', JSONBigString.stringify(infoList));
        }
      } catch (ex) {
        console.error('Can not parse info list json: ', list);
        this.removeLoginInfoList();
      }
    },
    getLoginInfoList() {
      const list = window.localStorage.getItem('lanying_im_logininfo_list') || '';
      let infoList = [];
      try {
        if (list.length) {
          infoList = JSONBigString.parse(list);
        }
      } catch (ex) {
        console.error('Can not parse info list json: ', list);
        this.removeLoginInfoList();
      }
      return infoList;
    },
    removeLoginInfoList() {
      window.localStorage.removeItem('lanying_im_logininfo_list');
    },
    saveAppId(appid) {
      window.localStorage.setItem('lanying_im_appid', appid);
    },
    retrieveAppId() {
      return this.intent.app_id || window.localStorage.getItem('lanying_im_appid') || 'welovemaxim';
    },
    autoRegisterAndLogin() {
      const im = this.getIM();
      var username = 'anon_';
      let password = '' + new Date().getTime() + Math.floor(Math.random() * 1000000000) + Math.floor(Math.random() * 1000000000);
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
              this.alert('当前APP用户数已达上限，请使用已有账号登录或联系管理员开通商业版');
            }
          } else {
            console.log('asyncRegisterAnonymous request error, please retry later: ', err);
          }
        });
    },
    loadIntent() {
      let params = new URL(document.location).searchParams;
      if (params.get('action') == 'chat' || params.get('action') == 'support') {
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
      if (params.get('action') !== 'chat') {
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
      if (this.intent.action !== 'chat') {
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
    needLaunch() {
      let bLaunch = false;
      if (/(MicroMessenger)/i.test(navigator.userAgent)) {
        bLaunch = true;
      }
      if (/(Macintosh|Intel|Windows)/i.test(navigator.userAgent)) {
        bLaunch = false;
      }
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

      return bLaunch;
    },
    maybeLaunchWXMP() {
      if (this.needLaunch() && parent) {
        const loginInfo = this.getLoginInfo();
        const im = this.getIM();
        im.userManage
          .asyncGenerateSecretInfo({
            expire_seconds: 60,
            secret_text: JSON.stringify({
              username: loginInfo.username,
              password: loginInfo.password
            })
          })
          .then((res) => {
            let query = 'link=' + this.intent.link + '&code=' + res.code;
            im.userManage
              .aysncGenerateWXUrlLink({
                path: 'pages/profile/index',
                query: query
              })
              .then((res) => {
                parent.postMessage(
                  JSON.stringify({
                    type: 'lanying_link_wakeup',
                    data: res.url_link
                  }),
                  '*'
                );
              })
              .catch((err) => {
                console.log('生成微信 url link 异常: code ' + err.code + ' : ' + err.message);
              });
          })
          .catch((err) => {
            console.log('获取登录凭证 code 异常: code ' + err.code + ' : ' + err.message);
          });
      }
    },
    alert(msg) {
      if (this.intent.action === 'support') {
        this.showSnackbar(msg);
      } else {
        window.alert(msg);
      }
    },
    showSnackbar(msg) {
      var x = document.getElementById('lanying-snackbar');
      x.className = 'show';
      x.innerHTML = msg;
      setTimeout(function () {
        x.className = x.className.replace('show', '');
      }, 2500);
    }
  }
};
</script>

<style scoped></style>
