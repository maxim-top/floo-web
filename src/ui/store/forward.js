//collection.js
const state = {
  rosterList: [],
  groupList: [],
  forwardMessage: null,

  showForwardList: false
};

const getters = {
  getRosterList(state) {
    return state.rosterList;
  },

  getGroupList(state) {
    return state.groupList;
  },

  getShowForwardList(state) {
    return state.showForwardList;
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

  setShowForwardList(state, x) {
    state.showForwardList = x;
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
    }
  },

  actionRecordForwardMessage(context, x) {
    // 记录要转发的message
    context.commit('setForwardMessage', x);
    context.commit('setShowForwardList', true);
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
    context.commit('setShowForwardList', false);
  },

  actionCancelForward(context) {
    context.commit('setShowForwardList', false);
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
