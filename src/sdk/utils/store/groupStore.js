import { getItem, removeItem, saveItem } from './storeBase';

const getMemberIdentity = (member) => {
  if (member && typeof member === 'object') {
    return `${member.user_id || member.uid || ''}`;
  }
  return `${member || ''}`;
};

const isObjectMember = (member) => member && typeof member === 'object';

const mergeMember = (current, incoming) => {
  if (!isObjectMember(current)) {
    return isObjectMember(incoming) ? incoming : incoming || current;
  }
  if (!isObjectMember(incoming)) {
    return current;
  }
  return Object.assign({}, current, incoming);
};

const dedupeMembers = (members = []) => {
  const seen = {};
  const order = [];
  members.forEach((member) => {
    const key = getMemberIdentity(member);
    if (!key) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(seen, key)) {
      order.push(key);
      seen[key] = member;
      return;
    }
    seen[key] = mergeMember(seen[key], member);
  });
  return order.map((key) => seen[key]);
};

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
    const groupInfos = getItem('key_group_infos') || {};
    const ret = groupInfos[group_id] || {};
    return Object.assign({}, ret, {
      group_id
    });
  },

  getRawGroupInfo: (group_id) => {
    const groupInfos = getItem('key_group_infos') || {};
    const ret = groupInfos[group_id] || {};
    return Object.assign({}, ret, {
      group_id
    });
  },

  getGroupInfoList: () => {
    const groupIds = groupStore.getJoinedGroups() || [];
    const allInfos = groupStore.getAllGroupInfos() || {};
    const ret = [];
    groupIds.forEach((gid) => {
      const ginfo = allInfos[gid] || {};
      ret.push(Object.assign({}, ginfo, { group_id: gid }));
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
      allMap[gid] = dedupeMembers(members);
      saveItem('key_group_members', allMap);
      return;
    }
    const savedIdentityMap = {};
    savedMembers.forEach((member) => {
      const key = getMemberIdentity(member);
      if (key) {
        savedIdentityMap[key] = true;
      }
    });
    members.forEach((member) => {
      // 这个是来通知后的追加
      const key = getMemberIdentity(member);
      if (!key) {
        return;
      }
      const index = savedMembers.findIndex((item) => getMemberIdentity(item) === key);
      if (index < 0) {
        savedIdentityMap[key] = true;
        savedMembers.push(member);
        return;
      }
      savedMembers[index] = mergeMember(savedMembers[index], member);
    });
    allMap[gid] = dedupeMembers(savedMembers);
    saveItem('key_group_members', allMap);
  },

  removeGroupMembers: (gid, members) => {
    if (!Array.isArray(members)) members = [members];
    const allMap = getItem('key_group_members') || {};
    const savedMembers = allMap[gid] || [];
    const removeIdentityMap = {};
    members.forEach((member) => {
      const key = getMemberIdentity(member);
      if (key) {
        removeIdentityMap[key] = true;
      }
    });
    allMap[gid] = savedMembers.filter((member) => {
      const key = getMemberIdentity(member);
      return !key || !removeIdentityMap[key];
    });
    saveItem('key_group_members', allMap);
  },

  getGroupMembers: (gid) => {
    const allMap = getItem('key_group_members') || {};
    const members = allMap[gid] || [];
    const normalizedMembers = dedupeMembers(members);
    if (normalizedMembers.length !== members.length) {
      allMap[gid] = normalizedMembers;
      saveItem('key_group_members', allMap);
    }
    return normalizedMembers;
  },

  clear: () => {
    removeItem('key_group_infos');
    removeItem('key_group_members');
    removeItem('key_group_lists');
  }
};

export default groupStore;
