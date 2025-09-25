//collection.js
// import { toNumber } from '../third/tools';

const state = {
  settingInfo: {},
  profileInfo: {},
  userVerification: {},
  callStatus: false
};

const getters = {
  getSettingInfo(state) {
    return state.settingInfo;
  },

  getProfileInfo(state) {
    return state.profileInfo;
  },

  getUserVerification(state) {
    return state.userVerification;
  }
};

const mutations = {
  setSettingInfo(state, x) {
    state.settingInfo = x;
  },

  setProfileInfo(state, x) {
    state.profileInfo = x;
  },

  setUserVerification(state, x) {
    state.userVerification = x;
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
  actionGetUserVerification(context) {
    const { rootState } = context;
    rootState.im.userManage
      .asyncGetUserVerification()
      .then((res) => {
        context.commit('setUserVerification', res);
      })
      .catch((ex) => {
        if (ex.code == 404) {
          context.commit('setUserVerification', {
            status: -1
          });
        }
      });
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
