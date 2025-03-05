import { getItem, saveItem } from '../utils/store/storeBase';
import log from '../utils/log';
import * as http from '../core/base/io/httpIo';
import { bind, fire } from '../utils/cusEvent';

const storage_id = (prefix, appID) => {
  if (!appID || !prefix) return '';
  else return '' + prefix + '_' + appID;
};

const saveServers = (appID, dnsInfos) => {
  if (!appID) return {};
  const { version, dns_list } = dnsInfos;
  const group_index = dns_list.findIndex((x) => x.group_level == 0);
  if (group_index < 0) {
    log.error('DNS ERROR: no available clusters (version:', version, ')');
    return {};
  }

  const ret = {
    clusters: dns_list[group_index].clusters,
    clusterIndex: 0,
    ratelIndex: 0,
    fireIndex: 0,
    rtcIndex: 0
  };

  saveDnsInfo(appID, ret);
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
  const ratelObj = clusterObj.ratel[ratelIndex];
  let fireObj;
  if (clusterObj.webim) {
    //dns v2
    fireObj = clusterObj.webim[fireIndex];
  } else {
    //compatible with dns v1
    fireObj = clusterObj.ws[fireIndex];
  }
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
  } else {
    changeClusterIndex(appID);
  }
};

bind('ratelError', () => {
  log.log('Ratel error, should try next in list');
  const appID = getConfig('app_id');
  changeRatelIndex(appID);
  const { ratel } = getServers(appID) || {};
  fire('refresh_ratel', ratel);
});

const changeFireplaceIndex = (appID) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex, ratelIndex, fireIndex, rtcIndex } = data;
  const clusterObj = clusters[clusterIndex];

  let fires;
  if (clusterObj.webim) {
    //dns v2
    fires = clusterObj.webim;
  } else {
    //compatible with dns v1
    fires = clusterObj.ws;
  }
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

const changeClusterIndex = (appID, expectClusterIndex = -1) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex } = data;

  if (expectClusterIndex > 0) {
    if (clusterIndex == expectClusterIndex) {
      return;
    }
    clusterIndex = expectClusterIndex - 1;
  }

  while (clusters.length > clusterIndex + 1) {
    clusterIndex++;
    const clusterObj = clusters[clusterIndex];
    //use fireplace url to check cluster availability,
    let fires;
    if (clusterObj.webim) {
      //dns v2
      fires = clusterObj.webim;
    } else {
      //compatible with dns v1
      fires = clusterObj.ws;
    }
    if (fires.length >= 0) {
      saveDnsInfo(appID, {
        clusters,
        clusterIndex,
        ratelIndex: 0,
        fireIndex: 0,
        rtcIndex: 0
      });
      return;
    }
  }
  //run out of cluster, refresh dns
  if (expectClusterIndex == -1) {
    fire('retrieve_dns');
  }
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
};

const getAppConfig = (appID) => {
  if (!appID) return '';
  return getItem(storage_id('key_app_config', appID), false, -1, true);
};

bind('retrieve_dns', () => {
  const dnsServer = getConfig('dns_server');
  const appID = getConfig('app_id');
  const ws = getConfig('ws');

  log.warn('Retrieve DNS for appid: ', appID);
  asyncGetDns(dnsServer, appID, ws);
});

const asyncGetDns = (dnsServer, appID, ws) => {
  saveConfig('dns_server', dnsServer);
  saveConfig('app_id', appID);
  saveConfig('ws', ws);

  const sret = getServers(appID);
  if (sret.ratel) {
    http
      .getServers(dnsServer, {
        app_id: appID
      })
      .then((res) => {
        log.info('DNS SUCCESS: ', res);
        saveServers(appID, res);
        getFastestServer(appID).then(() => {
          http
            .getAppConfig(getServers(appID).ratel, {
              platform: 6
            })
            .then((res) => {
              log.info('APP CONFIG SUCCESS: ', res);
              saveAppConfig(appID, res);
            });
        });
      });
    return Promise.resolve(sret);
  }

  return http
    .getServers(dnsServer, {
      app_id: appID
    })
    .then((res) => {
      log.info('DNS SUCCESS: ', res);
      saveServers(appID, res);
      getFastestServer(appID).then(() => {
        getServers(appID);
        http
          .getAppConfig(getServers(appID).ratel, {
            platform: 6
          })
          .then((res) => {
            log.info('APP CONFIG SUCCESS: ', res);
            saveAppConfig(appID, res);
          });
      });
      return getServers(appID);
    });
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

const getFastestServer = (appID) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex } = data;

  const promises = clusters.map((cluster, index) => {
    let url = cluster.ratel[0].protocol + '://' + cluster.ratel[0].host + '/';
    return testServerSpeed(url, index);
  });

  return Promise.race(promises).then((fastest) => {
    log.info(`SpeedTest The fastest server is: ${JSON.stringify(fastest)}`);
    if (clusterIndex != fastest.index) {
      log.info(`SpeedTest change server: ${JSON.stringify(fastest)}`);
      changeClusterIndex(appID, fastest.index);
      const { fireplace, ratel } = getServers(appID) || {};
      fire('refresh_ratel', ratel);
      fire('refresh_fireplace', fireplace);
    }
  });
};

const dnsManager = {
  asyncGetDns,
  getServers,
  getAppConfig
};

export default dnsManager;
