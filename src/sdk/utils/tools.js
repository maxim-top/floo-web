import Long from 'long';
import { STATIC_MESSAGE_CONTENT_TYPE, STATIC_MESSAGE_STATUS } from './static';

const formatJson = (obj) => {
  const isLong = obj instanceof Long;
  if (isLong) {
    return obj.toString();
  }
  // for uniapp compatibility, obj might not be instance of Long
  // since protobuf.wechat uses it own long.js
  const { low, high, unsigned = true } = obj;
  if (typeof low !== 'undefined' && typeof high !== 'undefined') {
    const srret = new Long(low, high, unsigned);
    return srret.toString();
  }

  const type = typeof obj;
  if (type === 'boolean' || type === 'string' || type === 'number') {
    return obj;
  }

  if (Array.isArray(obj)) {
    const arrRet = [];
    obj.forEach((item) => {
      typeof item !== 'undefined' && arrRet.push(formatJson(item));
    });
    return arrRet;
  }

  const hashRet = {};
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    typeof obj[key] !== 'undefined' && (hashRet[key] = formatJson(obj[key]));
  });
  return hashRet;
};

const transferToLong = (obj) => {
  const { low, high, unsigned } = obj;
  if (typeof low !== 'undefined' && typeof high !== 'undefined') {
    const srret = new Long(low, high, unsigned);
    return srret;
  }
  const type = typeof obj;
  if (type === 'boolean' || type === 'string' || type === 'number') {
    return obj;
  }
  if (Array.isArray(obj)) {
    const arrRet = [];
    obj.forEach((item) => {
      arrRet.push(transferToLong(item));
    });
    return arrRet;
  }
  const hashRet = {};
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    hashRet[key] = transferToLong(obj[key]);
  });
  return hashRet;
};

const toNumber = (obj = 0) => {
  if (typeof obj === 'string') {
    return obj - 0;
  }
  if (typeof obj === 'number') {
    return obj;
  }
  const { low, high, unsigned = true } = obj;
  if (typeof low !== 'undefined' && high !== 'undefined') {
    return new Long(low, high, unsigned).toNumber();
  }
};

const toLong = (obj) => {
  if (typeof obj === 'string') return Long.fromString(obj);
  const { low, high, unsigned = true } = obj;
  if (typeof low !== 'undefined' && high !== 'undefined') {
    return new Long(low, high, unsigned);
  }
  if (typeof obj === 'number') {
    return Long.fromNumber(obj);
  }
  return new Long();
};

const numToString = (obj) => {
  if (typeof obj === 'undefined') {
    return '';
  }
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return obj + '';
  if (typeof obj.low !== 'undefined' && typeof obj.high !== 'undefined') {
    return new Long(obj.low, obj.high, true).toString();
  }
  return new Long(obj).toString();
};

const Uint8ArrayToString = (fileData) => {
  var dataString = '';
  for (var i = 0; i < fileData.length; i++) {
    dataString += String.fromCharCode(fileData[i]);
  }

  return dataString;
};

const stringToUint8Array = (str) => {
  var arr = [];
  for (var i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i));
  }
  var tmpUint8Array = new Uint8Array(arr);
  return tmpUint8Array;
};

const metaToCustomer = (meta) => {
  if (!meta.payload) return meta;
  const { payload, from = {}, to = {}, id = {}, status, timestamp } = meta;
  const { content = '', attachment = '', ctype = 0, ext, config, type } = payload;
  let attach = null;
  let sconfig = null;
  try {
    attach = JSON.parse(attachment);
  } catch (ex) {
    //
  }

  try {
    sconfig = JSON.parse(config);
  } catch (ex) {
    //
  }

  // Messages from server has payload.status
  let local_status = status ? status : payload.status;

  let ret = {
    id: numToString(id),
    from: numToString(from.uid),
    to: numToString(to.uid),
    content,
    type: Object.keys(STATIC_MESSAGE_CONTENT_TYPE)[ctype].toLowerCase(),
    ext,
    status: local_status ? local_status : STATIC_MESSAGE_STATUS.UNREAD,
    timestamp: numToString(timestamp || 0),
    toType: type == 2 ? 'roster' : 'group'
  };
  if (attach) ret.attach = attach;
  if (sconfig) ret.config = sconfig;
  return ret;
};

const metasToCustomer = (metas) => {
  let a = [];
  metas.forEach((x) => {
    a.push(metaToCustomer(x));
  });
  return a;
};

export { formatJson, transferToLong, toLong, toNumber, numToString, Uint8ArrayToString, stringToUint8Array, metaToCustomer, metasToCustomer };
