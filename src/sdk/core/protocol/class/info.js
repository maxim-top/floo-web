import jsonDescriptor from '../info';
import protobuf from 'protobufjs/light';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const Info = root.lookupType('im.floo.protobuf.Info');

const decode = (bytes) => Info.decode(bytes);

const encode = (obj) => Info.encode(obj).finish();

export { decode, encode };
