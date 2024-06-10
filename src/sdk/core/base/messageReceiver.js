// 用来接受消息，如，消息，通知
// on 开头的是直接发给用户的
// im 开头的是内部用的
import log from '../../utils/log';
import { fire } from '../../utils/cusEvent';
import { infoStore, messageStore } from '../../utils/store';
import { toLong, toNumber } from '../../utils/tools';
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
import { makeSyncul, makeUnreadUl, makeUnreadULTimer } from './messageMaker';

const noticeXids = {}; //
let isKick = false;

const checkSuccess = (messageObj) => {
  const { status = {} } = messageObj;
  const { code, reason } = status;
  if (code === STATIC_FRAME_ERROR_STATUS.OK) return true;
  if (typeof status.code === 'undefined') return true; // 对于没有这个的，基本就是出错了

  // User should re-login manually
  if (code === STATIC_FRAME_ERROR_STATUS.INVALID_TOKEN || (code === STATIC_FRAME_ERROR_STATUS.UNAUTHORIZED && reason === 'you must login first')) {
    fire('flooNotice', { category: 'action', desc: 'relogin' });
  }

  if (
    code === STATIC_FRAME_ERROR_STATUS.USER_FROZEN ||
    code === STATIC_FRAME_ERROR_STATUS.INVALID_LICENSE ||
    code === STATIC_FRAME_ERROR_STATUS.LICENSE_LIMIT ||
    code === STATIC_FRAME_ERROR_STATUS.APP_FROZEN
  ) {
    fire('flooNotice', { category: 'action', desc: 'relogin_manually' });
  }

  if (code === STATIC_FRAME_ERROR_STATUS.USER_BANNED) {
    const category = 'USER_BANNED';
    const desc = '用户被禁言';
    fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.USER_FROZEN) {
    const category = 'USER_FROZEN';
    const desc = '用户被冻结，请联系App管理员。';
    fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.APP_FROZEN) {
    const category = 'APP_FROZEN';
    const desc = 'APP 被冻结，请登陆蓝莺IM控制台查看详情。';
    fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.INVALID_LICENSE) {
    const category = 'LICENSE';
    const desc = '无效 LICENSE，请确认服务已按时付费。';
    fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.LICENSE_LIMIT) {
    const category = 'LICENSE';
    const desc = '超出 LICENSE 用户数限制，请购买更高规格服务。';
    fire('flooError', { category, desc });
  } else if (code === STATIC_FRAME_ERROR_STATUS.FAIL) {
    const category = 'FAIL';
    const desc = reason;
    fire('flooError', { category, desc });
  } else {
    const category = code;
    const desc = reason;
    fire('flooError', { category, desc });
  }

  const { client_mid } = messageObj;
  if (client_mid) {
    // failed to send message
    fire('onSendingMessageStatusChanged', {
      status: 'failed',
      mid: toNumber(client_mid)
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
      // fire('sendMessage', makeUnreadUl(xid)); //发一个unread ul
      fire(
        'sendMessage',
        makeSyncul({
          xid,
          next_key: 0
        })
      ); // 有nextkey，接着sync
    }
  });
};

const receiveNotice = (noticeMb) => {
  // notice 无 status，不用检测..
  const { xid } = noticeMb; //
  const { uid = 0 } = xid;
  if (noticeXids[uid + '']) {
    setTimeout(() => {
      noticeXids[uid] = false;
      receiveNotice(noticeMb);
    }, 3000);
  } else {
    noticeXids[uid + ''] = true;
    fire('sendMessage', makeUnreadUl(xid)); //发一个unread ul
  }
};

const receiveProvision = (provisionMb) => {
  if (!checkSuccess(provisionMb)) {
    fire('flooNotice', {
      category: 'loginMessage',
      desc: 'login socket failure ......'
    });
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
  if (!checkSuccess(syncMb)) {
    //userNotice 没有这些 status
    return;
  }
  const { metas = [], xid, is_full_sync, client_mid, edit_timestamp } = syncMb;

  if (!is_full_sync && client_mid && toLong(client_mid).gt(0)) {
    fire('receivedSendMessage', client_mid, edit_timestamp);
    setTimeout(() => {
      messageStore.dealSendedRosterMessage(syncMb);
      messageStore.dealSendedGroupMessage(syncMb);
    }, 20);
    return;
  }

  let { next_key = 0 } = syncMb;

  if (next_key === 0 || toLong(next_key).eq(0)) {
    const { uid = 0 } = xid;
    delete noticeXids[uid + ''];
  }

  if (is_full_sync) {
    //拉取历史消息
    metas && metas.length && receiveMsg(metas.reverse(), is_full_sync);
    //TODO: Store history messages now, maybe refactor the message handlers on history messages and normal ones.

    fire('onReceiveHistoryMsg', { next: next_key });
  } else {
    //拉取部分消息
    metas.length && receiveMsg(metas);

    if (next_key === 0 || toLong(next_key).eq(0)) {
      //
    } else {
      fire(
        'sendMessage',
        makeSyncul({
          xid,
          next_key
        })
      ); // 有nextkey，接着sync
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
  type === STATIC_ROSTERNONTICE_TYPE.BANNED && fire('imRosterBaned', meta);
  type === STATIC_ROSTERNONTICE_TYPE.UNBANNED && fire('imRosterUnbaned', meta);
  type === STATIC_ROSTERNONTICE_TYPE.INFO_UPDATED && fire('imRosterInfoUpdated', meta);
  type === STATIC_ROSTERNONTICE_TYPE.MUTED && fire('imRosterMuted', meta);
  type === STATIC_ROSTERNONTICE_TYPE.UNMUTED && fire('imRosterUnmuted', meta);
};

const receiveUserNotice = (meta) => {
  const { payload = {} } = meta;
  const { type } = payload;

  if (
    type === STATIC_USERNOTICE_TYPE.UNKNOWN ||
    type === STATIC_USERNOTICE_TYPE.PASSWORD_CHANGED ||
    type === STATIC_USERNOTICE_TYPE.FROZEN ||
    type === STATIC_USERNOTICE_TYPE.REMOVED ||
    type === STATIC_USERNOTICE_TYPE.KICKED_BY_OTHER_DEVICE ||
    type === STATIC_USERNOTICE_TYPE.DEVICE_REMOVED ||
    type === STATIC_USERNOTICE_TYPE.CLUSTER_CHANGED ||
    type === STATIC_USERNOTICE_TYPE.DNS_UPDATE
  ) {
    // 这些都需要重新登录，或退出
    infoStore.deleteToken();
    infoStore.deleteDeviceSN();
    fire('flooNotice', { category: 'action', desc: 'relogin_manually' });
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
