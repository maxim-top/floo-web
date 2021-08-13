import { decode as xidDecode } from './xid';

import protobuf from 'protobufjs/light';
import jsonDescriptor from '../xsync';

var root = protobuf.Root.fromJSON(jsonDescriptor);
const ConversationUnread = root.lookupType('im.floo.protobuf.ConversationUnread');

const decode = (bytes) => {
  if (typeof bytes === 'undefined') {
    return bytes;
  }
  const ret = ConversationUnread.decode(bytes);
  ret.xid && (ret.xid = xidDecode(ret.xid));
  return ret;
};

export { decode };
