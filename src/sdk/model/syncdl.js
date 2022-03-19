/***
 Status status    = 1;
 repeated Meta   metas     = 2;
 uint64 next_key  = 3;
 XID    xid       = 4;
 uint64 client_mid  = 5;
 uint64 server_mid  = 6;
 uint64 server_time = 7;
 bool   is_full_sync  = 8;
 uint64 prev_mid      = 9;
 bool   is_eager_sync = 10;
 */
function syncdl(params) {
  params = Object.assign({}, params);
  typeof params.status !== 'undefined' && (this.status = params.status);
  typeof params.metas !== 'undefined' && (this.metas = params.metas);
  typeof params.next_key !== 'undefined' && (this.next_key = params.next_key);
  typeof params.xid !== 'undefined' && (this.xid = params.xid);
  typeof params.client_mid !== 'undefined' && (this.client_mid = params.client_mid);
  typeof params.server_mid !== 'undefined' && (this.server_mid = params.server_mid);
  typeof params.server_time !== 'undefined' && (this.server_time = params.server_time);
  typeof params.is_full_sync !== 'undefined' && (this.is_full_sync = params.is_full_sync);
  typeof params.prev_mid !== 'undefined' && (this.prev_mid = params.prev_mid);
  typeof params.is_eager_sync !== 'undefined' && (this.is_eager_sync = params.is_eager_sync);
}

syncdl.prototype = {
  setStatus: function (status) {
    this.status = status;
  },
  setMetas: function (metas) {
    this.metas = metas;
  },
  setNextkey: function (next_key) {
    this.next_key = next_key;
  },
  setXid: function (xid) {
    this.xid = xid;
  },
  setClientmid: function (client_mid) {
    this.client_mid = client_mid;
  },
  setServermid: function (server_mid) {
    this.server_mid = server_mid;
  },
  setServertime: function (server_time) {
    this.server_time = server_time;
  },
  setIsfullsync: function (is_full_sync) {
    this.is_full_sync = is_full_sync;
  },
  setPrevmid: function (prev_mid) {
    this.prev_mid = prev_mid;
  },
  setIseagersync: function (is_eager_sync) {
    this.is_eager_sync = is_eager_sync;
  }
};

export default syncdl;
