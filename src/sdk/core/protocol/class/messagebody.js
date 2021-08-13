import { constr as xidConstr } from './xid';
import protobuf from 'protobufjs/light';
import jsonDescriptor from '../messagebody';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const MessageBody = root.lookupType('im.floo.protobuf.MessageBody');
// const MessageOperation = root.lookupType("top.maxim.protobuf.MessageOperation");

const decode = (bytes) => {
  const ret = MessageBody.decode(bytes);
  //里边其他东西已经解析了。。
  return ret;
};

const encode = (obj) => {
  // 其他已经encode了，这里不需要额外处理了，都是坑啊。。
  // obj.operation = MessageOperation.encode(obj.operation).finish();
  // obj.from = xidEncode(obj.from);
  // obj.to = xidEncode(obj.to);
  return MessageBody.encode(obj).finish();
};

const constr = (obj) => {
  obj.xid = xidConstr(obj.xid);
  return MessageBody.create(obj);
};

export { decode, encode, constr };
