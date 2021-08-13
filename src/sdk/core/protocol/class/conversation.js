import jsonDescriptor from '../conversation';
import protobuf from 'protobufjs/light';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const Conv = root.lookupType('im.floo.protobuf.Conversation');

const decode = (bytes) => Conv.decode(bytes);

const encode = (obj) => Conv.encode(obj).finish();

export { decode, encode };
