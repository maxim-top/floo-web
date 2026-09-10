import log from '../log';
import { metaToCustomer, numToString, toLong, toNumber } from '../tools';
import recentStore from './recentStore';
import { getItem, removeAllItems, saveItem, removeItem } from './storeBase';
import { STATIC_MESSAGE_STATUS, STATIC_MESSAGE_OPTYPE, STATIC_MESSAGE_TYPE } from '../../utils/static';
import { fire, bind } from '../cusEvent';
import infoStore from './infoStore';
import { makeRosterRTCMessage } from '../../core/base/messageMaker';
import { markHistoryMessagesRead, mergeLatestMessages } from './messageStoreUtils';

const max_message_count = 100;
const MESSAGE_PARTITION_NUMBER = 31;
const NETWORK_DISCONNECTED_ERROR_REASON = 'Network disconnected';
const MESSAGE_SEND_TIMEOUT_ERROR_REASON = 'Message send timeout';
const MESSAGE_SEND_TIMEOUT = 30000;
const sendingMessageTimers = {
  roster: new Map(),
  group: new Map()
};
const reportedSendingFailureMids = new Set();
const MAX_REPORTED_SENDING_FAILURES = 200;
const deletedHistoryMessageIds = {
  roster: new Map(),
  group: new Map()
};
let deletedHistoryMessageIdsOwner = '';

const rememberReportedSendingFailure = (key) => {
  reportedSendingFailureMids.add(key);
  if (reportedSendingFailureMids.size > MAX_REPORTED_SENDING_FAILURES) {
    reportedSendingFailureMids.delete(reportedSendingFailureMids.values().next().value);
  }
};

const clearSendingMessageTimer = (clientMid) => {
  const key = `${toNumber(clientMid)}`;
  Object.keys(sendingMessageTimers).forEach((type) => {
    const timer = sendingMessageTimers[type].get(key);
    if (timer) clearTimeout(timer);
    sendingMessageTimers[type].delete(key);
  });
};

const reportUnconfirmedSendingMessage = (meta, errorReason = MESSAGE_SEND_TIMEOUT_ERROR_REASON) => {
  const clientMid = meta && meta.id;
  if (!clientMid) return;
  const key = `${toNumber(clientMid)}`;
  if (reportedSendingFailureMids.has(key)) return;
  rememberReportedSendingFailure(key);
  clearSendingMessageTimer(clientMid);
  log.warn('Message send was not confirmed:', key, errorReason);
  fire('onSendingMessageStatusChanged', {
    status: 'failed',
    mid: toNumber(clientMid),
    message: metaToCustomer(meta),
    errorReason
  });
};

const armSendingMessageTimer = (type, meta) => {
  const clientMid = meta && meta.id;
  if (!clientMid) return;
  const key = `${toNumber(clientMid)}`;
  clearSendingMessageTimer(clientMid);
  reportedSendingFailureMids.delete(key);
  const timer = setTimeout(() => {
    sendingMessageTimers[type].delete(key);
    reportUnconfirmedSendingMessage(meta);
  }, MESSAGE_SEND_TIMEOUT);
  sendingMessageTimers[type].set(key, timer);
};

const reportPendingMessagesOnDisconnect = () => {
  ['roster', 'group'].forEach((type) => {
    const storageKey = type === 'roster' ? 'key_roster_sending_message' : 'key_group_sending_message';
    const messages = getItem(storageKey) || [];
    messages.forEach((meta) => reportUnconfirmedSendingMessage(meta, NETWORK_DISCONNECTED_ERROR_REASON));
  });
};

const resetSendingMessageTracking = () => {
  Object.keys(sendingMessageTimers).forEach((type) => {
    sendingMessageTimers[type].forEach((timer) => clearTimeout(timer));
    sendingMessageTimers[type].clear();
  });
  reportedSendingFailureMids.clear();
};

bind('socketDisconnected', reportPendingMessagesOnDisconnect);
bind('logout', resetSendingMessageTracking);

const removeSendingMessage = (type, clientMid) => {
  const storageKey = type === 'roster' ? 'key_roster_sending_message' : 'key_group_sending_message';
  const messages = getItem(storageKey) || [];
  const index = messages.findIndex((item) => toNumber(item.id) === toNumber(clientMid));
  if (index < 0) return;
  messages.splice(index, 1);
  saveItem(storageKey, messages);
};

bind('onSendingMessageStatusChanged', ({ status, mid, errorCode } = {}) => {
  if (status !== 'sent' && status !== 'failed') return;
  clearSendingMessageTimer(mid);
  const key = `${toNumber(mid)}`;
  if (status === 'sent') {
    reportedSendingFailureMids.delete(key);
    return;
  }

  const isUnconfirmedFailure = reportedSendingFailureMids.has(key);
  const isDefinitiveFailure = errorCode !== undefined && errorCode !== null;
  if (isDefinitiveFailure || !isUnconfirmedFailure) {
    removeSendingMessage('roster', mid);
    removeSendingMessage('group', mid);
  }
  rememberReportedSendingFailure(key);
});

const failSendingMessage = (type, meta, errorReason = NETWORK_DISCONNECTED_ERROR_REASON) => {
  const clientMid = meta && meta.id;
  if (!clientMid) return;
  removeSendingMessage(type, clientMid);
  clearSendingMessageTimer(clientMid);
  const message = metaToCustomer(meta);
  fire('onSendingMessageStatusChanged', {
    status: 'failed',
    mid: toNumber(clientMid),
    message,
    errorReason
  });
  reportedSendingFailureMids.delete(`${toNumber(clientMid)}`);
};

const resetDeletedHistoryMessageIds = () => {
  deletedHistoryMessageIdsOwner = `${infoStore.getUid() || ''}`;
  deletedHistoryMessageIds.roster.clear();
  deletedHistoryMessageIds.group.clear();
};

const ensureDeletedHistoryMessageIdsOwner = () => {
  const owner = `${infoStore.getUid() || ''}`;
  if (owner !== deletedHistoryMessageIdsOwner) resetDeletedHistoryMessageIds();
};

const rememberDeletedMessage = (type, conversationId, messageId) => {
  ensureDeletedHistoryMessageIdsOwner();
  const key = `${conversationId}`;
  if (!deletedHistoryMessageIds[type].has(key)) deletedHistoryMessageIds[type].set(key, new Set());
  deletedHistoryMessageIds[type].get(key).add(`${messageId}`);
};

const isDeletedMessage = (type, conversationId, messageId) => {
  ensureDeletedHistoryMessageIdsOwner();
  const ids = deletedHistoryMessageIds[type].get(`${conversationId}`);
  return !!(ids && ids.has(`${messageId}`));
};

const createMessagePartitionCache = () => ({
  roster: new Map(),
  group: new Map()
});

let messagePartitionCacheOwner = '';
let messagePartitionCache = createMessagePartitionCache();

const resetMessagePartitionCache = () => {
  messagePartitionCacheOwner = `${infoStore.getUid() || ''}`;
  messagePartitionCache = createMessagePartitionCache();
};

const ensureMessagePartitionCacheOwner = () => {
  const owner = `${infoStore.getUid() || ''}`;
  if (owner !== messagePartitionCacheOwner) resetMessagePartitionCache();
};

const messagePartitionId = (conversationId) => {
  const id = Number(conversationId) || 0;
  return ((id % MESSAGE_PARTITION_NUMBER) + MESSAGE_PARTITION_NUMBER) % MESSAGE_PARTITION_NUMBER;
};

const getConversationMessageMap = (type, conversationId) => {
  ensureMessagePartitionCacheOwner();
  const partition = messagePartitionId(conversationId);
  const cache = messagePartitionCache[type];
  if (!cache.has(partition)) {
    const key = type === 'roster' ? 'key_roster_message_store' : 'key_group_message_store';
    cache.set(partition, getItem(key, true, conversationId) || {});
  }
  return cache.get(partition);
};

const saveConversationMessageMap = (type, conversationId, messageMap) => {
  ensureMessagePartitionCacheOwner();
  const key = type === 'roster' ? 'key_roster_message_store' : 'key_group_message_store';
  messagePartitionCache[type].set(messagePartitionId(conversationId), messageMap);
  saveItem(key, messageMap, true, conversationId);
};

const cloneStoredValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneStoredValue);
  if (!value || typeof value !== 'object') return value;
  if (typeof value.low !== 'undefined' && typeof value.high !== 'undefined') return toLong(value);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.keys(value).reduce((result, key) => {
    result[key] = cloneStoredValue(value[key]);
    return result;
  }, {});
};

bind('logout', resetMessagePartitionCache);
bind('logout', resetDeletedHistoryMessageIds);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', ({ key } = {}) => {
    if (typeof key !== 'string') return;
    if (key.indexOf('_key_roster_message_store_') >= 0) messagePartitionCache.roster.clear();
    if (key.indexOf('_key_group_message_store_') >= 0) messagePartitionCache.group.clear();
  });
}

const createUnreadCountCache = () => ({
  roster: Object.create(null),
  group: Object.create(null)
});

let unreadCountCacheOwner = '';
let unreadCountCache = createUnreadCountCache();

const resetUnreadCountCache = () => {
  unreadCountCacheOwner = `${infoStore.getUid() || ''}`;
  unreadCountCache = createUnreadCountCache();
};

const ensureUnreadCountCacheOwner = () => {
  const owner = `${infoStore.getUid() || ''}`;
  if (owner !== unreadCountCacheOwner) {
    unreadCountCacheOwner = owner;
    unreadCountCache = createUnreadCountCache();
  }
};

const getCachedUnreadCount = (type, conversationId) => {
  ensureUnreadCountCacheOwner();
  const key = `${conversationId}`;
  const cache = unreadCountCache[type];
  return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : undefined;
};

const setCachedUnreadCount = (type, conversationId, unreadCount) => {
  ensureUnreadCountCacheOwner();
  unreadCountCache[type][`${conversationId}`] = unreadCount;
};

const invalidateUnreadCount = (type, conversationId) => {
  if (conversationId === undefined || conversationId === null) return;
  ensureUnreadCountCacheOwner();
  delete unreadCountCache[type][`${conversationId}`];
};

bind('imLocalStorageConversationMessagesPruned', ({ type, conversationIds } = {}) => {
  if (!unreadCountCache[type] || !Array.isArray(conversationIds)) return;
  ensureMessagePartitionCacheOwner();
  conversationIds.forEach((conversationId) => {
    invalidateUnreadCount(type, conversationId);
    messagePartitionCache[type].delete(messagePartitionId(conversationId));
  });
});

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

const saveConversationMessages = (type, conversationId, messages = [], { isHistory = false } = {}) => {
  if (!messages.length) return;
  const allMessageMap = getConversationMessageMap(type, conversationId);
  const storedMessages = allMessageMap[conversationId] || [];
  const storableMessages = messages.filter(
    (meta) => meta && meta.type !== 'command' && meta.type !== 'forward' && (!isHistory || !isDeletedMessage(type, conversationId, meta.id))
  );
  if (!storableMessages.length) return;

  const mergedMessages = mergeLatestMessages(storedMessages, storableMessages, max_message_count, isHistory);
  if (mergedMessages === storedMessages) return;
  allMessageMap[conversationId] = mergedMessages;
  saveConversationMessageMap(type, conversationId, allMessageMap);
  invalidateUnreadCount(type, conversationId);
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

const ensureRecentTimestamp = (meta) => {
  if (!meta) return meta;
  const timestamp = toNumber(meta.timestamp);
  if (timestamp && timestamp > 0) {
    return meta;
  }
  return {
    ...meta,
    timestamp: `${Date.now()}`
  };
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
    armSendingMessageTimer('roster', meta);

    const { to, id } = meta;
    fire('onSendingMessageStatusChanged', {
      status: 'sending',
      uid: to.uid,
      mid: id,
      message: metaToCustomer(meta)
    });
  },

  failSendingRosterMessage: (meta, errorReason) => {
    failSendingMessage('roster', meta, errorReason);
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
      const reason = (syncMb.status && syncMb.status.reason) || 'Message send failed';
      log.log('failed to send message due to: ', reason);
      const index = allMsg.findIndex((item) => toNumber(item.id) === toNumber(client_mid));
      if (index > -1) {
        messageStore.failSendingRosterMessage(allMsg[index], reason);
      } else {
        clearSendingMessageTimer(client_mid);
        reportedSendingFailureMids.delete(`${toNumber(client_mid)}`);
      }
      return;
    }
    clearSendingMessageTimer(client_mid);
    reportedSendingFailureMids.delete(`${toNumber(client_mid)}`);
    const index = allMsg.findIndex((item) => toNumber(item.id) === toNumber(client_mid));
    if (index > -1) {
      const meta = allMsg[index];
      meta.id = server_mid;
      const meta_cus = metaToCustomer(meta);
      meta_cus.status = STATIC_MESSAGE_STATUS.UNREAD;
      const meta_recent = ensureRecentTimestamp(meta_cus);
      if (meta_cus.type === 'rtc') {
        messageStore.saveRosterRTCContentHandleMessage(meta_cus);
      }
      messageStore.saveRosterMessage(meta_cus);
      meta_recent.toType = 'roster';
      recentStore.saveRecent(meta_recent);

      allMsg.splice(index, 1);
      saveItem('key_roster_sending_message', allMsg);

      if (meta_cus.type === 'rtc') {
        messageStore.dealSendedRosterRTCMessage(meta_cus);
        meta_cus.isNative = true;
        messageStore.saveRosterMessage(meta_cus);
        recentStore.saveRecent(ensureRecentTimestamp(meta_cus));
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
    saveConversationMessages('roster', saveUid, [meta]);
  },

  saveRosterMessages: (rosterId, messages) =>
    saveConversationMessages('roster', rosterId, markHistoryMessagesRead(messages, STATIC_MESSAGE_STATUS.READ, infoStore.getUid()), { isHistory: true }),

  saveInCallStatus: (status) => {
    saveItem('key_rtc_in_call', status);
  },

  getInCallStatus: () => {
    return getItem('key_rtc_in_call') || false;
  },

  getRosterMessage: (roster_id) => {
    const allRosterMessageMap = getConversationMessageMap('roster', roster_id);
    return cloneStoredValue(allRosterMessageMap[roster_id] || []);
  },
  saveFormatedRosterMessage: (roster_id, messageArr = []) => {
    const allRosterMessageMap = getConversationMessageMap('roster', roster_id);
    allRosterMessageMap[roster_id] = messageArr;
    saveConversationMessageMap('roster', roster_id, allRosterMessageMap);
    invalidateUnreadCount('roster', roster_id);
  },

  getRosterUnreadMessageIdsByRosterid: (roster_id) => {
    const allRosterMessageMap = getConversationMessageMap('roster', roster_id);
    const ridMessages = allRosterMessageMap[roster_id] || [];
    const ret = [];
    ridMessages.forEach((msg) => {
      const { status = STATIC_MESSAGE_STATUS.READ, id } = msg;
      status == STATIC_MESSAGE_STATUS.UNREAD && ret.push(id);
    });
    return ret;
  },

  deleteRosterMessageByRosterId: (roster_id) => {
    const allRosterMessageMap = getConversationMessageMap('roster', roster_id);
    const messages = allRosterMessageMap[roster_id];
    if (messages) {
      delete allRosterMessageMap[roster_id];
    }
    saveConversationMessageMap('roster', roster_id, allRosterMessageMap);
    invalidateUnreadCount('roster', roster_id);
  },
  deleteSingleRosterMessage: (roster_id, message_id) => {
    // roster_id，是自己个。。删除消息，form to 都是自己
    const allRosterMessageMap = getConversationMessageMap('roster', roster_id);
    const messageId = numToString(message_id);
    rememberDeletedMessage('roster', roster_id, messageId);
    const rosterMessages = allRosterMessageMap[roster_id] || [];
    const index = rosterMessages.findIndex((x) => {
      const id = numToString(x.id);
      return id === messageId;
    });
    if (index > -1) {
      rosterMessages.splice(index, 1);
      allRosterMessageMap[roster_id] = rosterMessages;
      saveConversationMessageMap('roster', roster_id, allRosterMessageMap);
      invalidateUnreadCount('roster', roster_id);
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
    armSendingMessageTimer('group', meta);

    const { to, id } = meta;
    fire('onSendingMessageStatusChanged', {
      status: 'sending',
      uid: to.uid,
      mid: id,
      message: metaToCustomer(meta)
    });
  },

  failSendingGroupMessage: (meta, errorReason) => {
    failSendingMessage('group', meta, errorReason);
  },

  dealSendedGroupMessage: (syncMb) => {
    const { client_mid, server_mid } = syncMb;
    const allMsg = getItem('key_group_sending_message') || [];
    const index = allMsg.findIndex((item) => toNumber(item.id) === toNumber(client_mid));

    if (!server_mid) {
      const reason = (syncMb.status && syncMb.status.reason) || 'Message send failed';
      log.log('failed to send group message due to: ', reason);
      if (index > -1) {
        messageStore.failSendingGroupMessage(allMsg[index], reason);
      } else {
        clearSendingMessageTimer(client_mid);
        reportedSendingFailureMids.delete(`${toNumber(client_mid)}`);
      }
      return;
    }
    clearSendingMessageTimer(client_mid);
    reportedSendingFailureMids.delete(`${toNumber(client_mid)}`);
    if (index > -1) {
      const meta = allMsg[index];
      meta.id = server_mid;
      const meta_cus = metaToCustomer(meta);
      meta_cus.status = STATIC_MESSAGE_STATUS.UNREAD;
      messageStore.saveGroupMessage(meta_cus);
      const meta_recent = ensureRecentTimestamp(meta_cus);
      meta_recent.toType = 'group';
      recentStore.saveRecent(meta_recent);

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
    saveConversationMessages('group', groupId, [meta]);
  },

  saveGroupMessages: (groupId, messages) =>
    saveConversationMessages('group', groupId, markHistoryMessagesRead(messages, STATIC_MESSAGE_STATUS.READ, infoStore.getUid()), { isHistory: true }),

  getGroupMessage: (gid) => {
    const allGroupMessageMap = getConversationMessageMap('group', gid);
    return cloneStoredValue(allGroupMessageMap[gid] || []);
  },
  saveFormatedGroupMessage: (group_id, messageArr = []) => {
    const allGroupMessageMap = getConversationMessageMap('group', group_id);
    allGroupMessageMap[group_id] = messageArr;
    saveConversationMessageMap('group', group_id, allGroupMessageMap);
    invalidateUnreadCount('group', group_id);
  },
  getGroupUnreadMessageIdsByGid: (gid) => {
    const allGroupMessageMap = getConversationMessageMap('group', gid);
    const gidMessages = allGroupMessageMap[gid] || [];
    const ret = [];
    gidMessages.forEach((msg) => {
      const { r = false, id } = msg;
      !r && ret.push(id);
    });
    return ret;
  },

  deleteGroupMessageByGid: (gid) => {
    const allGroupMessageMap = getConversationMessageMap('group', gid);
    if (allGroupMessageMap[gid]) {
      delete allGroupMessageMap[gid];
    }
    saveConversationMessageMap('group', gid, allGroupMessageMap);
    invalidateUnreadCount('group', gid);
  },
  deleteSingleGroupMessage: (gid, messageId) => {
    const allGroupMessageMap = getConversationMessageMap('group', gid);
    messageId = numToString(messageId);
    rememberDeletedMessage('group', gid, messageId);
    const groupMessages = allGroupMessageMap[gid] || [];
    const index = groupMessages.findIndex((x) => {
      const id = numToString(x.id);
      return id === messageId;
    });

    if (index > -1) {
      groupMessages.splice(index, 1);
      allGroupMessageMap[gid] = groupMessages;
      saveConversationMessageMap('group', gid, allGroupMessageMap);
      invalidateUnreadCount('group', gid);
    }
  },

  /**
   * unread ...
   */
  getUnreadByRosterId: (rid) => {
    const cachedUnreadCount = getCachedUnreadCount('roster', rid);
    if (cachedUnreadCount !== undefined) return cachedUnreadCount;
    const messages = messageStore.getRosterMessage(rid) || [];
    let ret = 0;
    const uid = infoStore.getUid();
    messages.forEach((message) => {
      const { from, status, type, config, ext } = message;
      const fromUid = toNumber(from);
      const isSystemMessage = message && (message.is_system === true || message.is_system === 'true' || message.is_system === 1 || message.is_system === '1');
      const countAsUnread = (fromUid > 0 && fromUid !== uid) || (isSystemMessage && fromUid === 0);
      if (countAsUnread && status !== STATIC_MESSAGE_STATUS.READ) {
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
    setCachedUnreadCount('roster', rid, ret);
    return ret;
  },

  getUnreadByGroupId: (gid) => {
    const cachedUnreadCount = getCachedUnreadCount('group', gid);
    if (cachedUnreadCount !== undefined) return cachedUnreadCount;
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
    setCachedUnreadCount('group', gid, ret);
    return ret;
  },

  getRosterMessageById: (roster_id, mid) => {
    const messageId = numToString(mid);
    const allRosterMessageMap = getConversationMessageMap('roster', roster_id);
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
    const allGroupMessageMap = getConversationMessageMap('group', group_id);
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
    resetMessagePartitionCache();
    resetUnreadCountCache();
  }
};

export default messageStore;
