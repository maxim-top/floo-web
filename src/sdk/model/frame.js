/**
 *
 VSN              vsn                = 1;
 CompressMethod   compress_method    = 2;
 Command          command            = 3;
 bytes            payload            = 4;

 */
import { STATIC_FRAME_COMPRESS_METHOD, STATIC_FRAME_VSN } from '../utils/static';

function frame(params) {
  params = Object.assign(
    {},
    {
      vsn: STATIC_FRAME_VSN.XSYNC_V1,
      compress_method: STATIC_FRAME_COMPRESS_METHOD.NONE
    },
    params
  );
  typeof params.vsn !== 'undefined' && (this.vsn = params.vsn);
  typeof params.compress_method !== 'undefined' && (this.compress_method = params.compress_method);
  typeof params.command !== 'undefined' && (this.command = params.command);
  typeof params.payload !== 'undefined' && (this.payload = params.payload);
  typeof params.encrypt_method !== 'undefined' && (this.encrypt_method = params.encrypt_method);
  typeof params.encrypt_key !== 'undefined' && (this.encrypt_key = params.encrypt_key);
  typeof params.check_sum !== 'undefined' && (this.check_sum = params.check_sum);
  typeof params.tag !== 'undefined' && (this.tag = params.tag);
}

frame.prototype = {
  setVsn: function (vsn) {
    this.vsn = vsn;
  },
  setCompressmethod: function (compress_method) {
    this.compress_method = compress_method;
  },
  setCommond: function (command) {
    this.command = command;
  },
  setPayload: function (payload) {
    this.payload = payload;
  },
  setEncryptmethod: function (encrypt_method) {
    this.encrypt_method = encrypt_method;
  },
  setEncryptkey: function (encrypt_key) {
    this.encrypt_key = encrypt_key;
  },
  setChecksum: function (check_sum) {
    this.check_sum = check_sum;
  },
  setTag: function (tag) {
    this.tag = tag;
  }
};

export default frame;
