import http from '../core/base/io/index';
import { fire } from '../utils/cusEvent';
import dataLogics from '../core/base/dataLogics';
import { groupStore, messageStore } from '../utils/store';
import { makeRecallMessage } from '../core/base/messageMaker';

const asyncGetGroupInfo = (group_id, froce) => {
  group_id = group_id - 0;
  const ret = groupStore.getGroupInfo(group_id) || {};
  if (ret.name && !froce) {
    return Promise.resolve(ret);
  }

  return http
    .groupInfo({
      group_id
    })
    .then((res) => {
      groupStore.saveGroupInfo([res]); //todo fire ?

      return res;
    });
};

const asyncGetJoinedGroups = (force) => {
  if (force) {
    return http.groupUserjoined({}).then((res) => {
      if (!Array.isArray(res)) {
        return groupStore.getGroupInfoList();
      }
      return res;
    });
  }
  return Promise.resolve(groupStore.getGroupInfoList());
};

const openGroup = (group_id) => {
  http
    .groupMemberlist({
      group_id
    })
    .then((res) => {
      groupStore.saveGroupMembers(group_id, res);
      const ids = res.map((sitem) => sitem.user_id);
      ids.length && dataLogics.groupAddMemberLogic(group_id, ids, false, true);
      fire('onGroupMemberChanged', group_id);
    });
};

const getAllGroupDetail = () => groupStore.getAllGroupInfos();

const asyncGetGroupMembers = (group_id) => {
  return http
    .groupMemberlist({
      group_id
    })
    .then((res) => {
      groupStore.saveGroupMembers(group_id, res);
      const ids = res.map((sitem) => sitem.user_id);
      ids.length && dataLogics.groupAddMemberLogic(group_id, ids, false, true);
      return ids;
    });
};

const getGroupMembers = (group_id) => {
  const ret = groupStore.getGroupMembers(group_id) || [];
  return ret;
};

const asyncGetGroupListDetail = (gids) => {
  // todo，优化,force，缓存
  if (!gids || !gids.length) {
    return Promise.resolve({});
  }

  return http
    .groupInfoBatch({
      group_list: gids
    })
    .then((res) => {
      groupStore.saveGroupInfo(res);
      return res;
    });
};

const getGruopMessage = (gid) => {
  return messageStore.getGroupMessage(gid);
};

const asyncGetInfo = (param) => {
  if (!param.group_id) {
    param = {
      group_id: param
    };
  }
  return http.groupInfo(param);
};

const asyncGetMemberList = (param) => {
  if (!param.group_id) {
    param = {
      group_id: param
    };
  }
  return http.groupMemberlist(param);
};

const readGroupMessage = (group_id, mid) => {
  fire('imReadGroupMessage', {
    group_id,
    mid
  });
};

const recallMessage = (uid, mid) => {
  const smessage = makeRecallMessage(uid, mid);
  fire('sendMessage', smessage);
  fire('swapSendMessage', smessage);
};

const getUnreadCount = (gid) => messageStore.getUnreadByGroupId(gid);

export default {
  asyncGetGroupInfo,
  asyncGetJoinedGroups, // 改成 id 啊
  openGroup,
  getAllGroupDetail,
  asyncGetGroupMembers,
  getGroupMembers,
  asyncGetGroupListDetail,
  getGruopMessage,
  readGroupMessage,
  recallMessage,
  getUnreadCount,

  asyncGetAdminList: http.groupAdminList,
  asyncAdminAdd: http.groupAdminAdd,
  asyncAdminRemove: http.groupAdminRemove,
  asyncGetAnouncementById: http.groupAnnouncement,
  asyncAnouncementDelete: http.groupAnnouncementDelete,
  asyncAnnouncementEdit: http.groupAnnouncementEdit,
  asyncGetAnnouncementList: http.groupAnnouncementList,
  asyncCreate: http.groupCreate,
  asyncDestroy: http.groupDestroy,

  asyncGetInfo, //: http.groupInfo,

  asyncUpdateAvatar: http.groupInfoAvatar,
  asyncUpdateDescription: http.groupInfoDdscription,
  asyncUpdateExt: http.groupInfoExt,
  asyncUpdateName: http.groupInfoName,

  asyncGetMemberList, //: http.groupMemberlist,

  asyncGroupMsgMutemode: http.groupMsgMutemode,
  asyncGetPublicList: http.groupPubliclist,
  asyncUpdateMsgNotDisturb: http.groupMsgNotdisturb,
  asyncGroupBannedList: http.groupBannedList,
  asyncGroupBab: http.groupBab,
  asyncGroupUnban: http.groupUnban,
  asyncGetSettings: http.groupSettings,
  asyncUpdateAllowMemberInvitation: http.groupSettingsAllowmemberinvitation,
  asyncUpdateAllowMemberModify: http.groupSettingsAllowmembermodify,
  asyncUpdateEnableReadack: http.groupSettingsEnablereadack,
  asyncUpdateHistoryVisible: http.groupSettingsHistoryvisible,
  asyncUpdateRequireadminapproval: http.groupSettingsRequireadminapproval,
  asyncBanAll: http.groupSettingsBanAll,
  asyncUnBanAll: http.groupSettingsUnBanAll,
  asyncOwnerTransfer: http.groupTransfer,

  asyncGetUserJoined: http.groupUserjoined, //todo ..可能有了，优化下

  asyncApply: http.groupApply,
  asyncApplyHandle: http.groupApplyHandle,
  asyncGroupBockedlist: http.groupBockedlist,
  asyncGroupBlock: http.groupBlock,
  asyncGroupUnblock: http.groupUnblock,
  asyncKick: http.groupKick,
  asyncGetInvitationList: http.groupInvitationlist,
  asyncInvite: http.groupInvite,
  asyncInviteHandle: http.groupInviteHandle,
  asyncGetMemberDisplayName: http.groupMembersDidpayname,
  asyncLeave: http.groupLeave,
  asyncUpdateDisplayName: http.groupDisplayname,
  asncGetApplicationList: http.groupApplicationlist,
  asyncGetFileList: http.groupFilelist,
  asyncFileDelete: http.groupFiledelete,
  asyncFileUpload: http.groupFileupload
};
