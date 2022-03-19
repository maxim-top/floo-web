/***
 *
 XID    xid               = 1;
 uint64 key               = 2;
 Meta   meta              = 3; // for send message
 bool   is_full_sync      = 4;
 uint32 full_sync_num     = 5;

 */
function syncul(params) {
  params = Object.assign({}, params);
  typeof params.xid !== 'undefined' && (this.xid = params.xid);
  typeof params.key !== 'undefined' && (this.key = params.key);
  typeof params.meta !== 'undefined' && (this.meta = params.meta);
  typeof params.is_full_sync !== 'undefined' && (this.is_full_sync = params.is_full_sync);
  typeof params.full_sync_num !== 'undefined' && (this.full_sync_num = params.full_sync_num);
}

syncul.prototype = {
  setXid: function (xid) {
    this.xid = xid;
  },
  setKey: function (key) {
    this.key = key;
  },
  setMeta: function (meta) {
    this.meta = meta;
  },
  setIsfullsync: function (is_full_sync) {
    this.is_full_sync = is_full_sync;
  },
  setFullsyncnum: function (full_sync_num) {
    this.full_sync_num = full_sync_num;
  }
};

export default syncul;
