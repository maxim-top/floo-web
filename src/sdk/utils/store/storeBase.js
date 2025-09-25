import log from '../log';
import { transferToLong } from '../tools';
import { setItem } from './storeHelper';

const PARTITION_NUMBER = 31;

const getUid = () => {
  let uid = window.sessionStorage.getItem('key_user_id');
  if (uid) {
    return uid - 0;
  } else {
    uid = window.localStorage.getItem('key_user_id');
    if (uid) return uid - 0;
  }
  return;
};

const partitionId = (key) => {
  return key % PARTITION_NUMBER;
};

const saveItem = (key, item, hasuid = true, partition_key = -1, sessionStore = false) => {
  if (typeof item === 'undefined' || typeof key === 'undefined') {
    log.error('localstorage save error:', key, item);
    return;
  }

  var skey = key;
  if (hasuid) {
    const uid = getUid();
    skey = uid + '_' + key;
  }
  if (partition_key >= 0) {
    skey = skey + '_' + partitionId(partition_key);
  }

  if (typeof item === 'string') {
    if (sessionStore) {
      window.sessionStorage.setItem(skey, item);
    }
    setItem(skey, item);
    return;
  }

  let ret;
  if (Array.isArray(item)) {
    ret = {
      data: item
    };
  } else {
    ret = item;
  }
  try {
    const itemString = JSON.stringify(ret);
    if (itemString) {
      if (sessionStore) {
        window.sessionStorage.setItem(skey, itemString);
      }
      setItem(skey, itemString);
    }
  } catch (ex) {
    log.error('stringify error:', ex, skey, item);
  }
};

const getItem = (key, hasuid = true, partition_key = -1, sessionStore = false) => {
  if (typeof key === 'undefined') {
    log.error('localstorage get error:', key);
    return;
  }

  var skey = key;
  if (hasuid) {
    const uid = getUid();
    skey = uid + '_' + key;
  }
  if (partition_key >= 0) {
    skey = skey + '_' + partitionId(partition_key);
  }

  let itemString = null;
  if (sessionStore) {
    itemString = window.sessionStorage.getItem(skey);
    if (!itemString) {
      itemString = window.localStorage.getItem(skey);
    }
  } else {
    itemString = window.localStorage.getItem(skey);
  }
  if (!itemString) return undefined;
  let ret = itemString;
  try {
    ret = JSON.parse(itemString);
  } catch (ex) {
    //
  }
  ret = transferToLong(ret);
  return ret.data || ret;
};

const removeItem = (key, hasuid = true, partition_key = -1, sessionStore = false) => {
  let skey = key;
  if (hasuid) {
    const uid = getUid();
    skey = uid + '_' + key;
  }
  if (partition_key >= 0) {
    skey = skey + '_' + partitionId(partition_key);
  }
  if (sessionStore) {
    window.sessionStorage.removeItem(skey);
  }
  window.localStorage.removeItem(skey);
};

const removeAllItems = (key, hasuid = true) => {
  var i;
  for (i = 0; i < PARTITION_NUMBER; i++) {
    removeItem(key, hasuid, i);
  }
  removeItem(key, hasuid);
};

export { saveItem, getItem, removeItem, removeAllItems };
