//collection.js

const state = {
  rosterList: [],
  groupList: [],
  conversationList: [],
  contactStatus: 'contact',
  callInviteInfo: null,
  callId: '',
  pickupTime: 0,
  searchKeyword: '',
  totalUnread: ''
};

const contactRequestFlag = {
  rosterList: false,
  groupList: false
};

const getters = {
  getRosterList(state) {
    return state.rosterList;
  },
  getGroupList(state) {
    return state.groupList;
  },
  getContactStatus(state) {
    return state.contactStatus;
  },

  getConversationList(state) {
    return state.conversationList;
  },

  getSearchKeyword(state) {
    return state.searchKeyword;
  },

  getCallInviteInfo(state) {
    return state.callInviteInfo;
  },
  getCallId(state) {
    return state.callId;
  },
  getCallPickupTime(state) {
    return state.pickupTime;
  },

  getTotalUnread(state) {
    return state.totalUnread;
  }
};

const mutations = {
  setRosterList(state, x) {
    state.rosterList = x;
  },

  setGroupList(state, x) {
    state.groupList = x;
  },

  setContactStatus(state, x) {
    state.contactStatus = x;
  },

  saveConversationList(state, x) {
    state.conversationList = x;
  },

  setSearchKeyword(state, x) {
    state.searchKeyword = x;
  },

  setCallInviteInfo(state, x) {
    state.callInviteInfo = x;
  },

  setCallId(state, x) {
    state.callId = x;
  },

  setCallPickupTime(state, x) {
    state.pickupTime = x;
  },

  setTotalUnread(state, x) {
    state.totalUnread = x;
  }
};

const actions = {
  actionSetRosterList(context, x) {
    const { rootState } = context;
    x.forEach((s) => {
      s.avatar = rootState.im.sysManage.getImage({
        avatar: s.avatar,
        type: 'roster'
      });
    });
    context.commit('setRosterList', x);
  },
  actionSetGroupList(context, x) {
    const { rootState } = context;
    x.forEach((s) => {
      s.avatar = rootState.im.sysManage.getImage({
        avatar: s.avatar,
        type: 'group'
      });
    });
    context.commit('setGroupList', x);
  },

  actionSetContactStatus(context, x) {
    context.commit('setContactStatus', x);
  },

  actionGetConversationList(context) {
    const { rootState } = context;
    const convlist = rootState.im.userManage.getConversationList();
    const allGroupMap = rootState.im.groupManage.getAllGroupDetail();
    const allRosterMap = rootState.im.rosterManage.getAllRosterDetail() || {};
    let totalUnreadCount = 0;
    const convData = convlist.map((item, index) => {
      let name;
      const id = item.id;
      const content = item.content;
      const timestamp = item.timestamp;
      const hasAt = item.hasAt;
      // const img = allRosterMap[id] && allRosterMap[id].avatar;
      let avatar = ''; //(img && this.client.signatureUrl(img, { expires: 600, process: 'image/resize,w_50' })) || '/image/roster.png';
      const unreadCount = item.type == 'roster' ? rootState.im.rosterManage.getUnreadCount(id) : rootState.im.groupManage.getUnreadCount(id);
      const unread = unreadCount > 0 ? unreadCount : 0;
      totalUnreadCount += unread;
      if (item.type === 'roster') {
        //roster
        const sroster = allRosterMap[id] || {};
        name = sroster.alias || sroster.nick_name || sroster.username || id;
        avatar = sroster.avatar;
      } else if (item.type === 'group') {
        //group
        const sgroup = allGroupMap[id] || {};
        name = sgroup.name || id;
        avatar = sgroup.avatar;
      }
      avatar = rootState.im.sysManage.getImage({
        avatar,
        type: item.type === 'roster' ? 'roster' : 'group'
      });
      return {
        type: item.type,
        index,
        name,
        content,
        timestamp,
        avatar,
        unread,
        hasAt,
        sid: id
      };
    });

    const sortedConvList = convData.sort((a, b) => {
      return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0;
    });
    context.commit('saveConversationList', sortedConvList);
    if (totalUnreadCount > 99) {
      context.commit('setTotalUnread', '99+');
    } else if (totalUnreadCount > 0) {
      context.commit('setTotalUnread', totalUnreadCount.toString());
    } else {
      context.commit('setTotalUnread', '');
    }
  },

  actionLazyGetRosterList(context) {
    const { state, rootState } = context;
    if (!state.rosterList.length && !contactRequestFlag.rosterList) {
      contactRequestFlag.rosterList = true;
      rootState.im.rosterManage.asyncGetRosterIdList().then((res) => {
        rootState.im.rosterManage.asnycGetRosterListDetailByIds(res).then(() => {
          const allMaps = rootState.im.rosterManage.getAllRosterDetail() || {};
          const retObj = res.map((i) => {
            const rosterInfo = allMaps[i] || { user_id: i };
            rosterInfo.avatar = rootState.im.sysManage.getImage({
              avatar: rosterInfo.avatar
            });
            const unreadCount = rootState.im.rosterManage.getUnreadCount(i);
            return Object.assign(
              {
                unreadCount
              },
              rosterInfo
            );
          });
          context.commit('setRosterList', retObj);
          contactRequestFlag.rosterList = false;
        });
      });
    }
  },

  actionLazyGetGroupList(context) {
    const { state, rootState } = context;
    if (!state.groupList.length && !contactRequestFlag.groupList) {
      rootState.im.groupManage.asyncGetJoinedGroups().then((res) => {
        const retObj = res.map((i) => {
          const unreadCount = rootState.im.groupManage.getUnreadCount(i.group_id);
          i.avatar = rootState.im.sysManage.getImage({
            avatar: i.avatar,
            type: 'group'
          });
          return Object.assign(
            {
              unreadCount
            },
            i
          );
        });
        context.commit('setGroupList', retObj);
        contactRequestFlag.rosterList = false;
      });
    }
  },

  actionClearGroupList(context) {
    context.commit('setGroupList', []);
  },
  actionClearRosterList(context) {
    context.commit('setRosterList', []);
  },

  actionSetSearchkeyword(context, x) {
    context.commit('setSearchKeyword', x);
  },

  actionSetCallInviteInfo(context, x) {
    context.commit('setCallInviteInfo', x);
  },
  actionSetCallPickupTime(context, x) {
    context.commit('setCallPickupTime', x);
  },
  actionSetCallId(context, x) {
    context.commit('setCallId', x);
  }
};
export default {
  namespaced: true, //用于在全局引用此文件里的方法时标识这一个的文件名
  state,
  getters,
  mutations,
  actions
};
