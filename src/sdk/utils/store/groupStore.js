import { getItem, removeItem, saveItem } from './storeBase';

const groupStore = {
  saveJoinedGroups: (groups) => {
    if (!groups) return;
    if (!Array.isArray(groups)) {
      groups = [groups];
    }
    const gids = groups.map((item) => item.group_id || item);
    const savedIds = getItem('key_group_lists') || [];
    const ret = Array.from(new Set(gids.concat(savedIds)));
    saveItem('key_group_lists', ret);
  },

  removeGroup: (gid) => {
    const allList = getItem('key_group_lists') || [];
    const index = allList.findIndex((item) => item === gid);
    if (index >= 0) {
      allList.splice(index, 1);
      saveItem('key_group_lists', allList);
    }
  },

  getJoinedGroups: () => getItem('key_group_lists'),
  saveGroupInfo: (groups) => {
    if (!Array.isArray(groups)) {
      groups = [groups];
    }
    const allGroupInfos = getItem('key_group_infos') || {};
    groups.forEach((group) => {
      const sobj = {};
      const { group_id } = group;
      Object.keys(group).forEach((key) => {
        const v = group[key];
        typeof v !== 'undefined' && (sobj[key] = group[key]);
      });
      allGroupInfos[group_id] = allGroupInfos[group_id] || {};
      Object.assign(allGroupInfos[group_id], sobj);
    });
    saveItem('key_group_infos', allGroupInfos);
  },

  getGroupInfo: (group_id) => {
    const groupInfos = getItem('key_group_infos');
    const ret = groupInfos[group_id] || {};
    return Object.assign(ret, {
      group_id
    });
  },

  getGroupInfoList: () => {
    const groupIds = groupStore.getJoinedGroups() || [];
    const allInfos = groupStore.getAllGroupInfos() || {};
    const ret = [];
    groupIds.forEach((gid) => {
      const ginfo = allInfos[gid] || {};
      ret.push(
        Object.assign({}, ginfo, {
          group_id: gid
        })
      );
    });
    return ret;
  },

  getAllGroupInfos: () => getItem('key_group_infos') || {},

  saveGroupMembers: (gid, members, replace) => {
    //replace 表示强制的代替, 强制存新的，用于不是增加的时候。
    if (!Array.isArray(members)) members = [members];
    const allMap = getItem('key_group_members') || {};
    const savedMembers = allMap[gid] || [];
    if (replace) {
      // 这个是第一次取，全量替换旧的
      allMap[gid] = members;
      saveItem('key_group_members', allMap);
      return;
    }
    members.forEach((uid) => {
      // 这个是来通知后的追加
      const index = savedMembers.findIndex((x) => x === uid);
      index < 0 && savedMembers.push(uid);
    });
    allMap[gid] = savedMembers;
  },

  removeGroupMembers: (gid, members) => {
    const allMap = getItem('key_group_members') || {};
    const savedMembers = allMap[gid] || [];
    members.forEach((uid) => {
      const index = savedMembers.findIndex((x) => x === uid);
      index >= 0 && savedMembers.splice(index, 1);
    });
    allMap[gid] = savedMembers;
    saveItem('key_group_members', allMap);
  },

  getGroupMembers: (gid) => {
    const allMap = getItem('key_group_members') || {};
    return allMap[gid] || [];
  },

  clear: () => {
    removeItem('key_group_infos');
    removeItem('key_group_members');
    removeItem('key_group_lists');
  }
};

export default groupStore;
