//collection.js
const forwardResultCache = new Map();
const forwardResultWaiters = new Map();
const forwardLateResultWaiters = new Map();
const activeForwardMids = new Set();
const FORWARD_RESULT_TIMEOUT = 30000;
const FORWARD_LATE_RESULT_TIMEOUT = 5 * 60 * 1000;
const FORWARD_GROUP_INFO_BATCH_SIZE = 20;
let forwardStatusIm = null;
let capturingForwardResult = false;

const forwardStatusListener = (result = {}) => {
  if (result.status !== 'sent' && result.status !== 'failed') return;
  const key = `${result.mid}`;
  if (!capturingForwardResult && !activeForwardMids.has(key)) return;
  const waiter = forwardResultWaiters.get(key);
  if (waiter) {
    clearTimeout(waiter.timer);
    forwardResultCache.delete(key);
    forwardResultWaiters.delete(key);
    activeForwardMids.delete(key);
    waiter.resolve(result);
    return;
  }
  const lateWaiter = forwardLateResultWaiters.get(key);
  if (lateWaiter) {
    clearTimeout(lateWaiter.timer);
    forwardLateResultWaiters.delete(key);
    activeForwardMids.delete(key);
    lateWaiter.resolve(result);
    return;
  }
  forwardResultCache.set(key, result);
  if (forwardResultCache.size > 100) {
    forwardResultCache.delete(forwardResultCache.keys().next().value);
  }
};

const ensureForwardStatusListener = (im) => {
  if (forwardStatusIm === im) return;
  if (forwardStatusIm) forwardStatusIm.off('onSendingMessageStatusChanged', forwardStatusListener);
  forwardResultWaiters.forEach((waiter) => {
    clearTimeout(waiter.timer);
    waiter.resolve({ status: 'canceled', errorReason: 'Forward canceled' });
  });
  forwardLateResultWaiters.forEach((waiter) => {
    clearTimeout(waiter.timer);
    waiter.resolve({ status: 'canceled', errorReason: 'Forward canceled' });
  });
  forwardResultCache.clear();
  forwardResultWaiters.clear();
  forwardLateResultWaiters.clear();
  activeForwardMids.clear();
  forwardStatusIm = im;
  if (forwardStatusIm) forwardStatusIm.on('onSendingMessageStatusChanged', forwardStatusListener);
};

const waitForwardResult = (mid) => {
  const key = `${mid}`;
  const cached = forwardResultCache.get(key);
  if (cached) {
    forwardResultCache.delete(key);
    activeForwardMids.delete(key);
    return Promise.resolve(cached);
  }
  let resolveLateResult;
  const lateResult = new Promise((resolve) => {
    resolveLateResult = resolve;
  });
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      forwardResultWaiters.delete(key);
      const lateTimer = setTimeout(() => {
        forwardLateResultWaiters.delete(key);
        activeForwardMids.delete(key);
        resolveLateResult({ status: 'unknown', mid, errorReason: 'Forward status unknown' });
      }, FORWARD_LATE_RESULT_TIMEOUT);
      forwardLateResultWaiters.set(key, { resolve: resolveLateResult, timer: lateTimer });
      resolve({ status: 'unknown', mid, errorReason: 'Forward status unknown', lateResult });
    }, FORWARD_RESULT_TIMEOUT);
    forwardResultWaiters.set(key, { resolve, timer });
  });
};

const cancelForwardWaiters = () => {
  forwardResultWaiters.forEach((waiter) => {
    clearTimeout(waiter.timer);
    waiter.resolve({ status: 'canceled', errorReason: 'Forward canceled' });
  });
  forwardLateResultWaiters.forEach((waiter) => {
    clearTimeout(waiter.timer);
    waiter.resolve({ status: 'canceled', errorReason: 'Forward canceled' });
  });
  forwardResultWaiters.clear();
  forwardLateResultWaiters.clear();
  activeForwardMids.clear();
  forwardResultCache.clear();
};

const sendForwardAndWait = (im, message) => {
  ensureForwardStatusListener(im);
  capturingForwardResult = true;
  let mid;
  try {
    mid = im.sysManage.forwardMessage(message);
  } finally {
    capturingForwardResult = false;
  }
  activeForwardMids.add(`${mid}`);
  return waitForwardResult(mid);
};

const state = {
  rosterList: [],
  groupList: [],
  forwardMessage: null,
  multiForwardMessages: [],
  forwardStage: 'idle',
  showMultiForwardStatus: false,
  showForwardList: false,
  messageForwardMaxUserNum: 1,
  messageForwardMaxMessageNum: 1,
  forwardOperationId: 0
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
  },

  beginForwardOperation(state) {
    state.forwardOperationId += 1;
  }
};

const actions = {
  actionSyncForwardConfig(context) {
    const { rootState } = context;
    const appConfig = rootState.im.sysManage.getAppConfig(rootState.im.userManage.getAppid());
    if (!appConfig) return;
    if (Object.prototype.hasOwnProperty.call(appConfig, 'message_forward_max_user_num')) {
      context.commit('setMessageForwardMaxUserNum', appConfig.message_forward_max_user_num);
    }
    if (Object.prototype.hasOwnProperty.call(appConfig, 'message_forward_max_message_num')) {
      context.commit('setMessageForwardMaxMessageNum', appConfig.message_forward_max_message_num);
    }
  },

  actionSyncForwardGroupList(context, groups) {
    const { rootState } = context;
    const groupList = Array.isArray(groups) ? groups : rootState.im.groupManage.getGroupInfoList() || [];
    const allGroupMaps = rootState.im.groupManage.getAllGroupDetail() || {};
    const missingGroupIds = [];
    const retObj = groupList
      .map((group) => {
        const groupInfo = group && typeof group === 'object' ? group : {};
        const groupId = groupInfo.group_id || group;
        if (!groupId) return null;
        const cachedGroupInfo = allGroupMaps[groupId] || allGroupMaps[Number(groupId)] || {};
        const name = groupInfo.name || cachedGroupInfo.name;
        const avatar = groupInfo.avatar || cachedGroupInfo.avatar;
        if (!name) missingGroupIds.push(groupId);
        return {
          name: name || groupId,
          id: groupId,
          avatar: rootState.im.sysManage.getImage({
            avatar,
            type: 'group'
          })
        };
      })
      .filter(Boolean);
    context.commit('setGroupList', retObj);
    return Array.from(new Set(missingGroupIds));
  },

  actionLoadForwardGroupList(context) {
    const { rootState } = context;
    return rootState.im.groupManage
      .asyncGetJoinedGroups()
      .then((groups) => {
        return context.dispatch('actionSyncForwardGroupList', groups || []).then((missingGroupIds) => {
          if (!missingGroupIds.length) return;
          const batches = [];
          for (let index = 0; index < missingGroupIds.length; index += FORWARD_GROUP_INFO_BATCH_SIZE) {
            batches.push(missingGroupIds.slice(index, index + FORWARD_GROUP_INFO_BATCH_SIZE));
          }
          const loadBatch = (batch, retries = 1) => {
            return rootState.im.groupManage
              .asyncGetGroupListDetail(batch)
              .then(() => {
                return context.dispatch('actionSyncForwardGroupList');
              })
              .catch((error) => {
                if (retries > 0) {
                  console.warn('Retry forward group details batch:', batch, error);
                  return loadBatch(batch, retries - 1);
                }
                console.warn('Failed to load forward group details batch:', batch, error);
              });
          };
          return batches.reduce((request, batch) => {
            return request.then(() => loadBatch(batch));
          }, Promise.resolve());
        });
      })
      .catch((error) => {
        console.warn('Failed to load forward group details:', error);
      });
  },

  actionGetForwardList(context) {
    const { rootState, state } = context;
    context.dispatch('actionSyncForwardConfig');

    if (!state.rosterList.length) {
      rootState.im.rosterManage.asyncGetRosterIdList().then((res) => {
        return rootState.im.rosterManage.asnycGetRosterListDetailByIds(res).then(() => {
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
    }

    return context.dispatch('actionLoadForwardGroupList');
  },

  actionRecordForwardMessage(context, x) {
    cancelForwardWaiters();
    context.commit('beginForwardOperation');
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
    return sendForwardAndWait(rootState.im, fmsg);
  },

  actionBeginMultiForwardSelection(context) {
    cancelForwardWaiters();
    context.commit('beginForwardOperation');
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
    cancelForwardWaiters();
    context.commit('beginForwardOperation');
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
    return context.dispatch('actionForwardMessage', param);
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
    const operationId = state.forwardOperationId;
    const { type, id: xid, sentMessageIds = [] } = param; //type: group, roster; id: uid,gid
    const sentIds = new Set(sentMessageIds.map((id) => `${id}`));
    const messages = state.multiForwardMessages.filter((message) => !sentIds.has(`${message.id}`));
    const buildBatchResult = (results = []) => {
      const firstUnknown = results.find((result) => result && result.status === 'unknown');
      const firstFailure = results.find((result) => result && result.status === 'failed');
      const firstCanceled = results.find((result) => result && result.status === 'canceled');
      const result = firstUnknown || firstFailure || firstCanceled;
      return {
        status: sentIds.size === state.multiForwardMessages.length ? 'sent' : (result && result.status) || 'unknown',
        sentMessageIds: Array.from(sentIds),
        errorReason: result && result.errorReason
      };
    };

    if (state.forwardStage !== 'routing' || state.forwardOperationId !== operationId) {
      return Promise.resolve(buildBatchResult([{ status: 'canceled', errorReason: 'Forward canceled' }]));
    }

    // Keep the legacy 100ms dispatch spacing, but register the whole batch up front.
    // Once submitted, returning from the panel must not cancel messages that have not fired yet.
    const sendResults = messages.map(
      (message, index) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const fmsg = {};
            if (type === 'roster') {
              fmsg.uid = xid;
            } else {
              fmsg.gid = xid;
            }
            fmsg.message = message;
            let resultPromise;
            try {
              resultPromise = sendForwardAndWait(rootState.im, fmsg);
            } catch (error) {
              resultPromise = Promise.resolve({ status: 'failed', errorReason: error && error.message });
            }
            resolve(
              resultPromise.then((result) => {
                if (result.status === 'sent') sentIds.add(`${message.id}`);
                return { message, result };
              })
            );
          }, (index + 1) * 100);
        })
    );

    return Promise.all(sendResults).then((entries) => {
      const results = entries.map(({ result }) => result);
      const batchResult = buildBatchResult(results);
      const hasLateResult = results.some((result) => result && result.lateResult);
      if (hasLateResult) {
        batchResult.lateResult = Promise.all(
          results.map((result, index) => {
            if (!result || !result.lateResult) return result;
            return result.lateResult.then((lateStatus) => {
              if (lateStatus.status === 'sent') sentIds.add(`${entries[index].message.id}`);
              return lateStatus;
            });
          })
        ).then(buildBatchResult);
      }
      return batchResult;
    });
  },

  actionFinishForward(context) {
    cancelForwardWaiters();
    context.commit('beginForwardOperation');
    context.commit('setForwardStage', 'idle');
    context.commit('setForwardMessage', null);
    context.commit('setMultiForwardMessages', []);
  },

  actionCancelForward(context) {
    cancelForwardWaiters();
    context.commit('beginForwardOperation');
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
