// 有其他调用
import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';
import { STATIC_FRAME_COMMAND } from '../../../utils/static';
import { decode as unreadDecode, encode as unreaddlEncode } from './unreaddl';
import { decode as syncdlDecode } from './syncdl';
import { encode as synculEncode } from './syncul';
import { decode as noticeDecode, encode as noticeEncode } from './notice';
import { decode as provisionDecode, encode as provisionEncode } from './provision';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const Frame = root.lookupType('im.floo.protobuf.Frame');

// const pubkey = infoStore.getAesKey();

const decode = (bytes) => {
  bytes = new Uint8Array(bytes);
  const ret = Frame.decode(bytes);
  const { command, payload } = ret;
  if (command === STATIC_FRAME_COMMAND.UNREAD) {
    ret.payload = unreadDecode(payload);
  } else if (command === STATIC_FRAME_COMMAND.SYNC) {
    ret.payload = syncdlDecode(payload);
  } else if (command === STATIC_FRAME_COMMAND.NOTICE) {
    ret.payload = noticeDecode(payload);
  } else if (command === STATIC_FRAME_COMMAND.PROVISION) {
    ret.payload = provisionDecode(payload);
  }
  return ret;
};

const encode = (obj) => {
  const { payload, command } = obj;
  if (payload) {
    if (command === STATIC_FRAME_COMMAND.UNREAD) {
      obj.payload = unreaddlEncode(payload);
    } else if (command === STATIC_FRAME_COMMAND.SYNC) {
      obj.payload = synculEncode(payload);
    } else if (command === STATIC_FRAME_COMMAND.NOTICE) {
      obj.payload = noticeEncode(payload);
    } else if (command === STATIC_FRAME_COMMAND.PROVISION) {
      obj.payload = provisionEncode(payload);
    }
  }
  const ret = Frame.encode(obj).finish();
  return ret;
};

export { decode, encode };
