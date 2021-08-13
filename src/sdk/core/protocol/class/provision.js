import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const Provision = root.lookupType('im.floo.protobuf.Provision');

const decode = (bytes) => {
  const ret = Provision.decode(bytes);
  return ret;
};

const encode = (obj) => {
  return Provision.encode(obj).finish();
};

export { decode, encode };
