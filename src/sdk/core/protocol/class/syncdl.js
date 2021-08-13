import { encode as metaEncode } from './meta';
import { decode as msgBodyDecode } from './messagebody';
import { decode as groupnoticeDecode } from './groupnotice';
import { decode as rosternoticeDecode } from './rosternotice';
import { decode as usernoticeDecode } from './usernotice';
import { decode as infoDecode } from './info';
import { decode as convDecode } from './conversation';
import { STATIC_META_NAMESPACE } from '../../../utils/static';
import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';

const SyncDL = protobuf.Root.fromJSON(jsonDescriptor).lookupType('im.floo.protobuf.SyncDL');

const decode = (bytes) => {
  const ret = SyncDL.decode(bytes); //metas直接就给解了。。。。
  const { metas = [] } = ret; // meta中的payload这里不解析。。。额
  const metaRet = [];
  metas.forEach((meta) => {
    const { ns, payload } = meta;
    if (ns === STATIC_META_NAMESPACE.MESSAGE) {
      meta.payload = msgBodyDecode(payload);
    }
    if (ns === STATIC_META_NAMESPACE.GROUP_NOTICE) {
      meta.payload = groupnoticeDecode(payload);
    }
    if (ns === STATIC_META_NAMESPACE.ROSTER_NOTICE) {
      meta.payload = rosternoticeDecode(payload);
    }
    if (ns === STATIC_META_NAMESPACE.USER_NOTICE) {
      meta.payload = usernoticeDecode(payload);
    }
    if (ns === STATIC_META_NAMESPACE.INFO) {
      meta.payload = infoDecode(payload);
    }
    if (ns === STATIC_META_NAMESPACE.CONVERSATION) {
      meta.payload = convDecode(payload);
    }
    metaRet.push(meta);
  });
  ret.metas = metaRet;
  return ret;
};

const encode = (obj) => {
  const arr = [];
  const { metas = [] } = obj;
  metas.forEach((item) => {
    arr.push(metaEncode(item));
  });
  obj.metas = arr;
  return SyncDL.encode(obj).finish();
};

export { decode, encode };
