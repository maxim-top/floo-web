//collection.js

const state = {
  // appStatus: 'login',  //初始化一个colects数组
  appStatus: 'login', //初始化一个colects数组
  loginLog: ['这里是登录日志..'],
  mobileSign: '',
  signMobile: '',
  loginInfo: {},
  loginInfoList: []
};

const getters = {
  getAppStatus(state) {
    return state.appStatus;
  },
  getLoginLog(state) {
    return state.loginLog;
  },
  getMobileSign(state) {
    return state.mobileSign;
  },
  getSignMobile(state) {
    return state.signMobile;
  },
  getLoginInfo(state) {
    return state.loginInfo;
  },
  getLoginInfoList(state) {
    return state.loginInfoList;
  }
};

const mutations = {
  changeAppStatus(state, status) {
    //如何变化collects,插入items
    state.appStatus = status;
  },

  addLoginLog(state, log) {
    let sr = [].concat(state.loginLog);
    sr.push(log);
    if (sr.length > 3) {
      sr = sr.slice(-3); // 只保留3条
    }
    state.loginLog = sr;
  },
  setMobileSigh(state, sign) {
    state.mobileSign = sign;
  },
  setSighMobile(state, mobile) {
    state.signMobile = mobile;
  },
  setLoginInfo(state, info) {
    state.loginInfo = info;
  },
  setLoginInfoList(state, list) {
    state.loginInfoList = list;
  }
};

const actions = {
  actionChangeAppStatus(context, status) {
    //触发mutations里面的pushCollects ,传入数据形参item 对应到items
    context.commit('changeAppStatus', status);
  },

  actionAddLoginLog(context, log) {
    context.commit('addLoginLog', log);
  },
  actionSetMobileSign(context, sign) {
    context.commit('setMobileSigh', sign);
  },
  actionSetSignMobile(context, mobile) {
    context.commit('setSighMobile', mobile);
  },
  actionSetLoginInfo(context, info) {
    context.commit('setLoginInfo', info);
  },
  actionSetLoginInfoList(context, list) {
    context.commit('setLoginInfoList', list);
  }
};
export default {
  namespaced: true, //用于在全局引用此文件里的方法时标识这一个的文件名
  state,
  getters,
  mutations,
  actions
};
