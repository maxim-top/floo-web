import { rtcmessage, conversation, frame, message, meta, provision, syncul, xid } from '../../model/index';
import { infoStore } from '../../utils/store';
import { toLong, toNumber } from '../../utils/tools';
import log from '../../utils/log';
import {
  STATIC_RTC_SIGNAL_TYPE,
  STATIC_CONVERSATION_TYPE,
  STATIC_CONVERSATION_OPTYPE,
  STATIC_FRAME_COMMAND,
  STATIC_FRAME_ENCRYPTMETHOD,
  STATIC_MESSAGE_CONTENT_TYPE,
  STATIC_MESSAGE_OPTYPE,
  STATIC_MESSAGE_QOS,
  STATIC_MESSAGE_TYPE,
  STATIC_META_NAMESPACE
} from '../../utils/static';
import { bind, fire } from '../../utils/cusEvent'; // let userNoticeStatus = 'normal';  // normal, kick , logout
// let guid = infoStore.getDeviceGuid();
let count = 0;

let deviceSN = infoStore.getDeviceSN();
let deviceGuid = infoStore.getDeviceGuid();

const makeUniqueMid = () => {
  if (count > 1000) {
    count = 0;
  } else {
    count++;
  }
  return parseInt(new Date().getTime() + '' + count);
};

bind('userKicked', () => {
  log.log('user is kicked ... will new devicesn and guid, old Guid', deviceGuid);
  // guid = infoStore.getUid() + '_' + Math.floor(Math.random() * 2147483648);
  deviceSN = 0;
  deviceGuid = 999999999 + Math.floor(Math.random() * 2140000) + '';
  log.log('new Guid', deviceGuid);
});

bind('temporary_deviceSN', (x) => {
  deviceSN = x;
});

const makeSyncul = (param) => {
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  param.xid && ssyncul.setXid(param.xid);
  param.next_key && ssyncul.setKey(param.next_key);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeProvision = (param) => {
  const sxid = new xid({
    uid: param.uid - 0,
    deviceSN
  });
  const sprovision = new provision();
  if (!deviceGuid) deviceGuid = infoStore.getDeviceGuid();
  sprovision.setXid(sxid);
  sprovision.setToken(param.token);
  sprovision.setDeviceguid(deviceGuid);
  sprovision.setSdkvsn('2.0.0');
  sprovision.setEncryptmethod(STATIC_FRAME_ENCRYPTMETHOD.AES_CBC_128);
  sprovision.setEncryptkey(infoStore.getAesKey());
  sprovision.setDeviceinfo('Web');
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.PROVISION);
  sframe.setPayload(sprovision);

  return sframe;
};

const makeUnreadUl = (xid) => {
  xid.uid = xid.uid || 0;
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  ssyncul.setXid(xid);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeUnreadULTimer = () => {
  return {
    vsn: 0,
    compress_method: 0,
    command: 0
  };
};

const makeGroupMessage = (amessage) => {
  const { gid, content, type = 'text', attachment, ext, priority } = amessage;
  let sctype = Object.keys(STATIC_MESSAGE_CONTENT_TYPE).indexOf(type.toUpperCase());

  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });
  const to = new xid({
    uid: gid,
    deviceSN: 0
  });
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    content,
    ctype: sctype,
    type: STATIC_MESSAGE_TYPE.GROUPCHAT,
    ext
  });

  if (priority > 0) {
    smessage.priority = priority; // 设置消息的扩散优先级，默认为0。0表示扩散，数字越小扩散的越多。
  }

  if (sctype > 0 && attachment) {
    // 0是文本
    smessage.attachment = JSON.stringify(attachment);
  }

  const smeta = new meta({
    id: new Date().getTime(),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE,
    timestamp: new Date().getTime()
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeRosterMessage = (amessage) => {
  const { uid, content, type = 'text', ext, config, attachment } = amessage;
  fire('imSendRosterSignal', amessage);
  let sctype = Object.keys(STATIC_MESSAGE_CONTENT_TYPE).indexOf(type.toUpperCase());

  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });
  const to = new xid({
    uid: uid - 0,
    deviceSN: 0
  });
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    content,
    ctype: sctype,
    type: STATIC_MESSAGE_TYPE.CHAT,
    ext,
    config
  });

  if (sctype > 0 && attachment) {
    // 0是文本
    smessage.attachment = JSON.stringify(attachment);
  }

  const smeta = new meta({
    id: new Date().getTime(),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE,
    timestamp: new Date().getTime()
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeMessageDelevery = (amessage) => {
  const { id, from } = amessage;
  const fromUid = toNumber(from.uid);
  const sframe = new frame();
  const sfrom = new xid({
    uid: infoStore.getUid(),
    deviceSN
  });
  const sto = new xid({
    uid: fromUid,
    deviceSN: 0
  });
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  const smessage = new message({
    from: sfrom,
    to: sto,
    ctype: STATIC_MESSAGE_CONTENT_TYPE.COMMAND,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.DELIVER_ACK,
      mid: id
    }
  });
  const smeta = new meta({
    id: new Date().getTime(),
    from: sfrom,
    to: sto,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeReadMessageAck = (rid, mid) => {
  mid = toLong(mid);
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const from = new xid({
    uid: infoStore.getUid(),
    deviceSN
  });
  const to = new xid({
    uid: toNumber(rid),
    deviceSN: 0
  });
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    ctype: STATIC_MESSAGE_CONTENT_TYPE.COMMAND,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.READ_ACK,
      mid: mid
    }
  });
  const smeta = new meta({
    id: new Date().getTime() + Math.floor(Math.random() * 256),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeMessagePlayedAck = (rid, mid) => {
  mid = toLong(mid);
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const from = new xid({
    uid: infoStore.getUid(),
    deviceSN
  });
  const to = new xid({
    uid: toNumber(rid),
    deviceSN: 0
  });
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    ctype: STATIC_MESSAGE_CONTENT_TYPE.COMMAND,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.PLAY_ACK,
      mid: mid
    }
  });
  const smeta = new meta({
    id: new Date().getTime() + Math.floor(Math.random() * 256),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeHistorySyncul = (uid, sid, amount) => {
  sid = toLong(sid);
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const sxid = new xid({
    uid: toNumber(uid),
    deviceSN: 0
  });
  const ssyncul = new syncul();
  ssyncul.setXid(sxid);
  ssyncul.setKey(toNumber(sid));
  ssyncul.setFullsyncnum(amount);
  ssyncul.setIsfullsync(true);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeRecallMessage = (uid, mid) => {
  mid = toLong(mid);
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const from = new xid({
    uid: infoStore.getUid(),
    deviceSN
  });
  const to = new xid({
    uid: toNumber(uid),
    deviceSN: 0
  });
  const ssyncul = new syncul();
  const smessage = new message({
    ctype: STATIC_MESSAGE_CONTENT_TYPE.COMMAND,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.RECALL,
      mid: mid,
      xid: to
    }
  });
  const smeta = new meta({
    id: parseInt(new Date().getTime() + '' + Math.floor(Math.random() * 256)),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeDeleteMessage = (uid, mid) => {
  mid = toLong(mid);
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const from = new xid({
    uid: infoStore.getUid(),
    deviceSN
  });
  const to = new xid({ uid: toNumber(uid), deviceSN: 0 });
  const ssyncul = new syncul();
  const smessage = new message({
    ctype: STATIC_MESSAGE_CONTENT_TYPE.COMMAND,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.DELETE,
      mid: mid,
      xid: to
    }
  });

  const smeta = new meta({
    id: parseInt(new Date().getTime() + '' + Math.floor(Math.random() * 256)),
    from,
    to: from, // delete message will send to oneself
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeUnreadMessage = (uid, mid) => {
  mid = toLong(mid);
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const from = new xid({
    uid: infoStore.getUid(),
    deviceSN
  });
  const to = new xid({ uid: toNumber(uid), deviceSN: 0 });
  const ssyncul = new syncul();
  const smessage = new message({
    ctype: STATIC_MESSAGE_CONTENT_TYPE.COMMAND,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.READ_CANCEL,
      mid: mid,
      xid: to
    }
  });
  const smeta = new meta({
    id: parseInt(new Date().getTime() + '' + Math.floor(Math.random() * 256)),
    from,
    to: from,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeReadAllMessage = (uid, mid) => {
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const from = new xid({
    uid: infoStore.getUid(),
    deviceSN
  });
  const to = new xid({
    uid: toNumber(uid),
    deviceSN: 0
  });
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to: from,
    ctype: STATIC_MESSAGE_CONTENT_TYPE.COMMAND,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.READ_ALL,
      xid: to,
      mid
    }
  });
  const smeta = new meta({
    id: parseInt(new Date().getTime() + '' + Math.floor(Math.random() * 256)),
    from,
    to: from,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeContentAppendMessage = (uid, mid, content) => {
  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });
  const to = new xid({
    uid: toNumber(uid),
    deviceSN: 0
  });
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    content,
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.APPEND,
      mid: toLong(mid)
    }
  });
  const smeta = new meta({
    id: parseInt(new Date().getTime() + '' + Math.floor(Math.random() * 256)),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeReplaceMessage = (uid, mid, content, config, ext) => {
  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });
  const to = new xid({
    uid: toNumber(uid),
    deviceSN: 0
  });
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    content,
    config: JSON.stringify(config),
    ext: JSON.stringify(ext),
    type: STATIC_MESSAGE_TYPE.OPER,
    operation: {
      type: STATIC_MESSAGE_OPTYPE.REPLACE,
      mid: toLong(mid)
    }
  });
  const smeta = new meta({
    id: parseInt(new Date().getTime() + '' + Math.floor(Math.random() * 256)),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeMentionMessage = (amessage) => {
  const { gid, txt, mentionAll, mentionList, mentionedMessage, pushMessage, senderNickname } = amessage;
  let sctype = STATIC_MESSAGE_CONTENT_TYPE.TEXT;
  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });
  const to = new xid({
    uid: gid,
    deviceSN: 0
  });
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    content: txt,
    ctype: sctype,
    type: STATIC_MESSAGE_TYPE.GROUPCHAT
  });
  // if (sctype > 0 && attachment) { // 0是文本
  //   smessage.attachment = JSON.stringify(attachment);
  // }

  smessage.config = JSON.stringify({
    mentionAll,
    mentionList,
    mentionedMessage,
    pushMessage,
    senderNickname
  });
  const smeta = new meta({
    id: new Date().getTime(),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeTypingMessage = (uid, status) => {
  let sctype = STATIC_MESSAGE_CONTENT_TYPE.TEXT;
  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });
  const to = new xid({
    uid: uid - 0,
    deviceSN: 0
  });
  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  const ssyncul = new syncul();
  const smessage = new message({
    from,
    to,
    ctype: sctype,
    type: STATIC_MESSAGE_TYPE.CHAT,
    ext: JSON.stringify({
      input_status: status
    }),
    qos: STATIC_MESSAGE_QOS.AT_MOST_ONCE
  });
  const smeta = new meta({
    id: new Date().getTime(),
    from,
    to,
    payload: smessage,
    ns: STATIC_META_NAMESPACE.MESSAGE
  });
  ssyncul.setMeta(smeta);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeForwardMessage = (uid, gid, message) => {
  const { content, attach: attachment, type } = message;

  if (uid) {
    return makeRosterMessage({
      uid,
      content,
      type,
      attachment
    });
  } else {
    return makeGroupMessage({
      gid,
      content,
      type,
      attachment
    });
  }
};

const makeConversationOperation = (id, other_devices = true) => {
  let op_type = STATIC_CONVERSATION_OPTYPE.DELETE;
  if (other_devices) {
    op_type = STATIC_CONVERSATION_OPTYPE.DELETE_EVERYWHERE;
  }

  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });
  const to = new xid({ uid: id });
  const conv = new conversation({
    type: STATIC_CONVERSATION_TYPE.OPER,
    operation: {
      xid: to,
      type: op_type
    }
  });

  const smeta = new meta({
    id: new Date().getTime(),
    from,
    payload: conv,
    ns: STATIC_META_NAMESPACE.CONVERSATION
  });

  const ssyncul = new syncul();
  ssyncul.setMeta(smeta);

  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  sframe.setPayload(ssyncul);
  return sframe;
};

const makeRtcSignal = (amessage) => {
  const { content, media_server } = amessage;
  fire('imSendRosterSignal', amessage);

  const from = new xid({
    uid: infoStore.getUid() - 0,
    deviceSN
  });

  const rmessage = new rtcmessage({
    type: STATIC_RTC_SIGNAL_TYPE.VIDEO_ROOM,
    content,
    media_server
  });

  const smeta = new meta({
    id: makeUniqueMid(),
    from,
    to: 0,
    payload: rmessage,
    ns: STATIC_META_NAMESPACE.RTC_SIGNAL
  });

  const ssyncul = new syncul();
  ssyncul.setMeta(smeta);

  const sframe = new frame();
  sframe.setCommond(STATIC_FRAME_COMMAND.SYNC);
  sframe.setPayload(ssyncul);

  return sframe;
};

const makeRosterRTCMessage = (amessage) => {
  amessage.type = 'rtc';
  let msg = makeRosterMessage(amessage);
  msg.payload.meta.ns = STATIC_META_NAMESPACE.MESSAGE;
  return msg;
};

const makeGroupRTCMessage = (amessage) => {
  amessage.type = 'rtc';
  let msg = makeGroupMessage(amessage);
  msg.payload.meta.ns = STATIC_META_NAMESPACE.MESSAGE;
  return msg;
};

export {
  makeUnreadUl,
  makeProvision,
  makeSyncul,
  makeHistorySyncul,
  makeUnreadULTimer,
  makeRosterMessage,
  makeGroupMessage,
  makeContentAppendMessage,
  makeReplaceMessage,
  makeMentionMessage,
  makeMessageDelevery,
  makeReadMessageAck,
  makeMessagePlayedAck,
  makeUnreadMessage,
  makeForwardMessage,
  makeRecallMessage,
  makeDeleteMessage,
  makeReadAllMessage,
  makeTypingMessage,
  makeConversationOperation,
  makeRtcSignal,
  makeRosterRTCMessage,
  makeGroupRTCMessage
};
