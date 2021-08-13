import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const XID = root.lookupType('im.floo.protobuf.XID');

const decode = (bytes) => XID.decode(bytes);

const encode = (obj) => {
  const ret = XID.encode(obj).finish();
  return ret;
};

const constr = (obj) => XID.create(obj);

export { decode, encode, constr };
