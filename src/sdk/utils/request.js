import axios from 'axios';
import { infoStore } from './store';
import log from './log';
import queryString from 'query-string';
import { bind, fire } from './cusEvent';
let reqErr = {
  errTimer: null,
  errCount: 0,
  appId: '',
  ratel: ''
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
bind('logout', () => {
  resetReloginRequested();
  clearErrCounter();
});
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

const isAbsoluteUrl = (url) => /^[a-z][a-z\d+\-.]*:\/\//i.test(url) || /^\/\//.test(url);

const isRatelNetworkError = (error) => {
  if (!error || !error.isAxiosError || axios.isCancel(error)) {
    return false;
  }
  if (error.response) {
    return [502, 503, 504].includes(error.response.status);
  }
  return !!(error.request || error.code === 'ECONNABORTED' || error.message === 'Network Error');
};

const isCurrentRequestContext = (requestContext = {}) => {
  return typeof requestContext.isCurrent !== 'function' || requestContext.isCurrent();
};

axios.defaults.timeout = 20000;
// axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
axios.interceptors.request.use(
  (config) => {
    const token = infoStore.getToken();
    const app_id = infoStore.getAppid();
    config.__requestToken = token || '';
    config.__requestAppId = app_id || '';
    config.__requestRatel = config.baseURL || axios.defaults.baseURL || '';
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

const request = (url, method = 'get', params = {}, checks = [], isQuery = false, config = {}, processCallback = undefined, requestContext = {}) => {
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

  const requestConfig = Object.assign({}, config);
  const stallTimeout = requestConfig.stallTimeout;
  const responseTimeout = requestConfig.responseTimeout;
  delete requestConfig.stallTimeout;
  delete requestConfig.responseTimeout;
  let stallTimer = null;
  let responseTimer = null;
  let cancelSource = null;
  const clearStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = null;
  };
  const clearResponseTimer = () => {
    if (responseTimer) clearTimeout(responseTimer);
    responseTimer = null;
  };
  const clearTransferTimers = () => {
    clearStallTimer();
    clearResponseTimer();
  };
  const resetStallTimer = () => {
    if (!cancelSource || !(stallTimeout > 0)) return;
    clearStallTimer();
    stallTimer = setTimeout(() => cancelSource.cancel('File transfer stalled'), stallTimeout);
  };
  const startResponseTimer = () => {
    if (!cancelSource) return;
    clearStallTimer();
    if (!(responseTimeout > 0)) return;
    clearResponseTimer();
    responseTimer = setTimeout(() => cancelSource.cancel('File transfer response timeout'), responseTimeout);
  };
  const updateTransferTimer = (progressEvent) => {
    if (progressEvent.lengthComputable && progressEvent.total > 0 && progressEvent.loaded >= progressEvent.total) {
      startResponseTimer();
    } else {
      resetStallTimer();
    }
  };
  if ((stallTimeout > 0 || responseTimeout > 0) && !requestConfig.cancelToken) {
    cancelSource = axios.CancelToken.source();
    requestConfig.cancelToken = cancelSource.token;
    resetStallTimer();
  }
  if (processCallback || cancelSource) {
    if (!isQuery) {
      requestConfig.onUploadProgress = function (progressEvent) {
        updateTransferTimer(progressEvent);
        if (processCallback && progressEvent.lengthComputable) {
          processCallback(progressEvent);
        }
      };
    } else {
      requestConfig.onDownloadProgress = function (progressEvent) {
        updateTransferTimer(progressEvent);
        if (processCallback && progressEvent.lengthComputable) {
          processCallback(progressEvent);
        }
      };
    }
  }
  const isRatelRequest = Object.keys(config).length === 0 && !isAbsoluteUrl(url);
  return axios[_method](url, params2, requestConfig)
    .then((response) => {
      if (isRatelRequest && isCurrentRequestContext(requestContext)) {
        clearErrCounterForRequest(response.config);
      }
      const { data = {} } = response;

      if (Object.keys(config).length !== 0) {
        // Request with additional config means will call the 3rd party, i.e. aliyun,
        // in which it's difficult to check success

        if (config.operation === 'download_file') {
          return data;
        }

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
        return requestContext.returnEnvelope ? data : innerData;
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
      if (isRatelRequest && isRatelNetworkError(error)) {
        if (isTokenLoginUrl(url)) {
          if (!isCurrentRequestContext(requestContext)) {
            log.warn('Ignore network error from superseded token login');
            return Promise.reject(error);
          }
          if (!isCurrentRatelRequest(error.config)) {
            log.warn('Ignore stale token login network error for Ratel: ', error.config && error.config.__requestRatel);
            return Promise.reject(error);
          }
          clearErrCounter();
          log.warn('Token login network error, switch Ratel endpoint before retry: ', error.message);
          return new Promise((resolve) => {
            fire('ratelError', {
              appID: error.config && error.config.__requestAppId,
              onReady: resolve
            });
          }).then(() => Promise.reject(error));
        } else {
          checkErrCounter(error);
        }
      }
      return Promise.reject(error);
    })
    .finally(clearTransferTimers);
};

function clearErrCounter() {
  reqErr.errTimer && clearTimeout(reqErr.errTimer);
  reqErr.errTimer = null;
  reqErr.errCount = 0;
  reqErr.appId = '';
  reqErr.ratel = '';
}

function isCurrentRatelRequest(requestConfig = {}) {
  const requestAppID = requestConfig.__requestAppId || '';
  const requestRatel = requestConfig.__requestRatel || '';
  const currentAppID = infoStore.getAppid() || '';
  const currentRatel = axios.defaults.baseURL || '';
  return !!requestAppID && requestAppID === currentAppID && !!requestRatel && requestRatel === currentRatel;
}

function clearErrCounterForRequest(requestConfig = {}) {
  if (!isCurrentRatelRequest(requestConfig)) {
    log.warn('Ignore stale Ratel response: ', requestConfig.__requestAppId, requestConfig.__requestRatel);
    return;
  }
  clearErrCounter();
}

function checkErrCounter(error) {
  const requestConfig = (error && error.config) || {};
  const requestAppID = requestConfig.__requestAppId || '';
  const requestRatel = requestConfig.__requestRatel || '';
  if (!isCurrentRatelRequest(requestConfig)) {
    log.warn('Ignore stale Ratel network error: ', requestAppID, requestRatel);
    return;
  }
  if (reqErr.appId !== requestAppID || reqErr.ratel !== requestRatel) {
    clearErrCounter();
    reqErr.appId = requestAppID;
    reqErr.ratel = requestRatel;
  }
  reqErr.errTimer && clearTimeout(reqErr.errTimer);
  reqErr.errTimer = null;
  reqErr.errCount = reqErr.errCount + 1;
  log.warn(`Ratel network error ${reqErr.errCount}/5: `, error && error.message);
  if (reqErr.errCount >= 5) {
    reqErr.errCount = 0;
    fire('ratelError', { appID: requestAppID });
  } else {
    reqErr.errTimer = setTimeout(() => {
      reqErr.errCount = 0;
    }, 30 * 60 * 1000);
  }
}

export { request };
