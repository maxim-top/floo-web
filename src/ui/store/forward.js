//collection.js
const state = {
  rosterList: [],
  groupList: [],
  forwardMessage: null,
  multiForwardMessages: [],
  forwardStage: 'idle',
  showMultiForwardStatus: false,
  showForwardList: false,
  messageForwardMaxUserNum: 20,
  messageForwardMaxMessageNum: 100
};

const getters = {
  getRosterList(state) {
    return state.rosterList;
  },

  getGroupList(state) {
    return state.groupList;
  },

  getShowMultiForwardStatus(state) {
    return state.forwardStage === 'selecting';
  },

  getMultiForwardMessages(state) {
    return state.multiForwardMessages;
  },

  getShowForwardList(state) {
    return state.forwardStage === 'routing';
  },

  getForwardStage(state) {
    return state.forwardStage;
  },

  getForwardMessage(state) {
    return state.forwardMessage;
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

  setForwardStage(state, x) {
    state.forwardStage = x;
    state.showMultiForwardStatus = x === 'selecting';
    state.showForwardList = x === 'routing';
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
    context.commit('setForwardMessage', x);
    context.commit('setMultiForwardMessages', []);
    context.commit('setForwardStage', 'routing');
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

  actionBeginMultiForwardSelection(context) {
    context.commit('setForwardMessage', null);
    context.commit('setMultiForwardMessages', []);
    context.commit('setForwardStage', 'selecting');
  },

  actionOpenForwardRouting(context) {
    const { state } = context;
    if (!state.multiForwardMessages.length && !state.forwardMessage) {
      return;
    }
    context.commit('setForwardStage', 'routing');
  },

  actionBackToMessageSelection(context) {
    const { state } = context;
    if (state.multiForwardMessages.length) {
      context.commit('setForwardStage', 'selecting');
      return;
    }
    context.commit('setForwardStage', 'idle');
  },

  actionShowMultiForwardStatus(context, x) {
    if (x) {
      context.dispatch('actionBeginMultiForwardSelection');
    } else {
      context.dispatch('actionCancelForward');
    }
  },

  actionResetForwardStage(context) {
    context.commit('setForwardStage', 'idle');
    context.commit('setForwardMessage', null);
    context.commit('setMultiForwardMessages', []);
  },

  actionSelectForwardTarget(context, param) {
    const { state } = context;
    if (state.forwardStage !== 'routing') {
      return Promise.resolve();
    }
    if (state.multiForwardMessages.length) {
      return context.dispatch('actionMultiForwardMessages', param);
    }
    context.dispatch('actionForwardMessage', param);
    return Promise.resolve();
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
    const totalDelay = state.multiForwardMessages.reduce((lastDelay, message) => {
      const nextDelay = lastDelay + 100;
      setTimeout(() => {
        const fmsg = {};
        if (type === 'roster') {
          fmsg.uid = xid;
        } else {
          fmsg.gid = xid;
        }
        fmsg.message = message;
        rootState.im.sysManage.forwardMessage(fmsg);
      }, nextDelay);
      return nextDelay;
    }, count);
    return new Promise((resolve) => {
      setTimeout(resolve, totalDelay + 120);
    });
  },

  actionFinishForward(context) {
    context.commit('setForwardStage', 'idle');
    context.commit('setForwardMessage', null);
    context.commit('setMultiForwardMessages', []);
  },

  actionCancelForward(context) {
    context.commit('setForwardStage', 'idle');
    context.commit('setForwardMessage', null);
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
