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
    fireIndex: 0
  };

  saveDnsInfo(appID, ret);
};

const getServers = (appID) => {
  if (!appID) return {};
  const ws = getConfig('ws');
  const data = getDnsInfo(appID);
  const { clusters, clusterIndex, ratelIndex, fireIndex } = data;
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

  if (!ratelObj || !fireObj) {
    return {};
  }
  const ratel = ratelObj.protocol + '://' + ratelObj.host;

  let fireprotocol = 'https';
  if (ws) {
    if (fireObj.protocol === 'https') {
      fireprotocol = 'wss';
    } else {
      fireprotocol = 'ws';
    }
  } else {
    fireprotocol = fireObj.protocol;
  }
  const fireplace = fireprotocol + '://' + fireObj.host;
  return {
    ratel,
    fireplace
  };
};

const changeRatelIndex = (appID) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex, ratelIndex, fireIndex } = data;
  const clusterObj = clusters[clusterIndex];
  const ratels = clusterObj.ratel;
  if (ratels.length > ratelIndex + 1) {
    ratelIndex++;
    saveDnsInfo(appID, {
      clusters,
      clusterIndex,
      ratelIndex,
      fireIndex
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
  let { clusters, clusterIndex, ratelIndex, fireIndex } = data;
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
      fireIndex
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

const changeClusterIndex = (appID) => {
  const data = getDnsInfo(appID);
  let { clusters, clusterIndex } = data;

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
        fireIndex: 0
      });
      return;
    }
  }
  //run out of cluster, refresh dns
  fire('retrieve_dns');
};

const getDnsInfo = (appID) => {
  return getItem(storage_id('key_dns_infos', appID), false) || {};
};

const saveDnsInfo = (appID, dnsInfo) => {
  saveItem(storage_id('key_dns_infos', appID), dnsInfo, false);
};

const getConfig = (name) => {
  if (!name) return '';
  return getItem(storage_id('key_dns_config', name), false);
};

const saveConfig = (name, value) => {
  if (!name || !value) return;
  saveItem(storage_id('key_dns_config', name), value, false);
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
    return Promise.resolve(sret);
  }

  return http
    .getServers(dnsServer, {
      app_id: appID
    })
    .then((res) => {
      log.info('DNS SUCCESS: ', res);
      saveServers(appID, res);
      return getServers(appID);
    });
};

const dnsManager = {
  asyncGetDns,
  getServers
};

export default dnsManager;
