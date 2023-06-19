//collection.js
// import { toNumber } from '../third/tools';

const state = {
  settingInfo: {},
  profileInfo: {},
  callStatus: false
};

const getters = {
  getSettingInfo(state) {
    return state.settingInfo;
  },

  getProfileInfo(state) {
    return state.profileInfo;
  },

  getCallStatus(state) {
    return state.callStatus;
  }
};

const mutations = {
  setSettingInfo(state, x) {
    state.settingInfo = x;
  },

  setProfileInfo(state, x) {
    state.profileInfo = x;
  },

  setCallStatus(state, x) {
    state.callStatus = x;
  }
};

const actions = {
  actionGetProfile(context) {
    const { rootState } = context;
    rootState.im.userManage.asyncGetProfile(true).then((res) => {
      context.commit('setProfileInfo', res);
    });
  },
  actionGetSettingInfo(context) {
    const { rootState } = context;
    rootState.im.userManage.asyncGetSettings().then((res) => {
      context.commit('setSettingInfo', res);
    });
  },
  actionSetCallStatus(context, status) {
    context.commit('setCallStatus', status);
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
