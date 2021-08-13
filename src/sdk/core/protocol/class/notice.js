import { decode as xidDecode } from './xid';
import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const Notice = root.lookupType('im.floo.protobuf.Notice');

const decode = (bytes) => {
  const xid = xidDecode(bytes);
  // const ret = Notice.decode(bytes);
  return { xid };
};

const encode = (obj) => Notice.encode(obj).finish();

export { decode, encode };
