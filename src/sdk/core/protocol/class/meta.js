import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';
import { STATIC_META_NAMESPACE } from '../../../utils/static';
import { decode as msgBodyDecode, encode as msgBodyEncode } from './messagebody';
import { decode as groupnoticeDecode, encode as groupnoticeEncode } from './groupnotice';
import { decode as rosternoticeDecode, encode as rosternoticeEncode } from './rosternotice';
import { decode as usernoticeDecode, encode as usernoticeEncode } from './usernotice';
import { decode as infoDecode, encode as infoEncode } from './info';
import { decode as convDecode, encode as convEncode } from './conversation';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const Meta = root.lookupType('im.floo.protobuf.Meta');

const decode = (bytes) => {
  const ret = Meta.decode(bytes);
  const { ns, payload } = ret;
  if (ns === STATIC_META_NAMESPACE.MESSAGE) {
    ret.payload = msgBodyDecode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.GROUP_NOTICE) {
    ret.payload = groupnoticeDecode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.ROSTER_NOTICE) {
    ret.payload = rosternoticeDecode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.USER_NOTICE) {
    ret.payload = usernoticeDecode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.INFO) {
    ret.payload = infoDecode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.CONVERSATION) {
    ret.payload = convDecode(payload);
  }
  return ret;
};

const encode = (obj) => {
  const { ns, payload } = obj;
  // typeof ns !== 'undefined' && smeta.setNs(ns);

  if (ns === STATIC_META_NAMESPACE.MESSAGE) {
    obj.payload = msgBodyEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.GROUP_NOTICE) {
    obj.payload = groupnoticeEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.ROSTER_NOTICE) {
    obj.payload = rosternoticeEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.USER_NOTICE) {
    obj.payload = usernoticeEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.INFO) {
    obj.payload = infoEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.CONVERSATION) {
    obj.payload = convEncode(payload);
  }
  return Meta.encode(obj).finish();
};

const constr = (obj) => {
  const { ns, payload } = obj;

  if (ns === STATIC_META_NAMESPACE.MESSAGE) {
    obj.payload = msgBodyEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.GROUP_NOTICE) {
    obj.payload = groupnoticeEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.ROSTER_NOTICE) {
    obj.payload = rosternoticeEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.USER_NOTICE) {
    obj.payload = usernoticeEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.INFO) {
    obj.payload = infoEncode(payload);
  }
  if (ns === STATIC_META_NAMESPACE.CONVERSATION) {
    obj.payload = convEncode(payload);
  }
  return Meta.create(obj);
};

export { decode, encode, constr };
