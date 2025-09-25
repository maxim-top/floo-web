import log from '../log';
import { getItem, removeItem, saveItem } from './storeBase';

const saveUid = (uid) => {
  if (uid) {
    saveItem('key_user_id', uid + '', false, -1, true);
  } else {
    log.error('uid error:', uid);
    throw new Error('uid is error ...');
  }
};

const getUid = () => {
  let uid = getItem('key_user_id', false, -1, true);
  if (uid) return uid - 0;
};

const saveAppid = (appid) => {
  if (appid) {
    saveItem('key_app_id', appid + '', false, -1, true);
  } else {
    log.error('Invalid appid :', appid);
    throw new Error('Invalid appid ...');
  }
};

const getAppid = () => {
  return getItem('key_app_id', false, -1, true);
};

const removeUid = () => {
  removeItem('key_user_id');
};

const deleteToken = () => {
  removeItem('key_user_token', true, -1, true);
};

const deleteLinkServer = () => {
  removeItem('key_user_link_server');
};

const deleteAesKey = () => {
  removeItem('key_user_aes_key');
};

const deleteDeviceSN = () => {
  removeItem('key_user_device_sn');
};

const deleteDeviceGuid = () => {
  removeItem('key_user_device_guid');
};

const deleteTokenAppId = () => {
  removeItem('key_user_token_app_id');
};

const infoStore = {
  saveToken: (token) => saveItem('key_user_token', token, true, -1, true),
  getToken: () => getItem('key_user_token', true, -1, true),
  deleteToken,
  saveTokenAppId: (appId) => saveItem('key_user_token_app_id', appId),
  getTokenAppId: () => getItem('key_user_token_app_id'),
  deleteTokenAppId,
  saveLinkServer: (linkServer) => saveItem('key_user_link_server', linkServer),
  getLinkServer: () => getItem('key_user_link_server'),
  deleteLinkServer,
  getAesKey: () => getItem('key_user_aes_key'),
  saveAesKey: (key) => saveItem('key_user_aes_key', key),
  deleteAesKey,
  saveDeviceSN: (deviceSN) => saveItem('key_user_device_sn', deviceSN),
  getDeviceSN: () => {
    let ret = getItem('key_user_device_sn');
    if (!ret) {
      ret = 999999999 + Math.floor(Math.random() * 2140000) + '';
    }
    return ret - 0;
  },
  deleteDeviceSN,
  saveUid,
  getUid,
  removeUid,
  getDeviceGuid: () => {
    const uid = getUid();
    if (!uid) return '';
    let ret = getItem('key_user_device_guid');
    if (!ret) {
      ret = getUid() + '_' + Math.floor(Math.random() * 2147483648) + '';
      saveItem('key_user_device_guid', ret);
    }
    return ret;
  },
  deleteDeviceGuid,
  saveProfile: (profile) => saveItem('key_user_profile', profile),
  getProfile: () => getItem('key_user_profile'),

  clear: () => {
    deleteDeviceSN();
    deleteAesKey();
    deleteToken();
    removeUid();
    deleteDeviceGuid();
    deleteTokenAppId();
    deleteLinkServer();
  },

  saveAppid,
  getAppid
};

export default infoStore;
