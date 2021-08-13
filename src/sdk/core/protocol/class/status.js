import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const Status = root.lookupType('im.floo.protobuf.Status');

const decode = (bytes) => bytes && Status.decode(bytes);

const encode = (obj) => obj && Status.encode(obj).finish();

const constr = (obj) => Status.create(obj);

export { decode, encode, constr };
