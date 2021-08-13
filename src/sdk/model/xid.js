/*
uint64 uid       = 1; // or gid
uint32 deviceSN  = 2; // device serial number
**/
import { infoStore } from '../utils/store';

const xid = function (params = {}) {
  this.uid = params.uid || 0;
  const deviceSN = typeof params.deviceSN === 'undefined' ? infoStore.getDeviceSN() : params.deviceSN;
  this.deviceSN = deviceSN;
};

xid.prototype.setUid = function (uid) {
  this.uid = uid;
};

xid.prototype.setDeviceSN = function (sn) {
  this.deviceSN = sn;
};

export default xid;
