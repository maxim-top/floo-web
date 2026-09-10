//collection.js
import { t } from '../../i18n';
import { toNumber, toUnsignedLong } from '../third/tools';
import { withDisplayGroupAvatar } from '../utils/groupAvatar';
import {
  compactMessagesForDisplay,
  createMessageSession,
  findMessageIndex,
  HISTORY_REVEAL_BATCH_SIZE,
  historyCursorForSession,
  isPendingMessage,
  mergeHistoryMessages,
  mergeMessages,
  messageKey,
  MESSAGE_SESSION_LIMIT,
  shouldContinuePastOverlappingHistory,
  touchSessionOrder
} from '../utils/messageSessions';
// import axios from 'axios'

const HISTORY_QUERY_TIMEOUT = 15000;
const historyQueryTimers = new Map();

const clearHistoryQueryTimer = (sid) => {
  const key = `${sid}`;
  const timer = historyQueryTimers.get(key);
  if (timer) clearTimeout(timer);
  historyQueryTimers.delete(key);
};

const findMessageIndexByMid = (messages = [], mid) => {
  let index = findMessageIndex(messages, mid);
  if (index >= 0) return index;
  const targetKey = messageKey({ id: mid });
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messageKey(messages[i]) === targetKey) return i;
  }
  return -1;
};

const preventStreamReplay = (messages = []) =>
  messages.map((message) =>
    message.skipStreamReplayOnMount
      ? message
      : {
          ...message,
          skipStreamReplayOnMount: true
        }
  );

const compactSessionForDisplay = (session) => {
  if (!session) return;
  const compacted = compactMessagesForDisplay(session.messages, session.cachedHistoryMessages);
  session.messages = preventStreamReplay(compacted.messages);
  session.cachedHistoryMessages = compacted.cachedHistoryMessages;
  session.viewport = null;

  const visibleMessageIds = new Set(session.messages.map(messageKey));
  session.measurements = Object.keys(session.measurements || {}).reduce((measurements, mid) => {
    if (visibleMessageIds.has(`${mid}`)) measurements[mid] = session.measurements[mid];
    return measurements;
  }, Object.create(null));
};

const messagesOverlap = (oldMessageIds = new Set(), newMessages = []) => newMessages.some((message) => !isPendingMessage(message) && oldMessageIds.has(messageKey(message)));

const state = {
  /**
   rosterinfo
   groupinfo

   rosterchat
   groupchat

   notice
   setting

   rosterNotice
   groupInviteNotice
   grpupApplyNotice
   */
  viewType: '',
  sid: -1, //selected roster/group id..
  lastViewType: '',
  lastSid: -1,
  intentMessage: '',
  messages: [],
  time: [], // 这个是，消息的时间，几分钟显示一下，按现在的逻辑..

  rosterMap: {},
  groupMap: {},

  memberlistMap: {},
  adminListMap: {},

  scroll: 0,

  queryHistoryMessageId: 0,
  queryHistoryRecords: {}, // map of sid:queryTimes
  messageSessions: {},
  messageSessionOrder: [],
  messageSessionOwner: '',
  autoReadSuppressed: false
};

const getters = {
  getViewType(state) {
    return state.viewType;
  },

  getSid(state) {
    return state.sid;
  },

  getIntentMessage(state) {
    return state.intentMessage;
  },

  getMessages(state) {
    return state.messages;
  },

  getMessageTime(state) {
    return state.time;
  },

  getRosterInfo(state) {
    return state.rosterMap[state.sid] || {};
  },

  getGroupInfo(state) {
    return state.groupMap[state.sid] || {};
  },

  getMemberList(state) {
    return state.memberlistMap[state.sid] || [];
  },
  getMemberMap(state) {
    return (state.memberlistMap[state.sid] || []).reduce((members, member) => {
      members[`${member.user_id}`] = member;
      return members;
    }, Object.create(null));
  },
  getAdminList(state) {
    return state.adminListMap[state.sid] || [];
  },

  getScroll(state) {
    return state.scroll;
  },

  getAutoReadSuppressed(state) {
    return state.autoReadSuppressed;
  },

  getHistoryState(state) {
    const session = state.messageSessions[`${state.sid}`];
    return session || createMessageSession(state.sid);
  }
};

const mutations = {
  setViewType(state, x) {
    state.viewType = x;
  },

  setSid(state, x) {
    state.sid = x;
  },

  setLastViewType(state, x) {
    state.lastViewType = x;
  },

  setLastSid(state, x) {
    state.lastSid = x;
  },

  setIntentMessage(state, x) {
    state.intentMessage = x;
  },

  setMessage(state, x) {
    state.messages = x;
    const session = state.messageSessions[`${state.sid}`];
    if (session) session.messages = x;
  },

  clearVisibleMessages(state) {
    state.messages = [];
  },

  addMessages(state, x = []) {
    state.messages.push(x);
  },

  setMessageTime(state, t) {
    const s = state.time;
    s.push(t);
    state.time = [].concat(s);
  },

  setRosterInfo(state, x) {
    const obj = Object.assign({}, state.rosterMap, { [state.sid]: x });
    state.rosterMap = obj;
    // state.rosterMap[state.sid] = x;
  },

  setRosterInfoBySid(state, payload = {}) {
    const sid = payload.sid;
    if (typeof sid === 'undefined' || sid === null) {
      return;
    }
    const obj = Object.assign({}, state.rosterMap, { [sid]: payload.value || {} });
    state.rosterMap = obj;
  },

  setGroupInfo(state, x) {
    const obj = Object.assign({}, state.groupMap, { [state.sid]: x });
    state.groupMap = obj;
    // state.groupMap[state.sid] = x;
  },

  setGroupInfoBySid(state, payload = {}) {
    const sid = payload.sid;
    if (typeof sid === 'undefined' || sid === null) {
      return;
    }
    const obj = Object.assign({}, state.groupMap, { [sid]: payload.value || {} });
    state.groupMap = obj;
  },

  setMemberList(state, x) {
    const obj = Object.assign({}, state.memberlistMap, { [state.sid]: x });
    state.memberlistMap = obj;
  },
  setMemberListBySid(state, payload = {}) {
    const sid = payload.sid;
    if (typeof sid === 'undefined' || sid === null) {
      return;
    }
    const obj = Object.assign({}, state.memberlistMap, { [sid]: payload.value || [] });
    state.memberlistMap = obj;
  },
  setAdminList(state, x) {
    const obj = Object.assign({}, state.adminListMap, { [state.sid]: x });
    state.adminListMap = obj;
  },
  setAdminListBySid(state, payload = {}) {
    const sid = payload.sid;
    if (typeof sid === 'undefined' || sid === null) {
      return;
    }
    const obj = Object.assign({}, state.adminListMap, { [sid]: payload.value || [] });
    state.adminListMap = obj;
  },
  setQud(state, x) {
    state.queryHistoryMessageId = x;
  },

  recordHistoryQuery(state, sid) {
    const key = `${sid}`;
    const session = state.messageSessions[key];
    const times = (session ? session.historyQueryTimes : state.queryHistoryRecords[key] || 0) + 1;
    state.queryHistoryRecords = Object.assign({}, state.queryHistoryRecords, { [key]: times });
    if (session) session.historyQueryTimes = times;
  },

  activateMessageSession(state, sid) {
    const key = `${sid}`;
    const sessions = Object.assign({}, state.messageSessions);
    if (!sessions[key]) sessions[key] = createMessageSession(key);
    sessions[key].viewport = null;
    let order = touchSessionOrder(state.messageSessionOrder, key);
    while (order.length > MESSAGE_SESSION_LIMIT) {
      const evicted = order.shift();
      if (evicted !== key) delete sessions[evicted];
    }
    state.messageSessions = sessions;
    state.messageSessionOrder = order;
    state.messages = sessions[key].messages;
    state.queryHistoryMessageId = sessions[key].nextKey;
  },

  compactMessageSessionForReentry(state, sid) {
    const session = state.messageSessions[`${sid}`];
    if (!session) return;
    compactSessionForDisplay(session);
    session.needsMessageCompaction = true;
    session.messageCompactionOverlapIds = new Set(session.messages.filter((message) => !isPendingMessage(message)).map(messageKey));
    session.localMessagesLoaded = false;
    if (`${state.sid}` === `${sid}`) {
      state.messages = session.messages;
    }
  },

  compactMessageSession(state, sid) {
    const session = state.messageSessions[`${sid}`];
    if (!session) return;
    compactSessionForDisplay(session);
    session.needsMessageCompaction = false;
    session.messageCompactionOverlapIds = new Set();
    if (`${state.sid}` === `${sid}`) state.messages = session.messages;
  },

  resetMessageSessionForStorageGap(state, sid) {
    const key = `${sid}`;
    const session = state.messageSessions[key];
    if (!session) return;
    const hasPendingHistoryResponse = session.pendingHistoryCursor !== null;
    const pendingHistoryCursor = session.pendingHistoryCursor;
    session.messages = session.messages.filter(isPendingMessage);
    session.cachedHistoryMessages = [];
    session.nextKey = '0';
    session.historyExhausted = false;
    session.historyQueryTimes = 0;
    session.historyLoading = hasPendingHistoryResponse;
    session.pendingHistoryCursor = hasPendingHistoryResponse ? pendingHistoryCursor : null;
    session.discardPendingHistoryResponse = hasPendingHistoryResponse;
    if (!hasPendingHistoryResponse) {
      session.historyBlockedUntilReconnect = false;
      session.historyError = '';
    }
    if (`${state.sid}` === key) {
      state.messages = session.messages;
      state.queryHistoryMessageId = session.nextKey;
    }
  },

  revealCachedHistory(state, { sid, amount }) {
    const key = `${sid}`;
    const session = state.messageSessions[key];
    if (!session || !session.cachedHistoryMessages.length) return;
    const count = Math.min(amount, session.cachedHistoryMessages.length);
    const revealStart = session.cachedHistoryMessages.length - count;
    const revealedMessages = preventStreamReplay(session.cachedHistoryMessages.slice(revealStart));
    session.cachedHistoryMessages = session.cachedHistoryMessages.slice(0, revealStart);
    session.messages = mergeHistoryMessages(session.messages, revealedMessages, session.deletedMessageIds);
    if (`${state.sid}` === key) state.messages = session.messages;
  },

  finishDiscardedHistoryResponse(state, { sid, error = '' }) {
    const session = state.messageSessions[`${sid}`];
    if (!session) return;
    session.discardPendingHistoryResponse = false;
    session.historyLoading = false;
    session.historyBlockedUntilReconnect = false;
    session.historyError = error;
    session.pendingHistoryCursor = null;
  },

  setHistoryLoading(state, { sid, loading, error = '', requestCursor, clearRequest = false }) {
    const session = state.messageSessions[`${sid}`];
    if (!session) return;
    session.historyLoading = !!loading;
    session.historyError = error || '';
    if (typeof requestCursor !== 'undefined') session.pendingHistoryCursor = `${requestCursor}`;
    if (clearRequest) session.pendingHistoryCursor = null;
  },

  setLocalMessagesLoaded(state, sid) {
    const session = state.messageSessions[`${sid}`];
    if (session) session.localMessagesLoaded = true;
  },

  setHistoryBlocked(state, { sid, blocked, error = '' }) {
    const session = state.messageSessions[`${sid}`];
    if (!session) return;
    session.historyLoading = false;
    session.historyBlockedUntilReconnect = !!blocked;
    session.historyError = error || '';
  },

  resetHistoryBlocks(state) {
    Object.keys(state.messageSessions).forEach((sid) => {
      const session = state.messageSessions[sid];
      session.historyLoading = false;
      session.historyBlockedUntilReconnect = false;
      session.pendingHistoryCursor = null;
      session.historyError = '';
      session.discardPendingHistoryResponse = false;
    });
  },

  updateMessageAt(state, { index, message }) {
    if (index < 0 || index >= state.messages.length) return;
    state.messages.splice(index, 1, message);
  },

  updateSessionMessageAt(state, { sid, index, message }) {
    const session = state.messageSessions[`${sid}`];
    if (!session || index < 0 || index >= session.messages.length) return;
    session.messages.splice(index, 1, message);
  },

  updateCachedHistoryMessageAt(state, { sid, index, message }) {
    const session = state.messageSessions[`${sid}`];
    if (!session || index < 0 || index >= session.cachedHistoryMessages.length) return;
    session.cachedHistoryMessages.splice(index, 1, message);
  },

  setSessionMessages(state, { sid, messages }) {
    const session = state.messageSessions[`${sid}`];
    if (!session) return;
    session.messages = messages;
    if (`${state.sid}` === `${sid}`) state.messages = messages;
  },

  finishHistory(state, { sid, requestId, messages, cachedHistoryMessages, nextKey, exhausted, keepLoading = false, error = '' }) {
    const key = `${sid}`;
    const session = state.messageSessions[key];
    if (!session) return;
    session.messages = messages;
    if (cachedHistoryMessages) session.cachedHistoryMessages = cachedHistoryMessages;
    session.historyLoading = !!keepLoading;
    session.historyBlockedUntilReconnect = false;
    session.historyError = error;
    session.pendingHistoryCursor = null;
    if (requestId) session.lastHistoryRequestId = requestId;
    if (typeof nextKey !== 'undefined') session.nextKey = `${nextKey}`;
    session.historyExhausted = !!exhausted;
    if (`${state.sid}` === key) {
      state.messages = messages;
      state.queryHistoryMessageId = session.nextKey;
    }
  },

  deleteSessionMessage(state, { sid, mid }) {
    const key = `${sid}`;
    const session = state.messageSessions[key];
    if (!session) return;
    const target = messageKey({ id: mid });
    session.messages = session.messages.filter((message) => messageKey(message) !== target);
    session.cachedHistoryMessages = session.cachedHistoryMessages.filter((message) => messageKey(message) !== target);
    if (`${state.sid}` === key) state.messages = session.messages;
  },

  saveMessageViewport(state, { sid, viewport }) {
    const session = state.messageSessions[`${sid}`];
    if (session) session.viewport = viewport || null;
  },

  saveMessageMeasurements(state, { sid, measurements, width, reset = false }) {
    const session = state.messageSessions[`${sid}`];
    if (!session) return;
    if (reset) session.measurements = Object.create(null);
    Object.assign(session.measurements, measurements || {});
    if (typeof width === 'number') session.measurementWidth = width;
  },

  rememberDeletedMessage(state, { sid, mid }) {
    const session = state.messageSessions[`${sid}`];
    if (session) session.deletedMessageIds.add(messageKey({ id: mid }));
  },

  resetMessageSessions(state) {
    state.messageSessions = {};
    state.messageSessionOrder = [];
    state.messages = [];
    state.queryHistoryMessageId = 0;
    state.queryHistoryRecords = {};
  },

  setMessageSessionOwner(state, uid) {
    const owner = `${uid || ''}`;
    if (state.messageSessionOwner && state.messageSessionOwner !== owner) {
      state.messageSessions = {};
      state.messageSessionOrder = [];
      state.messages = [];
      state.queryHistoryMessageId = 0;
      state.queryHistoryRecords = {};
    }
    state.messageSessionOwner = owner;
  },

  setAutoReadSuppressed(state, x) {
    state.autoReadSuppressed = !!x;
  }
};

const actions = {
  actionOpenGroup(context) {
    const { rootState, state } = context;
    const targetSid = state.sid;
    rootState.im.groupManage.openGroup(state.sid);
    //rootState.im.groupManage.readGroupMessage(state.sid);

    rootState.im.groupManage
      .asyncGetAdminList({ group_id: targetSid })
      .then((res) => {
        context.commit('setAdminListBySid', {
          sid: targetSid,
          value: res
        });
      })
      .catch((err) => {
        console.error('Failed to GetAdminList, error:', err);
      });

    rootState.im.groupManage
      .asyncGetGroupInfo(targetSid, true)
      .then((res) => {
        context.commit('setGroupInfoBySid', {
          sid: targetSid,
          value: withDisplayGroupAvatar(rootState.im, res, {
            onUpdate: ({ group_id } = {}) => {
              if (`${group_id}` === `${targetSid}` && `${context.state.sid}` === `${targetSid}`) {
                context.dispatch('actionUpdateGroup');
              }
            }
          })
        });
      })
      .catch((err) => {
        console.error('Failed to GetGroupInfo, error:', err);
      });
  },

  actionPreOpenGroup(context, x) {
    const { rootState } = context;
    const targetSid = x.sid;
    rootState.im.groupManage.openGroup(x.sid);
    //rootState.im.groupManage.readGroupMessage(x.sid);

    rootState.im.groupManage
      .asyncGetAdminList({ group_id: targetSid })
      .then((res) => {
        context.commit('setAdminListBySid', {
          sid: targetSid,
          value: res
        });
      })
      .catch((err) => {
        console.error('Failed to GetAdminList, error:', err);
      });

    rootState.im.groupManage
      .asyncGetGroupInfo(targetSid, true)
      .then((res) => {
        context.commit('setGroupInfoBySid', {
          sid: targetSid,
          value: withDisplayGroupAvatar(rootState.im, res, {
            onUpdate: ({ group_id } = {}) => {
              if (`${group_id}` === `${targetSid}` && `${context.state.sid}` === `${targetSid}`) {
                context.dispatch('actionUpdateGroup');
              }
            }
          })
        });
      })
      .catch((err) => {
        console.error('Failed to GetGroupInfo, error:', err);
      });
  },

  actionEnsureConversationEntry(context, x = {}) {
    const { rootState } = context;
    const sid = x.sid;
    const type = x.type;
    if (typeof sid === 'undefined' || sid === null || sid < 0 || !type) {
      return Promise.resolve();
    }

    const existing = (rootState.im.userManage.getConversationList({ requestRosterInfo: false }) || []).find((item) => `${item.id}` === `${sid}` && item.type === type);
    if (existing) {
      return Promise.resolve(existing);
    }

    if (type === 'group') {
      return rootState.im.groupManage
        .asyncGetGroupInfo(sid, true)
        .catch(() => null)
        .then((groupInfo) => {
          rootState.im.sysManage.touchConversation(sid, 'group');
          return groupInfo;
        });
    }

    return rootState.im.rosterManage
      .asyncGetRosterInfo(sid, true)
      .catch(() => null)
      .then((rosterInfo) => {
        rootState.im.sysManage.touchConversation(sid, 'roster');
        return rosterInfo;
      });
  },

  actionTouchConversationEntry(context, x = {}) {
    const { rootState } = context;
    const sid = x.sid;
    const type = x.type;
    if (typeof sid === 'undefined' || sid === null || sid < 0 || !type) {
      return;
    }
    rootState.im.sysManage.touchConversation(sid, type, Date.now());
  },

  actionSuppressAutoRead(context) {
    context.commit('setAutoReadSuppressed', true);
  },

  actionResumeAutoRead(context) {
    context.commit('setAutoReadSuppressed', false);
  },

  actionMarkCurrentMessageUnread(context, x = {}) {
    const { state, rootState } = context;
    const mid = x.mid;
    const isGroup = state.viewType === 'groupchat';
    if (!mid || (state.viewType !== 'rosterchat' && state.viewType !== 'groupchat')) {
      return;
    }

    rootState.im.sysManage.markMessageUnread(state.sid, mid, isGroup);

    const oldMessages = state.messages || [];
    const updatedMessages = oldMessages.map((message) => {
      if (`${message.id}` !== `${mid}`) {
        return message;
      }
      return {
        ...message,
        status: rootState.im.sysManage.getStaticVars().STATIC_MESSAGE_STATUS.UNREAD
      };
    });
    context.commit('setMessage', updatedMessages);
    context.commit('setAutoReadSuppressed', true);

    rootState.im.sysManage.touchConversation(state.sid, isGroup ? 'group' : 'roster', Date.now());
    if (rootState.contact) {
      context.dispatch('contact/actionGetConversationList', null, { root: true });
    }
  },

  actionGetGroupAdminList(context, x) {
    const { rootState } = context;
    return rootState.im.groupManage
      .asyncGetAdminList({ group_id: x.sid })
      .then((res) => {
        context.commit('setAdminListBySid', {
          sid: x.sid,
          value: res
        });
        return true;
      })
      .catch((err) => {
        console.error('Failed to GetAdminList, error:', err);
        return false;
      });
  },

  actionSetType(context, x) {
    const { rootState, state } = context;
    const previousSid = state.sid;
    const previousViewType = state.viewType;
    if (x.type == 'restore') {
      x.sid = state.lastSid;
      x.type = state.lastViewType;
    }
    const conversationChanged = previousSid !== x.sid || previousViewType !== x.type;
    if (conversationChanged && previousSid >= 0 && (previousViewType === 'rosterchat' || previousViewType === 'groupchat')) {
      context.commit('compactMessageSessionForReentry', previousSid);
    }
    if (typeof x.sid === 'undefined' || x.sid < 0) {
      context.commit('clearVisibleMessages');
      context.commit('setViewType', '');
      context.commit('setAutoReadSuppressed', false);
    }

    if (state.sid !== x.sid || state.viewType !== x.type) {
      context.commit('setAutoReadSuppressed', false);
      context.commit('setSid', x.sid);
      x.type && context.commit('setViewType', x.type);
      if (x.type === 'groupchat') {
        const cachedMembers = state.memberlistMap[x.sid] || rootState.im.groupManage.getGroupMembers(x.sid);
        if (cachedMembers.length) {
          context.commit('setMemberListBySid', {
            sid: x.sid,
            value: cachedMembers
          });
        }
      }
      if (typeof x.sid !== 'undefined' && x.sid !== null && x.sid >= 0 && (x.type === 'rosterchat' || x.type === 'groupchat')) {
        context.commit('activateMessageSession', x.sid);
      } else if (typeof x.sid !== 'undefined' && x.sid !== null) {
        context.commit('clearVisibleMessages');
      }
      state.time = [];
      if (x.type == 'groupchat' || x.type == 'rosterchat') {
        if (state.lastSid !== x.sid || state.lastViewType !== x.type) {
          context.commit('setLastSid', x.sid);
          context.commit('setLastViewType', x.type);
        }
      }
    }
  },

  actionSetIntentMessage(context, x) {
    const { state } = context;
    if (state.intentMessage !== x) {
      context.commit('setIntentMessage', x);
    }
  },

  actionUpdateRoster(context, options = {}) {
    const { rootState, state } = context;
    const targetSid = typeof options.sid === 'undefined' || options.sid === null ? state.sid : options.sid;
    if (Number(targetSid) === 0) {
      const systemNotice = {
        user_id: 0,
        username: t('系统通知'),
        nick_name: t('系统通知'),
        alias: '',
        avatar: '/image/setting.png'
      };
      context.commit('setRosterInfoBySid', {
        sid: targetSid,
        value: systemNotice
      });
      return Promise.resolve(systemNotice);
    }
    if (typeof targetSid === 'undefined' || targetSid === null || Number(targetSid) < 0) {
      return Promise.resolve({});
    }
    const force = typeof options.force === 'undefined' ? true : !!options.force;
    return rootState.im.rosterManage.asyncGetRosterInfo(targetSid, force).then((res) => {
      context.commit('setRosterInfoBySid', {
        sid: targetSid,
        value: res
      });
      return res;
    });
  },

  actionUpdateGroup(context, options = {}) {
    const { rootState, state } = context;
    const targetSid = typeof options.sid === 'undefined' || options.sid === null ? state.sid : options.sid;
    return rootState.im.groupManage.asyncGetGroupInfo(targetSid, !!options.force).then((res) => {
      const displayGroup = withDisplayGroupAvatar(rootState.im, res, {
        onUpdate: ({ group_id } = {}) => {
          if (`${group_id}` === `${targetSid}` && `${context.state.sid}` === `${targetSid}`) {
            context.dispatch('actionUpdateGroup');
          }
        }
      });
      context.commit('setGroupInfoBySid', {
        sid: targetSid,
        value: displayGroup
      });
      return displayGroup;
    });
  },

  actionUpdateMemberList(context) {
    const { rootState, state } = context;
    const members = rootState.im.groupManage.getGroupMembers(state.sid);
    context.commit('setMemberListBySid', {
      sid: state.sid,
      value: members
    });
  },

  actionFetchMemberList(context, sid) {
    const { rootState, state } = context;
    const targetSid = typeof sid === 'undefined' || sid === null ? state.sid : sid;
    if (typeof targetSid === 'undefined' || targetSid === null || targetSid < 0) {
      return Promise.resolve([]);
    }
    return rootState.im.groupManage.asyncGetGroupMembers(targetSid).then(() => {
      const members = rootState.im.groupManage.getGroupMembers(targetSid);
      context.commit('setMemberListBySid', {
        sid: targetSid,
        value: members
      });
      return members;
    });
  },

  actionRequireMessage(context, options = {}) {
    const { rootState, state } = context;
    const sid = state.sid;

    let localMessages = undefined;
    if (state.viewType === 'rosterchat') {
      localMessages = rootState.im.rosterManage.getRosterMessageByRid(sid);
    } else if (state.viewType === 'groupchat') {
      localMessages = rootState.im.groupManage.getGruopMessage(sid);
    } else; //undefined type

    if (localMessages) {
      // Messages restored while re-entering a session should not replay the
      // typing animation from the beginning if an AI stream never closed.
      const restoredMessages = localMessages.map((message) => ({
        ...message,
        skipStreamReplayOnMount: true
      }));
      const activeSession = state.messageSessions[`${sid}`];
      if (
        activeSession &&
        activeSession.needsMessageCompaction &&
        activeSession.messageCompactionOverlapIds.size &&
        restoredMessages.length &&
        !messagesOverlap(activeSession.messageCompactionOverlapIds, restoredMessages)
      ) {
        console.warn('Local message window no longer overlaps cached session, reset history cursor:', sid);
        context.commit('resetMessageSessionForStorageGap', sid);
      }
      context.dispatch('actionAppendMessage', { messages: restoredMessages });

      if (!state.autoReadSuppressed && restoredMessages.length) {
        const uid = rootState.im.userManage.getUid();
        const readStatus = rootState.im.sysManage.getStaticVars().STATIC_MESSAGE_STATUS.READ;
        if (state.viewType === 'rosterchat') {
          restoredMessages.forEach((message) => {
            const fromUid = toNumber(message.from);
            const isSystem = message.is_system === true || message.is_system === 'true' || message.is_system === 1 || message.is_system === '1';
            const isReceived = (fromUid !== uid && fromUid > 0) || (isSystem && fromUid === 0);
            if (isReceived && message.status !== readStatus) {
              rootState.im.rosterManage.readRosterMessage(state.sid, message.id);
            }
          });
        } else if (state.viewType === 'groupchat') {
          restoredMessages.forEach((message) => {
            if (`${message.from}` !== `${uid}` && message.status !== readStatus) {
              rootState.im.groupManage.readGroupMessage(state.sid, message.id);
            }
          });
        }
      }
    }

    const activeSession = state.messageSessions[`${sid}`];
    const reenteredSession = !!(activeSession && activeSession.needsMessageCompaction);
    if (reenteredSession) context.commit('compactMessageSession', sid);

    context.commit('setLocalMessagesLoaded', sid);
    const session = state.messageSessions[`${sid}`];
    const historyQueryTimes = session ? session.historyQueryTimes : state.queryHistoryRecords[sid] || 0;
    if (!options.skipAutoHistory && !reenteredSession && historyQueryTimes === 0 && (!localMessages || localMessages.length <= 3)) {
      context.dispatch('queryHistory');
    }
  },

  actionAppendMessage(context, data = {}) {
    const newMessages = data.messages || [];
    const sendingMessages = data.sendingMessages || [];
    const isHistory = data.history;
    const { state, rootState } = context;
    const uid = rootState.im.userManage.getUid();
    const oldMessages = state.messages || [];
    const filteredMessages = newMessages.filter((newMeta) => {
      let jext = {};
      try {
        jext = typeof newMeta.ext === 'string' ? JSON.parse(newMeta.ext) : newMeta.ext || {};
      } catch (ex) {
        // Ignore malformed extension data here; the message remains displayable.
      }
      if (jext.input_status) return false;
      if (state.viewType === 'rosterchat' && newMeta.type === 'rtc') {
        if (newMeta.config && newMeta.config.action && newMeta.config.action !== 'record') return false;
        if (jext.callId) return false;
      }
      const fromUid = toNumber(newMeta.from);
      const toUid = toNumber(newMeta.to);
      const saveUid = fromUid === uid ? toUid : fromUid;
      if (state.viewType === 'rosterchat') return `${saveUid}` === `${state.sid}`;
      if (state.viewType === 'groupchat') return `${toUid}` === `${state.sid}`;
      return false;
    });
    const allMessages = mergeMessages(oldMessages, filteredMessages, sendingMessages);

    context.commit('setMessage', allMessages);
    if (!isHistory && allMessages.length !== oldMessages.length) {
      state.scroll = state.scroll + 1;
    }
  },

  actionUpdateMessage(context, data = {}) {
    const mid = data.mid;
    const message = data.message;
    const { state } = context;
    const sessionIds = Object.keys(state.messageSessions);
    for (const sid of sessionIds) {
      const oldMessages = state.messageSessions[sid].messages || [];
      const index = findMessageIndexByMid(oldMessages, mid);
      if (index < 0) continue;
      if (isPendingMessage(oldMessages[index]) && !isPendingMessage(message)) {
        const remainingMessages = oldMessages.slice();
        remainingMessages.splice(index, 1);
        context.commit('setSessionMessages', { sid, messages: mergeMessages(remainingMessages, [message]) });
      } else {
        context.commit('updateSessionMessageAt', { sid, index, message });
      }
      return true;
    }

    for (const sid of sessionIds) {
      const cachedMessages = state.messageSessions[sid].cachedHistoryMessages || [];
      const cachedIndex = findMessageIndexByMid(cachedMessages, mid);
      if (cachedIndex < 0) continue;
      context.commit('updateCachedHistoryMessageAt', { sid, index: cachedIndex, message });
      return true;
    }

    const oldMessages = state.messages || [];
    const index = findMessageIndexByMid(oldMessages, mid);
    if (index < 0) return false;
    if (isPendingMessage(oldMessages[index]) && !isPendingMessage(message)) {
      const remainingMessages = oldMessages.slice();
      remainingMessages.splice(index, 1);
      context.commit('setMessage', mergeMessages(remainingMessages, [message]));
      return true;
    }
    context.commit('updateMessageAt', { index, message });
    return true;
  },

  actionPatchMessage(context, data = {}) {
    const { mid, patch = {} } = data;
    const { state } = context;
    const sessionIds = Object.keys(state.messageSessions);
    for (const sid of sessionIds) {
      const messages = state.messageSessions[sid].messages || [];
      const index = findMessageIndexByMid(messages, mid);
      if (index < 0) continue;
      context.commit('updateSessionMessageAt', {
        sid,
        index,
        message: { ...messages[index], ...patch }
      });
      return true;
    }

    for (const sid of sessionIds) {
      const cachedMessages = state.messageSessions[sid].cachedHistoryMessages || [];
      const cachedIndex = findMessageIndexByMid(cachedMessages, mid);
      if (cachedIndex < 0) continue;
      context.commit('updateCachedHistoryMessageAt', {
        sid,
        index: cachedIndex,
        message: { ...cachedMessages[cachedIndex], ...patch }
      });
      return true;
    }

    const index = findMessageIndexByMid(state.messages || [], mid);
    if (index < 0) return false;
    context.commit('updateMessageAt', {
      index,
      message: { ...state.messages[index], ...patch }
    });
    return true;
  },

  actionDeleteMessage(context, payload) {
    const { state } = context;
    const mid = payload && typeof payload === 'object' ? payload.mid : payload;
    const sid = payload && typeof payload === 'object' && typeof payload.sid !== 'undefined' ? payload.sid : state.sid;
    const session = state.messageSessions[`${sid}`];
    const oldVisibleCount = session ? session.messages.length : 0;
    context.commit('rememberDeletedMessage', { sid, mid });
    context.commit('deleteSessionMessage', { sid, mid });
    if (`${state.sid}` === `${sid}` && oldVisibleCount !== state.messages.length) {
      state.scroll = state.scroll - 1;
    }
  },

  queryHistory(context, options = {}) {
    const { rootState, state } = context;
    const targetSid = typeof options.sid === 'undefined' || options.sid === null ? `${state.sid}` : `${options.sid}`;
    let session = state.messageSessions[targetSid];
    const retryExhausted = !!options.retryExhausted;
    const continueOverlap = !!options.continueOverlap;
    if (!session) return false;
    if (!session.localMessagesLoaded && !continueOverlap) {
      if (`${state.sid}` !== targetSid) return false;
      context.dispatch('actionRequireMessage', { skipAutoHistory: true });
      session = state.messageSessions[targetSid];
    }
    if (!continueOverlap && session.cachedHistoryMessages.length) {
      context.commit('revealCachedHistory', { sid: targetSid, amount: HISTORY_REVEAL_BATCH_SIZE });
      return true;
    }
    if (
      session.discardPendingHistoryResponse ||
      (continueOverlap && !session.historyLoading) ||
      (session.historyLoading && !continueOverlap) ||
      (!retryExhausted && session.historyExhausted) ||
      session.historyBlockedUntilReconnect
    )
      return false;
    let mid = historyCursorForSession(session);
    if (retryExhausted && session.historyExhausted && `${mid}` === '0' && session.messages.length) {
      mid = messageKey(session.messages[0]);
    }
    const amount = HISTORY_REVEAL_BATCH_SIZE; // Batch size of one time history message query.
    const accepted = rootState.im.sysManage.requireHistoryMessage(targetSid, mid, amount);
    if (accepted === false) {
      context.commit('setHistoryBlocked', { sid: targetSid, blocked: true, error: 'history_request_in_flight' });
      return false;
    }
    context.commit('setHistoryLoading', { sid: targetSid, loading: true, requestCursor: mid });

    clearHistoryQueryTimer(targetSid);
    historyQueryTimers.set(
      targetSid,
      setTimeout(() => {
        historyQueryTimers.delete(targetSid);
        context.commit('setHistoryBlocked', { sid: targetSid, blocked: true, error: 'history_request_timeout' });
        console.warn('History query timeout:', targetSid, mid);
      }, HISTORY_QUERY_TIMEOUT)
    );
    return true;
  },

  actionReceiveHistoryBatch(context, payload = {}) {
    const { state, rootState } = context;
    const sid = typeof payload.sid === 'undefined' || payload.sid === null ? '' : `${payload.sid}`;
    clearHistoryQueryTimer(sid);
    const session = state.messageSessions[sid];
    if (!session) return;
    if (session.discardPendingHistoryResponse) {
      if (payload.success === false && payload.blockedUntilReconnect) {
        context.commit('setHistoryBlocked', {
          sid,
          blocked: true,
          error: payload.reason || 'history_request_timeout'
        });
        return;
      }
      context.commit('finishDiscardedHistoryResponse', {
        sid,
        error: payload.success === false ? payload.reason || 'history_request_failed' : ''
      });
      return;
    }
    if (payload.requestId && session.lastHistoryRequestId === payload.requestId) return;
    if (session.pendingHistoryCursor === null) {
      if (session.historyBlockedUntilReconnect && session.historyError === 'history_request_in_flight') {
        context.commit('setHistoryBlocked', { sid, blocked: false });
      }
      console.warn('Ignore history response without matching request:', sid, payload.requestId || '');
      return;
    }
    if (payload.success === false) {
      if (payload.blockedUntilReconnect) {
        context.commit('setHistoryBlocked', {
          sid,
          blocked: true,
          error: payload.reason || 'history_request_timeout'
        });
        return;
      }
      context.commit('setHistoryLoading', {
        sid,
        loading: false,
        error: payload.reason || 'history_request_failed',
        clearRequest: true
      });
      return;
    }

    const incoming = (payload.messages || [])
      .filter((message) => {
        let ext = {};
        try {
          ext = typeof message.ext === 'string' ? JSON.parse(message.ext) : message.ext || {};
        } catch (ex) {
          // Malformed extension data does not make a normal message invisible.
        }
        if (ext.input_status) return false;
        if (message.toType === 'roster' && message.type === 'rtc') {
          if (message.config && message.config.action && message.config.action !== 'record') return false;
          if (ext.callId) return false;
        }
        return true;
      })
      .map((message) => {
        const fromCurrentUser = `${message.from}` === `${rootState.im.userManage.getUid()}`;
        const readStatus = rootState.im.sysManage.getStaticVars().STATIC_MESSAGE_STATUS.READ;
        return {
          ...message,
          ...(fromCurrentUser ? {} : { status: readStatus, r: true }),
          skipStreamReplayOnMount: true
        };
      });
    const mergeIntoCache = session.cachedHistoryMessages.length > 0;
    const oldCount = session.messages.length + session.cachedHistoryMessages.length;
    const mergedMessages = mergeIntoCache ? session.messages : mergeHistoryMessages(session.messages, incoming, session.deletedMessageIds);
    const mergedCachedHistoryMessages = mergeIntoCache ? mergeHistoryMessages(session.cachedHistoryMessages, incoming, session.deletedMessageIds) : session.cachedHistoryMessages;
    const addedCount = mergedMessages.length + mergedCachedHistoryMessages.length - oldCount;
    const messages = addedCount > 0 && !mergeIntoCache ? mergedMessages : session.messages;
    const cachedHistoryMessages = addedCount > 0 && mergeIntoCache ? mergedCachedHistoryMessages : session.cachedHistoryMessages;
    const nextKey = typeof payload.nextKey !== 'undefined' ? `${payload.nextKey}` : toUnsignedLong(payload.next || 0).toString();
    const noProgress = nextKey !== '0' && nextKey === `${session.pendingHistoryCursor}` && addedCount === 0;
    const skipOverlappingPage = shouldContinuePastOverlappingHistory(session.pendingHistoryCursor, nextKey, addedCount);
    if (noProgress) {
      console.warn('History query made no progress, keep current cursor for manual retry:', sid, nextKey);
    }
    context.commit('finishHistory', {
      sid,
      requestId: payload.requestId,
      messages,
      cachedHistoryMessages,
      nextKey,
      exhausted: nextKey === '0',
      keepLoading: skipOverlappingPage
    });
    context.commit('recordHistoryQuery', sid);
    if (skipOverlappingPage) {
      console.log('History page overlaps loaded messages, continue from:', sid, nextKey);
      setTimeout(() => {
        const continuationSession = context.state.messageSessions[sid];
        if (!continuationSession || !continuationSession.historyLoading || `${continuationSession.nextKey}` !== `${nextKey}`) return;
        context.dispatch('queryHistory', { continueOverlap: true, sid });
      }, 0);
    }
  },

  actionSaveMessageViewport(context, payload = {}) {
    context.commit('saveMessageViewport', {
      sid: typeof payload.sid === 'undefined' ? context.state.sid : payload.sid,
      viewport: typeof payload.viewport === 'undefined' ? payload : payload.viewport
    });
  },

  actionSaveMessageMeasurements(context, payload = {}) {
    context.commit('saveMessageMeasurements', payload);
  },

  actionResetMessageSessions(context) {
    historyQueryTimers.forEach((timer) => clearTimeout(timer));
    historyQueryTimers.clear();
    context.commit('resetMessageSessions');
  },

  actionSetMessageSessionOwner(context, uid) {
    context.commit('setMessageSessionOwner', uid);
  },

  actionResetHistoryBlocks(context) {
    historyQueryTimers.forEach((timer) => clearTimeout(timer));
    historyQueryTimers.clear();
    context.commit('resetHistoryBlocks');
  },

  actionUpdateMessageTime(context, time) {
    context.commit('setMessageTime', time);
  },

  actionUpdateQueryMessageId() {}
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
