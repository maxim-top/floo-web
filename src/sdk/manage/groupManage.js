import http from '../core/base/io/index';
import { fire } from '../utils/cusEvent';
import dataLogics from '../core/base/dataLogics';
import { groupStore, messageStore } from '../utils/store';
import { makeRecallMessage } from '../core/base/messageMaker';
/**
 * 群管理
 * @module groupManage
 */
/**
 * 获取群信息
 * @static
 * @param {number} group_id 群ID
 * @param {boolean} froce 是否强制从服务器拉取： true - 从服务器拉取， false - 优先从本地存储获取
 * @returns {Promise.<module:types~GroupInfoAndSettings>} 群信息
 */
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

/**
 * 获取加入的群组
 * @static
 * @param {boolean} froce 是否强制从服务器拉取： true - 从服务器拉取， false - 优先从本地存储获取
 * @returns {Promise.<Array.<number>>} 群组ID列表
 */
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
/**
 * 打开群组， 此方法会准备群组聊天界面的一些必备信息。
 * @static
 * @param {number} group_id 群组ID
 */
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
/**
 * 获取缓存的所有群组详情
 * @static
 * @returns {Object.<number,module:types~GroupInfoAndSettings>} 群组详情
 */
const getAllGroupDetail = () => groupStore.getAllGroupInfos();
/**
 * 获取群组成员（异步）
 * @static
 * @param {number} group_id 群组ID
 * @returns {Promise.<Array.<module:types~GroupMember>>} 群成员列表
 */
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
/**
 * 获取群组成员（同步）
 * @static
 * @param {number} group_id 群组ID
 * @returns {Array.<module:types~GroupMember>} 群成员列表
 */
const getGroupMembers = (group_id) => {
  const ret = groupStore.getGroupMembers(group_id) || [];
  return ret;
};
/**
 * 按id获取群组详情
 * @static
 * @param {Array.<number>} gids 群组ID列表
 * @returns {Promise.<Array.<module:types~BriefGroupInfoAndSettings>>} 群组详情列表
 */
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
/**
 * 获取群消息
 * @static
 * @param {number} gid 群ID
 * @returns {Array.<module:types~Meta>} 群消息列表
 */
const getGruopMessage = (gid) => {
  return messageStore.getGroupMessage(gid);
};

/**
 * 获取群组详情
 * @static
 * @param {object} params 参数
 * @param {number} params.group_id 群组ID
 * @returns {Promise.<module:types~GroupInfoAndSettings>} 群组详情
 */
const asyncGetInfo = (param) => {
  if (!param.group_id) {
    param = {
      group_id: param
    };
  }
  return http.groupInfo(param);
};

/**
 * 获取群成员列表
 * @static
 * @param {object} param 参数
 * @param {number} params.group_id 群组ID
 * @returns {Promise.<Array.<module:types~GroupMember>>}  群成员列表
 */
const asyncGetMemberList = (param) => {
  if (!param.group_id) {
    param = {
      group_id: param
    };
  }
  return http.groupMemberlist(param);
};

/**
 * 将群消息设置已读
 * @static
 * @param {number} group_id 群组ID
 * @param {number} mid 消息ID
 */
const readGroupMessage = (group_id, mid) => {
  fire('imReadGroupMessage', {
    group_id,
    mid
  });
};

/**
 * 撤回消息
 * @static
 * @param {number} uid 群组ID
 * @param {number} mid 消息ID
 */
const recallMessage = (uid, mid) => {
  const smessage = makeRecallMessage(uid, mid);
  fire('sendMessage', smessage);
  fire('swapSendMessage', smessage);
};

/**
 * 获取群未读消息数
 * @static
 * @param {number} gid 群组ID
 * @returns {number} 未读消息数
 */
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

  /**
   * 获取群管理员列表
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupMember>>} 群管理员列表
   */
  asyncGetAdminList: http.groupAdminList,
  /**
   * 群添加管理员
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   */
  asyncAdminAdd: http.groupAdminAdd,
  /**
   * 移除管理员
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   */
  asyncAdminRemove: http.groupAdminRemove,
  /**
   * 获取群公告详情
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.announcement_id 公告ID
   * @returns {Promise.<module:types~GroupAnnouncement>} 群公告详情
   */
  asyncGetAnouncementById: http.groupAnnouncement,
  /**
   * 删除群公告
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.announcement_id 公告ID
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncAnouncementDelete: http.groupAnnouncementDelete,
  /**
   * 编辑群公告
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.title 公告标题
   * @param {string} params.content 公告内容
   * @returns {Promise.<module:types~GroupAnnouncement>} 群公告详情
   */
  asyncAnnouncementEdit: http.groupAnnouncementEdit,
  /**
   * 群公告列表
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupAnnouncement>>} 群公告详情列表
   */
  asyncGetAnnouncementList: http.groupAnnouncementList,
  /**
   * 创建群组
   * @function
   * @param {module:types~GroupInfoRequest} params 请求参数
   * @returns {Promise.<module:types~GroupInfoAndSettings>} 群详情
   */
  asyncCreate: http.groupCreate,
  /**
   * 解散群组
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncDestroy: http.groupDestroy,

  asyncGetInfo, //: http.groupInfo,

  /**
   * 更新群头像
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 头像地址
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateAvatar: http.groupInfoAvatar,
  /**
   * 更新群描述
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 群组描述
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateDescription: http.groupInfoDdscription,
  /**
   * 更新群扩展信息
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 扩展信息
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateExt: http.groupInfoExt,
  /**
   * 更新群名称
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 群名称
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateName: http.groupInfoName,

  asyncGetMemberList, //: http.groupMemberlist,

  /**
   * 设置群消息免打扰情况
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {number} params.msg_mute_mode 群消息屏蔽模式: 0 - 表示不屏蔽, 1 - 表示屏蔽本地消息通知, 2 - 表示屏蔽消息，不接收消息
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncGroupMsgMutemode: http.groupMsgMutemode,
  asyncGetPublicList: http.groupPubliclist,
  asyncUpdateMsgNotDisturb: http.groupMsgNotdisturb,
  /**
   * 获取群禁言列表
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @return {Promise.<Array<module:types~GroupMemberBanned>>} 禁言成员列表
   */
  asyncGroupBannedList: http.groupBannedList,
  /**
   * 禁言群成员
   * @function
   * @param {module:types~GroupBannedMemberRequest} params 请求参数
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 请求结果列表
   */
  asyncGroupBab: http.groupBab,
  /**
   * 解除成员禁言
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 请求结果列表
   */
  asyncGroupUnban: http.groupUnban,
  /**
   * 获取群设置
   * @function
   * @param {number} group_id 群ID
   * @returns {Promise.<module:types~GroupInfoAndSettings>} 群设置
   */
  asyncGetSettings: http.groupSettings,
  /**
   * 设置群成员是否可以邀请
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 群成员邀请设置: false - 不允许邀请, true - 允许邀请(默认)
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateAllowMemberInvitation: http.groupSettingsAllowmemberinvitation,
  /**
   * 设置群成员是否可以修改群信息
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 群成员修改群信息设置:  false - 群成员不能修改群信息(默认), true - 群成员可以修改群信息
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateAllowMemberModify: http.groupSettingsAllowmembermodify,
  /**
   * 设置群是否开启已读模式
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 是否开启群消息已读功能:  false - 不开启, true - 开启
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateEnableReadack: http.groupSettingsEnablereadack,
  /**
   * 设置群历史是否可见
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 设置群历史是否可见:  false - 不可见, true - 可见
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateHistoryVisible: http.groupSettingsHistoryvisible,
  /**
   * 设置入群是否需要申请
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.apply_approval 入群申请审批设置, 0:同意所有申请 1:需要管理员确认 2:拒绝所有申请
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateRequireadminapproval: http.groupSettingsRequireadminapproval,
  /**
   * 全员禁言，只允许管理员发消息
   * @function
   * @param {object} params 参数
   * @param {number} params.duration - 禁言时长，单位为分钟,int64
   * @param {number} params.group_id - 群id,int64
   * @returns {Promise.<module:types~GroupBanAllResponse>} 结果
   */
  asyncBanAll: http.groupSettingsBanAll,
  /**
   * 取消全员禁言
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id - 群id,int64
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUnBanAll: http.groupSettingsUnBanAll,
  /**
   * 更换群主
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {number} params.new_owner 新群主的用户ID
   * @returns {Promise.<module:types~GroupUserRelationResponse>} 结果
   */
  asyncOwnerTransfer: http.groupTransfer,

  /**
   * 获取用户的群组列表
   * @function
   * @param {object} params 参数, 空对象
   * @returns {Promise.<Array.<number>>} 群ID的列表
   */
  asyncGetUserJoined: http.groupUserjoined, //todo ..可能有了，优化下

  /**
   * 申请加入群
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.reason 申请入群原因
   * @returns {Promise.<module:types~GroupUserRelationResponse>} 结果
   */
  asyncApply: http.groupApply,
  /**
   * 处理用户的入群申请
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {number} params.user_id 用户ID
   * @param {boolean} params.approval 审批结果：true为同意，false为拒绝
   * @returns {Promise.<module:types~GroupUserRelationResponse>} 结果
   */
  asyncApplyHandle: http.groupApplyHandle,
  /**
   * 获取群黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupBlockedListItem>>} 群黑名单列表
   */
  asyncGroupBockedlist: http.groupBockedlist,
  /**
   * 将成员加入黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   */
  asyncGroupBlock: http.groupBlock,
  /**
   * 解除黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   */
  asyncGroupUnblock: http.groupUnblock,
  /**
   * 踢出群组
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   */
  asyncKick: http.groupKick,
  /**
   * 获取群邀请列表
   * @function
   * @returns {Promise.<Array.<module:types~GroupInvitation>>} 群邀请列表
   */
  asyncGetInvitationList: http.groupInvitationlist,
  /**
   * 邀请成员加入群
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   */
  asyncInvite: http.groupInvite,
  /**
   * 处理群邀请
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {number} params.user_id 用户ID
   * @param {boolean} params.approval 审批结果：true为同意，false为拒绝
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncInviteHandle: http.groupInviteHandle,
  /**
   * 批量获取群成员的群名片
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupMember>>} 群成员列表
   */
  asyncGetMemberDisplayName: http.groupMembersDidpayname,
  /**
   * 退出群
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncLeave: http.groupLeave,
  /**
   * 修改群名片
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 新名片
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateDisplayName: http.groupDisplayname,
  /**
   * 获取群申请列表
   * @function
   * @param {object} params 参数
   * @param {Array.<number>} params.group_list 群列表
   * @returns {Promise.<Array.<module:types~GroupApplication>>} 群申请列表
   */
  asncGetApplicationList: http.groupApplicationlist,
  /**
   * 获取群文件列表
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupSharedFile>>} 群文件列表
   */
  asyncGetFileList: http.groupFilelist,
  /**
   * 删除群文件
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.file_list 文件ID列表
   * @returns {Promise.<Array.<module:types~GroupSharedFileResponse>>} 结果列表
   */
  asyncFileDelete: http.groupFiledelete,
  /**
   * 上传群文件
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id - 群id,int64
   * @param {string} params.name - 文件名称
   * @param {number} params.size - 文件大小,int64
   * @param {string} params.type - 文件类型
   * @param {string} params.url - 文件url
   * @returns {Promise.<Array.<module:types~GroupSharedFile>>} 群文件列表
   */
  asyncFileUpload: http.groupFileupload
};
