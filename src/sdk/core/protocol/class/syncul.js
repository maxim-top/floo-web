import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';
import { constr as metaConstr } from './meta';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const SyncUL = root.lookupType('im.floo.protobuf.SyncUL');

const decode = (bytes) => {
  return SyncUL.decode(bytes);
};

const encode = (obj) => {
  obj.meta && (obj.meta = metaConstr(obj.meta));
  const ret = SyncUL.encode(obj).finish();
  return ret;
};

export { decode, encode };
