/**
 Status          status          = 1;
 XID             xid             = 2;
 EncryptMethod   encrypt_method  = 3;
 string          encrypt_key     = 4;
 string          password        = 5;
 string          token           = 6;
 OsType          os_type         = 7;
 string          sdk_vsn         = 8;
 bool            is_manual_login = 9;
 string          device_guid     = 10; // Device Global Unique Id
 string          device_notifier = 11; // offline msg push use this
 string          device_token    = 12;
 string          device_info     = 13; // User Agent or others
 uint64          last_login_time = 14; // last login time in millisecond
 */
// import xid from './xid';
import { STATIC_FRAME_ENCRYPTMETHOD, STATIC_FRAME_OSTYPE } from '../utils/static';

function provision(params) {
  params = Object.assign(
    {},
    {
      encrypt_method: STATIC_FRAME_ENCRYPTMETHOD.ENCRYPT_NONE,
      os_type: STATIC_FRAME_OSTYPE.WEB
      // device_guid: infoStore.getDeviceGuid(),
    },
    params
  );
  typeof params.status !== 'undefined' && (this.status = params.status);
  typeof params.xid !== 'undefined' && (this.xid = params.xid);
  typeof params.encrypt_method !== 'undefined' && (this.encrypt_method = params.encrypt_method);
  typeof params.encrypt_key !== 'undefined' && (this.encrypt_key = params.encrypt_key);
  typeof params.password !== 'undefined' && (this.password = params.password);
  typeof params.token !== 'undefined' && (this.token = params.token);
  typeof params.os_type !== 'undefined' && (this.os_type = params.os_type);
  typeof params.sdk_vsn !== 'undefined' && (this.sdk_vsn = params.sdk_vsn);
  typeof params.is_manual_login !== 'undefined' && (this.is_manual_login = params.is_manual_login);
  typeof params.device_guid !== 'undefined' && (this.device_guid = params.device_guid);
  typeof params.device_notifier !== 'undefined' && (this.device_notifier = params.device_notifier);
  typeof params.device_token !== 'undefined' && (this.device_token = params.device_token);
  typeof params.device_info !== 'undefined' && (this.device_info = params.device_info);
  typeof params.last_login_time !== 'undefined' && (this.last_login_time = params.last_login_time);
}

provision.prototype = {
  setStatus: function (status) {
    this.status = status;
  },
  setXid: function (xid) {
    this.xid = xid;
  },
  setEncryptmethod: function (encrypt_method) {
    this.encrypt_method = encrypt_method;
  },
  setEncryptkey: function (encrypt_key) {
    this.encrypt_key = encrypt_key;
  },
  setPassword: function (password) {
    this.password = password;
  },
  setToken: function (token) {
    this.token = token;
  },
  setOstype: function (os_type) {
    this.os_type = os_type;
  },
  setSdkvsn: function (sdk_vsn) {
    this.sdk_vsn = sdk_vsn;
  },
  setIsmanuallogin: function (is_manual_login) {
    this.is_manual_login = is_manual_login;
  },
  setDeviceguid: function (device_guid) {
    this.device_guid = device_guid;
  },
  setDevicenotifier: function (device_notifier) {
    this.device_notifier = device_notifier;
  },
  setDevicetoken: function (device_token) {
    this.device_token = device_token;
  },
  setDeviceinfo: function (device_info) {
    this.device_info = device_info;
  },
  setLastlogintime: function (last_login_time) {
    this.last_login_time = last_login_time;
  }
};

export default provision;
