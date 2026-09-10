// 用来接受消息，如，消息，通知
// on 开头的是直接发给用户的
// im 开头的是内部用的
import log from '../../utils/log';
import { bind, fire } from '../../utils/cusEvent';
import { shouldAcceptSocketLoginResult } from './loginAttemptGuard';
import { infoStore, messageStore } from '../../utils/store';
import { metaToCustomer, toLong, toNumber, toUnsignedLong } from '../../utils/tools';
import {
  STATIC_CONVERSATION_OPTYPE,
  STATIC_CONVERSATION_TYPE,
  STATIC_FRAME_COMMAND,
  STATIC_FRAME_ERROR_STATUS,
  STATIC_GROUPNOTICE_TYPE,
  STATIC_MESSAGE_OPTYPE,
  STATIC_MESSAGE_TYPE,
  STATIC_META_NAMESPACE,
  STATIC_ROSTERNONTICE_TYPE,
  STATIC_USERNOTICE_TYPE,
  STATIC_RTC_SIGNAL_TYPE
} from '../../utils/static';
import { makeProvision, makeSyncul, makeUnreadULTimer, resetDeviceIdentity } from './messageMaker';

let isKick = false;
let historyResponseSequence = 0;
let deviceGuidConflictRetried = false;
const SOCKET_LOGIN_SERVICE_RETRY_MAX = 2;
const SOCKET_LOGIN_SERVICE_RETRY_DELAY = 2000;
let socketLoginServiceRetryTimes = 0;
let socketLoginServiceRetryTimer = null;
const UNREAD_SYNC_MAX_CONCURRENCY = 6;
const UNREAD_SYNC_TIMEOUT = 30000;
let unreadSyncQueue = [];
let priorityUnreadSyncQueue = [];
const queuedUnreadSyncIds = new Set();
const activeUnreadSyncItems = new Map();
const pausedUnreadSyncItems = new Map();
const pendingUnreadSyncXids = new Map();
let activePriorityUnreadSyncId = '';

const unreadSyncId = (xid = {}) => {
  if (typeof xid.uid === 'undefined' || xid.uid === null) return '';
  return toLong(xid.uid).toString();
};

const normalizeUnreadSyncId = (value) => {
  if (typeof value === 'undefined' || value === null) return '';
  if (typeof value === 'object') return unreadSyncId(value);
  return toLong(value).toString();
};

const resetUnreadSyncQueue = () => {
  unreadSyncQueue = [];
  priorityUnreadSyncQueue = [];
  queuedUnreadSyncIds.clear();
  activeUnreadSyncItems.forEach((item) => clearTimeout(item.timeout));
  activeUnreadSyncItems.clear();
  pausedUnreadSyncItems.clear();
  pendingUnreadSyncXids.clear();
  activePriorityUnreadSyncId = '';
};

const clearSocketLoginServiceRetry = (resetTimes = true) => {
  if (socketLoginServiceRetryTimer) {
    clearTimeout(socketLoginServiceRetryTimer);
  }
  socketLoginServiceRetryTimer = null;
  if (resetTimes) {
    socketLoginServiceRetryTimes = 0;
  }
};

const isRetryableSocketLoginServiceFailure = (status = {}) => {
  return (
    status.code === STATIC_FRAME_ERROR_STATUS.FAIL ||
    status.code === STATIC_FRAME_ERROR_STATUS.RATE_LIMIT_EXCEEDED ||
    status.code === STATIC_FRAME_ERROR_STATUS.INVALID_LICENSE ||
    status.code === STATIC_FRAME_ERROR_STATUS.LICENSE_LIMIT ||
    status.code === STATIC_FRAME_ERROR_STATUS.APP_FROZEN
  );
};

const isSocketLoginPolicyFailure = (status = {}) =>
  status.code === STATIC_FRAME_ERROR_STATUS.INVALID_LICENSE || status.code === STATIC_FRAME_ERROR_STATUS.LICENSE_LIMIT || status.code === STATIC_FRAME_ERROR_STATUS.APP_FROZEN;

const scheduleSocketLoginServiceRetry = (status = {}) => {
  if (socketLoginServiceRetryTimer) {
    return true;
  }
  if (socketLoginServiceRetryTimes >= SOCKET_LOGIN_SERVICE_RETRY_MAX) {
    return false;
  }
  const retryCount = socketLoginServiceRetryTimes + 1;
  const delay = retryCount * SOCKET_LOGIN_SERVICE_RETRY_DELAY;
  socketLoginServiceRetryTimes = retryCount;
  fire('flooNotice', {
    category: 'loginMessage',
    desc: `socket login service failure, retrying ${retryCount}/${SOCKET_LOGIN_SERVICE_RETRY_MAX} in ${delay} ms: ${status.reason}`
  });
  socketLoginServiceRetryTimer = setTimeout(() => {
    socketLoginServiceRetryTimer = null;
    fire('sendMessage', makeProvision({ token: infoStore.getToken(), uid: infoStore.getUid() }));
  }, delay);
  return true;
};

const sendUnreadSync = (xid, nextKey = 0) => {
  fire(
    'sendMessage',
    makeSyncul({
      xid,
      next_key: nextKey
    })
  );
};

const unreadSyncKey = (nextKey = 0) => toLong(nextKey).toString();

const armUnreadSyncTimeout = (item) => {
  clearTimeout(item.timeout);
  item.timeout = setTimeout(() => {
    if (activeUnreadSyncItems.get(item.id) !== item) return;
    if (item.retries < 1) {
      item.retries += 1;
      sendUnreadSync(item.xid, item.nextKey);
      armUnreadSyncTimeout(item);
      return;
    }
    log.error('Unread conversation sync timeout:', item.id, item.nextKey);
    finishUnreadSync(item.xid);
  }, UNREAD_SYNC_TIMEOUT);
};

const startUnreadSync = (item, lane) => {
  item.lane = lane;
  item.priorityRequested = false;
  activeUnreadSyncItems.set(item.id, item);
  if (lane === 'priority') {
    activePriorityUnreadSyncId = item.id;
    log.log('Start priority unread conversation sync:', item.id);
  }
  sendUnreadSync(item.xid, item.nextKey);
  armUnreadSyncTimeout(item);
};

const activeBackgroundUnreadSyncCount = () => {
  return activeUnreadSyncItems.size - (activePriorityUnreadSyncId && activeUnreadSyncItems.has(activePriorityUnreadSyncId) ? 1 : 0);
};

const pumpPriorityUnreadSyncQueue = () => {
  if (activePriorityUnreadSyncId) return;
  while (priorityUnreadSyncQueue.length) {
    const item = priorityUnreadSyncQueue.shift();
    queuedUnreadSyncIds.delete(item.id);
    pausedUnreadSyncItems.delete(item.id);
    if (activeUnreadSyncItems.has(item.id)) continue;
    startUnreadSync(item, 'priority');
    return;
  }
  const activeCandidate = Array.from(activeUnreadSyncItems.values()).find((item) => item.lane === 'background' && item.priorityRequested);
  if (activeCandidate) {
    activeCandidate.lane = 'priority';
    activeCandidate.priorityRequested = false;
    activePriorityUnreadSyncId = activeCandidate.id;
    log.log('Prioritize active unread conversation sync:', activeCandidate.id);
  }
};

const pumpBackgroundUnreadSyncQueue = () => {
  while (activeBackgroundUnreadSyncCount() < UNREAD_SYNC_MAX_CONCURRENCY && unreadSyncQueue.length) {
    const item = unreadSyncQueue.shift();
    queuedUnreadSyncIds.delete(item.id);
    if (activeUnreadSyncItems.has(item.id)) continue;
    startUnreadSync(item, 'background');
  }
};

const pumpUnreadSyncQueue = () => {
  pumpPriorityUnreadSyncQueue();
  pumpBackgroundUnreadSyncQueue();
};

const queuePriorityUnreadSyncItem = (item) => {
  item.lane = '';
  item.timeout = null;
  queuedUnreadSyncIds.add(item.id);
  pausedUnreadSyncItems.set(item.id, item);
  priorityUnreadSyncQueue.push(item);
};

const continueUnreadSync = (xid, nextKey) => {
  const item = activeUnreadSyncItems.get(unreadSyncId(xid));
  if (!item) return;
  item.nextKey = nextKey;
  item.retries = 0;
  if (item.lane === 'priority' && priorityUnreadSyncQueue.length) {
    clearTimeout(item.timeout);
    activeUnreadSyncItems.delete(item.id);
    activePriorityUnreadSyncId = '';
    queuePriorityUnreadSyncItem(item);
    pumpUnreadSyncQueue();
    return;
  }
  sendUnreadSync(item.xid, item.nextKey);
  armUnreadSyncTimeout(item);
};

const isDuplicateUnreadSyncResponse = (xid, nextKey) => {
  const id = unreadSyncId(xid);
  const key = unreadSyncKey(nextKey);
  const item = activeUnreadSyncItems.get(id);
  if (item) {
    if (item.responseKeys.has(key)) return true;
    item.responseKeys.add(key);
    return false;
  }
  if (pausedUnreadSyncItems.has(id)) return true;
  return false;
};

const finishUnreadSync = (xid) => {
  const id = unreadSyncId(xid);
  const item = activeUnreadSyncItems.get(id);
  if (!item) return;
  clearTimeout(item.timeout);
  activeUnreadSyncItems.delete(id);
  if (activePriorityUnreadSyncId === id) {
    activePriorityUnreadSyncId = '';
  }
  const pending = pendingUnreadSyncXids.get(id);
  if (pending) {
    pendingUnreadSyncXids.delete(id);
    enqueueUnreadSync(pending.xid, pending.priority);
  }
  pumpUnreadSyncQueue();
};

const promoteQueuedUnreadSync = (id) => {
  if (!id || !queuedUnreadSyncIds.has(id)) return false;
  const index = unreadSyncQueue.findIndex((item) => item.id === id);
  if (index < 0) return false;
  const item = unreadSyncQueue.splice(index, 1)[0];
  priorityUnreadSyncQueue.push(item);
  log.log('Prioritize queued unread conversation sync:', id);
  return true;
};

const prioritizeUnreadSync = (value) => {
  const id = normalizeUnreadSyncId(value);
  if (!id) return;
  const activeItem = activeUnreadSyncItems.get(id);
  if (activeItem && activeItem.lane !== 'priority') {
    activeItem.priorityRequested = true;
  }
  const pending = pendingUnreadSyncXids.get(id);
  if (pending) {
    pending.priority = true;
  }
  if (promoteQueuedUnreadSync(id)) {
    pumpUnreadSyncQueue();
    return;
  }
  pumpUnreadSyncQueue();
};

const enqueueUnreadSync = (xid, priority = false) => {
  const id = unreadSyncId(xid);
  if (!id) return;
  if (queuedUnreadSyncIds.has(id)) {
    if (priority && promoteQueuedUnreadSync(id)) {
      pumpUnreadSyncQueue();
    }
    return;
  }
  if (activeUnreadSyncItems.has(id)) {
    const activeItem = activeUnreadSyncItems.get(id);
    if (priority && activeItem.lane !== 'priority') {
      activeItem.priorityRequested = true;
    }
    // The next key acknowledges the previous unread page on the server, so an
    // active sync must finish its cursor chain before the notice-triggered refresh.
    const pending = pendingUnreadSyncXids.get(id);
    pendingUnreadSyncXids.set(id, {
      xid,
      priority: priority || !!(pending && pending.priority)
    });
    return;
  }
  queuedUnreadSyncIds.add(id);
  const item = { id, xid, nextKey: 0, retries: 0, timeout: null, lane: '', priorityRequested: false, responseKeys: new Set() };
  if (priority) {
    priorityUnreadSyncQueue.push(item);
  } else {
    unreadSyncQueue.push(item);
  }
};

bind('loginSuccess', () => {
  resetUnreadSyncQueue();
  deviceGuidConflictRetried = false;
});
bind('logout', () => {
  resetUnreadSyncQueue();
  deviceGuidConflictRetried = false;
  clearSocketLoginServiceRetry();
});
bind('socketDisconnected', () => {
  deviceGuidConflictRetried = false;
  clearSocketLoginServiceRetry();
});
bind('prioritizeUnreadSync', prioritizeUnreadSync);

const isClientSendFailure = (messageObj = {}) => {
  const { client_mid } = messageObj;
  return !!(client_mid && toLong(client_mid).gt(0));
};

const checkSuccess = (messageObj) => {
  const { status = {} } = messageObj;
  const { code, reason } = status;
  const clientSendFailure = isClientSendFailure(messageObj);
  if (code === STATIC_FRAME_ERROR_STATUS.OK) return true;
  if (typeof status.code === 'undefined') return true; // 对于没有这个的，基本就是出错了

  // User should re-login manually
  if (code === STATIC_FRAME_ERROR_STATUS.INVALID_TOKEN || (code === STATIC_FRAME_ERROR_STATUS.UNAUTHORIZED && reason === 'you must login first')) {
    fire('flooNotice', { category: 'action', desc: 'relogin' });
  }

  if (code === STATIC_FRAME_ERROR_STATUS.USER_FROZEN) {
    fire('flooNotice', { category: 'action', desc: 'relogin_manually' });
  }

  if (code === STATIC_FRAME_ERROR_STATUS.USER_BANNED) {
    const category = 'USER_BANNED';
    const desc = '用户被禁言';
    !clientSendFailure && fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.USER_FROZEN) {
    const category = 'USER_FROZEN';
    const desc = '用户被冻结，请联系App管理员。';
    !clientSendFailure && fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.APP_FROZEN) {
    const category = 'APP_FROZEN';
    const desc = 'APP 被冻结，请登陆蓝莺IM控制台查看详情。';
    !clientSendFailure && fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.INVALID_LICENSE) {
    const category = 'LICENSE';
    const desc = '无效 LICENSE，请确认服务已按时付费。';
    !clientSendFailure && fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.LICENSE_LIMIT) {
    const category = 'LICENSE';
    const desc = '超出 LICENSE 用户数限制，请购买更高规格服务。';
    !clientSendFailure && fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.FAIL) {
    const category = 'FAIL';
    const desc = reason;
    !clientSendFailure && fire('flooError', { category, desc });
  } else {
    const category = code;
    const desc = reason;
    !clientSendFailure && fire('flooError', { category, desc });
  }

  const { client_mid } = messageObj;
  if (client_mid) {
    // failed to send message
    fire('onSendingMessageStatusChanged', {
      status: 'failed',
      mid: toNumber(client_mid),
      message: metaToCustomer(messageObj),
      errorCode: code,
      errorReason: reason
    });
  }

  log.error('ret error ......code:', code, '...reason:', reason);
  return false;
};

const receiveMessage = (message) => {
  // frame 的数据结构
  const { command = 0, payload } = message;
  command === STATIC_FRAME_COMMAND.UNREAD && receiveUnread(payload);
  command === STATIC_FRAME_COMMAND.SYNC && receiveSyncdl(payload);
  command === STATIC_FRAME_COMMAND.NOTICE && receiveNotice(payload);
  command === STATIC_FRAME_COMMAND.PROVISION && receiveProvision(payload);
};
// the first layers ...
const receiveUnread = (unreadMb) => {
  const { unread = [] } = unreadMb;
  fire('imReceivedUnread', unread);
  unread.forEach((conversationUnread) => {
    const { xid, n } = conversationUnread;
    if (n > 0) {
      enqueueUnreadSync(xid);
    }
  });
  pumpUnreadSyncQueue();
};

const receiveNotice = (noticeMb) => {
  // notice 无 status，不用检测..
  const { xid } = noticeMb; //
  enqueueUnreadSync(xid, true);
  pumpUnreadSyncQueue();
};

const receiveProvision = (provisionMb) => {
  const { status = {} } = provisionMb;
  const success = status.code === STATIC_FRAME_ERROR_STATUS.OK || typeof status.code === 'undefined';
  if (!shouldAcceptSocketLoginResult({ success })) {
    return;
  }
  clearSocketLoginServiceRetry(false);
  if (status.code === STATIC_FRAME_ERROR_STATUS.DEVICE_GUID_CONFLICT) {
    if (!deviceGuidConflictRetried) {
      deviceGuidConflictRetried = true;
      resetDeviceIdentity();
      fire('flooNotice', {
        category: 'loginMessage',
        desc: 'device guid conflict, retrying socket login with a new device identity'
      });
      fire('sendMessage', makeProvision({ token: infoStore.getToken(), uid: infoStore.getUid() }));
      return;
    }
    deviceGuidConflictRetried = false;
    fire('reconnect', { reason: 'DeviceGuidConflict' });
    return;
  }

  if (isRetryableSocketLoginServiceFailure(status)) {
    const reportPolicyFailure = isSocketLoginPolicyFailure(status) && socketLoginServiceRetryTimes === 0;
    if (!scheduleSocketLoginServiceRetry(status)) {
      clearSocketLoginServiceRetry();
      fire('reconnect', { reason: 'SocketLoginServiceFailure' });
    }
    if (reportPolicyFailure) {
      checkSuccess(provisionMb);
    }
    return;
  }

  const checkedSuccess = checkSuccess(provisionMb);
  clearSocketLoginServiceRetry();
  if (!checkedSuccess) {
    fire('flooNotice', {
      category: 'loginMessage',
      desc: 'login socket failure: code=' + status.code + ', reason=' + (status.reason || 'unknown')
    });
    deviceGuidConflictRetried = false;
    fire('loginFail', 'socket_failure');
    return;
  }

  const { xid = {} } = provisionMb;
  const { deviceSN } = xid;
  fire('temporary_deviceSN', deviceSN); // 新的
  if (!isKick) {
    deviceSN && infoStore.saveDeviceSN(deviceSN); // 被相同设备t完之后，不存储deviceSN
  }
  fire('flooNotice', {
    category: 'loginMessage',
    desc: 'login socket success.....'
  });
  fire('loginSuccess', {});
  fire('sendMessage', makeUnreadULTimer());
};

const receiveSyncdl = (syncMb) => {
  // syncdl 的数据结构
  const { xid = {}, is_full_sync } = syncMb;
  if (!checkSuccess(syncMb)) {
    if (is_full_sync) {
      fire('imHistoryBatchFailed', {
        sid: unreadSyncId(xid),
        requestId: ++historyResponseSequence,
        reason: syncMb.status && syncMb.status.reason
      });
      return;
    }
    //userNotice 没有这些 status
    if (!isClientSendFailure(syncMb)) {
      finishUnreadSync(xid);
    }
    return;
  }
  const { metas = [], client_mid, edit_timestamp } = syncMb;

  if (!is_full_sync && client_mid && toLong(client_mid).gt(0)) {
    fire('receivedSendMessage', client_mid, edit_timestamp);
    setTimeout(() => {
      messageStore.dealSendedRosterMessage(syncMb);
      messageStore.dealSendedGroupMessage(syncMb);
    }, 20);
    return;
  }

  let { next_key = 0 } = syncMb;

  if (is_full_sync) {
    //拉取历史消息
    const sid = unreadSyncId(xid);
    fire('imHistoryBatchStart', { sid });
    metas && metas.length && receiveMsg(metas.reverse(), is_full_sync);
    fire('imHistoryBatchComplete', {
      sid,
      requestId: ++historyResponseSequence,
      next: next_key,
      nextKey: toUnsignedLong(next_key).toString()
    });
  } else {
    //拉取部分消息
    if (isDuplicateUnreadSyncResponse(xid, next_key)) return;
    metas.length && receiveMsg(metas);

    if (next_key === 0 || toLong(next_key).eq(0)) {
      finishUnreadSync(xid);
    } else {
      continueUnreadSync(xid, next_key); // 同一会话继续占用当前同步槽位。
    }
  }
};
// 二级 的开始 ... /////// 二级 的开始 ... /////// 二级 的开始 ... /////// 二级 的开始 ... /////
const receiveMsg = (metas = [], isHistory = false) => {
  // 解析具体消息了 从meta中的
  metas.forEach((meta) => {
    const { ns } = meta;
    if (ns === STATIC_META_NAMESPACE.UNKNOWN) {
      log.log('received unknown message ...', meta);
    }
    if (isHistory) {
      meta.isHistory = true;
      // A full-sync history response is display data, not a replay of old
      // notices, conversation operations or realtime side effects.
      if (ns !== STATIC_META_NAMESPACE.MESSAGE) return;
    }
    ns === STATIC_META_NAMESPACE.MESSAGE && receiveMessageBody(meta);
    ns === STATIC_META_NAMESPACE.GROUP_NOTICE && recieveGroupNotice(meta);
    ns === STATIC_META_NAMESPACE.ROSTER_NOTICE && receiveRosterNotice(meta);
    ns === STATIC_META_NAMESPACE.USER_NOTICE && receiveUserNotice(meta);
    ns === STATIC_META_NAMESPACE.CONVERSATION && receiveConversation(meta);
    ns === STATIC_META_NAMESPACE.PUSH && receivePush(meta);
    ns === STATIC_META_NAMESPACE.RTC_SIGNAL && receiveRTCSignal(meta);
    // ns === STATIC_META_NAMESPACE.INFO && receiveInfo(meta);
  });
}; //具体消息部分

const receiveRTCSignal = (meta) => {
  //rtc single service janus singles.
  const { payload = {} } = meta;
  const { type } = payload;
  type === STATIC_RTC_SIGNAL_TYPE.UNKNOWN && fire('rtcSignalNormal', meta);
  type === STATIC_RTC_SIGNAL_TYPE.VIDEO_ROOM && fire('rtcVideoRoomSignal', meta);
};

const receivePush = (meta) => {
  // do not need in web.
  log.log('received online push: ', meta);
};

const receiveConversation = (meta) => {
  const { payload = {} } = meta;
  const { type, operation } = payload;

  if (type === STATIC_CONVERSATION_TYPE.OPER) {
    if (operation.type == STATIC_CONVERSATION_OPTYPE.DELETE || operation.type == STATIC_CONVERSATION_OPTYPE.DELETE_EVERYWHERE) {
      const { xid } = operation;
      fire('deleteConversation', { id: xid.uid, source: 'other_operation' });
    } else {
      log.log('received unknown conversation operation: ', operation);
    }
  } else {
    log.log('received unknown conversation: ', meta);
  }
};
//具体消息部分
const receiveMessageBody = (meta) => {
  const { payload = {} } = meta;
  const { type, operation } = payload;
  type === STATIC_MESSAGE_TYPE.NORMAL && fire('messageNormal', meta);
  type === STATIC_MESSAGE_TYPE.CHAT && fire('imRosterMessage', meta);
  type === STATIC_MESSAGE_TYPE.GROUPCHAT && fire('imGroupMessage', meta);

  if (type === STATIC_MESSAGE_TYPE.OPER) {
    if (meta.isHistory) return;
    //操作消息
    if (operation.type === STATIC_MESSAGE_OPTYPE.UNKNOWN) {
      log.log('received unknown operation: ', meta);
    }
    meta.isReceived = true;
    fire('onActionMessage', meta);
    /**
     operation.type === STATIC_MESSAGE_OPTYPE.READ_ACK && fire('onReadedMessage', meta);
     operation.type === STATIC_MESSAGE_OPTYPE.READ_ALL && fire('onReadedAllMessage', meta);
     operation.type === STATIC_MESSAGE_OPTYPE.READ_CANCEL && fire('onReadCanceled', meta);
     operation.type === STATIC_MESSAGE_OPTYPE.DELIVER_ACK && fire('onMessageDelivery', meta);
     operation.type === STATIC_MESSAGE_OPTYPE.RECALL && fire('onMessageRecall', meta);
     */
  }
};

const recieveGroupNotice = (meta) => {
  const { payload = {} } = meta;
  const { type } = payload;
  if (type === STATIC_GROUPNOTICE_TYPE.UNKNOWN) {
    log.log('received unknown groupnotice: ', meta);
  }
  type === STATIC_GROUPNOTICE_TYPE.PRESENCE && fire('imGroupPresence', meta);
  type === STATIC_GROUPNOTICE_TYPE.ABSENCE && fire('imGroupAbesence', meta);
  type === STATIC_GROUPNOTICE_TYPE.CREATED && fire('imGroupCreated', meta);
  type === STATIC_GROUPNOTICE_TYPE.DESTROYED && fire('imGroupDestoryed', meta);
  type === STATIC_GROUPNOTICE_TYPE.JOINED && fire('imGroupJoined', meta);
  type === STATIC_GROUPNOTICE_TYPE.APPLYED && fire('imGroupApplyed', meta);
  type === STATIC_GROUPNOTICE_TYPE.APPLY_ACCEPTED && fire('imGroupApplyAccepted', meta);
  type === STATIC_GROUPNOTICE_TYPE.APPLY_DECLINED && fire('imGroupApplyDeclined', meta);
  type === STATIC_GROUPNOTICE_TYPE.INVITED && fire('imGroupInvited', meta);
  type === STATIC_GROUPNOTICE_TYPE.INVITE_ACCEPTED && fire('imGroupInvitedAccepted', meta);
  type === STATIC_GROUPNOTICE_TYPE.INVITE_DECLINED && fire('imGroupInvitedDeclined', meta);
  type === STATIC_GROUPNOTICE_TYPE.KICKED && fire('imGroupKicked', meta);
  type === STATIC_GROUPNOTICE_TYPE.LEAVED && fire('imGroupLeaved', meta);
  type === STATIC_GROUPNOTICE_TYPE.BANNED && fire('imGroupBaned', meta);
  type === STATIC_GROUPNOTICE_TYPE.UNBANNED && fire('imGroupUnbaned', meta);
  type === STATIC_GROUPNOTICE_TYPE.OWNER_ASSIGNED && fire('imGroupOwnerAssigned', meta);
  type === STATIC_GROUPNOTICE_TYPE.ADMIN_GRANTED && fire('imGroupAdminGranted', meta);
  type === STATIC_GROUPNOTICE_TYPE.ADMIN_REVOKED && fire('imGroupAdminRevoked', meta);
  type === STATIC_GROUPNOTICE_TYPE.BLOCKED && fire('imGroupBlocked', meta);
  type === STATIC_GROUPNOTICE_TYPE.UNBLOCKED && fire('imGroupUnblocked', meta);
  type === STATIC_GROUPNOTICE_TYPE.MUTED && fire('imGroupMuted', meta);
  type === STATIC_GROUPNOTICE_TYPE.UNMUTED && fire('imGroupUnmuted', meta);
  type === STATIC_GROUPNOTICE_TYPE.INFO_UPDATED && fire('imGroupInfoUpdated', meta);
  type === STATIC_GROUPNOTICE_TYPE.ANNOUNCEMENT_UPDATED && fire('imGroupAnnouncementUpdated', meta);
  type === STATIC_GROUPNOTICE_TYPE.MESSAGE_SETTING && fire('imGroupMessageSetting', meta);
  type === STATIC_GROUPNOTICE_TYPE.FILE_UPLOADED && fire('imGroupFileUploaded', meta);
  type === STATIC_GROUPNOTICE_TYPE.FILE_DELETED && fire('imGroupFileDeleted', meta);
  type === STATIC_GROUPNOTICE_TYPE.FILE_UPDATED && fire('imGroupFileUpdated', meta);
};

const receiveRosterNotice = (meta) => {
  const { payload = {} } = meta;
  const { type } = payload;
  if (type === STATIC_ROSTERNONTICE_TYPE.UNKNOWN) {
    log.log('received unknown rosterNotice: ', meta);
  }
  type === STATIC_ROSTERNONTICE_TYPE.ADDED && fire('imRosterAdded', meta);
  type === STATIC_ROSTERNONTICE_TYPE.REMOVED && fire('imRosterRemoved', meta);
  type === STATIC_ROSTERNONTICE_TYPE.APPLIED && fire('imRosterApplied', meta);
  type === STATIC_ROSTERNONTICE_TYPE.ACCEPTED && fire('imRosterAccepted', meta);
  type === STATIC_ROSTERNONTICE_TYPE.DECLINED && fire('imRosterDeclined', meta);
  type === STATIC_ROSTERNONTICE_TYPE.BLOCKED && fire('imRosterBaned', meta);
  type === STATIC_ROSTERNONTICE_TYPE.UNBLOCKED && fire('imRosterUnbaned', meta);
  type === STATIC_ROSTERNONTICE_TYPE.INFO_UPDATED && fire('imRosterInfoUpdated', meta);
  type === STATIC_ROSTERNONTICE_TYPE.MUTED && fire('imRosterMuted', meta);
  type === STATIC_ROSTERNONTICE_TYPE.UNMUTED && fire('imRosterUnmuted', meta);
};

const receiveUserNotice = (meta) => {
  const { payload = {} } = meta;
  const { type } = payload;

  if (
    type === STATIC_USERNOTICE_TYPE.PASSWORD_CHANGED ||
    type === STATIC_USERNOTICE_TYPE.FROZEN ||
    type === STATIC_USERNOTICE_TYPE.REMOVED ||
    type === STATIC_USERNOTICE_TYPE.KICKED_BY_OTHER_DEVICE ||
    type === STATIC_USERNOTICE_TYPE.DEVICE_REMOVED
  ) {
    // 这些都需要重新登录，或退出
    infoStore.deleteToken();
    infoStore.deleteDeviceSN();
    fire('flooNotice', { category: 'action', desc: 'relogin_manually' });
  }

  if (type === STATIC_USERNOTICE_TYPE.CLUSTER_CHANGED || type === STATIC_USERNOTICE_TYPE.DNS_UPDATE) {
    infoStore.deleteToken();
    fire('retrieve_dns');
    setTimeout(() => {
      fire('flooNotice', { category: 'action', desc: 'relogin' });
    }, 2000);
  }

  if (type === STATIC_USERNOTICE_TYPE.UNKNOWN) {
    log.log('received unknown userNotice: ', meta);
  }

  if (type === STATIC_USERNOTICE_TYPE.KICK_BY_SAME_DEVICE) {
    isKick = true;
    fire('userKicked');
  }

  fire('flooNotice', { category: 'userNotice', desc: Object.keys(STATIC_USERNOTICE_TYPE)[type] });
};

export default receiveMessage;
