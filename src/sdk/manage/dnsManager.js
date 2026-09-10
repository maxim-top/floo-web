import { getItem, saveItem } from '../utils/store/storeBase';
import log from '../utils/log';
import * as http from '../core/base/io/httpIo';
import { bind, fire } from '../utils/cusEvent';
import { speedTest } from '../utils/speedTest';

const storage_id = (prefix, appID) => {
  if (!appID || !prefix) return '';
  else return '' + prefix + '_' + appID;
};

const getFireplaces = (cluster) => {
  if (!cluster) {
    return [];
  }
  return cluster.webim || cluster.ws || [];
};

const isUsableCluster = (cluster) => {
  return cluster && Array.isArray(cluster.ratel) && cluster.ratel.length > 0 && getFireplaces(cluster).length > 0 && Array.isArray(cluster.rtc) && cluster.rtc.length > 0;
};

const isUnavailableAppStatus = (appStatus) => {
  return appStatus === 'banned' || appStatus === 'frozen' || appStatus === 'revoked';
};

const saveUnavailableServers = (appID, version, appStatus, accountVerification) => {
  log.error('DNS ERROR: no available clusters (version:', version, ')');
  saveDnsInfo(appID, {
    clusters: [],
    clusterIndex: 0,
    ratelIndex: 0,
    fireIndex: 0,
    rtcIndex: 0,
    app_status: appStatus,
    account_verification: accountVerification
  });
};

const saveServers = (appID, dnsInfos) => {
  if (!appID) return {};
  const { version, dns_list = [], app_status = '', account_verification = {}, dns_server_list = [], link_server_list = [] } = dnsInfos;
  const group_index = dns_list.findIndex((x) => x.group_level == 0);
  if (group_index < 0) {
    saveUnavailableServers(appID, version, app_status, account_verification);
    return {};
  }
  const clusters = dns_list[group_index].clusters || [];
  const clusterIndex = clusters.findIndex(isUsableCluster);
  if (clusterIndex < 0) {
    saveUnavailableServers(appID, version, app_status, account_verification);
    return {};
  }

  if (getConfig('app_id') === appID) {
    saveDnsServerList(dns_server_list);
    saveLinkServerList(link_server_list);
  }

  const ret = {
    clusters,
    clusterIndex,
    ratelIndex: 0,
    fireIndex: 0,
    rtcIndex: 0,
    app_status: app_status,
    account_verification: account_verification
  };

  saveDnsInfo(appID, ret);
};

const getAppStatus = (appID) => {
  if (!appID) return '';
  const data = getDnsInfo(appID);
  const { app_status = '' } = data;
  return app_status;
};

const getAccountVerification = (appID) => {
  if (!appID) return {};
  const data = getDnsInfo(appID);
  const { account_verification = {} } = data;
  return account_verification;
};

const getServerIp = (appID) => {
  if (!appID) return '';
  const data = getDnsInfo(appID);
  const { clusters, clusterIndex, ratelIndex } = data;
  if (!clusters || !clusters.length) {
    return '';
  }
  try {
    const clusterObj = clusters[clusterIndex];
    return clusterObj.ratel[ratelIndex].ip_list[0];
  } catch (e) {
    return '';
  }
};

const getServers = (appID) => {
  if (!appID) return {};
  const ws = getConfig('ws');
  const data = getDnsInfo(appID);
  const { clusters, clusterIndex, ratelIndex, fireIndex, rtcIndex } = data;
  if (!clusters || !clusters.length) {
    return {};
  }

  const clusterObj = clusters[clusterIndex];
  if (!isUsableCluster(clusterObj)) {
    return {};
  }
  const ratelObj = clusterObj.ratel[ratelIndex];
  const fireObj = getFireplaces(clusterObj)[fireIndex];
  let rtcObj = clusterObj.rtc[rtcIndex];
  if (!ratelObj || !fireObj || !rtcObj) {
    return {};
  }
  const ratel = ratelObj.protocol + '://' + ratelObj.host;

  let fireprotocol = 'https';
  let rtcprotocol = 'https';
  if (ws) {
    if (fireObj.protocol === 'https') {
      fireprotocol = 'wss';
    } else {
      fireprotocol = 'ws';
    }
    if (rtcObj.protocol === 'https') {
      rtcprotocol = 'wss';
    } else {
      rtcprotocol = 'ws';
    }
  } else {
    fireprotocol = fireObj.protocol;
    if (rtcObj.protocol === 'https') {
      rtcprotocol = 'wss';
    } else {
      rtcprotocol = 'ws';
    }
  }
  const fireplace = fireprotocol + '://' + fireObj.host;
  const rtc = rtcprotocol + '://' + rtcObj.host;

  return {
    ratel,
    fireplace,
    rtc
  };
};

const changeRatelIndex = (appID) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex, ratelIndex, fireIndex, rtcIndex } = data;
  if (!Array.isArray(clusters) || !clusters.length || !isUsableCluster(clusters[clusterIndex])) {
    return false;
  }
  const clusterObj = clusters[clusterIndex];
  const ratels = clusterObj.ratel;
  if (ratels.length > ratelIndex + 1) {
    ratelIndex++;
    saveDnsInfo(appID, {
      clusters,
      clusterIndex,
      ratelIndex,
      fireIndex,
      rtcIndex
    });
    return true;
  } else {
    return changeClusterIndex(appID, -1, false);
  }
};

bind('ratelError', (options = {}) => {
  log.log('Ratel error, should try next in list');
  const appID = getConfig('app_id');
  const notifyReady = () => {
    if (typeof options.onReady === 'function') {
      options.onReady();
    }
  };
  if (options.appID && options.appID !== appID) {
    log.warn('Ignore stale Ratel error for appid: ', options.appID);
    notifyReady();
    return;
  }
  const switched = changeRatelIndex(appID);
  const refreshRatel = () => {
    if (getConfig('app_id') !== appID) {
      log.warn('Ignore stale Ratel refresh for appid: ', appID);
      return;
    }
    const { ratel } = getServers(appID) || {};
    fire('refresh_ratel', ratel);
  };
  if (switched) {
    refreshRatel();
    notifyReady();
    return;
  }
  retrieveDns()
    .then(() => {
      refreshRatel();
    })
    .catch((error) => {
      log.warn('Retrieve DNS after Ratel exhaustion failed: ', error && error.message);
    })
    .then(notifyReady);
});

const changeFireplaceIndex = (appID) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex, ratelIndex, fireIndex, rtcIndex } = data;
  if (!Array.isArray(clusters) || !clusters.length || !isUsableCluster(clusters[clusterIndex])) {
    fire('retrieve_dns');
    return;
  }
  const clusterObj = clusters[clusterIndex];

  const fires = getFireplaces(clusterObj);
  if (fires.length > fireIndex + 1) {
    fireIndex++;
    saveDnsInfo(appID, {
      clusters,
      clusterIndex,
      ratelIndex,
      fireIndex,
      rtcIndex
    });
  } else {
    changeClusterIndex(appID);
  }
};

bind('fireplaceError', () => {
  const appID = getConfig('app_id');
  log.log('Fireplace error, should try next in list, appid: ', appID);
  changeFireplaceIndex(appID);
  const { fireplace } = getServers(appID) || {};
  fire('refresh_fireplace', fireplace);
});

const changeClusterIndex = (appID, expectClusterIndex = -1, refreshOnExhausted = true) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex } = data;
  if (!Array.isArray(clusters) || !clusters.length) {
    if (refreshOnExhausted) {
      fire('retrieve_dns');
    }
    return false;
  }

  if (expectClusterIndex >= 0) {
    if (clusterIndex == expectClusterIndex) {
      return false;
    }
    clusterIndex = expectClusterIndex - 1;
  }

  while (clusters.length > clusterIndex + 1) {
    clusterIndex++;
    const clusterObj = clusters[clusterIndex];
    if (isUsableCluster(clusterObj)) {
      saveDnsInfo(appID, {
        clusters,
        clusterIndex,
        ratelIndex: 0,
        fireIndex: 0,
        rtcIndex: 0
      });
      return true;
    }
  }
  //run out of cluster, refresh dns
  if (expectClusterIndex == -1 && refreshOnExhausted) {
    fire('retrieve_dns');
  }
  return false;
};

const getDnsInfo = (appID) => {
  return getItem(storage_id('key_dns_infos', appID), false, -1, true) || {};
};

const saveDnsInfo = (appID, dnsInfo) => {
  saveItem(storage_id('key_dns_infos', appID), dnsInfo, false, -1, true);
};

const getConfig = (name) => {
  if (!name) return '';
  return getItem(storage_id('key_dns_config', name), false, -1, true);
};

const saveConfig = (name, value) => {
  if (!name || !value) return;
  saveItem(storage_id('key_dns_config', name), value, false, -1, true);
};

const saveAppConfig = (appID, appConfig) => {
  if (!appID) return {};
  saveItem(storage_id('key_app_config', appID), appConfig, false, -1, true);
  fire('onAppConfigUpdated', appID);
};

const getAppConfig = (appID) => {
  if (!appID) return '';
  return getItem(storage_id('key_app_config', appID), false, -1, true);
};

const getDnsServerList = () => {
  return getItem('dns_server_list', false, -1, false) || [];
};

const saveDnsServerList = (dnsServerList) => {
  saveItem('dns_server_list', dnsServerList, false, -1, false);
};

const getLinkServerList = () => {
  return getItem('link_server_list', false, -1, false) || [];
};

const saveLinkServerList = (linkServerList) => {
  saveItem('link_server_list', linkServerList, false, -1, false);
};

const dnsRefreshPromises = {};
const dnsRequestVersions = {};

const isCurrentDnsRequest = (appID, requestVersion) => dnsRequestVersions[appID] === requestVersion;

const retrieveDns = () => {
  const dnsServers = getConfig('dns_servers');
  const appID = getConfig('app_id');
  const ws = getConfig('ws');
  const source = getConfig('source');
  const path = getConfig('path');
  if (dnsRefreshPromises[appID]) {
    return dnsRefreshPromises[appID];
  }

  log.warn('Retrieve DNS for appid: ', appID);
  const refreshPromise = asyncGetDns(dnsServers, appID, ws, source, path, true).then(
    (result) => {
      if (dnsRefreshPromises[appID] === refreshPromise) {
        delete dnsRefreshPromises[appID];
      }
      return result;
    },
    (error) => {
      if (dnsRefreshPromises[appID] === refreshPromise) {
        delete dnsRefreshPromises[appID];
      }
      return Promise.reject(error);
    }
  );
  dnsRefreshPromises[appID] = refreshPromise;
  return refreshPromise;
};

bind('retrieve_dns', () => {
  retrieveDns().catch((error) => {
    log.warn('Retrieve DNS failed: ', error && error.message);
  });
});

const asyncGetDns = (dnsServers, appID, ws, source, path, forceRefresh = false) => {
  const requestVersion = (dnsRequestVersions[appID] || 0) + 1;
  dnsRequestVersions[appID] = requestVersion;
  saveConfig('dns_servers', dnsServers);
  saveConfig('app_id', appID);
  saveConfig('ws', ws);
  saveConfig('source', source);
  saveConfig('path', path);

  const sret = getServers(appID);

  // 测试dnsServers，返回可用的dnsServer
  const testDnsSpeed = () => {
    return speedTest(dnsServers, '/api/health', 1000, 10000);
  };

  const fetchAndSaveServers = (dnsServer) => {
    return http.getServers(dnsServer + path, { app_id: appID, source }).then((res) => {
      if (!isCurrentDnsRequest(appID, requestVersion)) {
        log.warn('Ignore stale DNS response for appid: ', appID);
        return getServers(appID);
      }
      log.info('DNS SUCCESS: ', res);
      saveServers(appID, res);
      const servers = getServers(appID);
      if (isUnavailableAppStatus(getAppStatus(appID))) {
        return servers;
      }
      if (!servers.ratel || !servers.fireplace) {
        return Promise.reject(new Error('NoAvailableEndpoint'));
      }
      getFastestServer(appID, requestVersion)
        .then(() => {
          if (!isCurrentDnsRequest(appID, requestVersion) || getConfig('app_id') !== appID) {
            return;
          }
          return http.getAppConfig({ platform: 6 }).then((res) => {
            if (!isCurrentDnsRequest(appID, requestVersion) || getConfig('app_id') !== appID) {
              return;
            }
            log.info('APP CONFIG SUCCESS: ', res);
            saveAppConfig(appID, res);
          });
        })
        .catch((error) => {
          log.warn('DNS server speed test failed: ', error && error.message);
        });
      return servers;
    });
  };

  if (sret.ratel && !forceRefresh) {
    // 异步测试速度再请求，不阻塞返回 sret
    testDnsSpeed()
      .then((dnsServer) => fetchAndSaveServers(dnsServer))
      .catch((error) => {
        log.warn('Background DNS refresh failed: ', error && error.message);
      });
    return Promise.resolve(sret);
  }

  // sret.ratel 不存在，等待速度测试和请求完成
  return testDnsSpeed().then((dnsServer) => fetchAndSaveServers(dnsServer));
};

const testServerSpeed = (url, index) => {
  const start = Date.now();
  return fetch(url)
    .then(() => {
      const end = Date.now();
      const timeTaken = end - start;
      log.info(`SpeedTest ${url} took ${timeTaken} ms`);
      return { url, timeTaken, index };
    })
    .catch((error) => {
      log.info(`SpeedTest ${url} got error`);
      return delay(10000).then(() => {
        return { url, timeTaken: Infinity, index }; // 如果请求失败，返回最大值
      });
    });
};

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getFastestServer = (appID, requestVersion) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex } = data;

  const promises = (clusters || []).reduce((result, cluster, index) => {
    if (isUsableCluster(cluster)) {
      const url = cluster.ratel[0].protocol + '://' + cluster.ratel[0].host + '/';
      result.push(testServerSpeed(url, index));
    }
    return result;
  }, []);
  if (!promises.length) {
    return Promise.resolve();
  }

  return Promise.race(promises).then((fastest) => {
    if (!isCurrentDnsRequest(appID, requestVersion)) {
      return;
    }
    log.info(`SpeedTest The fastest server is: ${JSON.stringify(fastest)}`);
    if (clusterIndex != fastest.index) {
      log.info(`SpeedTest change server: ${JSON.stringify(fastest)}`);
      changeClusterIndex(appID, fastest.index);
    }
    if (getConfig('app_id') === appID) {
      const { fireplace, ratel } = getServers(appID) || {};
      fire('refresh_ratel', ratel);
      fire('refresh_fireplace', fireplace);
    }
  });
};

const dnsManager = {
  asyncGetDns,
  getServers,
  getAppConfig,
  getAppStatus,
  getAccountVerification,
  getServerIp,
  getDnsServerList,
  getLinkServerList
};

export default dnsManager;
