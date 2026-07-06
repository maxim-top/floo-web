//collection.js
import { t } from '../../i18n';
import { toLong, toNumber } from '../third/tools';
// import axios from 'axios'

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
  getAdminList(state) {
    return state.adminListMap[state.sid] || [];
  },

  getScroll(state) {
    return state.scroll;
  },

  getAutoReadSuppressed(state) {
    return state.autoReadSuppressed;
  }
};

const mutations = {
  setViewType(state, x) {
    state.viewType = x;
  },

  setSid(state, x) {
    state.sid = x;
    this.queryHistoryMessageId = 0;
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

  setGroupInfo(state, x) {
    const obj = Object.assign({}, state.groupMap, { [state.sid]: x });
    state.groupMap = obj;
    // state.groupMap[state.sid] = x;
  },

  setMemberList(state, x) {
    const obj = Object.assign({}, state.memberlistMap, { [state.sid]: x });
    state.memberlistMap = obj;
  },
  setAdminList(state, x) {
    const obj = Object.assign({}, state.adminListMap, { [state.sid]: x });
    state.adminListMap = obj;
  },
  setQud(state, x) {
    state.queryHistoryMessageId = x;
  },

  recordHistoryQuery(state) {
    let times = state.queryHistoryRecords[state.sid] || 0;
    times++;
    state.queryHistoryRecords[state.sid] = times;
  },

  setAutoReadSuppressed(state, x) {
    state.autoReadSuppressed = !!x;
  }
};

const actions = {
  actionOpenGroup(context) {
    const { rootState, state } = context;
    rootState.im.groupManage.openGroup(state.sid);
    //rootState.im.groupManage.readGroupMessage(state.sid);

    rootState.im.groupManage
      .asyncGetAdminList({ group_id: state.sid })
      .then((res) => {
        context.commit('setAdminList', res);
      })
      .catch((err) => {
        console.error('Failed to GetAdminList, error:', err);
      });

    rootState.im.groupManage
      .asyncGetGroupInfo(state.sid, true)
      .then((res) => {
        context.commit('setGroupInfo', res);
      })
      .catch((err) => {
        console.error('Failed to GetGroupInfo, error:', err);
      });
  },

  actionPreOpenGroup(context, x) {
    const { rootState } = context;
    rootState.im.groupManage.openGroup(x.sid);
    //rootState.im.groupManage.readGroupMessage(x.sid);

    rootState.im.groupManage
      .asyncGetAdminList({ group_id: x.sid })
      .then((res) => {
        context.commit('setAdminList', res);
      })
      .catch((err) => {
        console.error('Failed to GetAdminList, error:', err);
      });

    rootState.im.groupManage
      .asyncGetGroupInfo(x.sid, true)
      .then((res) => {
        context.commit('setGroupInfo', res);
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

    const existing = (rootState.im.userManage.getConversationList() || []).find((item) => `${item.id}` === `${sid}` && item.type === type);
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
    rootState.im.groupManage
      .asyncGetAdminList({ group_id: x.sid })
      .then((res) => {
        context.commit('setAdminList', res);
      })
      .catch((err) => {
        console.error('Failed to GetAdminList, error:', err);
      });
  },

  actionSetType(context, x) {
    const { state } = context;
    if (x.type == 'restore') {
      x.sid = state.lastSid;
      x.type = state.lastViewType;
    }
    if (typeof x.sid === 'undefined' || x.sid < 0) {
      context.commit('setMessage', []);
      context.commit('setViewType', '');
      context.commit('setAutoReadSuppressed', false);
    }

    if (state.sid !== x.sid || state.viewType !== x.type) {
      context.commit('setAutoReadSuppressed', false);
      context.commit('setSid', x.sid);
      x.type && context.commit('setViewType', x.type);
      typeof x.sid !== 'undefined' && x.sid !== null && context.commit('setMessage', []);
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

  actionUpdateRoster(context) {
    const { rootState, state } = context;
    if (state.sid === 0) {
      context.commit('setRosterInfo', {
        user_id: 0,
        username: t('系统通知'),
        nick_name: t('系统通知'),
        alias: '',
        avatar: '/image/setting.png'
      });
      return;
    }
    rootState.im.rosterManage.asyncGetRosterInfo(state.sid, true).then((res) => {
      context.commit('setRosterInfo', res);
    });
  },

  actionUpdateGroup(context) {
    const { rootState, state } = context;
    rootState.im.groupManage.asyncGetGroupInfo(state.sid).then((res) => {
      context.commit('setGroupInfo', res);
    });
  },

  actionUpdateMemberList(context) {
    const { rootState, state } = context;
    const members = rootState.im.groupManage.getGroupMembers(state.sid);
    context.commit('setMemberList', members);
  },

  actionRequireMessage(context) {
    const { rootState, state } = context;

    let localMessages = undefined;
    if (state.viewType === 'rosterchat') {
      localMessages = rootState.im.rosterManage.getRosterMessageByRid(state.sid);
    } else if (state.viewType === 'groupchat') {
      localMessages = rootState.im.groupManage.getGruopMessage(state.sid);
    } else; //undefined type

    if (localMessages) {
      // Messages restored while re-entering a session should not replay the
      // typing animation from the beginning if an AI stream never closed.
      const restoredMessages = localMessages.map((message) => ({
        ...message,
        skipStreamReplayOnMount: true
      }));
      context.dispatch('actionAppendMessage', { messages: restoredMessages });
    }

    const historyQueryTimes = state.queryHistoryRecords[state.sid] || 0;
    if (historyQueryTimes === 0 && (!localMessages || localMessages.length <= 3)) {
      context.dispatch('queryHistory');
    }
  },

  actionAppendMessage(context, data = {}) {
    const newMessages = data.messages || [];
    const sendingMessages = data.sendingMessages || [];
    const isHistory = data.history;
    if (isHistory) {
      this.queryHistoryMessageId = data.next;
    }
    const { state, rootState } = context;
    const uid = rootState.im.userManage.getUid();
    const oldMessages = state.messages || [];

    let allMessages = [];
    let i = 0,
      j = 0;
    while (i < newMessages.length && j < oldMessages.length) {
      const newMeta = newMessages[i];
      const { ext } = newMeta;
      let jext = {};
      try {
        jext = JSON.parse(ext);
      } catch (ex) {
        //
      }
      if (jext.input_status) {
        i++;
        continue;
      }
      const { from, to } = newMeta;
      const fromUid = toNumber(from);
      const toUid = toNumber(to);
      let saveUid = fromUid === uid ? toUid : fromUid;
      if (saveUid + '' !== state.sid + '' && state.viewType === 'rosterchat') {
        return; // rosterchat, 必须有一个id是 sid
      }
      if (toUid + '' !== state.sid + '' && state.viewType === 'groupchat') {
        // 群消息 to 是 群 id。。
        return; //group，to 必须是sid
      }

      const oldMeta = oldMessages[j];
      const c = toLong(newMeta.id).comp(toLong(oldMeta.id));
      if (-1 === c) {
        allMessages.push(newMeta);
        i++;
      } else if (1 === c) {
        allMessages.push(oldMeta);
        j++;
      } else {
        //same id, which means message info updated
        allMessages.push(newMeta);
        i++;
        j++;
      }
    }

    if (i < newMessages.length) {
      allMessages = allMessages.concat(newMessages.slice(i, newMessages.length));
    }

    if (j < oldMessages.length) {
      allMessages = allMessages.concat(oldMessages.slice(j, oldMessages.length));
    }

    if (sendingMessages.length) {
      sendingMessages.forEach((msg) => {
        if (allMessages.filter((m) => m.id === msg.id).length === 0) {
          allMessages.push(msg);
        }
      });
    }

    context.commit('setMessage', allMessages);
    if (!isHistory && allMessages.length !== oldMessages.length) {
      state.scroll = state.scroll + 1;
    }
  },

  actionUpdateMessage(context, data = {}) {
    const mid = data.mid;
    const message = data.message;
    const { state } = context;
    const oldMessages = state.messages || [];
    let allMessages = [];

    let i = 0;
    for (i = 0; i < oldMessages.length; i++) {
      if (oldMessages[i].id == mid) {
        allMessages.push(message);
      } else {
        allMessages.push(oldMessages[i]);
      }
    }
    context.commit('setMessage', allMessages);
  },

  actionDeleteMessage(context, mid) {
    const { state } = context;
    const oldMessages = state.messages || [];
    const newMessages = oldMessages.filter((meta) => {
      if (meta.id == mid) return false;
      else return true;
    });

    context.commit('setMessage', [].concat(newMessages));
    if (oldMessages.length !== state.messages.length) {
      state.scroll = state.scroll - 1;
    }
  },

  queryHistory(context) {
    const { rootState, state } = context;
    const mid = this.queryHistoryMessageId || 0; // Query historys older than the message with id:mid, 0 means from the last message;
    const amount = 20; // Batch size of one time history message query.
    rootState.im.sysManage.requireHistoryMessage(state.sid, mid, amount);

    context.commit('recordHistoryQuery');
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
