import protobuf from 'protobufjs/light';
import jsonDescriptor from '../rtcsignal';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const RtcSignal = root.lookupType('im.floo.protobuf.RtcSignal');

const decode = (bytes) => RtcSignal.decode(bytes);

const encode = (obj) => RtcSignal.encode(obj).finish();

export { decode, encode };
