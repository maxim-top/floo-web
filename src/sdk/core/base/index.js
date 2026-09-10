import io from './io/index';
import { infoStore, recentStore, messageStore, rosterStore, groupStore } from '../../utils/store';
import log from '../../utils/log';
import { bind, fire, unBind } from '../../utils/cusEvent';
import './messageReceiver';
import rosterManage from '../../manage/rosterManage';
import groupManage from '../../manage/groupManage';
import dnsManager from '../../manage/dnsManager';
import userManage from '../../manage/userManage';
import sysManage from '../../manage/sysManage';
import { setSocketLoginResultGuard } from './loginAttemptGuard';
/**
 * @module flooim
 */
let config = {};
let loginSwap = null;
let sdkOk = false;
let isLogin = false;
let stopAutoLogin = false;
let appStatus = '';
let isReloading = false;
let initVersion = 0;
let loginVersion = 0;
let pendingPasswordLogin = null;
const AUTO_LOGIN_PREPARATION_RETRY_DELAY = 2000;
const AUTO_LOGIN_PREPARATION_RETRY_DELAY_MAX = 10000;
const AUTO_LOGIN_RATE_LIMIT_RETRY_DELAY = 30000;
const RETRYABLE_LOGIN_HTTP_STATUS = [408, 500, 502, 503, 504];

const getLoginErrorStatus = (error = {}) => Number(error.response ? error.response.status : error.code);

const isLoginRateLimitedError = (error) => getLoginErrorStatus(error) === 429;

const isLoginPreparationNetworkError = (error) => {
  if (!error || error.__CANCEL__) {
    return false;
  }
  const status = getLoginErrorStatus(error);
  if (!error.isAxiosError) {
    return RETRYABLE_LOGIN_HTTP_STATUS.includes(status);
  }
  return !error.response || RETRYABLE_LOGIN_HTTP_STATUS.includes(status);
};

const prepareAutoLogin = ({ currentInitVersion, currentLoginVersion, token, retryTimes = 0 }) => {
  if (currentInitVersion !== initVersion || currentLoginVersion !== loginVersion || token !== infoStore.getToken()) {
    return;
  }
  const rosterRequest = rosterManage.asyncGetRosterIdList(true);
  const groupRequest = io.groupUserjoined({});
  Promise.all([rosterRequest, groupRequest])
    .then((res) => {
      if (currentInitVersion !== initVersion || currentLoginVersion !== loginVersion || token !== infoStore.getToken()) {
        return;
      }
      const groupItems = Array.isArray(res[1]) ? res[1] : null;
      const groups = groupItems || groupStore.getGroupInfoList();
      if (groupItems) {
        groupStore.saveJoinedGroups(groupItems);
      }
      isLogin = true;
      fire('imRostersGroupslistReady', {
        rosters: res[0],
        groups
      });
      log.log('get roster, group over .... will io connect');
      io.connect(config);
    })
    .catch((error) => {
      if (currentInitVersion !== initVersion || currentLoginVersion !== loginVersion || token !== infoStore.getToken()) {
        return;
      }
      isLogin = false;
      log.warn('Prepare auto login failed: ', error && error.message);
      fire('flooNotice', {
        category: 'loginMessage',
        desc: 'get roster list failure:' + (error && error.message)
      });
      const rateLimited = isLoginRateLimitedError(error);
      if (!rateLimited && !isLoginPreparationNetworkError(error)) {
        return;
      }
      const nextRetryTimes = retryTimes + 1;
      const delay = rateLimited ? AUTO_LOGIN_RATE_LIMIT_RETRY_DELAY : Math.min(nextRetryTimes * AUTO_LOGIN_PREPARATION_RETRY_DELAY, AUTO_LOGIN_PREPARATION_RETRY_DELAY_MAX);
      fire('flooNotice', {
        category: 'loginMessage',
        desc: `auto login preparation ${rateLimited ? 'rate limited' : 'network failure'}, retrying ${nextRetryTimes} in ${delay} ms`
      });
      setTimeout(() => {
        prepareAutoLogin({ currentInitVersion, currentLoginVersion, token, retryTimes: nextRetryTimes });
      }, delay);
    });
};

bind('refresh_fireplace', (fireplace) => {
  if (fireplace) {
    config = Object.assign({}, config, { fireplace });
  }
});

const getAuthState = () => {
  return {
    isLogin,
    uid: infoStore.getUid(),
    token: infoStore.getToken(),
    tokenAppId: infoStore.getTokenAppId(),
    aesKey: infoStore.getAesKey()
  };
};

const restoreAuthState = (authState) => {
  if (authState.uid) {
    infoStore.saveUid(authState.uid);
  } else {
    infoStore.removeUid();
  }
  if (authState.token) {
    infoStore.saveToken(authState.token);
  } else {
    infoStore.deleteToken();
  }
  if (authState.tokenAppId) {
    infoStore.saveTokenAppId(authState.tokenAppId);
  } else {
    infoStore.deleteTokenAppId();
  }
  if (authState.aesKey) {
    infoStore.saveAesKey(authState.aesKey);
  } else {
    infoStore.deleteAesKey();
  }
  isLogin = authState.isLogin;
};

const cancelPendingPasswordLogin = () => {
  const pendingLogin = pendingPasswordLogin;
  const hasQueuedLogin = loginSwap && loginSwap.type === 'login';
  if (!pendingLogin && !hasQueuedLogin) {
    return false;
  }
  loginVersion++;
  pendingPasswordLogin = null;
  if (hasQueuedLogin) {
    loginSwap = null;
  }
  if (pendingLogin && pendingLogin.authApplied) {
    const connectionWasReplaced = pendingLogin.phase === 'connecting';
    if (connectionWasReplaced) {
      io.disConnect();
    }
    if (connectionWasReplaced && pendingLogin.authState.isLogin) {
      restoreAuthState(
        Object.assign({}, pendingLogin.authState, {
          isLogin: false
        })
      );
    } else {
      restoreAuthState(pendingLogin.authState);
    }
  }
  return true;
};

const completePendingPasswordLogin = () => {
  const pendingLogin = pendingPasswordLogin;
  if (!pendingLogin || pendingLogin.phase !== 'connecting' || pendingLogin.version !== loginVersion) {
    return;
  }
  if (pendingLogin.groupItems) {
    groupStore.saveJoinedGroups(pendingLogin.groupItems);
  }
  fire('imRostersGroupslistReady', {
    rosters: pendingLogin.rosters,
    groups: pendingLogin.groups
  });
  pendingPasswordLogin = null;
};

bind('loginSuccess', () => {
  window.sessionStorage.removeItem('key_stop_auto_login');
  completePendingPasswordLogin();
});
setSocketLoginResultGuard(() => {
  if (pendingPasswordLogin && pendingPasswordLogin.phase !== 'connecting') {
    log.warn('Ignore Socket login result from previous connection during password login');
    return false;
  }
  return true;
});
bind('loginFail', (message) => {
  if (message !== 'socket_failure') {
    return;
  }
  if (pendingPasswordLogin && pendingPasswordLogin.phase === 'connecting') {
    cancelPendingPasswordLogin();
  } else {
    isLogin = false;
    io.disConnect();
  }
});
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
const webim = function ({ autoLogin = true, dnsServer, appid = 'welovemaxim', ws = false, logLevel = 'debug', linkServer = 'https://lanyinglink.com/info' }) {
  const currentInitVersion = ++initVersion;
  cancelPendingPasswordLogin();
  loginVersion++;
  isLogin = false;
  appStatus = '';
  sdkOk = false;
  log.setLogLevel(logLevel);
  const { source, path, dnsServers } = decideDnsServers(dnsServer);
  infoStore.saveAppid(appid);
  infoStore.saveLinkServer(linkServer);
  stopAutoLogin = window.sessionStorage.getItem('key_stop_auto_login') || false;
  if (isReloading) {
    log.log('window is reloading, stop init floo');
    return;
  }
  dnsManager
    .asyncGetDns(dnsServers, appid, ws, source, path)
    .then((res) => {
      if (currentInitVersion !== initVersion) {
        return;
      }
      appStatus = dnsManager.getAppStatus(appid);
      if (appStatus == 'banned') {
        fireInitError({ category: 'APP_BANNED', desc: 'app is banned' });
        return;
      } else if (appStatus == 'frozen') {
        fireInitError({ category: 'APP_FROZEN', desc: 'app is frozen' });
        return;
      } else if (appStatus == 'revoked') {
        fireInitError({ category: 'APP_REVOKED', desc: 'app is revoked' });
        return;
      }
      const { ratel, fireplace } = res;
      if (!ratel || !fireplace) {
        log.log('DNS error, check the server: ', dnsServer, 'appStatus:', appStatus);
        fireInitError({ category: 'DNS_FAILED', desc: dnsServer });
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
          prepareAutoLogin({
            currentInitVersion,
            currentLoginVersion: loginVersion,
            token
          });
        }
      }
    })
    .catch((ex) => {
      if (currentInitVersion !== initVersion) {
        return;
      }
      console.log('flooim init error, please retry later: ', ex);
      fireInitError({ category: 'DNS_FAILED', desc: ex.message, code: ex.code ? ex.code : 0 });
    });
};

// Keep initialization errors on the existing flooError contract.
const fireInitError = (error) => {
  fire('flooError', error);
};

const setup_servers = function (appID) {
  log.log('setup servers for app: ', appID);
  const { ratel, fireplace } = dnsManager.getServers(appID) || {};
  fire('refresh_ratel', ratel);
  fire('refresh_fireplace', fireplace);
};

const decideDnsServers = function (dnsServer) {
  if (dnsServer && !(dnsServer.includes('dns.lanyingim.com') || dnsServer.includes('dns.maximtop.com'))) {
    return { source: 'sdk', path: '', dnsServers: [dnsServer] };
  }
  let savedDnsServerList = dnsManager.getDnsServerList();
  let returnDnsServerList = [];
  for (let i in savedDnsServerList) {
    let server = savedDnsServerList[i];
    if (server.domain) {
      returnDnsServerList.push('https://' + server.domain);
    }
  }
  let source = decideSource();
  let ipServer = 'https://39.107.255.12';
  if (returnDnsServerList.length == 0) {
    if (source == 'app') {
      returnDnsServerList.push('https://dns-app.lanyingim.com', 'https://dns-app.maximtop.com');
    } else {
      returnDnsServerList.push('https://dns.lanyingim.com', 'https://dns.maximtop.com');
    }
  }
  if (!returnDnsServerList.includes(ipServer)) {
    returnDnsServerList.push(ipServer);
  }
  return { source, path: '/v2/app_dns', dnsServers: returnDnsServerList };
};

const decideSource = function () {
  if (typeof window !== 'undefined' && window.location && window.location.href) {
    const href = window.location.href;
    if (href.includes('lanyingim.com') || href.includes('maximtop.com')) {
      return 'app';
    }
    if (href.includes('%E8%93%9D%E8%8E%BAIM') || href.includes('蓝莺IM') || href.includes('lanying-im-pc')) {
      return 'app';
    }
  }
  return 'sdk';
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
  cancelPendingPasswordLogin();
  const currentLoginVersion = ++loginVersion;
  pendingPasswordLogin = {
    version: currentLoginVersion,
    authState: getAuthState(),
    authApplied: false,
    phase: 'token'
  };
  console.log('webim.login', opt, 'sdkOk:', sdkOk);
  if (!sdkOk) {
    loginSwap = {
      type: 'login',
      opt
    };
    return;
  }
  fire('flooNotice', { category: 'loginMessage', desc: 'getting token...' });
  io.tokenUser(opt, {
    isCurrent: () => currentLoginVersion === loginVersion
  })
    .then((res) => {
      if (currentLoginVersion !== loginVersion) {
        return;
      }
      const { token, user_id, public_key } = res;
      if (pendingPasswordLogin && pendingPasswordLogin.version === currentLoginVersion) {
        pendingPasswordLogin.authApplied = true;
      }
      infoStore.saveUid(user_id);
      infoStore.saveToken(token);
      infoStore.saveTokenAppId(infoStore.getAppid());
      infoStore.saveAesKey(public_key);
      pendingPasswordLogin.phase = 'preparing';
      const rosterRequest = rosterManage.asyncGetRosterIdList(true);
      const groupRequet = io.groupUserjoined({});
      console.log('Get token success');
      isLogin = true;

      fire('flooNotice', {
        category: 'loginMessage',
        desc: 'token sucecc, getting roster lists..'
      });
      Promise.all([rosterRequest, groupRequet])
        .then((res) => {
          if (currentLoginVersion !== loginVersion) {
            return;
          }
          const rosters = res[0];
          const groupItems = Array.isArray(res[1]) ? res[1] : null;
          const groups = groupItems || groupStore.getGroupInfoList();
          log.log('get roster, group over .... will io connect');
          config = Object.assign(
            {
              uid: user_id,
              token
            },
            config
          );
          pendingPasswordLogin = Object.assign({}, pendingPasswordLogin, {
            phase: 'connecting',
            rosters,
            groupItems,
            groups
          });
          io.connect(config);
          loginSwap = null;
        })
        .catch((ex) => {
          if (currentLoginVersion !== loginVersion) {
            return;
          }
          log.warn('Prepare password login failed: ', ex && ex.message);
          fire('flooNotice', {
            category: 'loginMessage',
            desc: 'get roster list failure:' + ex.message
          });
          cancelPendingPasswordLogin();
          if (isLoginRateLimitedError(ex)) {
            fire('loginFail', 'login preparation failure:Rate Limited:' + ex.message);
          } else {
            fire('loginFail', isLoginPreparationNetworkError(ex) ? 'login preparation failure:Network Error:' + ex.message : 'login preparation failure');
          }
        });
    })
    .catch((ex) => {
      if (currentLoginVersion !== loginVersion) {
        return;
      }
      pendingPasswordLogin = null;
      if (isLoginRateLimitedError(ex)) {
        fire('loginFail', 'token failure:Rate Limited:' + ex.message);
      } else {
        fire('loginFail', isLoginPreparationNetworkError(ex) ? 'token failure:Network Error:' + ex.message : 'token failure:' + ex.message);
      }
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
  cancelPendingPasswordLogin();
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
  cancelPendingPasswordLogin();
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
  cancelPendingPasswordLogin();
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
          isReloading = true;
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
            isReloading = true;
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
  cancelPendingPasswordLogin();
  loginVersion++;
  io.disConnect();
  window.sessionStorage.setItem('key_stop_auto_login', true);
  isLogin = false;
  fire('logout');
  if (opt) {
    if (opt.deleteUser) {
      // do nothing.
    } else {
      if (opt.quitAllWeb) {
        webim.kickAllWeb();
      }
      if (!opt.linkLogin) {
        isReloading = true;
        window.location.reload();
      }
    }
  } else {
    isReloading = true;
    window.location.reload();
  }
};

webim.isReady = function () {
  return sdkOk;
};

webim.isAppInfoReady = function () {
  return !!appStatus;
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
