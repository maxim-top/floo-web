import io from './io/index';
import { infoStore, recentStore, messageStore, rosterStore, groupStore } from '../../utils/store';
import log from '../../utils/log';
import { bind, fire, unBind } from '../../utils/cusEvent';
import './messageReceiver';
import rosterManage from '../../manage/rosterManage';
import groupManage from '../../manage/groupManage';
import dnsManager from '../../manage/dnsManager';
import userManage from '../../manage/userManage';
/**
 * @module flooim
 */
let config = {};
let loginSwap = null;
let sdkOk = false;
let isLogin = false;
let stopAutoLogin = false;
/**
 * 初始化SDK
 * @function flooim
 * @static
 * @param {object} config SDK初始化设置
 * @param {string} config.appid APPID
 * @param {boolean} config.ws 连接地址前缀是否为ws/wss: true - 连接地址前缀为ws或wss, false - 连接地址前缀为http/https
 * @param {boolean} config.autoLogin 是否自动登录
 * @param {(string|undefined)} config.dnsServer DNS服务器地址， 可以不设置，默认为 https://dns.lanyingim.com/v2/app_dns
 * @param {string} config.logLevel SDK的日志等级， 默认为debug, 取值为 debug、info、warn、error 或 off, 其中off为不打印日志。
 * @returns {object} flooim对象
 * @example
 * const config = {
 * // dnsServer: "https://dns.lanyingim.com/v2/app_dns",
 * appid: "YOUR_APP_ID",
 * ws: false, // uniapp版需要设置为true, web版需要设置为false
 * autoLogin: true
 * };
 * import flooim from 'floo-3.0.0';
 * const im = flooim(config);
 * {% lanying_code_snippet repo="lanying-im-web",class="",function="flooim" %}{% endlanying_code_snippet %}
 */
const webim = function ({
  autoLogin = true,
  dnsServer = 'https://dns.lanyingim.com/v2/app_dns',
  appid = 'welovemaxim',
  ws = false,
  logLevel = 'debug',
  linkServer = 'https://lanying.link/info'
}) {
  log.setLogLevel(logLevel);
  infoStore.saveAppid(appid);
  infoStore.saveLinkServer(linkServer);
  stopAutoLogin = window.sessionStorage.getItem('key_stop_auto_login') || false;
  dnsManager
    .asyncGetDns(dnsServer, appid, ws)
    .then((res) => {
      const { ratel, fireplace } = res;
      if (!ratel || !fireplace) {
        log.log('DNS error, check the server: ', dnsServer);
        fire('flooError', { category: 'DNS_FAILED', desc: dnsServer });
        return;
      }

      setup_servers(appid);

      config = {
        appid,
        baseUrl: ratel,
        autoLogin: stopAutoLogin ? false : autoLogin,
        fireplace
      };
      webim.baseUrl = config.baseUrl;
      sdkOk = true;

      if (loginSwap) {
        const { type } = loginSwap;
        if (type == 'login') webim.login(loginSwap.opt);
        if (type == 'qrlogin') webim.qrlogin(loginSwap.opt);
        if (type == 'tokenLogin') webim.tokenLogin(loginSwap.user_id, loginSwap.token);
        return;
      }

      if (config.autoLogin) {
        isLogin = true;
        const user_id = infoStore.getUid();
        const token = infoStore.getToken();
        const tokenAppId = infoStore.getTokenAppId();
        if (user_id && token && tokenAppId == appid) {
          infoStore.saveUid(user_id);
          const rosterRequest = rosterManage.asyncGetRosterIdList(true);
          const groupRequet = groupManage.asyncGetJoinedGroups(true);
          Promise.all([rosterRequest, groupRequet])
            .then((res) => {
              const rosters = res[0];
              const groups = res[1];
              fire('imRostersGroupslistReady', {
                rosters,
                groups
              });
              log.log('get roster, group over .... will io connect');
              io.connect(config);
            })
            .catch((ex) => {
              fire('flooNotice', {
                category: 'loginMessage',
                desc: 'get roster list failure:' + ex.message
              });
            });
        }
      }
    })
    .catch((ex) => {
      console.log('flooim init error, please retry later: ', ex);
      fire('flooError', { category: 'DNS_FAILED', desc: ex.message });
    });
};

const setup_servers = function (appID) {
  log.log('setup servers for app: ', appID);
  const { ratel, fireplace } = dnsManager.getServers(appID) || {};
  fire('refresh_ratel', ratel);
  fire('refresh_fireplace', fireplace);
};

// 系统相关 ////////////////////////////////////////////////////////////
/**
 * 登录
 * @function login
 * @static
 * @param {object} opt
 * @param {string} opt.name - 用户名
 * @param {string} opt.password - 密码
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="login" %}{% endlanying_code_snippet %}
 */
webim.login = function (opt) {
  console.log('webim.login', opt, 'sdkOk:', sdkOk);
  if (!sdkOk) {
    loginSwap = {
      type: 'login',
      opt
    };
    return;
  }
  fire('flooNotice', { category: 'loginMessage', desc: 'getting token...' });
  io.tokenUser(opt)
    .then((res) => {
      const { token, user_id, public_key } = res;
      infoStore.saveUid(user_id);
      infoStore.saveToken(token);
      infoStore.saveTokenAppId(infoStore.getAppid());
      infoStore.saveAesKey(public_key);
      const rosterRequest = rosterManage.asyncGetRosterIdList(true);
      const groupRequet = groupManage.asyncGetJoinedGroups(true);
      console.log('Get token success');
      isLogin = true;

      fire('flooNotice', {
        category: 'loginMessage',
        desc: 'token sucecc, getting roster lists..'
      });
      Promise.all([rosterRequest, groupRequet])
        .then((res) => {
          const rosters = res[0];
          const groups = res[1];
          fire('imRostersGroupslistReady', {
            rosters,
            groups
          });
          log.log('get roster, group over .... will io connect');
          config = Object.assign(
            {
              uid: user_id,
              token
            },
            config
          );
          io.connect(config);
          loginSwap = null;
        })
        .catch((ex) => {
          fire('flooNotice', {
            category: 'loginMessage',
            desc: 'get roster list failure:' + ex.message
          });
        });
    })
    .catch((ex) => {
      fire('loginFail', 'token failure:' + ex.message);
    });
};

/**
 * 二维码登录
 * @function qrlogin
 * @static
 * @param {object} opt
 * @param {number} opt.user_id 用户ID
 * @param {string} opt.password 密码
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="qrlogin" %}{% endlanying_code_snippet %}
 */
webim.qrlogin = function (opt) {
  console.log('webim.qrlogin', opt);
  if (!sdkOk) {
    loginSwap = {
      type: 'qrlogin',
      opt
    };
    return;
  }

  fire('flooNotice', { category: 'loginMessage', desc: 'getting token...' });
  io.tokenId(opt)
    .then((res) => {
      const { token, user_id, public_key } = res;
      infoStore.saveUid(user_id);
      infoStore.saveToken(token);
      infoStore.saveTokenAppId(infoStore.getAppid());
      infoStore.saveAesKey(public_key);
      const rosterRequest = rosterManage.asyncGetRosterIdList(true);
      const groupRequet = groupManage.asyncGetJoinedGroups(true);
      fire('flooNotice', {
        category: 'loginMessage',
        desc: 'token sucecc, getting roster lists..'
      });
      isLogin = true;

      Promise.all([rosterRequest, groupRequet])
        .then((res) => {
          const rosters = res[0];
          const groups = res[1];
          fire('imRostersGroupslistReady', {
            rosters,
            groups
          });
          log.log('get roster, group over .... will io connect');
          config = Object.assign(
            {
              uid: user_id,
              token
            },
            config
          );
          io.connect(config);
          loginSwap = null;
        })
        .catch((ex) => {
          fire('flooNotice', {
            category: 'loginMessage',
            desc: 'get roster list failure:' + ex.message
          });
        });
    })
    .catch((ex) => {
      fire('loginFail', 'token failure:' + ex.message);
    });
};

/**
 * token登录
 * @function tokenLogin
 * @static
 * @param {number} user_id 用户ID
 * @param {string} token Token
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="tokenLogin" %}{% endlanying_code_snippet %}
 */
webim.tokenLogin = function (user_id, token, public_key) {
  console.log('webim.tokenLogin', user_id);
  if (!sdkOk) {
    loginSwap = {
      type: 'tokenLogin',
      user_id,
      token
    };
    return;
  }

  infoStore.saveUid(user_id);
  infoStore.saveToken(token);
  infoStore.saveTokenAppId(infoStore.getAppid());
  infoStore.saveAesKey(public_key);
  const rosterRequest = rosterManage.asyncGetRosterIdList(true);
  const groupRequet = groupManage.asyncGetJoinedGroups(true);
  fire('flooNotice', {
    category: 'loginMessage',
    desc: 'token sucecc, getting roster lists..'
  });
  isLogin = true;

  Promise.all([rosterRequest, groupRequet])
    .then((res) => {
      const rosters = res[0];
      const groups = res[1];
      fire('imRostersGroupslistReady', {
        rosters,
        groups
      });
      log.log('get roster, group over .... will io connect');
      config = Object.assign(
        {
          uid: user_id,
          token
        },
        config
      );
      io.connect(config);
      loginSwap = null;
    })
    .catch((ex) => {
      fire('flooNotice', {
        category: 'loginMessage',
        desc: 'get roster list failure:' + ex.message
      });
    });
};

// 系统相关 ////////////////////////////////////////////////////////////
/**
 * 使用用户ID和密码登录
 * @function idLogin
 * @static
 * @param {object} opt
 * @param {number} opt.user_id 用户ID
 * @param {string} opt.password 密码
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="idLogin" %}{% endlanying_code_snippet %}
 */
webim.idLogin = function (opt) {
  io.tokenId(opt)
    .then((res) => {
      const { token, user_id, public_key } = res;
      infoStore.saveUid(user_id);
      infoStore.saveToken(token);
      infoStore.saveTokenAppId(infoStore.getAppid());
      infoStore.saveAesKey(public_key);
      const rosterRequest = rosterManage.asyncGetRosterIdList(true);
      const groupRequet = groupManage.asyncGetJoinedGroups(true);
      fire('flooNotice', {
        category: 'loginMessage',
        desc: 'token success, getting roster lists..'
      });
      isLogin = true;

      Promise.all([rosterRequest, groupRequet])
        .then((res) => {
          const rosters = res[0] || [];
          rosters.push(user_id);
          const groups = res[1];
          fire('imRostersGroupslistReady', { rosters, groups });
          log.log('get roster, group over .... will io connect');
          config = Object.assign({ uid: user_id, token }, config);
          io.connect(config);
          loginSwap = null;
        })
        .catch((ex) => {
          fire('flooNotice', {
            category: 'loginMessage',
            desc: 'get roster list failure:' + ex.message
          });
        });
    })
    .catch((ex) => {
      fire('loginFail', 'token failure:' + ex.message);
    });
};

webim.wxlogin = function () {};

webim.cleanup = function () {
  log.log('FLOO: IM logout, cleanup the data.');
  recentStore.clear();
  rosterStore.clear();
  groupStore.clear();
  infoStore.clear();
  messageStore.clearAll();
};

/**
 * 是否已登录
 * @function isLogin
 * @static
 * @returns {boolean} 是否已登录
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="isLogin" %}{% endlanying_code_snippet %}
 */
webim.isLogin = function () {
  return isLogin && infoStore.getUid() && infoStore.getToken() && infoStore.getAppid() == infoStore.getTokenAppId();
};

/**
 * 事件监听
 * @function on
 * @static
 * @param {(module:types~Event | Object.<module:types~Event, module:types~EventCallback>)} options 可以为事件名，也可以为事件名和事件回调
 * @param {(module:types~EventCallback | undefined)} ext 事件回调，只有options为事件名时需要设置
 * @example
 * const im = flooim(config);
 * im.on('event', (ret) => {
 *    //do something with ret
 *  })
 *  // or
 * im.on({
 *    eventName: (ret) => {
 *      //do something with ret
 *    },
 *    ...
 *  })
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="on" %}{% endlanying_code_snippet %}
 */
webim.on = webim.listen = function (options, ext) {
  if (ext) {
    bind(options, ext);
  } else {
    const eventNames = Object.keys(options);
    eventNames.forEach((eventName) => {
      bind(eventName, options[eventName]);
    });
  }
};

/**
 * 取消监听
 * @function off
 * @static
 * @param {(module:types~Event | Object.<module:types~Event, module:types~EventCallback>)} options 可以为事件名，也可以为事件名和事件回调
 * @param {(module:types~EventCallback | undefined)} ext 事件回调，只有options为事件名时需要设置
 * @example
 *  const im = flooim(config);
 *  im.off('events', (ret) => {
 *    //do something with ret
 *  })
 *  // or
 *  im.off({
 *    eventName: (ret) => {
 *      //do something with ret
 *    },
 *  ...
 *  })
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="off" %}{% endlanying_code_snippet %}
 */
webim.off = function (options, ext) {
  if (ext) {
    unBind(options, ext);
  } else {
    const eventNames = Object.keys(options);
    eventNames.forEach((eventName) => {
      unBind(eventName, options[eventName]);
    });
  }
};

webim.kickAllWeb = function () {
  userManage
    .asyncGetDeviceList()
    .then((device_list) => {
      if (device_list && device_list.length) {
        if (device_list.length === 1) {
          webim.cleanup();
          window.location.reload();
        } else {
          let arr = [];
          device_list.forEach((device) => {
            if (device.device_sn != userManage.getDeviceSN() && device.platform === 6) {
              arr.push(
                new Promise((resolve, reject) => {
                  userManage
                    .asyncKickDevice({ device_sn: device.device_sn })
                    .then(() => {
                      resolve();
                    })
                    .catch((ex) => {
                      reject(ex);
                    });
                })
              );
            }
          });
          Promise.all(arr).then(() => {
            webim.cleanup();
            window.location.reload();
          });
        }
      }
    })
    .catch((ex) => {
      console.log('flooim asyncGetDeviceList error: ', ex);
    });
};

/**
 * 退出账户
 * @function logout
 * @static
 * @example {object} opt
 * @param {boolean} opt.quitAllWeb 是否退出所有网页 用户ID
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="logout" %}{% endlanying_code_snippet %}
 */
webim.logout = function (opt) {
  io.disConnect();
  window.sessionStorage.setItem('key_stop_auto_login', true);
  if (opt && opt.quitAllWeb) {
    webim.kickAllWeb();
  } else {
    window.location.reload();
  }
};

webim.isReady = function () {
  return sdkOk;
};

/**
 * 设置日志等级
 * @function setLogLevel
 * @static
 * @param {string} logLevel SDK的日志等级， 默认为debug, 取值为 debug、info、warn、error 或 off, 其中off为不打印日志。
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="im",function="setLogLevel" %}{% endlanying_code_snippet %}
 */
webim.setLogLevel = function (logLevel) {
  log.setLogLevel(logLevel);
};

webim.disConnect = io.disConnect;

export default webim;
