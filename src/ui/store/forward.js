//collection.js
const state = {
  rosterList: [],
  groupList: [],
  forwardMessage: null,
  multiForwardMessages: [],
  showMultiForwardStatus: false,
  showForwardList: false,
  messageForwardMaxUserNum: 1,
  messageForwardMaxMessageNum: 1
};

const getters = {
  getRosterList(state) {
    return state.rosterList;
  },

  getGroupList(state) {
    return state.groupList;
  },

  getShowMultiForwardStatus(state) {
    return state.showMultiForwardStatus;
  },

  getMultiForwardMessages(state) {
    return state.multiForwardMessages;
  },

  getShowForwardList(state) {
    return state.showForwardList;
  },

  getMessageForwardMaxUserNum(state) {
    return state.messageForwardMaxUserNum;
  },

  getMessageForwardMaxMessageNum(state) {
    return state.messageForwardMaxMessageNum;
  }
};

const mutations = {
  setRosterList(state, x) {
    state.rosterList = x;
  },

  setGroupList(state, x) {
    state.groupList = x;
  },

  setForwardMessage(state, x) {
    state.forwardMessage = x;
  },

  setMultiForwardMessages(state, x) {
    state.multiForwardMessages = x;
  },

  setPushMultiForwardMessages(state, x) {
    if (x && x.id) {
      state.multiForwardMessages.push(x);
    }
  },

  setSpliceMultiForwardMessages(state, x) {
    state.multiForwardMessages.splice(x, 1);
  },

  setShowMultiForwardStatus(state, x) {
    state.showMultiForwardStatus = x;
  },

  setShowForwardList(state, x) {
    state.showForwardList = x;
  },

  setMessageForwardMaxUserNum(state, x) {
    state.messageForwardMaxUserNum = x;
  },

  setMessageForwardMaxMessageNum(state, x) {
    state.messageForwardMaxMessageNum = x;
  }
};

const actions = {
  actionGetForwardList(context) {
    const { rootState, state } = context;
    if (!state.rosterList.length && !state.groupList.length) {
      rootState.im.rosterManage.asyncGetRosterIdList().then((res) => {
        rootState.im.rosterManage.asnycGetRosterListDetailByIds(res).then(() => {
          const allMaps = rootState.im.rosterManage.getAllRosterDetail() || {};
          const retObj = res.map((i) => {
            const rosterInfo = allMaps[i] || { user_id: i };
            return {
              name: rosterInfo.alias || rosterInfo.nick_name || rosterInfo.username || rosterInfo.user_id,
              id: rosterInfo.user_id,
              avatar: rootState.im.sysManage.getImage({
                avatar: rosterInfo.avatar
              })
            };
          });
          context.commit('setRosterList', [].concat(retObj));
        });
      });

      rootState.im.groupManage.asyncGetJoinedGroups(/**true**/).then((res) => {
        res = res || [];
        const retObj = res.map((i) => {
          return {
            name: i.name,
            id: i.group_id,
            avatar: rootState.im.sysManage.getImage({
              avatar: i.avatar,
              type: 'group'
            })
          };
        });
        // this.forwardMembers.groupps = [].concat(retObj);
        context.commit('setGroupList', [].concat(retObj));
      });

      let appConfig = rootState.im.sysManage.getAppConfig(rootState.im.userManage.getAppid());
      if (appConfig) {
        if (appConfig.message_forward_max_user_num && appConfig.message_forward_max_user_num > state.messageForwardMaxUserNum) {
          context.commit('setMessageForwardMaxUserNum', appConfig.message_forward_max_user_num);
        }
        if (appConfig.message_forward_max_message_num && appConfig.message_forward_max_message_num > state.messageForwardMaxMessageNum) {
          context.commit('setMessageForwardMaxMessageNum', appConfig.message_forward_max_message_num);
        }
      }
    }
  },

  actionRecordForwardMessage(context, x) {
    // 记录要转发的message
    context.commit('setForwardMessage', x);
    context.commit('setShowForwardList', true);
    context.commit('setShowMultiForwardStatus', false);
  },

  actionForwardMessage(context, param) {
    const { rootState, state } = context;
    const { type, id: xid } = param; //type: group, roster; id: uid,gid
    const fmsg = {};
    if (type === 'roster') {
      fmsg.uid = xid;
    } else {
      fmsg.gid = xid;
    }
    fmsg.message = state.forwardMessage;
    rootState.im.sysManage.forwardMessage(fmsg);
  },

  actionShowMultiForwardStatus(context, x) {
    const { state } = context;
    if (state.showMultiForwardStatus !== x) {
      context.commit('setShowMultiForwardStatus', x);
      context.commit('setShowForwardList', x);
    }
  },

  actionMultiForwardMessageSelect(context, param) {
    const { state } = context;
    const index = state.multiForwardMessages.findIndex((message) => {
      return message.id === param.id;
    });
    if (index >= 0) {
      context.commit('setSpliceMultiForwardMessages', index);
    } else {
      context.commit('setPushMultiForwardMessages', param);
    }
  },

  actionMultiForwardMessages(context, param) {
    const { rootState, state } = context;
    const { type, id: xid } = param; //type: group, roster; id: uid,gid
    let count = 0;
    state.multiForwardMessages.forEach((message) => {
      setTimeout(() => {
        const fmsg = {};
        if (type === 'roster') {
          fmsg.uid = xid;
        } else {
          fmsg.gid = xid;
        }
        fmsg.message = message;
        rootState.im.sysManage.forwardMessage(fmsg);
      }, (count += 100));
    });
  },

  actionFinishForward(context) {
    context.commit('setShowForwardList', false);
    context.commit('setShowMultiForwardStatus', false);
    context.commit('setMultiForwardMessages', []);
  },

  actionCancelForward(context) {
    context.commit('setShowForwardList', false);
    context.commit('setShowMultiForwardStatus', false);
    context.commit('setMultiForwardMessages', []);
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
