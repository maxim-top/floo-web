/**
 *
 *  消息存储规则:
 *  需要操作的放在notice，
 *  能放user，group 消息里的尽量放
 *  实在无处放的，放notice
 *
 */
import { bind, fire } from '../../utils/cusEvent';
import { groupStore, infoStore, messageStore, noticeStore, recentStore, rosterStore } from '../../utils/store';
import * as io from './io/httpIo';
import { metaToCustomer, numToString, toNumber } from '../../utils/tools';
import { makeReadAllMessage, makeReadMessageAck } from './messageMaker';
import { STATIC_MESSAGE_OPTYPE, STATIC_MESSAGE_TYPE, STATIC_MESSAGE_STATUS } from '../../utils/static';

bind('imRostersGroupslistReady', (lists) => {
  const { rosters } = lists;
  rosterStore.saveRosterList([].concat(rosters));
  rostersInfoLogic(rosters);
});

//// rosters ////////////////////////////////////////////
const rosterInfoRequestTime = {}; //存储rosterinfo上次请求时间
const isRosterInfoRecentRequest = (user_id) => {
  const now = new Date().getTime();
  const lastRequestTime = rosterInfoRequestTime[user_id] || 0;
  if (now - lastRequestTime < 1000) {
    return true;
  } else {
    return false;
  }
};
const updateRosterInfoRequestTime = (user_id) => {
  const now = new Date().getTime();
  rosterInfoRequestTime[user_id] = now;
};

const rostersInfoLogic = (rosterIds = []) => {
  if (!Array.isArray(rosterIds)) rosterIds = [rosterIds];
  const allRosterInfos = rosterStore.getAllRosterInfos() || {};
  const ret = [];
  rosterIds.forEach((user_id) => {
    user_id = user_id.user_id || user_id;

    if (user_id > 0) {
      const savedRoster = allRosterInfos[user_id] || {};
      const { avatar, nick_name, username } = savedRoster;

      if (avatar || nick_name || username) {
        //
      } else {
        user_id && !isRosterInfoRecentRequest(user_id) && ret.push(user_id) && updateRosterInfoRequestTime(user_id);
      }
    }
  });
  ret.length && getRostersInfos(ret);
};

const groupsInfoLogic = (groupIds = [], fromServer = false) => {
  if (!Array.isArray(groupIds)) {
    groupIds = [groupIds];
  }

  if (fromServer) {
    getGroupInfos(groupIds);
    return;
  }

  const allGroupInfos = groupStore.getAllGroupInfos() || {};
  const ret = [];
  groupIds.forEach((item) => {
    const group_id = item.group_id || item;

    if (item > 0) {
      const savedGroup = allGroupInfos[group_id] || {};
      const { name } = savedGroup;

      if (!name) {
        ret.push(group_id);
      }
    }
  });
  ret.length && getGroupInfos(ret);
};

const blackRostList = []; // 脏数据存储，取不到信息的。
//获取roster详情

const getRostersInfos = (list = []) => {
  let slist = list.filter((x) => {
    return blackRostList.indexOf(x) < 0;
  });

  if (slist.length) {
    io.rosterListPost({
      list: slist
    }).then((res) => {
      slist.forEach((x) => {
        const index = res.findIndex((a) => a.user_id == x);

        if (index < 0) {
          blackRostList.push(x);
        }
      });
      rosterStore.saveRosterInfo(res);
      fire('onRosterListUpdate');
    });
  }
};

const getGroupInfos = (group_list = []) => {
  if (group_list.length) {
    io.groupInfoBatch({
      group_list
    }).then((res) => {
      groupStore.saveGroupInfo(res);
      fire('onGroupListUpdate');
    });
  }
};

// 当消息通知的时候，并且无存储的时候，不做处理
// replace ， 是否完全替换之前的存储

const groupAddMemberLogic = (group_id, uids, isNotice, replace) => {
  if (isNotice) {
    const saved = groupStore.getGroupMembers(group_id);

    if (!saved || !saved.length) {
      return;
    }
  }

  if (typeof uids === 'undefined') {
    return;
  }

  if (!Array.isArray(uids)) {
    uids = [uids];
  }

  io.groupMembersDidpayname({
    group_id,
    user_list: uids
  }).then((res) => {
    if (!res || !res.length) {
      return;
    }

    const arr = [];
    const allRosterInfos = rosterStore.getAllRosterInfos();
    res.forEach((item) => {
      if (!allRosterInfos[item.user_id] || !allRosterInfos[item.user_id].username) {
        arr.push(item.user_id);
      } else {
        item.display_name = item.display_name || allRosterInfos[item.user_id].username;
        item.avatar = allRosterInfos[item.user_id].avatar;
      }
    });

    if (arr.length) {
      io.rosterListPost({
        list: arr
      }).then((details) => {
        rosterStore.saveRosterInfo(details);
        const allRosterInfos = rosterStore.getAllRosterInfos();
        res = res.map((sitem) => {
          if (!sitem.display_name) {
            sitem.display_name = sitem.display_name || allRosterInfos[sitem.user_id].username;
          }

          sitem.avatar = allRosterInfos[sitem.user_id].avatar;
          return sitem;
        });
        groupStore.saveGroupMembers(group_id, res, replace);
        fire('onGroupMemberChanged', group_id);
      });
    } else {
      groupStore.saveGroupMembers(group_id, res, replace);
      fire('onGroupMemberChanged', group_id);
    }
  });
};

const groupDeleteMemberLogic = (group_id, uid) => {
  const members = groupStore.getGroupMembers(group_id);

  if (!members || members.length === 0) {
    return;
  }

  const index = members.findIndex((item) => item.user_id === uid);
  if (index >= 0) {
    members.splice(index, 1);
    groupStore.saveGroupMembers(group_id, members, true); //这个是全量

    fire('onGroupMemberChanged', group_id);
  }
};

//// groups ////////////////////////////////////////////
bind('imRostersGroupslistReady', (lists) => {
  const { groups } = lists;
  groupStore.saveJoinedGroups([].concat(groups));
  groupsInfoLogic(groups);
});

//// messages ////////////////////////////////////////////
bind('imRosterMessage', (meta) => {
  const meta_cus = metaToCustomer(meta);
  const { ext = '', from, to } = meta_cus;

  let jext = {};
  try {
    jext = JSON.parse(ext);
  } catch (ex) {
    //
  }

  if (typeof jext.input_status !== 'undefined' && from != infoStore.getUid()) {
    //typing消息
    fire('onInputStatusMessage', {
      ext,
      from,
      to
    });
  } else {
    messageStore.saveRosterMessage(meta_cus);
    meta_cus.toType = 'roster';
    recentStore.saveRecent(meta_cus);

    const uid = infoStore.getUid();
    const suid = uid == from ? to : from;
    rostersInfoLogic(suid);

    fire('onUnreadChange', suid);
  }
  // const smessage = makeMessageDelevery(meta);
  // fire('sendMessage', smessage); //表示消息已送达
  fire('onRosterMessage', meta_cus);
});

bind('imSendRosterMessage', (meta) => {
  rostersInfoLogic(meta.uid);
});

bind('imGetRecent', (idx) => {
  rostersInfoLogic(idx);
});

bind('imGroupMessage', (meta) => {
  const meta_cus = metaToCustomer(meta);
  messageStore.saveGroupMessage(meta_cus);
  meta_cus.toType = 'group';
  recentStore.saveRecent(meta_cus);

  const uid = infoStore.getUid();
  const { config } = meta_cus;

  if (config && config.mentionList && config.mentionList.indexOf(uid) >= 0) {
    fire('onMentionMessage', meta_cus);
  }

  fire('onGroupMessage', meta_cus);
});
bind('imReceivedUnread', (unread) => {
  const rosterIds = unread.filter((x) => x.type === 1).map((f) => toNumber(f.xid.uid));
  const gids = unread.filter((x) => x.type === 2).map((f) => toNumber(f.xid.uid));
  dealRosterUnread(rosterIds);
  rostersInfoLogic(rosterIds);
  dealGroupUnread(gids);
  groupsInfoLogic(gids);
});

const dealRosterUnread = (uids) => {
  const allRosterInfos = rosterStore.getAllRosterInfos() || {};
  const ret = [];
  uids.forEach((user_id) => {
    const savedRoster = allRosterInfos[user_id] || {};
    const { avatar, nick_name, username } = savedRoster;

    if (avatar || nick_name || username) {
      //
    } else {
      user_id && !isRosterInfoRecentRequest(user_id) && ret.push(user_id) && updateRosterInfoRequestTime(user_id);
    }
  });

  if (ret.length) {
    io.rosterListPost({
      list: ret
    }).then((res) => {
      rosterStore.saveRosterInfo(res);
      recentStore.saveUnreadRecent(uids, 'roster');
    });
  } else {
    recentStore.saveUnreadRecent(uids, 'roster');
  }
};

const dealGroupUnread = (gids) => {
  const allGroupInfos = groupStore.getAllGroupInfos() || {};
  const ret = [];
  gids.forEach((gid) => {
    const savedRoster = allGroupInfos[gid] || {};
    const { name } = savedRoster;

    if (name) {
      //
    } else {
      gid && ret.push(gid);
    }
  });

  if (ret.length) {
    io.groupInfoBatch({
      group_list: ret
    }).then((res) => {
      groupStore.saveGroupInfo(res);
      fire('onGroupListUpdate');
      recentStore.saveUnreadRecent(gids, 'group');
    });
  } else {
    recentStore.saveUnreadRecent(gids, 'group');
  }
};

//// systems----- roster ////////////////////////////////////////////
bind('imRosterAdded', (meta) => {
  // 是列表有加人!!!艹
  const { payload } = meta;
  const { to = [], from } = payload;
  const uid = infoStore.getUid();

  if (to.length === 1 && toNumber(to[0].uid) === uid) {
    //自己收到别人的请求
    // noticeStore.saveNotice(meta);
    rostersInfoLogic([toNumber(from.uid)]);
    rosterStore.saveRosterList(toNumber(from.uid));
    fire('onRosterListUpdate', meta); //
  }
});

bind('imRosterRemoved', (meta) => {
  // from 是点 删除 的那个人。。
  const { payload } = meta;
  const { from, to = [] } = payload;
  const uid = infoStore.getUid();
  const fromUid = toNumber(from.uid);

  if (fromUid === uid) {
    // 是自己，做下处理，删掉
    if (to.length === 1) {
      const toUid = toNumber(to[0].uid);
      rosterStore.removeRoster(toUid);
      noticeStore.saveNotice(meta);
      recentStore.deleteRecentById(toUid);
      messageStore.deleteRosterMessageByRosterId(toUid);
      fire('onRosterRemoved', meta);
    }
  }
  // 自己被删 先不做处理
});

bind('imRosterApplied', (meta) => {
  fire('onRosterApplied', meta);
});

bind('imRosterAccepted', (meta) => {
  // from === 点同意的， to， 被同意
  const { payload } = meta;
  const { from, to = [] } = payload;
  const uid = infoStore.getUid();
  const fromUid = toNumber(from.uid);

  if (to.length === 1) {
    const toUid = toNumber(to[0].uid);
    if (fromUid === uid) {
      //自己同意别人的请求
      noticeStore.removeNotice(meta); //删除请求的notice
      rosterStore.saveRosterList(toUid);
      rostersInfoLogic(toUid);
    } else if (toUid === uid) {
      // 别人同意自己
      rosterStore.saveRosterList(fromUid);
      rostersInfoLogic(fromUid);
    }
    // messageStore.saveRosterMessage(meta); // a 与 b 已成好友，开始聊天吧。。大概如此
    fire('onRosterAccepted', meta);
  }
});

bind('imRosterDeclined', (meta) => {
  // 拒绝好友，from 是 点 拒绝 的人
  const { payload } = meta;
  const { from, to = [] } = payload;
  const uid = infoStore.getUid();
  const fromUid = toNumber(from.uid);
  if (to.length === 1) {
    const toUid = toNumber(to[0].uid);
    if (fromUid === uid) {
      //自己拒绝
      noticeStore.removeNotice(meta); //删除请求的notice
      noticeStore.saveNotice(meta); // 新的消息，你拒绝了xxx的好友申请
    } else if (toUid === uid) {
      //自己加被拒绝，放到通知
      noticeStore.saveNotice(meta);
    }

    fire('onRosterDeclined', meta);
  }
});

bind('imRrosterBaned', (meta) => {
  // 不做处理
  fire('onRosterNotice', meta);
});
bind('imRosterUnbaned', (meta) => {
  // 不做处理
  fire('onRosterNotice', meta);
});
bind('imRosterInfoUpdated', (meta) => {
  //roster 信息修改
  const { payload } = meta;
  const { from, content = '{}' } = payload;
  const fromUid = toNumber(from.uid);
  let info = {};
  try {
    info = JSON.parse(content);
  } catch (e) {
    //
  }

  if (Object.keys(info).length) {
    let sinfo = Object.assign({}, rosterStore.getRosterInfo(fromUid), info);
    rosterStore.saveRosterInfo([sinfo]);
    fire('onRosterInfoUpdate');
    fire('onRosterListUpdate');
  }
});

// group 处理 ==========================================================
/**
 bind('imGroupPresence', (meta) => {
  fire('onGroupNotice', meta);
});
 bind('imGroupAbesence', (meta) => {
  fire('onGroupNotice', meta);
});
 */

bind('imGroupCreated', (meta) => {
  const { payload } = meta;
  const { gid, from } = payload;
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const fromUid = toNumber(from.uid);
  groupStore.saveJoinedGroups(groupId);

  if (fromUid !== uid) {
    rostersInfoLogic(fromUid);
  }
  groupsInfoLogic(groupId);
  // messageStore.saveGroupMessage(meta); // 有落地，所以放在group 里边
  fire('onGroupListUpdate', meta);
  fire('onGroupCreated', meta);
  // fire('onGroupListUpdate');
});
bind('imGroupDestoryed', (meta) => {
  const { payload } = meta;
  const { gid, from } = payload;
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const fromUid = toNumber(from.uid);
  if (fromUid !== uid) {
    rostersInfoLogic(fromUid);
  }

  groupStore.removeGroup(groupId);
  noticeStore.saveNotice(meta); // 存到notice
  recentStore.deleteRecentById(gid);
  messageStore.deleteGroupMessageByGid(gid);
  fire('onGroupListUpdate');
  fire('onGroupDestoryed', meta);
});

bind('imGroupJoined', (meta) => {
  // from 是 进入群的人，也有可能是自己。
  const { payload } = meta;
  const { gid, from, to = [] } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (fromUid === uid) {
    //自己加入
    groupStore.saveJoinedGroups(groupId);
    groupsInfoLogic(groupId);
    fire('onGroupListUpdate');
  } else {
    //别人加入群
    groupAddMemberLogic(groupId, fromUid, true);
    rostersInfoLogic(fromUid);
    fire('onGroupMemberChanged', groupId);
  }
  // messageStore.saveGroupMessage(meta); // 都需要加入群的消息里边。。
  fire('onGroupJoined', meta);
});

bind('imGroupApplyed', (meta) => {
  // 入群申请，是申请，申请的那个人就是from
  const { payload } = meta;
  const { from /**gid */ } = payload;
  const fromUid = toNumber(from.uid);
  // const groupId = toNumber(gid.uid);
  const uid = infoStore.getUid();
  if (fromUid !== uid) {
    //别人申请的，自己申请的不做处理
    rostersInfoLogic([fromUid]);
    noticeStore.saveNotice(meta);
    // fire('onGroupMemberChanged', groupId);
  }
});
bind('imGroupApplyAccepted', (meta) => {
  //接受，不是被，相当于accept操作的那个人
  const { payload } = meta;
  const { gid, from, to = [] } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (fromUid === uid) {
    //自己同意别人入群
    noticeStore.removeNotice(meta); // 删除之前的操作请求....
    rostersInfoLogic(toUids);
    groupAddMemberLogic(groupId, toUids, true);
    fire('onGroupMemberChanged', groupId);
  } else {
    //自己加的
    groupStore.saveJoinedGroups(groupId);
    groupsInfoLogic(groupId);
    rostersInfoLogic(fromUid);
    fire('onGroupListUpdate');
  }
  // messageStore.saveGroupMessage(meta); // 不管如何，都有 xxx 加入了群的消息
  fire('onGroupApplyAccepted', meta);
});
bind('imGroupApplyDeclined', (meta) => {
  // 点 拒绝的人，可能是自己，也可能自己被拒
  const { payload } = meta;
  const { from, to } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (fromUid === uid) {
    //自己拒绝别人
    // messageStore.saveGroupMessage(meta); // 遵循有地方放，就不放notice的原则
    rostersInfoLogic(toUids);
  } else {
    //自己被拒绝
    noticeStore.saveNotice(meta);
  }

  fire('onGroupApplyDeclined', meta);
});
bind('imGroupInvited', (meta) => {
  //邀请人加入群，from就是发起邀请的人
  const { payload } = meta;
  const { gid, from, to = [] } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (fromUid === uid) {
    //自己邀请人
    rostersInfoLogic(toUids);
    // messageStore.saveGroupMessage(meta);
  } else if (toUids.findIndex((x) => x === uid) > -1) {
    //自己收到了邀请
    rostersInfoLogic(fromUid);
    groupsInfoLogic(groupId);
    noticeStore.saveNotice(meta);
  } else {
    rostersInfoLogic(toUids);
    // messageStore.saveGroupMessage(meta); // a 邀请 b 加入 群
  }

  fire('onGroupNotice', meta);
});
bind('imGroupInvitedAccepted', (meta) => {
  // 同意邀请，，from 是 同意进群，被邀请的人
  const { payload } = meta;
  const { gid, from, to = [] } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (fromUid === uid) {
    //自己同意群邀请,自己进群
    noticeStore.removeNotice(meta);
    groupStore.saveJoinedGroups(groupId);
    groupsInfoLogic(groupId);
    fire('onGroupListUpdate');
  } else {
    // 其他人进群, from 就是进群的人
    groupAddMemberLogic(groupId, fromUid, true);
    rostersInfoLogic(fromUid);
    fire('onGroupMemberChanged', groupId);
  }
  // messageStore.saveGroupMessage(meta);
  fire('onGroupInvitedAccepted', meta);
});
bind('imGroupInvitedDeclined', (meta) => {
  // 邀请被拒绝，from 是 点 拒绝的人
  const { payload } = meta;
  const { gid, from } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);

  if (fromUid === uid) {
    //别人邀请自己进入，自己拒绝
    noticeStore.removeNotice(meta);
    noticeStore.saveNotice(meta);
    groupsInfoLogic(groupId);
  } else {
    // 别人 拒绝了 群的邀请
    // messageStore.saveGroupMessage(meta);
    rostersInfoLogic(fromUid);
  }

  fire('onGroupInvitedDeclined', meta);
});

bind('imGroupKicked', (meta) => {
  //kick是t的那个人
  meta = Object.assign({}, meta);
  const { payload } = meta;
  const { gid, to = [] } = payload;
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (toUids.findIndex((x) => x === uid) > -1) {
    //自己被T
    groupStore.removeGroup(groupId);
    noticeStore.saveNotice(meta); // 存到notice
    recentStore.deleteRecentById(gid);
    messageStore.deleteGroupMessageByGid(gid);
    fire('onGroupListUpdate');
    // messageStore.deleteGroupMessageByGid(groupId);
  } else {
    // messageStore.saveGroupMessage(meta);
    groupDeleteMemberLogic(groupId, toUids); // 里边有fire
  }
  // fire('onGroupKicked', meta);
  // fire('onGroupListUpdate');
});

bind('imGroupBlocked', (meta) => {
  // 加入黑名单，相当于T人。。
  const { payload } = meta;
  const { gid, to = [] } = payload;
  const uid = infoStore.getUid();
  const groupId = toNumber(gid.uid);
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (toUids.findIndex((x) => x === uid) > -1) {
    //自己被ban，相当于退群
    groupStore.removeGroup(groupId);
    noticeStore.saveNotice(meta);
    recentStore.deleteRecentById(gid);
    messageStore.deleteGroupMessageByGid(gid);
    fire('onGroupListUpdate');
  } else {
    // 别人被ban
    rostersInfoLogic(toUids);
    groupDeleteMemberLogic(groupId, toUids);
    // messageStore.saveGroupMessage(meta);
  }
  // fire('onGroupBaned', meta);
  // fire('onGroupListUpdate');
});

bind('imGroupUnblocked', (meta) => {
  // 群黑名单， 解除， 只能管理员才能收到，就是不能在to里边
  // todo... 新加这个群。。。
  const { payload } = meta;
  const { to = [] } = payload;
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });
  rostersInfoLogic(toUids);
  // messageStore.saveGroupMessage(meta);
  // fire('onGroupListUpdate', meta);
});
bind('imGroupOwnerAssigned', (meta) => {
  // from 是 转让， to 是 新的接受的
  const { payload } = meta;
  const { from, to = [] } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });
  if (fromUid !== uid) {
    toUids.push(fromUid);
  }
  rostersInfoLogic(toUids);
  // messageStore.saveGroupMessage(meta);
  fire('onGroupOwnerAssigned', meta);
});
bind('imGroupAdminGranted', (meta) => {
  const { payload } = meta;
  const { from, to = [] } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (fromUid !== uid) {
    toUids.push(fromUid);
  }
  rostersInfoLogic(toUids);
  // messageStore.saveGroupMessage(meta);
  fire('onGroupAdminGranted', meta);
});
bind('imGroupAdminRevoked', (meta) => {
  const { payload } = meta;
  const { from, to = [] } = payload;
  const fromUid = toNumber(from.uid);
  const uid = infoStore.getUid();
  const toUids = [];
  to.forEach((item) => {
    toUids.push(toNumber(item.uid));
  });

  if (fromUid !== uid) {
    toUids.push(fromUid);
  }
  rostersInfoLogic(toUids);
  // messageStore.saveGroupMessage(meta);
  fire('onGroupAdminRevoked', meta);
});
bind('imGroupMuted', (meta) => {
  // 不收消息，from 只能是自己
  // messageStore.saveGroupMessage(meta);
  fire('onGroupMuted', meta);
});
bind('imGroupUnblocked', (meta) => {
  // messageStore.saveGroupMessage(meta);
  fire('onGroupUnblocked', meta);
});
bind('imGroupBaned', (meta) => {
  // 不能发消息， 管理员设置的
  // messageStore.saveGroupMessage(meta);
  fire('onGroupBaned', meta);
});
bind('imGroupUnbaned', (meta) => {
  // messageStore.saveGroupMessage(meta);
  fire('onGroupUnbaned', meta);
});
bind('imGroupInfoUpdated', (meta) => {
  const { payload } = meta;
  const { gid, content = '{}' } = payload;
  const groupId = toNumber(gid.uid);
  let info = {};
  try {
    info = JSON.parse(content);
  } catch (e) {
    //
  }
  if (Object.keys(info).length) {
    let sinfo = Object.assign({}, groupStore.getGroupInfo(groupId), info);
    groupStore.saveGroupInfo([sinfo]);
    fire('onGroupListUpdate');
    // fire('onGroupInfoUpdated', meta);
  }
  // messageStore.saveGroupMessage(meta);
  // groupsInfoLogic(groupId, true);
});
bind('imGroupAnnouncementUpdated', (meta) => {
  const { payload } = meta;
  const { gid } = payload;
  const groupId = toNumber(gid.uid);
  // messageStore.saveGroupMessage(meta);
  groupsInfoLogic(groupId, true);
  fire('onGroupAnnouncementUpdated', meta);
});

/******* 读消息....  *****/
bind('imReadRosterMessage', (param) => {
  // 读取的是，对方的消息，并且，没有存ack的。。
  // 这里只是表示读取对方消息，显示不用做任何处理.....
  const { roster_id, mid, isReceived } = param;
  let unread_changed = false;

  if (mid) {
    // read one message status
    const meta = messageStore.getRosterMessageById(roster_id, mid);
    const needAck = changeRosterMessageStatusRead(meta);
    if (needAck && !isReceived) {
      unread_changed = true;
      const sframe = makeReadMessageAck(roster_id, mid);
      fire('sendMessage', sframe);
    }
  } else {
    // read all message status
    const allMsgs = messageStore.getRosterMessage(roster_id);
    let mid_read;

    allMsgs.forEach((meta) => {
      const needAck = changeRosterMessageStatusRead(meta);
      if (needAck && !isReceived) {
        unread_changed = true;
        const sframe = makeReadMessageAck(roster_id, meta.id);
        fire('sendMessage', sframe);
      }
      mid_read = meta.id;
    });

    if (!isReceived && unread_changed) {
      // send to other devices
      const sframe = makeReadAllMessage(roster_id, mid_read);
      fire('sendMessage', sframe);
    }
  }

  if (unread_changed) {
    // if isReceived, no need to resend onUnreadChange
    fire('onUnreadChange', roster_id);
  }
});

const changeRosterMessageStatusRead = (meta) => {
  let needAck = false;
  const changed = changeRosterMessageStatus(meta, STATIC_MESSAGE_STATUS.READ);
  if (meta && changed) {
    // Only received message needs ACK.
    const cuid = infoStore.getUid();
    const fromUid = toNumber(meta.from);
    if (fromUid > 0 && fromUid != cuid) {
      needAck = true;
    }
  }
  return needAck;
};
const changeRosterMessageStatus = (meta, status) => {
  let changed = false;
  if (meta && meta.status != status) {
    const meta_changed = meta;
    meta_changed.status = status;
    messageStore.saveRosterMessage(metaToCustomer(meta_changed));
    changed = true;
  }
  return changed;
};

bind('imReadGroupMessage', (param) => {
  const { group_id, mid, isReceived } = param;
  let unread_changed = false;

  if (mid) {
    // read one message
    const meta = messageStore.getGroupMessageById(group_id, mid);
    const needAck = changeGroupMessageStatusRead(meta);
    if (needAck && !isReceived) {
      unread_changed = true;
      const groupMemberUid = numToString(meta.from);
      const sframe = makeReadMessageAck(groupMemberUid, mid);
      fire('sendMessage', sframe);
    }
  } else {
    // read all messages
    const allMsgs = messageStore.getGroupMessage(group_id);
    let mid_read;

    allMsgs.forEach((meta) => {
      const needAck = changeGroupMessageStatusRead(meta);
      if (needAck && !isReceived) {
        unread_changed = true;
        const groupMemberUid = numToString(meta.from);
        const sframe = makeReadMessageAck(groupMemberUid, meta.id);
        fire('sendMessage', sframe);
      }
      mid_read = meta.id;
    });
    messageStore.saveFormatedGroupMessage(group_id, allMsgs);

    if (!isReceived && unread_changed) {
      //send to other devices
      const sframe = makeReadAllMessage(group_id, mid_read);
      fire('sendMessage', sframe);
    }
  }

  if (unread_changed) {
    // if isReceived, no need to resend onUnreadChange
    fire('onUnreadChange', group_id);
  }
}); //read ack,, delivery ack ...

const changeGroupMessageStatusRead = (meta) => {
  let needAck = false;
  const changed = changeGroupMessageStatus(meta, STATIC_MESSAGE_STATUS.READ);
  if (meta && changed) {
    // Only received message needs ACK.
    const cuid = infoStore.getUid();
    const fromUid = toNumber(meta.from);
    if (fromUid > 0 && fromUid != cuid) {
      if (meta.config && meta.config.groupMemberList) {
        //Only ACK on Group message with member list
        needAck = true;
      }
    }
  }
  return needAck;
};

const changeGroupMessageStatus = (meta, status) => {
  let changed = false;
  if (meta && meta.status != status) {
    const meta_changed = meta;
    meta_changed.status = status;
    messageStore.saveGroupMessage(metaToCustomer(meta_changed));
    changed = true;
  }
  return changed;
};

const resetLastMessage = (uid, isGroup) => {
  let messages = [];
  if (isGroup) {
    messages = messageStore.getGroupMessage(uid);
  } else {
    messages = messageStore.getRosterMessage(uid);
  }

  if (messages.length > 0) {
    recentStore.saveRecent(messages[messages.length - 1]);
  }
};

bind('onActionMessage', (meta) => {
  const { payload, from, to, isReceived } = meta;
  const { type, operation = {} } = payload;
  const cuid = infoStore.getUid() + '';
  const toUid = to ? numToString(to.uid) : 0;
  const fromUid = numToString(from.uid);
  const messageUid = cuid + '' === fromUid + '' ? toUid : fromUid;
  const allGids = groupStore.getJoinedGroups();
  const isGroup = allGids.indexOf(toUid - 0) != -1;

  if (type !== STATIC_MESSAGE_TYPE.OPER) return;

  const { type: opType, mid, xid } = operation;
  // Why use xid.uid instead of messageUid?
  // Action sent to other devices of the sender, its messageUid would be sender-self

  let meta_changed;
  if (isGroup) {
    meta_changed = messageStore.getGroupMessageById(messageUid, mid);
  } else {
    meta_changed = messageStore.getRosterMessageById(messageUid, mid);
  }

  if (opType === STATIC_MESSAGE_OPTYPE.READ_ACK) {
    !isGroup && changeRosterMessageStatusRead(meta_changed);
    isGroup && changeGroupMessageStatusRead(meta_changed);
  } else if (opType === STATIC_MESSAGE_OPTYPE.DELIVER_ACK) {
    !isGroup && changeRosterMessageStatus(meta_changed, STATIC_MESSAGE_STATUS.DELIVERED);
    isGroup && changeGroupMessageStatus(meta_changed, STATIC_MESSAGE_STATUS.DELIVERED);
  } else if (opType === STATIC_MESSAGE_OPTYPE.RECALL) {
    !isGroup && messageStore.deleteSingleRosterMessage(messageUid, mid);
    isGroup && messageStore.deleteSingleGroupMessage(messageUid, mid);

    resetLastMessage(messageUid, isGroup);
    fire('onMessageRecalled', {
      uid: messageUid,
      mid
    });
  } else if (opType === STATIC_MESSAGE_OPTYPE.DELETE) {
    !isGroup && messageStore.deleteSingleRosterMessage(xid.uid, mid);
    isGroup && messageStore.deleteSingleGroupMessage(xid.uid, mid);

    resetLastMessage(xid.uid, isGroup);
    fire('onMessageDeleted', {
      uid: xid.uid,
      mid
    });
  } else if (opType === STATIC_MESSAGE_OPTYPE.READ_CANCEL) {
    !isGroup && changeRosterMessageStatus(meta_changed, STATIC_MESSAGE_STATUS.UNREAD);
    isGroup && changeGroupMessageStatus(meta_changed, STATIC_MESSAGE_STATUS.UNREAD);

    fire('onMessageCanceled', {
      uid: messageUid,
      mid
    });
  } else if (opType === STATIC_MESSAGE_OPTYPE.READ_ALL) {
    if (isGroup) {
      fire('imReadGroupMessage', {
        group_id: xid.uid,
        mid,
        isReceived
      });
    } else {
      fire('imReadRosterMessage', {
        roster_id: xid.uid,
        mid,
        isReceived
      });
    }
  }

  const suid = numToString(xid && xid.uid ? xid.uid : messageUid);
  fire('onMessageStatusChanged', { uid: suid, mid: numToString(mid) });
  fire('onUnreadChange', suid);
}); ////////////////////////////////////// swap 消息处理 /////////////////////////////

const swapedSendMessage = {};
bind('swapSendMessage', (message) => {
  const { payload } = message;
  const { meta } = payload;
  const { id } = meta;
  swapedSendMessage[numToString(id)] = message;
});

bind('receivedSendMessage', (client_mid) => {
  client_mid = numToString(client_mid);
  const message = swapedSendMessage[client_mid];
  if (message) {
    const metaPayload = message.payload;
    const { meta } = metaPayload;
    const { payload } = meta;
    const { type } = payload;
    if (type === STATIC_MESSAGE_TYPE.OPER) {
      fire('onActionMessage', meta);
    }
  }
});

bind('deleteConversation', ({ id, source }) => {
  fire('flooNotice', {
    category: 'conversation_deleted',
    desc: { id, source }
  });

  const { idx, type } = recentStore.getRecentById(id);
  if (idx < 0) return;

  //cleanup messages in conversation
  if (type == 'group') {
    messageStore.deleteGroupMessageByGid(id);
  } else {
    // roster and others
    messageStore.deleteRosterMessageByRosterId(id);
  }
  recentStore.deleteRecentById(id);
});

export default {
  groupAddMemberLogic
  // saveGroups,
};
