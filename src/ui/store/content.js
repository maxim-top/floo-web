//collection.js
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
  intentMessage: '',
  messages: [],
  time: [], // 这个是，消息的时间，几分钟显示一下，按现在的逻辑..

  rosterMap: {},
  groupMap: {},

  memberlistMap: {},
  adminListMap: {},

  scroll: 0,

  queryHistoryMessageId: 0,
  queryHistoryRecords: {} // map of sid:queryTimes
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
  }
};

const actions = {
  actionOpenGroup(context) {
    const { rootState, state } = context;
    rootState.im.groupManage.openGroup(state.sid);
    rootState.im.groupManage.readGroupMessage(state.sid);

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

  actionSetType(context, x) {
    const { state } = context;
    if (typeof x.sid === 'undefined' || x.sid < 0) {
      context.commit('setMessage', []);
      context.commit('setViewType', '');
    }

    if (state.sid !== x.sid || state.viewType !== x.type) {
      context.commit('setSid', x.sid);
      x.type && context.commit('setViewType', x.type);
      x.sid && context.commit('setMessage', []);
      state.time = [];
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
    rootState.im.rosterManage.asyncGetRosterInfo(state.sid).then((res) => {
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
      context.dispatch('actionAppendMessage', { messages: localMessages });
    }

    const historyQueryTimes = state.queryHistoryRecords[state.sid] || 0;
    if (historyQueryTimes === 0 && (!localMessages || localMessages.length <= 3)) {
      context.dispatch('queryHistory');
    }
  },

  actionAppendMessage(context, data = {}) {
    const newMessages = data.messages || [];
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
      allMessages = allMessages.concat(oldMessages.slice(i, oldMessages.length));
    }
    context.commit('setMessage', allMessages);
    if (!isHistory && allMessages.length !== oldMessages.length) {
      state.scroll = state.scroll + 1;
    }
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
