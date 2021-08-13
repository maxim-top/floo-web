import { encode as xidEncode } from './xid';
import protobuf from 'protobufjs/light';
import jsonDescriptor from '../groupnotice';
// import { encode as statusEncode, decode as statusDecode } from './status';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const GroupNotice = root.lookupType('im.floo.protobuf.GroupNotice');

const decode = (bytes) => {
  const ret = GroupNotice.decode(bytes); // 也都已经搞好了。。
  // ret.from = xidDecode(ret.from);
  // ret.xid = xidDecode(ret.xid);
  // const sto = ret.to || [];
  // const toArr = [];
  // sto.forEach(item => {
  //   toArr.push(xidDecode(item));
  // })
  // ret.to = toArr;
  return ret;
};

const encode = (obj) => {
  // obj.xid = xidEncode(obj.xid);
  obj.from = xidEncode(obj.from);
  const toArr = [];
  const sto = obj.to || [];
  sto.forEach((item) => {
    toArr.push(xidEncode(item));
  });
  obj.to = toArr;
  return GroupNotice.encode(obj).finish();
};

export { decode, encode };
