import log from '../log';
import { metaToCustomer, numToString, toLong, toNumber } from '../tools';
import recentStore from './recentStore';
import { getItem, removeAllItems, saveItem, removeItem } from './storeBase';
import { STATIC_MESSAGE_STATUS, STATIC_MESSAGE_OPTYPE, STATIC_MESSAGE_TYPE } from '../../utils/static';
import { fire } from '../cusEvent';
import infoStore from './infoStore';
import { makeRosterRTCMessage } from '../../core/base/messageMaker';

const max_message_count = 100;

const isAutoSent = (meta) => {
  // READ_ACK and READ_ALL are auto sent by sdk.
  const { payload } = meta;
  if (!payload) return false;
  const { type, operation = {} } = payload;
  if (!operation || type !== STATIC_MESSAGE_TYPE.OPER) return false;
  const { type: opType } = operation;
  if (opType === STATIC_MESSAGE_OPTYPE.READ_ACK || opType == STATIC_MESSAGE_OPTYPE.READ_ALL) return true;
  else return false;
};

const insertMeta = (allMessages, meta) => {
  const messageid = toLong(meta.id);
  if (allMessages.length === 0) {
    allMessages.push(meta);
  } else {
    const first = allMessages[0];
    const last = allMessages[allMessages.length - 1];

    if (messageid.comp(toLong(first.id)) === -1) {
      allMessages.unshift(meta);
    } else if (messageid.comp(toLong(last.id)) === 1) {
      allMessages.push(meta);
    } else {
      // find the element with id greater than or equal with meta;
      let i = 0;
      let deleteCount = 0;
      while (i < allMessages.length) {
        const m = allMessages[i];
        const comp = messageid.comp(toLong(m.id));
        if (0 === comp) deleteCount = 1;
        if (1 !== comp) break;
        i++;
      }
      allMessages.splice(i, deleteCount, meta);
    }
  }
  return allMessages;
};

const calculateCallTime = (time) => {
  let intervalMsec = parseInt(time);
  let intervalSec = intervalMsec / 1000;
  let day = parseInt(intervalSec / 3600 / 24);
  let hour = parseInt((intervalSec - day * 24 * 3600) / 3600);
  let min = parseInt((intervalSec - day * 24 * 3600 - hour * 3600) / 60);
  let sec = parseInt(intervalSec - day * 24 * 3600 - hour * 3600 - min * 60);
  let rs =
    (hour > 0 ? hour.toString() : '00') +
    ':' +
    (min >= 10 ? min.toString() : min > 0 ? '0' + min.toString() : '00') +
    ':' +
    (sec >= 10 ? sec.toString() : sec > 0 ? '0' + sec.toString() : '00');
  return rs;
};

const calculateRtcOutput = (from, content, config) => {
  let output = '';
  let isSelf = false;
  if (infoStore.getUid() == toNumber(from)) {
    isSelf = true;
  }
  if (config && config.action === 'record') {
    switch (content) {
      case 'busy':
        if (isSelf) {
          output = '对方忙';
        } else {
          output = '忙线未接听';
        }
        break;
      case 'timeout':
        if (isSelf) {
          output = '对方未应答';
        } else {
          output = '未应答';
        }
        break;
      case 'canceled':
        if (isSelf) {
          output = '通话已取消';
        } else {
          output = '通话已被对方取消';
        }
        break;
      case 'rejected':
        if (isSelf) {
          output = '通话已被对方拒绝';
        } else {
          output = '通话已拒绝';
        }
        break;
      default:
        if (config.peerDrop) {
          output = '通话中断 ' + calculateCallTime(content);
        } else {
          output = '通话时长 ' + calculateCallTime(content);
        }
        break;
    }
  } else {
    output = content;
  }
  return output;
};

const messageStore = {
  saveRosterRTCContentHandleMessage: (meta) => {
    const { config } = meta;
    if (config && config.action && config.action === 'record') {
      meta.content = calculateRtcOutput(toNumber(meta.from), meta.content, config);
    }
  },

  saveSendingRosterMessage: (meta) => {
    const allMsg = getItem('key_roster_sending_message') || [];
    allMsg.push(meta);
    const len = allMsg.length;
    if (len > max_message_count) {
      allMsg.splice(0, len - max_message_count);
    }
    saveItem('key_roster_sending_message', allMsg);

    const { to, id } = meta;
    fire('onSendingMessageStatusChanged', {
      status: 'sending',
      uid: to.uid,
      mid: id,
      message: metaToCustomer(meta)
    });
  },

  dealSendedRosterRTCMessage: (message) => {
    const { config } = message;
    const uid = infoStore.getUid();
    if (config && config.action) {
      if (config.action === 'call' && config.initiator == uid) {
        saveItem('key_rtc_in_call', true);
      } else if (config.action === 'pickup' && config.initiator != uid) {
        saveItem('key_rtc_in_call', true);
      } else if (config.action === 'hangup') {
        if (config.callId && (config.initiator == uid || config.peerDrop)) {
          const record = makeRosterRTCMessage({
            uid: message.to,
            content: message.content,
            config: JSON.stringify({
              action: 'record',
              callId: config.callId,
              initiator: config.initiator,
              peerDrop: config.peerDrop,
              pushMessageLocKey: config.pushMessageLocKey,
              pushMessageLocArgs: config.pushMessageLocArgs
            })
          });
          const meta = record.payload.meta;
          messageStore.saveSendingRosterMessage(meta);
          fire('sendMessage', record);
          saveItem('key_rtc_in_call', false);
        }
      } else if (config.action === 'record') {
        if (config.initiator != uid) {
          message.to = message.from;
          message.from = config.initiator;
        }
      }
    }
  },

  dealSendedRosterMessage: (syncMb) => {
    const { client_mid, server_mid } = syncMb;
    const allMsg = getItem('key_roster_sending_message') || [];

    if (!server_mid) {
      // Assume reason is "client msg id duplicated"
      log.log('failed to send message due to: ', syncMb.status.reason);

      //需要删除临存储的消息
      const index = allMsg.findIndex((item) => toNumber(item.id) === toNumber(client_mid));
      if (index > -1) {
        const allMsg = getItem('key_roster_sending_message') || [];
        allMsg.splice(index, 1);
      }
      return;
    }
    const index = allMsg.findIndex((item) => toNumber(item.id) === toNumber(client_mid));
    if (index > -1) {
      const meta = allMsg[index];
      meta.id = server_mid;
      const meta_cus = metaToCustomer(meta);
      meta_cus.status = STATIC_MESSAGE_STATUS.UNREAD;
      if (meta_cus.type === 'rtc') {
        messageStore.saveRosterRTCContentHandleMessage(meta_cus);
      }
      messageStore.saveRosterMessage(meta_cus);
      meta_cus.toType = 'roster';
      recentStore.saveRecent(meta_cus);

      allMsg.splice(index, 1);
      saveItem('key_roster_sending_message', allMsg);

      if (meta_cus.type === 'rtc') {
        messageStore.dealSendedRosterRTCMessage(meta_cus);
        meta_cus.isNative = true;
        messageStore.saveRosterMessage(meta_cus);
        recentStore.saveRecent(meta_cus);
        fire('onRosterRTCMessage', meta_cus);
      }

      fire('onRosterMessage', meta_cus);

      if (!isAutoSent(meta_cus)) {
        fire('onSendingMessageStatusChanged', {
          status: 'sent',
          mid: toNumber(client_mid),
          message: meta_cus
        });
      }
    }
  },

  saveRosterMessage: (meta) => {
    const { from, to, type } = meta;
    if (type == 'command' || type == 'forward') {
      //commond message，没法做处理
      return;
    }

    const fromUid = toNumber(from);
    const uid = toNumber(infoStore.getUid());
    const toUid = toNumber(to);
    let saveUid = fromUid === uid ? toUid : fromUid;
    const allRosterMessageMap = getItem('key_roster_message_store', true, saveUid) || {};
    const allMessages = allRosterMessageMap[saveUid] || [];
    insertMeta(allMessages, meta);

    if (allMessages.length > max_message_count) {
      allRosterMessageMap[saveUid] = allMessages.slice(allMessages.length - max_message_count);
    } else {
      allRosterMessageMap[saveUid] = allMessages;
    }
    saveItem('key_roster_message_store', allRosterMessageMap, true, saveUid);
  },

  saveInCallStatus: (status) => {
    saveItem('key_rtc_in_call', status);
  },

  getInCallStatus: () => {
    return getItem('key_rtc_in_call') || false;
  },

  getRosterMessage: (roster_id) => {
    const allRosterMessageMap = getItem('key_roster_message_store', true, roster_id) || {};
    return allRosterMessageMap[roster_id] || [];
  },
  saveFormatedRosterMessage: (roster_id, messageArr = []) => {
    const allRosterMessageMap = getItem('key_roster_message_store', true, roster_id) || {};
    allRosterMessageMap[roster_id] = messageArr;
    saveItem('key_roster_message_store', allRosterMessageMap, true, roster_id);
  },

  getRosterUnreadMessageIdsByRosterid: (roster_id) => {
    const allRosterMessageMap = getItem('key_roster_message_store', true, roster_id) || {};
    const ridMessages = allRosterMessageMap[roster_id] || [];
    const ret = [];
    ridMessages.forEach((msg) => {
      const { status = STATIC_MESSAGE_STATUS.READ, id } = msg;
      status == STATIC_MESSAGE_STATUS.UNREAD && ret.push(id);
    });
    return ret;
  },

  deleteRosterMessageByRosterId: (roster_id) => {
    const allRosterMessageMap = getItem('key_roster_message_store', true, roster_id) || {};
    const messages = allRosterMessageMap[roster_id];
    if (messages) {
      delete allRosterMessageMap[roster_id];
    }
    saveItem('key_roster_message_store', allRosterMessageMap, true, roster_id);
  },
  deleteSingleRosterMessage: (roster_id, message_id) => {
    // roster_id，是自己个。。删除消息，form to 都是自己
    const allRosterMessageMap = getItem('key_roster_message_store', true, roster_id) || {};
    const messageId = numToString(message_id);
    const rosterMessages = allRosterMessageMap[roster_id] || [];
    const index = rosterMessages.findIndex((x) => {
      const id = numToString(x.id);
      return id === messageId;
    });
    if (index > -1) {
      rosterMessages.splice(index, 1);
      allRosterMessageMap[roster_id] = rosterMessages;
      saveItem('key_roster_message_store', allRosterMessageMap, true, roster_id);
    }
  },

  ////////////////////////////////////////////////////
  saveSendingGroupMessage: (meta) => {
    const allMsg = getItem('key_group_sending_message') || [];
    allMsg.push(meta);
    const len = allMsg.length;

    if (len > max_message_count) {
      allMsg.splice(0, len - max_message_count);
    }
    saveItem('key_group_sending_message', allMsg);

    const { to, id } = meta;
    fire('onSendingMessageStatusChanged', {
      status: 'sending',
      uid: to.uid,
      mid: id,
      message: metaToCustomer(meta)
    });
  },

  dealSendedGroupMessage: (syncMb) => {
    const { client_mid, server_mid } = syncMb;
    const allMsg = getItem('key_group_sending_message') || [];
    const index = allMsg.findIndex((item) => toNumber(item.id) === toNumber(client_mid));

    if (index > -1) {
      const meta = allMsg[index];
      meta.id = server_mid;
      const meta_cus = metaToCustomer(meta);
      meta_cus.status = STATIC_MESSAGE_STATUS.UNREAD;
      messageStore.saveGroupMessage(meta_cus);
      meta_cus.toType = 'group';
      recentStore.saveRecent(meta_cus);

      allMsg.splice(index, 1);
      saveItem('key_group_sending_message', allMsg);
      fire('onGroupMessage', meta_cus);

      if (!isAutoSent(meta_cus)) {
        fire('onSendingMessageStatusChanged', {
          status: 'sent',
          mid: toNumber(client_mid),
          message: meta_cus
        });
      }
    }
  },

  saveGroupMessage: (meta) => {
    const { to, type } = meta;
    if (type == 'command' || type == 'forward') {
      //command message，没法做处理
      return;
    }
    const groupId = toNumber(to); //群文本消息，只有to没有gid， 群通知只有gid 没有 to
    const allGroupMessageMap = getItem('key_group_message_store', true, groupId) || {};
    const allMessages = allGroupMessageMap[groupId] || [];
    insertMeta(allMessages, meta);

    if (allMessages.length > max_message_count) {
      allGroupMessageMap[groupId] = allMessages.slice(allMessages.length - max_message_count);
    } else {
      allGroupMessageMap[groupId] = allMessages;
    }

    saveItem('key_group_message_store', allGroupMessageMap, true, groupId);
  },

  getGroupMessage: (gid) => {
    const allGroupMessageMap = getItem('key_group_message_store', true, gid) || {};
    return allGroupMessageMap[gid] || [];
  },
  saveFormatedGroupMessage: (group_id, messageArr = []) => {
    const allGroupMessageMap = getItem('key_group_message_store', true, group_id) || {};
    allGroupMessageMap[group_id] = messageArr;
    saveItem('key_group_message_store', allGroupMessageMap, true, group_id);
  },
  getGroupUnreadMessageIdsByGid: (gid) => {
    const allGroupMessageMap = getItem('key_group_message_store', true, gid) || {};
    const gidMessages = allGroupMessageMap[gid] || [];
    const ret = [];
    gidMessages.forEach((msg) => {
      const { r = false, id } = msg;
      !r && ret.push(id);
    });
    return ret;
  },

  deleteGroupMessageByGid: (gid) => {
    const allGroupMessageMap = getItem('key_group_message_store', true, gid) || {};
    if (allGroupMessageMap[gid]) {
      delete allGroupMessageMap[gid];
    }
    saveItem('key_group_message_store', allGroupMessageMap, true, gid);
  },
  deleteSingleGroupMessage: (gid, messageId) => {
    const allGroupMessageMap = getItem('key_group_message_store', true, gid) || {};
    messageId = numToString(messageId);
    const groupMessages = allGroupMessageMap[gid] || [];
    const index = groupMessages.findIndex((x) => {
      const id = numToString(x.id);
      return id === messageId;
    });

    if (index > -1) {
      groupMessages.splice(index, 1);
      allGroupMessageMap[gid] = groupMessages;
      saveItem('key_group_message_store', allGroupMessageMap, true, gid);
    }
  },

  /**
   * unread ...
   */
  getUnreadByRosterId: (rid) => {
    const messages = messageStore.getRosterMessage(rid) || [];
    let ret = 0;
    const uid = infoStore.getUid();
    messages.forEach((message) => {
      const { from, status, type, config, ext } = message;
      const fromUid = toNumber(from);
      if (fromUid > 0 && fromUid !== uid && status !== STATIC_MESSAGE_STATUS.READ) {
        ret++;
        if (type === 'rtc' && config && config.action && config.action !== 'record') {
          ret--;
        }
        if (ext) {
          let sext = {};
          try {
            sext = JSON.parse(ext);
          } catch (ex) {
            //
          }
          if (type == 'rtc' && sext && sext.callId) {
            ret--;
          }
        }
      }
    });
    return ret;
  },

  getUnreadByGroupId: (gid) => {
    const messages = messageStore.getGroupMessage(gid) || [];
    let ret = 0;
    const uid = infoStore.getUid();
    messages.forEach((message) => {
      const { from, status } = message;
      const fromUid = toNumber(from);
      if (fromUid > 0 && fromUid !== uid && status !== STATIC_MESSAGE_STATUS.READ) {
        ret++;
      }
    });
    return ret;
  },

  getRosterMessageById: (roster_id, mid) => {
    const messageId = numToString(mid);
    const allRosterMessageMap = getItem('key_roster_message_store', true, roster_id) || {};
    for (var x1 in allRosterMessageMap) {
      const sx = allRosterMessageMap[x1];
      if (sx && sx.length) {
        const ret = sx.find((a) => a.id == messageId);
        if (ret) return ret;
      }
    }
  },
  getGroupMessageById: (group_id, mid) => {
    const messageId = numToString(mid);
    const allGroupMessageMap = getItem('key_group_message_store', true, group_id) || {};
    for (var x in allGroupMessageMap) {
      const sx = allGroupMessageMap[x];
      if (sx && sx.length) {
        const ret = sx.find((a) => a.id == messageId);
        if (ret) return ret;
      }
    }
  },

  clear: (id, type) => {
    if ('group' == type) {
      messageStore.deleteGroupMessageByGid(id);
    } else {
      //roster conversation
      messageStore.deleteRosterMessageByRosterId(id);
    }
  },

  clearAll: () => {
    removeAllItems('key_roster_message_store');
    removeAllItems('key_group_message_store');
    removeItem('key_group_sending_message');
    removeItem('key_roster_sending_message');
    removeItem('key_rtc_in_call');
  }
};

export default messageStore;
