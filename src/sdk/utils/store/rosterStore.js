import { getItem, removeItem, saveItem } from './storeBase';
import { bind } from '../cusEvent';
import infoStore from './infoStore';

const ROSTER_INFO_FLUSH_DELAY = 1000;

let cacheOwner = '';
let rosterInfoCache = null;
let rosterInfoDirty = false;
let rosterInfoPersistTimer = null;

const cloneRosterInfo = (info) => (info ? Object.assign({}, info) : info);

const cancelRosterInfoPersist = () => {
  if (!rosterInfoPersistTimer) return;
  clearTimeout(rosterInfoPersistTimer);
  rosterInfoPersistTimer = null;
};

const resetRosterInfoCache = () => {
  cancelRosterInfoPersist();
  cacheOwner = `${infoStore.getUid() || ''}`;
  rosterInfoCache = null;
  rosterInfoDirty = false;
};

const ensureRosterInfoCache = () => {
  const owner = `${infoStore.getUid() || ''}`;
  if (owner !== cacheOwner) {
    resetRosterInfoCache();
    cacheOwner = owner;
  }
  if (!rosterInfoCache) {
    rosterInfoCache = getItem('key_roster_infos') || {};
  }
  return rosterInfoCache;
};

const persistRosterInfo = () => {
  cancelRosterInfoPersist();
  if (!rosterInfoDirty || !rosterInfoCache) return;
  saveItem('key_roster_infos', rosterInfoCache);
  rosterInfoDirty = false;
};

const scheduleRosterInfoPersist = () => {
  rosterInfoDirty = true;
  cancelRosterInfoPersist();
  rosterInfoPersistTimer = setTimeout(persistRosterInfo, ROSTER_INFO_FLUSH_DELAY);
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', persistRosterInfo);
}
// Explicit logout can discard pending cache changes; the server will refresh them after login.
bind('logout', () => {
  resetRosterInfoCache();
});

const rosterStore = {
  saveRosterList: (rosters = []) => {
    if (!Array.isArray(rosters)) {
      rosters = [rosters];
    }
    const ids = rosters.map((item) => item.roster_user_id || item.user_id || item);
    const old_roster = rosterStore.getRosterList() || [];
    let new_roster;
    if (Array.isArray(old_roster)) {
      new_roster = Array.from(new Set(old_roster.concat(ids)));
    } else {
      // old roster is in bad format, abandon it.
      new_roster = ids;
    }
    saveItem('key_roster_lists', new_roster);

    rosterStore.saveRosterInfo(rosters);
  },

  replaceRosterList: (rosters = []) => {
    if (!Array.isArray(rosters)) {
      rosters = [rosters];
    }
    const ids = rosters.map((item) => item.roster_user_id || item.user_id || item);
    saveItem('key_roster_lists', Array.from(new Set(ids)));
    rosterStore.saveRosterInfo(rosters);
  },

  getRosterList: () => getItem('key_roster_lists'),

  getRosterInfoList: () => {
    const userids = rosterStore.getRosterList() || [];
    const allInfos = rosterStore.getAllRosterInfos() || {};
    const ret = [];
    userids.forEach((uid) => {
      const uinfo = allInfos[uid] || {};
      ret.push(
        Object.assign({}, uinfo, {
          user_id: uid
        })
      );
    });
    return ret;
  },
  removeRoster: (uid) => {
    const userids = rosterStore.getRosterList();
    const index = userids.indexOf(uid);
    index >= 0 && userids.splice(index, 1);
    saveItem('key_roster_lists', userids);
  },
  removeRosterList: () => removeItem('key_roster_lists'),
  saveRosterInfo: (rosters = []) => {
    if (!Array.isArray(rosters)) {
      rosters = [rosters];
    }
    const allSavedMap = ensureRosterInfoCache();
    let changed = false;
    rosters.forEach((roster) => {
      const { user_id } = roster;
      const sobj = {};
      Object.keys(roster).forEach((key) => {
        const v = roster[key];
        typeof v !== 'undefined' && (sobj[key] = v);
      });
      if (user_id) {
        allSavedMap[user_id] = allSavedMap[user_id] || {};
        Object.assign(allSavedMap[user_id], sobj);
        changed = true;
        // if (typeof relation !== 'undefined') { // 从 rosterlist 接口取的
        //   Object.assign(allSavedMap[uid], { relation, alias })
        // } else if (typeof username !== 'undefined') { // 从rost list 详情 取的
        // }
      }
    });
    if (changed) scheduleRosterInfoPersist();
  },

  getRosterInfo: (uid) => {
    const user = cloneRosterInfo(ensureRosterInfoCache()[uid]) || {};
    return Object.assign(user, {
      user_id: uid
    });
  },
  getAllRosterInfos: () => {
    const ret = {};
    const allSavedMap = ensureRosterInfoCache();
    Object.keys(allSavedMap).forEach((uid) => {
      ret[uid] = cloneRosterInfo(allSavedMap[uid]);
    });
    return ret;
  },

  clear: () => {
    resetRosterInfoCache();
    removeItem('key_roster_infos');
    removeItem('key_roster_lists');
  }
};

export default rosterStore;
