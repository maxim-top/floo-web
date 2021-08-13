import protobuf from 'protobufjs/light';
import jsonDescriptor from '../rosternotice';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const RosterNotice = root.lookupType('im.floo.protobuf.RosterNotice');

const decode = (bytes) => {
  const ret = RosterNotice.decode(bytes);
  return ret;
};

const encode = (obj) => {
  return RosterNotice.encode(obj).finish();
};

export { decode, encode };
