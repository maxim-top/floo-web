//collection.js

const state = {
  headerStatus: 'contact',
  userProfile: {},
  supportSafariAudio: false
};

const headerRequestFlag = {
  profile: false
};

const getters = {
  getHeaderStatus(state) {
    return state.headerStatus;
  },
  getUserProfile(state) {
    return state.userProfile;
  },
  getSupportSafariAudio(state) {
    return state.supportSafariAudio;
  }
};

const mutations = {
  changeHeaderStatus(state, status) {
    state.headerStatus = status;
  },

  changeHeaderUserProfile(state, profile) {
    state.userProfile = profile;
  },

  changeSupportSafariAudio(state, status) {
    state.supportSafariAudio = status;
  }
};

const actions = {
  actionChangeHeaderStatus(context, status) {
    context.commit('changeHeaderStatus', status);
  },
  actionChangeHeaderUserProfile(context, profile) {
    context.commit('changeHeaderUserProfile', profile);
  },
  actionGetHeaderProfile(context) {
    const { rootState } = context;
    rootState.im.userManage.asyncGetProfile(true).then((profile) => {
      context.commit('changeHeaderUserProfile', profile);
    });
  },
  actionLazyGetHeaderProfile(context) {
    const { state, rootState } = context;
    if (!state.userProfile.user_id && !headerRequestFlag.profile) {
      headerRequestFlag.profile = true;
      rootState.im.userManage.asyncGetProfile().then((profile) => {
        context.commit('changeHeaderUserProfile', profile);
        headerRequestFlag.profile = false;
      });
    }
  },
  actionChangeSupportSafariAudio(context, status) {
    context.commit('changeSupportSafariAudio', status);
  }
};
export default {
  namespaced: true, //用于在全局引用此文件里的方法时标识这一个的文件名
  state,
  getters,
  mutations,
  actions
};
