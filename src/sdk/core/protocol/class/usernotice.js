import protobuf from 'protobufjs/light';
import jsonDescriptor from '../usernotice';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const UserNotice = root.lookupType('im.floo.protobuf.UserNotice');

const decode = (bytes) => UserNotice.decode(bytes);

const encode = (obj) => UserNotice.encode(obj).finish();

export { decode, encode };
