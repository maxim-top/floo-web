import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const UnreadDL = root.lookupType('im.floo.protobuf.UnreadDL');

const decode = (bytes) => {
  const ret = UnreadDL.decode(bytes);
  return ret;
};

const encode = (obj) => {
  return UnreadDL.encode(obj).finish();
};

export { decode, encode };
