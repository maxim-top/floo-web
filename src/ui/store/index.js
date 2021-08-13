import Vue from 'vue';
import Vuex from 'vuex';

import Login from './login';
import header from './header';
import contact from './contact';
import chat from './content';
import content from './content';
import forward from './forward';
import setting from './setting';
import layer from './layer';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    login: Login,
    header,
    contact,
    chat,
    content,
    forward,
    setting,
    layer
  },

  state: {
    appID: '',
    im: {}
  },

  getters: {
    getAppID(state) {
      return state.appID;
    },

    wim(state) {
      return state.im;
    },
    im(state) {
      return state.im;
    }
  },

  mutations: {
    changeAppID(state, newAppID) {
      state.appID = newAppID;
    },

    saveIm(state, pim) {
      state.im = pim;
    }
  },

  actions: {
    actionChangeAppID(context, appID) {
      context.commit('changeAppID', appID);
    },

    actionSaveIm(context, pim) {
      context.commit('saveIm', pim);
    }
  }
});
