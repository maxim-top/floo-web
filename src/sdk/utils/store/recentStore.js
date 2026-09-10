import { toLong, toNumber } from '../tools';
import { getItem, saveItem, removeItem } from './storeBase';
import { bind, fire } from '../cusEvent';
import infoStore from './infoStore';

const RECENT_STORE_FLUSH_INTERVAL = 1000;

let cacheOwner = '';
let recentList = null;
let recentById = new Map();
let recentOrder = new Map();
let recentOrderSequence = 0;
let orderDirty = false;
let storageDirty = false;
let draftDirty = false;
let persistTimer = null;
let notifyTimer = null;

const recentId = (id) => `${id}`;

const cloneRecentValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneRecentValue);
  if (!value || typeof value !== 'object') return value;
  if (typeof value.low !== 'undefined' && typeof value.high !== 'undefined') return toLong(value);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return Object.keys(value).reduce((result, key) => {
    result[key] = cloneRecentValue(value[key]);
    return result;
  }, {});
};

const cancelTimers = () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (notifyTimer) {
    clearTimeout(notifyTimer);
    notifyTimer = null;
  }
};

const resetCache = () => {
  cancelTimers();
  cacheOwner = `${infoStore.getUid() || ''}`;
  recentList = null;
  recentById = new Map();
  recentOrder = new Map();
  recentOrderSequence = 0;
  orderDirty = false;
  storageDirty = false;
  draftDirty = false;
};

const ensureCache = () => {
  const owner = `${infoStore.getUid() || ''}`;
  if (owner !== cacheOwner) {
    resetCache();
    cacheOwner = owner;
  }
  if (recentList) return;

  recentList = getItem('key_recent_store') || [];
  for (let index = recentList.length - 1; index >= 0; index--) {
    const item = recentList[index];
    const id = recentId(item.id);
    recentById.set(id, item);
    recentOrder.set(id, ++recentOrderSequence);
  }
};

const orderedRecents = () => {
  ensureCache();
  if (orderDirty) {
    recentList.sort((a, b) => (recentOrder.get(recentId(b.id)) || 0) - (recentOrder.get(recentId(a.id)) || 0));
    orderDirty = false;
  }
  return recentList;
};

const persistNow = () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!storageDirty || !recentList) return;
  saveItem('key_recent_store', orderedRecents());
  storageDirty = false;
  draftDirty = false;
};

const schedulePersist = () => {
  storageDirty = true;
  if (!persistTimer) {
    persistTimer = setTimeout(persistNow, RECENT_STORE_FLUSH_INTERVAL);
  }
};

const fireRecentListUpdate = () => {
  notifyTimer = null;
  fire('recentlistUpdate');
};

const scheduleRecentListUpdate = () => {
  if (!notifyTimer) {
    notifyTimer = setTimeout(fireRecentListUpdate, RECENT_STORE_FLUSH_INTERVAL);
  }
};

const touchOrder = (id) => {
  recentOrder.set(recentId(id), ++recentOrderSequence);
  orderDirty = true;
};

const addRecent = (item) => {
  recentList.push(item);
  recentById.set(recentId(item.id), item);
  touchOrder(item.id);
};

const normalizeDraftMention = (draft, draftMention = {}) => {
  if (!draft.trim()) {
    return {
      mentionAll: false,
      mentionList: [],
      tokens: []
    };
  }
  const tokens = Array.isArray(draftMention.tokens)
    ? draftMention.tokens
        .map((token) => {
          const type = token && token.type;
          const label = token && typeof token.label === 'string' ? token.label : '';
          const start = token && Number.isInteger(token.start) ? token.start : -1;
          const end = token && Number.isInteger(token.end) ? token.end : -1;
          const uid = type === 'member' && token.uid !== undefined && token.uid !== null ? `${token.uid}` : '';
          if ((type !== 'all' && type !== 'member') || !label || (type === 'member' && !uid) || start < 0 || end <= start || draft.slice(start, end) !== `@${label}`) {
            return null;
          }
          return type === 'member' ? { type, uid, label, start, end } : { type, label, start, end };
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start)
        .reduce((result, token) => {
          const previous = result[result.length - 1];
          if (!previous || token.start >= previous.end) result.push(token);
          return result;
        }, [])
    : [];
  const mentionList = [...new Set(tokens.filter((token) => token.type === 'member').map((token) => token.uid))];
  return {
    mentionAll: tokens.some((token) => token.type === 'all'),
    mentionList,
    tokens
  };
};

const markChanged = (notify = true) => {
  schedulePersist();
  if (notify) scheduleRecentListUpdate();
};

const checkTyping = (message) => {
  const { ext } = message;
  let status = {};
  try {
    status = JSON.parse(ext);
  } catch (ex) {
    // Non-JSON extensions are normal messages.
  }

  if (typeof status.input_status !== 'undefined') {
    return true;
  }
  return false;
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', persistNow);
}
// Preserve local-only drafts, but discard pending recent metadata that can be rebuilt after login.
bind('logout', () => {
  if (draftDirty) persistNow();
  resetCache();
});

const recentStore = {
  saveRecent: (meta, forceUpdate = false) => {
    if (checkTyping(meta)) return;
    const { from, to, type, toType, attach, config, ext, timestamp, isHistory } = meta;
    const isSystemMessage = meta && (meta.is_system === true || meta.is_system === 'true' || meta.is_system === 1 || meta.is_system === '1');
    const isSystemConversationMessage = isSystemMessage && toType === 'roster' && toNumber(from) === 0;
    if (isSystemMessage && !isSystemConversationMessage) return;
    let content = meta.content;
    if (!content && !attach) {
      if (ext && ext.typing) {
        fire('onInputStatusMessage', { from, to, ext });
      }
      return;
    }
    if (type != 'text' && type != 'rtc') content = type;
    if (type === 'rtc' && (!config || !config.action || config.action !== 'record')) return;

    let savedUid = toNumber(to);
    const uid = infoStore.getUid();
    if (savedUid === uid) savedUid = toNumber(from);

    let hasAt = false;
    if (toNumber(from) !== uid && config && (config.mentionAll === true || (config.mentionList && config.mentionList.indexOf(uid) >= 0)) && !isHistory) {
      hasAt = true;
    }

    ensureCache();
    const item = recentById.get(recentId(savedUid));
    if (item && item.hasAt === true) hasAt = true;
    if (item && !forceUpdate && toNumber(timestamp) <= toNumber(item.timestamp)) return;

    const next = {
      type: toType,
      id: savedUid,
      content,
      ext,
      timestamp,
      hasAt,
      draft: item ? item.draft || '' : '',
      draftTimestamp: item ? item.draftTimestamp || '' : ''
    };
    if (item) {
      Object.assign(item, next);
      touchOrder(savedUid);
    } else {
      addRecent(next);
    }
    markChanged();
  },

  saveUnreadRecent: (xids, type, forcedTimestamp = '') => {
    ensureCache();
    xids.forEach((xid) => {
      const item = recentById.get(recentId(xid));
      if (item) {
        if (forcedTimestamp) item.timestamp = forcedTimestamp;
        touchOrder(xid);
        return;
      }
      addRecent({
        type,
        id: xid,
        content: '',
        ext: {},
        timestamp: forcedTimestamp || '',
        hasAt: false,
        draft: '',
        draftTimestamp: '',
        draftMention: {
          mentionAll: false,
          mentionList: [],
          tokens: []
        }
      });
    });
    if (xids.length) markChanged();
  },

  saveDraft: (id, type, draft, forcedTimestamp = '', draftMention = {}) => {
    if (!type || typeof id === 'undefined' || id === null || id === '') return;
    ensureCache();
    const normalizedDraft = typeof draft === 'string' ? draft : '';
    const hasDraft = !!normalizedDraft.trim();
    const nextDraftTimestamp = hasDraft ? forcedTimestamp || Date.now() : '';
    const nextDraftMention = normalizeDraftMention(normalizedDraft, draftMention);
    let item = recentById.get(recentId(id));
    if (!item) {
      if (!hasDraft) return;
      item = {
        type,
        id,
        content: '',
        ext: {},
        timestamp: '',
        hasAt: false,
        draft: normalizedDraft,
        draftTimestamp: nextDraftTimestamp,
        draftMention: nextDraftMention
      };
      addRecent(item);
      draftDirty = true;
      markChanged();
      return;
    }
    const nextDraft = hasDraft ? normalizedDraft : '';
    const draftMentionUnchanged =
      item.draftMention &&
      item.draftMention.mentionAll === nextDraftMention.mentionAll &&
      JSON.stringify(item.draftMention.mentionList || []) === JSON.stringify(nextDraftMention.mentionList) &&
      JSON.stringify(item.draftMention.tokens || []) === JSON.stringify(nextDraftMention.tokens);
    if (item.draft === nextDraft && item.draftTimestamp === nextDraftTimestamp && draftMentionUnchanged) return;
    item.draft = nextDraft;
    item.draftTimestamp = nextDraftTimestamp;
    item.draftMention = nextDraftMention;
    touchOrder(id);
    draftDirty = true;
    markChanged();
  },

  updateRecentsAt: (id, status) => {
    ensureCache();
    const item = recentById.get(recentId(id));
    if (!item || item.hasAt === status) return;
    item.hasAt = status;
    touchOrder(id);
    markChanged();
  },

  getRecentByConversation: (id, type) => {
    ensureCache();
    const item = recentById.get(recentId(id));
    return item && item.type === type ? item : null;
  },

  getRecents: (options = {}) => {
    const recent = orderedRecents().map(cloneRecentValue);
    if (options.requestRosterInfo !== false) {
      fire(
        'imGetRecent',
        recent.filter((item) => item.type == 'roster').map((item) => item.id)
      );
    }
    return recent;
  },

  getRecentById: (id) => {
    const list = orderedRecents();
    const idx = list.findIndex((item) => recentId(item.id) === recentId(id));
    if (idx < 0) return { idx };
    return { idx, id, type: list[idx].type };
  },

  deleteRecentById(id) {
    ensureCache();
    const key = recentId(id);
    const item = recentById.get(key);
    if (!item) return;
    recentById.delete(key);
    recentOrder.delete(key);
    const index = recentList.indexOf(item);
    if (index >= 0) recentList.splice(index, 1);
    storageDirty = true;
    persistNow();
  },

  clear: () => {
    cancelTimers();
    removeItem('key_recent_store');
    resetCache();
  }
};

export default recentStore;
