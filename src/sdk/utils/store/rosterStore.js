import { getItem, removeItem, saveItem } from './storeBase';

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
    const allSavedMap = rosterStore.getAllRosterInfos() || {};
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
        // if (typeof relation !== 'undefined') { // 从 rosterlist 接口取的
        //   Object.assign(allSavedMap[uid], { relation, alias })
        // } else if (typeof username !== 'undefined') { // 从rost list 详情 取的
        // }
      }
    });
    saveItem('key_roster_infos', allSavedMap);
  },

  getRosterInfo: (uid) => {
    const userMap = getItem('key_roster_infos') || {};
    let user = userMap[uid];
    return (
      user &&
      Object.assign(user, {
        user_id: uid
      })
    );
  },
  getAllRosterInfos: () => {
    const ret = getItem('key_roster_infos');
    return ret;
  },

  clear: () => {
    removeItem('key_roster_infos');
    removeItem('key_roster_lists');
  }
};

export default rosterStore;
