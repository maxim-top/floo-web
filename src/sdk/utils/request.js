import axios from 'axios';
import { infoStore } from './store';
import log from './log';
import queryString from 'query-string';
import { bind, fire } from './cusEvent';
let reqErr = {
  errTimer: null,
  errCount: 0
};
let reloginRequestState = {
  token: '',
  appId: ''
};

const resetReloginRequested = () => {
  reloginRequestState = {
    token: '',
    appId: ''
  };
};

bind('loginSuccess', resetReloginRequested);
bind('loginFail', resetReloginRequested);
bind('logout', resetReloginRequested);
bind('flooNotice', (msg = {}) => {
  if (msg.category === 'action' && msg.desc === 'relogin_manually') {
    resetReloginRequested();
  }
});

bind('refresh_ratel', (ratel) => {
  ratel && (axios.defaults.baseURL = ratel);
});

const paramCheck = (params = {}, checks = []) => {
  let error = [];
  checks.forEach((item) => {
    if (typeof item === 'string') {
      if (typeof params[item] === 'undefined') {
        error.push(item + ' can not be null..');
      }
    }
    if (Array.isArray(item)) {
      let has = false;
      item.forEach((innerItem) => {
        if (typeof params[innerItem] !== 'undefined') {
          has = true;
        }
      });
      if (!has) {
        error.push(item.join('、') + ' can not be all null');
      }
    }
  });
  return error;
};

const noTokenUrls = [
  'app_dns',
  'info',
  'app/captcha/image',
  'app/captcha/sms',
  'app/captcha/sms_web',
  'app/user/info_pwd',
  'app/wechat_login',
  'mobile_bind_with_sign',
  'qr_code',
  'qr_login',
  'token/id',
  'token/user',
  'user/register',
  '/app/secret_info',
  '/app/config'
];

const isTokenRequired = (url) => {
  let isRequired = true;
  noTokenUrls.forEach((x) => {
    if (url.indexOf(x) > -1) {
      isRequired = false;
    }
  });
  return isRequired;
};

const isTokenLoginUrl = (url) => url.indexOf('token/user') > -1 || url.indexOf('token/id') > -1;

axios.defaults.timeout = 20000;
// axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
axios.interceptors.request.use(
  (config) => {
    const token = infoStore.getToken();
    const app_id = infoStore.getAppid();
    config.__requestToken = token || '';
    config.__requestAppId = app_id || '';
    if (app_id) {
      config.headers.common['app_id'] = app_id;
    }
    if (token) {
      config.headers.common['access-token'] = token;
    }

    if (isTokenRequired(config.url) && !token) {
      throw new Error('you should login  ...');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const shouldTriggerRelogin = (config = {}) => {
  const sentToken = config.__requestToken || '';
  const sentAppId = config.__requestAppId || '';
  const currentToken = infoStore.getToken() || '';
  const currentAppId = infoStore.getAppid() || '';

  // Ignore stale 402 responses from requests sent under an older token/app context.
  if (!sentToken || sentToken !== currentToken || sentAppId !== currentAppId) {
    return false;
  }

  if (reloginRequestState.token === sentToken && reloginRequestState.appId === sentAppId) {
    return false;
  }

  reloginRequestState = {
    token: sentToken,
    appId: sentAppId
  };
  return true;
};

const dealParams = (param) => {
  if (param.group_id) param.group_id = param.group_id - 0;
  if (param.user_id) param.user_id = param.user_id - 0;
  if (param.new_owner) param.new_owner = param.new_owner - 0;
  if (param.apply_approval) param.apply_approval = param.apply_approval - 0;
  if (param.duration) param.duration = param.duration - 0;
  if (param.limit) param.limit = param.limit - 0;
  if (param.version) param.version = param.version - 0;
  if (param.announcement_id) param.announcement_id = param.announcement_id - 0;
  if (param.user_list && Array.isArray(param.user_list)) param.user_list = param.user_list.map((i) => i - 0);
  if (param.user_list && Array.isArray(param.user_list)) param.user_list = param.user_list.map((i) => i - 0);
  if (param.file_list && Array.isArray(param.file_list)) param.file_list = param.file_list.map((i) => i - 0);
  return param;
};

const request = (url, method = 'get', params = {}, checks = [], isQuery = false, config = {}, processCallback = undefined) => {
  log.log('========request=============', url, method, params, checks, isQuery);
  const arr = paramCheck(params, checks);
  if (arr.length) {
    const errMsg = arr.join(',');
    return Promise.reject(new Error(errMsg));
  }

  let params2 = {};
  const _method = method.toLowerCase();
  if (_method === 'get' || (_method === 'post' && isQuery)) {
    if (url.indexOf('?') > 0) {
      url += '&';
    } else {
      url += '?';
    }
    url += queryString.stringify(params);
  } else {
    // change params to integer when necessary
    params2 = dealParams(params);
  }

  if (processCallback) {
    if (!isQuery) {
      axios.defaults.onUploadProgress = function (progressEvent) {
        if (progressEvent.lengthComputable) {
          processCallback(progressEvent);
        }
      };
    } else {
      axios.defaults.onDownloadProgress = function (progressEvent) {
        if (progressEvent.lengthComputable) {
          processCallback(progressEvent);
        }
      };
    }
  }
  return axios[_method](url, params2, config)
    .then((response) => {
      clearErrCounter();
      const { data = {} } = response;

      if (Object.keys(config).length !== 0) {
        // Request with additional config means will call the 3rd party, i.e. aliyun,
        // in which it's difficult to check success

        if (typeof data.data === 'boolean' && data.data) {
          //ceph
          return;
        } else if (typeof data.Status === 'string' && data.Status === 'OK') {
          //aliyun oss
          return;
        }
        return Promise.reject({ config, url });
      }

      const { data: innerData, code, message } = data;
      if (code === 200) {
        log.log('======request success, ', url, innerData);
        return innerData;
      } else {
        if (code === 402 && !isTokenLoginUrl(url) && shouldTriggerRelogin(response.config)) {
          //triger token refresh
          fire('flooNotice', { category: 'action', desc: 'relogin' });
        }
        log.req(url + '' === '' + message);
        return Promise.reject({ url, code, message });
      }
    })
    .catch((error) => {
      checkErrCounter();
      return Promise.reject(error);
    });
};

function clearErrCounter() {
  reqErr.errTimer && clearTimeout(reqErr.errTimer);
  reqErr.errTimer = null;
  reqErr.errCount = 0;
}

function checkErrCounter() {
  reqErr.errTimer && clearTimeout(reqErr.errTimer);
  reqErr.errTimer = null;
  reqErr.errCount = reqErr.errCount + 1;
  if (reqErr.errCount >= 5) {
    reqErr.errCount = 0;
    fire('ratelError');
  } else {
    reqErr.errTimer = setTimeout(() => {
      reqErr.errCount = 0;
    }, 30 * 60 * 1000);
  }
}

export { request };
