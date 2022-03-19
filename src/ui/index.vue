<template>
  <div class="ui-index">
    <div class="layer_mask" v-if="getShowmask"></div>
    <Chatting v-if="getAppStatus == 'chatting'" />
    <Login :appid="appid" :sdkok="sdkok" v-else />
    <Layers />
  </div>
</template>

<script>
import Login from './login/index.vue';
import Chatting from './chatting/index.vue';
import Layers from './layers/index.vue';
import { mapGetters } from 'vuex';

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
    Layers
  },
  data() {
    return {
      appid: '',
      sdkok: false
    };
  },
  mounted() {
    this.appid = this.retrieveAppId();
    this.$store.dispatch('actionChangeAppID', this.appid);
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
        this.imLogin();
        return;
      }
      if (times < INIT_CHECK_TIMES_MAX) {
        setTimeout(() => this.waitForFlooReadyAndLogin(times + 1), 1000);
      } else {
        console.error('flooim 初始化失败，请重新初始化');
      }
    },

    initFlooIM() {
      const config = {
        // dnsServer: "https://dns.maximtop.com/v2/app_dns",
        appid: this.appid,
        ws: false,
        autoLogin: true
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
      this.getIM().on({
        loginSuccess: () => {
          this.$store.dispatch('login/actionChangeAppStatus', 'chatting');
          // this.bindDeviceToken( device_token, notifier_name );
        },
        loginFail: (msg) => {
          window.alert('登陆失败, error: ' + msg);
        },
        flooNotice: (msg) => {
          const { category, desc } = msg;
          console.log('Floo Notice: ' + category + ' : ' + desc);
          switch (category) {
            case 'action':
              if ('relogin' == desc) {
                console.log('Token失效，尝试自动登录中');
                const info = this.getLoginInfo();
                if (info.name && autoLoginTimes < AUTO_LOGIN_TIMES_MAX) {
                  console.log('Token失效，尝试自动登录中:', autoLoginTimes);
                  setTimeout(() => {
                    this.getIM().login(info);
                  }, autoLoginTimes * AUTO_LOGIN_DELAY);
                  autoLoginTimes++;
                } else {
                  console.log('自动登录失败次数过多，请手工登录。');
                  autoLoginTimes = 0;
                  window.alert('请重新登录');
                  this.imLogout();
                }
              } else if ('relogin_manually' == desc) {
                window.alert('请重新登录');
                this.imLogout();
              } else {
                console.log('Floo Notice: unknown action ', desc);
              }
              break;
            case 'userNotice':
              console.log('Floo Notice: 收到用户/设备通知 : ', desc);
              break;
            case 'loginMessage':
              this.$store.dispatch('login/actionAddLoginLog', desc);
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
              window.alert('用户错误: ' + desc);
              break;
            case 'DNS_FAILED':
              window.alert('DNS错误: 无法访问 ' + desc);
              break;
            case 'LICENSE':
              window.alert('服务需要续费: ' + desc);
              break;
            default:
              console.log('Floo Error：' + category + ' : ' + desc);
          }
        }
      });
    },

    //如果你在原生App中集成Web版，尤其是Uniapp这样的场景，你才可能需要绑定 DeviceToken 以利用厂商推送通道。
    //其中 notifier_name 为证书名称，也即在美信拓扑控制台内上传证书时候设置的名称。
    bindDeviceToken(device_token, notifier_name) {
      const imUser = this.getIM().userManage;
      const device_sn = imUser.getDeviceSN();
      imUser
        .asyncBindDeviceToken({
          device_sn,
          device_token,
          notifier_name
        })
        .then(() => {
          window.alert('设备绑定成功: ' + device_sn);
        })
        .catch((err) => {
          window.alert('设备绑定失败: ' + err.code + ':' + err.errMsg);
        });
    },
    unbindDeviceToken() {
      const imUser = this.getIM().userManage;
      const device_sn = imUser.getDeviceSN();
      imUser
        .asyncUnbindDeviceToken({
          deviceSn: device_sn
        })
        .then(() => {
          window.alert('设备解绑成功: ' + device_sn);
        })
        .catch((err) => {
          window.alert('设备解绑失败: ' + err.code + ':' + err.errMsg);
        });
    },

    imLogin() {
      const im = this.getIM();
      if (!this.isIMLogin()) {
        const loginInfo = this.getLoginInfo();

        console.log('GOT USER: ', JSON.stringify(loginInfo));
        if (loginInfo && loginInfo.username) {
          im.login({
            //TODO: change name to username
            name: loginInfo.username,
            password: loginInfo.password
          });
        } else if (loginInfo && loginInfo.user_id) {
          im.idLogin({
            user_id: loginInfo.user_id,
            password: loginInfo.password
          });
        } else {
          console.log('没有用户信息不能登录');
        }
      }
    },

    imLogout() {
      this.getIM().logout();
      this.removeLoginInfo();
      this.$store.dispatch('login/actionChangeAppStatus', 'login');
    },

    isIMLogin() {
      const im = this.getIM();
      return im && im.isLogin && im.isLogin();
    },
    saveLoginInfo(info) {
      // const {name, password} = info;
      window.localStorage.setItem('lanying_im_logininfo', JSON.stringify(info));
    },
    getLoginInfo() {
      const info_str = window.localStorage.getItem('lanying_im_logininfo') || {};
      let info = {};
      try {
        info = JSON.parse(info_str);
      } catch (ex) {
        console.error('Can not parse json, remove login info: ', info_str);
        this.removeLoginInfo();
      }
      return info;
    },
    removeLoginInfo() {
      window.localStorage.removeItem('lanying_im_logininfo');
    },
    saveAppId(appid) {
      window.localStorage.setItem('lanying_im_appid', appid);
    },
    retrieveAppId() {
      return window.localStorage.getItem('lanying_im_appid') || 'welovemaxim';
    }
  }
};
</script>

<style scoped></style>
