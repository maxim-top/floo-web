//collection.js
import { t } from '../../i18n';
import { clearCachedGroupAvatar, getCachedGroupAvatar, refreshCachedGroupAvatar, withDisplayGroupAvatar } from '../utils/groupAvatar';

const state = {
  rosterList: [],
  groupList: [],
  conversationList: [],
  contactStatus: 'contact',
  callInviteInfo: null,
  callId: '',
  pickupTime: 0,
  searchKeyword: '',
  totalUnread: '',
  conversationScroll: 0,
  skipAutoSelectOnce: false,
  skipConversationAutoSelectOnce: false
};

const contactRequestFlag = {
  rosterList: false,
  groupList: false
};
const GROUP_INFO_BATCH_SIZE = 12;
const GROUP_MEMBER_BATCH_SIZE = 6;
const GROUP_INFO_REQUEST_INTERVAL = 800;
const GROUP_MEMBER_REQUEST_INTERVAL = 1000;
const CONVERSATION_LIST_REFRESH_INTERVAL = 1000;
const CONVERSATION_PREVIEW_BATCH_SIZE = 10;
const CONVERSATION_PREVIEW_BATCH_INTERVAL = 16;
const groupInfoRequestFlag = {};
const groupMemberRequestFlag = {};
const groupAvatarRefreshTasks = {};
let groupInfoQueue = [];
let groupMemberQueue = [];
let groupInfoQueueTimer = null;
let groupMemberQueueTimer = null;
let groupInfoQueueRunning = false;
let groupMemberQueueRunning = false;
let pendingGroupListRefresh = false;
let pendingConversationListRefresh = false;
let conversationListRefreshTimer = null;
let conversationListLastRefreshedAt = 0;
let pendingConversationListContext = null;
let pendingConversationListImmediate = false;
let conversationListInteractionActive = false;
let conversationListUserActive = false;
let recentPreviewCache = new Map();
let recentPreviewCandidates = new Map();
let queuedRecentPreviewKeys = new Set();
let recentPreviewQueue = [];
let recentPreviewQueueTimer = null;
let conversationRosterInfoRequested = false;

const sameConversation = (a, b) => {
  if (!a || !b) return false;
  return (
    a.type === b.type &&
    `${a.sid}` === `${b.sid}` &&
    a.name === b.name &&
    a.content === b.content &&
    `${a.timestamp || ''}` === `${b.timestamp || ''}` &&
    a.avatar === b.avatar &&
    a.unread === b.unread &&
    a.muted === b.muted &&
    a.hasAt === b.hasAt &&
    a.isDraft === b.isDraft
  );
};

const resetConversationListRefresh = () => {
  if (conversationListRefreshTimer) {
    clearTimeout(conversationListRefreshTimer);
    conversationListRefreshTimer = null;
  }
  conversationListLastRefreshedAt = 0;
  pendingConversationListContext = null;
  pendingConversationListImmediate = false;
};

const scheduleConversationListRefresh = (context, immediate = false) => {
  pendingConversationListContext = context;
  pendingConversationListImmediate = pendingConversationListImmediate || immediate;
  if (conversationListInteractionActive) return;
  const shouldRefreshImmediately = pendingConversationListImmediate;
  if (!shouldRefreshImmediately && conversationListUserActive) return;
  const now = Date.now();
  const elapsed = now - conversationListLastRefreshedAt;
  const refresh = () => {
    if (conversationListInteractionActive || (!shouldRefreshImmediately && conversationListUserActive)) {
      conversationListRefreshTimer = null;
      return;
    }
    const refreshContext = pendingConversationListContext;
    conversationListRefreshTimer = null;
    pendingConversationListContext = null;
    pendingConversationListImmediate = false;
    conversationListLastRefreshedAt = Date.now();
    if (refreshContext) {
      refreshContext.dispatch('actionGetConversationListInternal');
    }
  };

  if (shouldRefreshImmediately) {
    if (conversationListRefreshTimer) {
      clearTimeout(conversationListRefreshTimer);
      conversationListRefreshTimer = null;
    }
    refresh();
    return;
  }

  if (!conversationListLastRefreshedAt || elapsed >= CONVERSATION_LIST_REFRESH_INTERVAL) {
    if (conversationListRefreshTimer) {
      clearTimeout(conversationListRefreshTimer);
    }
    refresh();
    return;
  }

  if (!conversationListRefreshTimer) {
    conversationListRefreshTimer = setTimeout(refresh, CONVERSATION_LIST_REFRESH_INTERVAL - elapsed);
  }
};

const resetGroupDetailFetchState = () => {
  Object.keys(groupInfoRequestFlag).forEach((key) => {
    delete groupInfoRequestFlag[key];
  });
  Object.keys(groupMemberRequestFlag).forEach((key) => {
    delete groupMemberRequestFlag[key];
  });
  Object.keys(groupAvatarRefreshTasks).forEach((key) => {
    delete groupAvatarRefreshTasks[key];
  });
  groupInfoQueue = [];
  groupMemberQueue = [];
  pendingGroupListRefresh = false;
  pendingConversationListRefresh = false;
  if (groupInfoQueueTimer) {
    clearTimeout(groupInfoQueueTimer);
    groupInfoQueueTimer = null;
  }
  if (groupMemberQueueTimer) {
    clearTimeout(groupMemberQueueTimer);
    groupMemberQueueTimer = null;
  }
  groupInfoQueueRunning = false;
  groupMemberQueueRunning = false;
  if (recentPreviewQueueTimer) {
    clearTimeout(recentPreviewQueueTimer);
    recentPreviewQueueTimer = null;
  }
  recentPreviewCache = new Map();
  recentPreviewCandidates = new Map();
  queuedRecentPreviewKeys = new Set();
  recentPreviewQueue = [];
  conversationListInteractionActive = false;
  conversationListUserActive = false;
  conversationRosterInfoRequested = false;
  resetConversationListRefresh();
};

const getGroupId = (group = {}) => {
  if (group && typeof group === 'object') {
    return group.group_id || group.id || '';
  }
  return group || '';
};

const getMissingGroupInfoIds = (context, groups = []) => {
  const allGroupMap = context.rootState.im.groupManage.getAllGroupDetail() || {};
  return groups
    .map((group) => {
      const groupId = `${getGroupId(group)}`;
      if (!groupId || groupInfoRequestFlag[groupId]) {
        return '';
      }
      const localGroup = allGroupMap[groupId] || allGroupMap[Number(groupId)] || {};
      const currentGroup = group && typeof group === 'object' ? group : {};
      if (localGroup.name || currentGroup.name) {
        return '';
      }
      return groupId;
    })
    .filter(Boolean);
};

const buildDisplayGroupList = (context, groups = []) => {
  const { rootState } = context;
  return groups.map((group) => {
    const sgroup = Object.assign({}, group, {
      avatar: group.avatar || getCachedGroupAvatar(rootState.im, group.group_id) || ''
    });
    const unreadCount = rootState.im.groupManage.getUnreadCount(sgroup.group_id);
    sgroup.avatar = rootState.im.sysManage.getImage({
      avatar: sgroup.avatar,
      type: 'group'
    });
    return Object.assign(
      {
        unreadCount
      },
      sgroup
    );
  });
};

const refreshVisibleGroupAvatars = (context, groups = []) => {
  const allGroupMap = context.rootState.im.groupManage.getAllGroupDetail() || {};
  groups.forEach((group) => {
    const groupId = `${getGroupId(group)}`;
    if (!groupId) {
      return;
    }
    const localGroup = allGroupMap[groupId] || allGroupMap[Number(groupId)] || {};
    if (localGroup.avatar || getCachedGroupAvatar(context.rootState.im, groupId)) {
      return;
    }
    const members = context.rootState.im.groupManage.getGroupMembers(groupId) || [];
    if (!members.length) {
      return;
    }
    context.dispatch('actionRefreshGroupAvatar', groupId);
  });
};

const getMissingGroupMemberIds = (context, groups = []) => {
  const allGroupMap = context.rootState.im.groupManage.getAllGroupDetail() || {};
  return groups
    .map((group) => {
      const groupId = `${getGroupId(group)}`;
      if (!groupId || groupMemberRequestFlag[groupId]) {
        return '';
      }
      const localGroup = allGroupMap[groupId] || allGroupMap[Number(groupId)] || {};
      if (localGroup.avatar) {
        return '';
      }
      const members = context.rootState.im.groupManage.getGroupMembers(groupId) || [];
      // Scrolling lists can rely on cached members/avatar composition.
      // Entering a group detail still refreshes members through openGroup().
      if (members.length) {
        return '';
      }
      return groupId;
    })
    .filter(Boolean);
};

const enqueueGroupIds = (queue = [], groupIds = []) => {
  const queueSet = new Set(queue);
  groupIds.forEach((groupId) => {
    if (groupId && !queueSet.has(groupId)) {
      queue.push(groupId);
      queueSet.add(groupId);
    }
  });
  return queue;
};

const scheduleGroupInfoQueue = (context) => {
  if (groupInfoQueueRunning || groupInfoQueueTimer || !groupInfoQueue.length) {
    return;
  }
  groupInfoQueueTimer = setTimeout(() => {
    groupInfoQueueTimer = null;
    processGroupInfoQueue(context);
  }, GROUP_INFO_REQUEST_INTERVAL);
};

const scheduleGroupMemberQueue = (context) => {
  if (groupMemberQueueRunning || groupMemberQueueTimer || !groupMemberQueue.length) {
    return;
  }
  groupMemberQueueTimer = setTimeout(() => {
    groupMemberQueueTimer = null;
    processGroupMemberQueue(context);
  }, GROUP_MEMBER_REQUEST_INTERVAL);
};

const processGroupInfoQueue = (context) => {
  if (groupInfoQueueRunning || !groupInfoQueue.length) {
    return Promise.resolve([]);
  }
  const missingGroupIds = groupInfoQueue.splice(0, GROUP_INFO_BATCH_SIZE);
  groupInfoQueueRunning = true;
  missingGroupIds.forEach((groupId) => {
    groupInfoRequestFlag[groupId] = true;
  });
  return context.rootState.im.groupManage
    .asyncGetGroupListDetail(missingGroupIds)
    .then((res) => {
      const headerStatus = context.rootGetters['header/getHeaderStatus'];
      if (pendingGroupListRefresh && headerStatus === 'contact') {
        const localGroups = context.rootState.im.groupManage.getGroupInfoList() || [];
        context.commit('setGroupList', buildDisplayGroupList(context, localGroups));
        pendingGroupListRefresh = false;
      }
      if (pendingConversationListRefresh && headerStatus === 'conversation') {
        context.dispatch('actionGetConversationList', {
          skipMissingGroupInfoRequest: true
        });
        pendingConversationListRefresh = false;
      }
      return res;
    })
    .catch((err) => {
      return Promise.reject(err);
    })
    .finally(() => {
      missingGroupIds.forEach((groupId) => {
        delete groupInfoRequestFlag[groupId];
      });
      groupInfoQueueRunning = false;
      scheduleGroupInfoQueue(context);
    });
};

const processGroupMemberQueue = (context) => {
  if (groupMemberQueueRunning || !groupMemberQueue.length) {
    return Promise.resolve([]);
  }
  const missingGroupIds = groupMemberQueue.splice(0, GROUP_MEMBER_BATCH_SIZE);
  groupMemberQueueRunning = true;
  missingGroupIds.forEach((groupId) => {
    groupMemberRequestFlag[groupId] = true;
  });
  return Promise.all(
    missingGroupIds.map((groupId) => {
      return context.rootState.im.groupManage
        .asyncGetGroupMembers(groupId)
        .then((members) => ({
          groupId,
          members,
          success: true
        }))
        .catch(() => ({
          groupId,
          members: [],
          success: false
        }));
    })
  )
    .then((res) => {
      res.forEach(({ groupId, success }) => {
        if (!success) {
          return;
        }
        context.dispatch('actionRefreshGroupAvatar', groupId);
      });
      return res;
    })
    .finally(() => {
      missingGroupIds.forEach((groupId) => {
        delete groupMemberRequestFlag[groupId];
      });
      groupMemberQueueRunning = false;
      scheduleGroupMemberQueue(context);
    });
};

const requestMissingGroupInfos = (context, groups = [], options = {}) => {
  const missingGroupIds = Array.from(new Set(getMissingGroupInfoIds(context, groups)));
  if (!missingGroupIds.length) {
    return Promise.resolve([]);
  }
  if (options.refreshGroupList) {
    pendingGroupListRefresh = true;
  }
  if (options.refreshConversationList) {
    pendingConversationListRefresh = true;
  }
  enqueueGroupIds(groupInfoQueue, missingGroupIds);
  scheduleGroupInfoQueue(context);
  return Promise.resolve(missingGroupIds);
};

const requestMissingGroupMembers = (context, groups = []) => {
  const missingGroupIds = Array.from(new Set(getMissingGroupMemberIds(context, groups)));
  if (!missingGroupIds.length) {
    return Promise.resolve([]);
  }
  enqueueGroupIds(groupMemberQueue, missingGroupIds);
  scheduleGroupMemberQueue(context);
  return Promise.resolve(missingGroupIds);
};

const withConversationGroupAvatar = (context, group) => {
  return withDisplayGroupAvatar(context.rootState.im, group, {
    onUpdate: ({ group_id, avatar } = {}) => {
      const displayAvatar = context.rootState.im.sysManage.getImage({
        avatar,
        type: 'group'
      });
      context.commit('updateConversationAvatar', {
        sid: group_id,
        avatar: displayAvatar
      });
    }
  });
};

const withListGroupAvatar = (context, group) => {
  return withDisplayGroupAvatar(context.rootState.im, group, {
    onUpdate: ({ group_id, avatar } = {}) => {
      const displayAvatar = context.rootState.im.sysManage.getImage({
        avatar,
        type: 'group'
      });
      context.commit('updateGroupListAvatar', {
        sid: group_id,
        avatar: displayAvatar
      });
    }
  });
};

const needsRecentPreview = (item) => {
  const draft = typeof item.draft === 'string' ? item.draft : '';
  const hasDraft = !!draft.trim();
  return (!hasDraft && !item.content) || (!hasDraft && !item.timestamp) || (hasDraft && !item.draftTimestamp && !item.timestamp);
};

const recentPreviewKey = (item) => `${item.type}:${item.id}`;

const deriveRecentPreviewFromMessage = (message) => {
  if (!message) {
    return {
      content: '',
      timestamp: ''
    };
  }

  const { type, attach, timestamp } = message;
  let content = message.content || '';
  if (!content && !attach) {
    return {
      content: '',
      timestamp: timestamp || ''
    };
  }

  if (type !== 'text' && type !== 'rtc') {
    content = type;
  }

  return {
    content,
    timestamp: timestamp || ''
  };
};

const scheduleRecentPreviewQueue = () => {
  if (conversationListInteractionActive || conversationListUserActive || recentPreviewQueueTimer || !recentPreviewQueue.length) return;
  recentPreviewQueueTimer = setTimeout(() => {
    recentPreviewQueueTimer = null;
    if (conversationListInteractionActive || conversationListUserActive) return;
    const batch = recentPreviewQueue.splice(0, CONVERSATION_PREVIEW_BATCH_SIZE);
    let refreshContext = null;
    batch.forEach(({ context, item, key }) => {
      queuedRecentPreviewKeys.delete(key);
      if (!needsRecentPreview(item) || recentPreviewCache.has(key)) return;
      const id = item.id;
      const rootState = context.rootState;
      const messages = item.type === 'roster' ? rootState.im.rosterManage.getRosterMessageByRid(id) : rootState.im.groupManage.getGruopMessage(id);
      recentPreviewCache.set(key, deriveRecentPreviewFromMessage(messages && messages.length ? messages[messages.length - 1] : null));
      recentPreviewCandidates.delete(key);
      refreshContext = context;
    });
    if (refreshContext) refreshContext.dispatch('actionGetConversationList');
    scheduleRecentPreviewQueue();
  }, CONVERSATION_PREVIEW_BATCH_INTERVAL);
};

const enqueueRecentPreview = (context, item) => {
  const key = recentPreviewKey(item);
  if (recentPreviewCache.has(key) || queuedRecentPreviewKeys.has(key)) return;
  queuedRecentPreviewKeys.add(key);
  recentPreviewQueue.push({ context, item, key });
  scheduleRecentPreviewQueue();
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
  },

  getConversationScroll(state) {
    return state.conversationScroll || 0;
  },

  getSkipAutoSelectOnce(state) {
    return state.skipAutoSelectOnce;
  },

  getSkipConversationAutoSelectOnce(state) {
    return state.skipConversationAutoSelectOnce;
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

  updateConversationAvatar(state, payload = {}) {
    const sid = `${payload.sid || ''}`;
    const avatar = payload.avatar || '';
    state.conversationList = (state.conversationList || []).map((item) => {
      if (item.type !== 'group' || `${item.sid}` !== sid) {
        return item;
      }
      return Object.assign({}, item, {
        avatar
      });
    });
  },

  updateGroupListAvatar(state, payload = {}) {
    const sid = `${payload.sid || ''}`;
    const avatar = payload.avatar || '';
    state.groupList = (state.groupList || []).map((item) => {
      if (`${item.group_id}` !== sid) {
        return item;
      }
      return Object.assign({}, item, {
        avatar
      });
    });
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
  },

  setConversationScroll(state, x) {
    state.conversationScroll = x;
  },

  setSkipAutoSelectOnce(state, x) {
    state.skipAutoSelectOnce = x;
  },

  setSkipConversationAutoSelectOnce(state, x) {
    state.skipConversationAutoSelectOnce = x;
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
  actionSyncGroupList(context) {
    const groups = context.rootState.im.groupManage.getGroupInfoList() || [];
    context.commit('setGroupList', buildDisplayGroupList(context, groups));
  },
  actionEnsureVisibleGroupData(context, groups = []) {
    refreshVisibleGroupAvatars(context, groups);
    requestMissingGroupInfos(context, groups, {
      refreshGroupList: true
    }).catch(() => {});
    requestMissingGroupMembers(context, groups).catch(() => {});
  },
  actionEnsureVisibleConversationGroupData(context, groups = []) {
    refreshVisibleGroupAvatars(context, groups);
    requestMissingGroupInfos(context, groups, {
      refreshConversationList: true
    }).catch(() => {});
    requestMissingGroupMembers(context, groups).catch(() => {});
  },
  actionEnsureConversationPreviews(context, conversations = []) {
    const visibleKeys = new Set(conversations.map((conversation) => `${conversation.type}:${conversation.sid}`));
    if (!context.state.searchKeyword && recentPreviewQueue.length) {
      recentPreviewQueue = recentPreviewQueue.filter((item) => visibleKeys.has(item.key));
      queuedRecentPreviewKeys = new Set(recentPreviewQueue.map((item) => item.key));
    }
    conversations.forEach((conversation) => {
      const key = `${conversation.type}:${conversation.sid}`;
      const item = recentPreviewCandidates.get(key);
      if (item) enqueueRecentPreview(context, item);
    });
    scheduleRecentPreviewQueue();
  },
  actionEnsureAllConversationPreviews(context) {
    recentPreviewCandidates.forEach((item) => enqueueRecentPreview(context, item));
    scheduleRecentPreviewQueue();
  },

  actionSetContactStatus(context, x) {
    context.commit('setContactStatus', x);
  },

  actionResetGroupAvatarFetchState() {
    resetGroupDetailFetchState();
  },

  actionRefreshGroupAvatar(context, groupId) {
    const { rootState } = context;
    if (!groupId && groupId !== 0) {
      return Promise.resolve();
    }
    const groupKey = `${groupId}`;
    if (groupAvatarRefreshTasks[groupKey]) {
      return groupAvatarRefreshTasks[groupKey];
    }
    const groupMap = rootState.im.groupManage.getAllGroupDetail() || {};
    const group = groupMap[groupId] || groupMap[`${groupId}`] || {};
    if (!group.group_id) {
      return Promise.resolve();
    }
    const updateGroupAvatar = (avatar) => {
      const displayAvatar = rootState.im.sysManage.getImage({
        avatar,
        type: 'group'
      });
      context.commit('updateGroupListAvatar', {
        sid: groupId,
        avatar: displayAvatar
      });
      context.commit('updateConversationAvatar', {
        sid: groupId,
        avatar: displayAvatar
      });
    };
    if (group.avatar) {
      clearCachedGroupAvatar(rootState.im, groupId);
      updateGroupAvatar(group.avatar);
      return Promise.resolve(group.avatar);
    }
    const members = rootState.im.groupManage.getGroupMembers(groupId) || [];
    groupAvatarRefreshTasks[groupKey] = refreshCachedGroupAvatar(rootState.im, groupId, members)
      .then(({ avatar }) => {
        updateGroupAvatar(avatar || '');
        return avatar || '';
      })
      .finally(() => {
        delete groupAvatarRefreshTasks[groupKey];
      });
    return groupAvatarRefreshTasks[groupKey];
  },

  actionGetConversationList(context, options = {}) {
    scheduleConversationListRefresh(context, !!options && options.immediate === true);
  },

  actionSetConversationListInteractionActive(context, active) {
    const nextActive = !!active;
    if (conversationListInteractionActive === nextActive) return;
    conversationListInteractionActive = nextActive;
    if (nextActive) {
      if (conversationListRefreshTimer) {
        clearTimeout(conversationListRefreshTimer);
        conversationListRefreshTimer = null;
      }
      if (recentPreviewQueueTimer) {
        clearTimeout(recentPreviewQueueTimer);
        recentPreviewQueueTimer = null;
      }
      return;
    }
    if (pendingConversationListContext) {
      scheduleConversationListRefresh(pendingConversationListContext, pendingConversationListImmediate);
    }
    scheduleRecentPreviewQueue();
  },

  actionSetConversationListUserActive(context, active) {
    const nextActive = !!active;
    if (conversationListUserActive === nextActive) return;
    conversationListUserActive = nextActive;
    if (nextActive) {
      if (conversationListRefreshTimer) {
        clearTimeout(conversationListRefreshTimer);
        conversationListRefreshTimer = null;
      }
      if (recentPreviewQueueTimer) {
        clearTimeout(recentPreviewQueueTimer);
        recentPreviewQueueTimer = null;
      }
      return;
    }
    if (pendingConversationListContext) {
      scheduleConversationListRefresh(pendingConversationListContext, pendingConversationListImmediate);
    }
    scheduleRecentPreviewQueue();
  },

  actionGetConversationListInternal(context) {
    const { rootState, state } = context;
    const convlist = rootState.im.userManage.getConversationList({
      requestRosterInfo: !conversationRosterInfoRequested
    });
    conversationRosterInfoRequested = true;
    const allGroupMap = rootState.im.groupManage.getAllGroupDetail();
    const allRosterMap = rootState.im.rosterManage.getAllRosterDetail() || {};
    let totalUnreadCount = 0;
    const livePreviewKeys = new Set(convlist.map(recentPreviewKey));
    Array.from(recentPreviewCache.keys()).forEach((key) => {
      if (!livePreviewKeys.has(key)) recentPreviewCache.delete(key);
    });
    Array.from(recentPreviewCandidates.keys()).forEach((key) => {
      if (!livePreviewKeys.has(key)) recentPreviewCandidates.delete(key);
    });
    if (recentPreviewQueue.length) {
      recentPreviewQueue = recentPreviewQueue.filter((item) => livePreviewKeys.has(item.key));
      queuedRecentPreviewKeys = new Set(recentPreviewQueue.map((item) => item.key));
    }
    const previousBySid = new Map((state.conversationList || []).map((conversation) => [`${conversation.sid}`, conversation]));
    const convData = convlist.map((item) => {
      let name;
      const id = item.id;
      const draft = typeof item.draft === 'string' ? item.draft : '';
      const hasDraft = !!draft.trim();
      const needsFallbackContent = !hasDraft && !item.content;
      const needsFallbackTimestamp = (!hasDraft && !item.timestamp) || (hasDraft && !item.draftTimestamp && !item.timestamp);
      let fallbackPreview = {
        content: '',
        timestamp: ''
      };
      if (needsFallbackContent || needsFallbackTimestamp) {
        const previewKey = recentPreviewKey(item);
        fallbackPreview = recentPreviewCache.get(previewKey);
        if (!fallbackPreview) {
          recentPreviewCandidates.set(previewKey, item);
          fallbackPreview = {
            content: '',
            timestamp: ''
          };
        } else {
          recentPreviewCandidates.delete(previewKey);
        }
      } else {
        recentPreviewCandidates.delete(recentPreviewKey(item));
      }
      const content = hasDraft ? draft : item.content || fallbackPreview.content;
      const timestamp = hasDraft ? item.draftTimestamp || item.timestamp || fallbackPreview.timestamp : item.timestamp || fallbackPreview.timestamp;
      const hasAt = item.hasAt;
      // const img = allRosterMap[id] && allRosterMap[id].avatar;
      let avatar = ''; //(img && this.client.signatureUrl(img, { expires: 600, process: 'image/resize,w_50' })) || '/image/roster.png';
      const unreadCount = item.type == 'roster' ? rootState.im.rosterManage.getUnreadCount(id) : rootState.im.groupManage.getUnreadCount(id);
      const unread = unreadCount > 0 ? unreadCount : 0;
      const rosterInfo = allRosterMap[id] || {};
      const groupInfo = allGroupMap[id] || {};
      const muted = item.type === 'roster' ? Number(id) !== 0 && rosterInfo.mute_notification === true : Number(groupInfo.msg_mute_mode || 0) !== 0;
      if (!muted) {
        totalUnreadCount += unread;
      }
      if (item.type === 'roster') {
        //roster
        if (Number(id) === 0) {
          name = t('系统通知');
          avatar = '/image/setting.png';
        } else {
          name = rosterInfo.alias || rosterInfo.nick_name || rosterInfo.username || id;
          avatar = rosterInfo.avatar;
        }
      } else if (item.type === 'group') {
        //group
        const sgroup = withConversationGroupAvatar(context, Object.assign({ group_id: id }, groupInfo));
        name = sgroup.name || id;
        avatar = sgroup.avatar;
      }
      avatar = rootState.im.sysManage.getImage({
        avatar,
        type: item.type === 'roster' ? 'roster' : 'group'
      });
      const conversation = {
        type: item.type,
        name,
        content,
        timestamp,
        avatar,
        unread,
        muted,
        hasAt,
        isDraft: hasDraft,
        sid: id
      };
      const previous = previousBySid.get(`${id}`);
      return sameConversation(previous, conversation) ? previous : conversation;
    });
    if (state.searchKeyword) {
      recentPreviewCandidates.forEach((item) => enqueueRecentPreview(context, item));
    }

    const sortedConvList = convData.sort((a, b) => {
      const aTimestamp = Number(a.timestamp || 0);
      const bTimestamp = Number(b.timestamp || 0);
      return aTimestamp < bTimestamp ? 1 : aTimestamp > bTimestamp ? -1 : 0;
    });
    const listChanged = sortedConvList.length !== state.conversationList.length || sortedConvList.some((conversation, index) => conversation !== state.conversationList[index]);
    if (listChanged) context.commit('saveConversationList', sortedConvList);
    const totalUnread = totalUnreadCount > 99 ? '99+' : totalUnreadCount > 0 ? totalUnreadCount.toString() : '';
    if (totalUnread !== state.totalUnread) context.commit('setTotalUnread', totalUnread);
  },

  actionOpenConversation(context, conversation) {
    if (!conversation) return;
    const { rootState } = context;
    context.dispatch('header/actionChangeHeaderStatus', 'conversation', { root: true });
    context.dispatch(
      'content/actionSetType',
      {
        sid: conversation.sid,
        type: conversation.type === 'group' ? 'groupchat' : 'rosterchat'
      },
      { root: true }
    );
    window.localStorage.setItem('lastActiveChat', conversation.sid);
    if (conversation.type === 'group' && conversation.hasAt) {
      rootState.im.groupManage.consumeGroupAtStatus(conversation.sid);
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
      contactRequestFlag.groupList = true;
      rootState.im.groupManage
        .asyncGetJoinedGroups()
        .then((res) => {
          if (res && res.length) {
            return res;
          }
          return rootState.im.groupManage.asyncGetJoinedGroups(true);
        })
        .then((res) => {
          const retObj = buildDisplayGroupList(context, res);
          context.commit('setGroupList', retObj);
        })
        .finally(() => {
          contactRequestFlag.groupList = false;
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
  },
  actionSetConversationScroll(context, scroll) {
    context.commit('setConversationScroll', scroll);
  },
  actionSetSkipAutoSelectOnce(context, x) {
    context.commit('setSkipAutoSelectOnce', x);
  },
  actionSetSkipConversationAutoSelectOnce(context, x) {
    context.commit('setSkipConversationAutoSelectOnce', x);
  }
};
export default {
  namespaced: true, //用于在全局引用此文件里的方法时标识这一个的文件名
  state,
  getters,
  mutations,
  actions
};
