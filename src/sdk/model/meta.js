/**
 *
 uint64    id         = 1;
 XID       from       = 2;
 XID       to         = 3;
 uint64    timestamp  = 4;
 NameSpace ns         = 5;
 bytes     payload    = 6;

 */
// import xid from './xid';

function meta(params) {
  params = Object.assign({}, params);
  typeof params.id !== 'undefined' && (this.id = params.id);
  typeof params.from !== 'undefined' && (this.from = params.from);
  typeof params.to !== 'undefined' && (this.to = params.to);
  typeof params.timestamp !== 'undefined' && (this.timestamp = params.timestamp);
  typeof params.ns !== 'undefined' && (this.ns = params.ns);
  typeof params.payload !== 'undefined' && (this.payload = params.payload);
}

meta.prototype = {
  setId: function (id) {
    this.id = id;
  },
  setFrom: function (from) {
    this.from = from;
  },
  setTo: function (to) {
    this.to = to;
  },
  setTimestamp: function (timestamp) {
    this.timestamp = timestamp;
  },
  setNs: function (ns) {
    this.ns = ns;
  },
  setPayload: function (payload) {
    this.payload = payload;
  }
};

export default meta;
