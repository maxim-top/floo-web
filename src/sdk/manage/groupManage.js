import http from '../core/base/io/index';
import { fire } from '../utils/cusEvent';
import dataLogics from '../core/base/dataLogics';
import { groupStore, messageStore, recentStore } from '../utils/store';
import { formatJson } from '../utils/tools';
import { makeRecallMessage, makeDeleteMessage, makeContentAppendMessage, makeReplaceMessage } from '../core/base/messageMaker';
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetGroupInfo" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetJoinedGroups" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="openGroup" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="getAllGroupDetail" %}{% endlanying_code_snippet %}
 */
const getAllGroupDetail = () => groupStore.getAllGroupInfos();
/**
 * 获取群组成员ID列表（异步）
 * @static
 * @param {number} group_id 群组ID
 * @returns {Promise.<Array.<number>>} 群成员ID列表
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetGroupMembers" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="getGroupMembers" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetGroupListDetail" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="getGruopMessage" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetInfo" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetMemberList" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="readGroupMessage" %}{% endlanying_code_snippet %}
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
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="recallMessage" %}{% endlanying_code_snippet %}
 */
const recallMessage = (uid, mid) => {
  const smessage = makeRecallMessage(uid, mid);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

/**
 * 删除消息
 * @static
 * @param {number} uid 会话ID
 * @param {number} mid 消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="deleteMessage" %}{% endlanying_code_snippet %}
 */
const deleteMessage = (uid, mid) => {
  const smessage = makeDeleteMessage(uid, mid);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

/**
 * 追加消息内容
 * @static
 * @param {number} uid 会话ID
 * @param {number} mid 消息ID
 * @param {string} content 消息追加内容
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="appendMessageContent" %}{% endlanying_code_snippet %}
 */
const appendMessageContent = (uid, mid, content) => {
  const smessage = makeContentAppendMessage(uid, mid, content);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

/**
 * 更新消息内容
 * @static
 * @param {number} uid 会话ID
 * @param {number} mid 消息ID
 * @param {string} content 消息更新内容
 * @param {(string|object)} config 消息更新配置
 * @param {(string|object)} ext 消息更新扩展信息
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="replaceMessage" %}{% endlanying_code_snippet %}
 */
const replaceMessage = (uid, mid, content = '', config = null, ext = null) => {
  if (!content && !config && !ext) {
    // do nothing.
  } else {
    const smessage = makeReplaceMessage(uid, mid, content, config, ext);
    fire('swapSendMessage', formatJson(smessage));
    fire('sendMessage', smessage);
  }
};

/**
 * 获取群未读消息数
 * @static
 * @param {number} gid 群组ID
 * @returns {number} 未读消息数
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="getUnreadCount" %}{% endlanying_code_snippet %}
 */
const getUnreadCount = (gid) => messageStore.getUnreadByGroupId(gid);

const consumeGroupAtStatus = (gid) => recentStore.updateRecentsAt(gid, false);

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
  deleteMessage,
  appendMessageContent,
  replaceMessage,
  getUnreadCount,
  consumeGroupAtStatus,

  /**
   * 获取群管理员列表
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupMember>>} 群管理员列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetAdminList" %}{% endlanying_code_snippet %}
   */
  asyncGetAdminList: http.groupAdminList,
  /**
   * 群添加管理员
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncAdminAdd" %}{% endlanying_code_snippet %}
   */
  asyncAdminAdd: http.groupAdminAdd,
  /**
   * 移除管理员
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncAdminRemove" %}{% endlanying_code_snippet %}
   */
  asyncAdminRemove: http.groupAdminRemove,
  /**
   * 获取群公告详情
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.announcement_id 公告ID
   * @returns {Promise.<module:types~GroupAnnouncement>} 群公告详情
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetAnouncementById" %}{% endlanying_code_snippet %}
   */
  asyncGetAnouncementById: http.groupAnnouncement,
  /**
   * 删除群公告
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.announcement_id 公告ID
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncAnouncementDelete" %}{% endlanying_code_snippet %}
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
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncAnnouncementEdit" %}{% endlanying_code_snippet %}
   */
  asyncAnnouncementEdit: http.groupAnnouncementEdit,
  /**
   * 群公告列表
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupAnnouncement>>} 群公告详情列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetAnnouncementList" %}{% endlanying_code_snippet %}
   */
  asyncGetAnnouncementList: http.groupAnnouncementList,
  /**
   * 创建群组
   * @function
   * @param {module:types~GroupInfoRequest} params 请求参数
   * @returns {Promise.<module:types~GroupInfoAndSettings>} 群详情
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncCreate" %}{% endlanying_code_snippet %}
   */
  asyncCreate: http.groupCreate,
  /**
   * 解散群组
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncDestroy" %}{% endlanying_code_snippet %}
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
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateAvatar" %}{% endlanying_code_snippet %}
   */
  asyncUpdateAvatar: http.groupInfoAvatar,
  /**
   * 更新群描述
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 群组描述
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateDescription" %}{% endlanying_code_snippet %}
   */
  asyncUpdateDescription: http.groupInfoDdscription,
  /**
   * 更新群扩展信息
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 扩展信息
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateExt" %}{% endlanying_code_snippet %}
   */
  asyncUpdateExt: http.groupInfoExt,
  /**
   * 更新群名称
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 群名称
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateName" %}{% endlanying_code_snippet %}
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
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGroupMsgMutemode" %}{% endlanying_code_snippet %}
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
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGroupBannedList" %}{% endlanying_code_snippet %}
   */
  asyncGroupBannedList: http.groupBannedList,
  /**
   * 禁言群成员
   * @function
   * @param {module:types~GroupBannedMemberRequest} params 请求参数
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 请求结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGroupBab" %}{% endlanying_code_snippet %}
   */
  asyncGroupBab: http.groupBab,
  /**
   * 解除成员禁言
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 请求结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGroupUnban" %}{% endlanying_code_snippet %}
   */
  asyncGroupUnban: http.groupUnban,
  /**
   * 获取群设置
   * @function
   * @param {number} group_id 群ID
   * @returns {Promise.<module:types~GroupInfoAndSettings>} 群设置
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetSettings" %}{% endlanying_code_snippet %}
   */
  asyncGetSettings: http.groupSettings,
  /**
   * 设置群成员是否可以邀请
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 群成员邀请设置: false - 不允许邀请, true - 允许邀请(默认)
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateAllowMemberInvitation" %}{% endlanying_code_snippet %}
   */
  asyncUpdateAllowMemberInvitation: http.groupSettingsAllowmemberinvitation,
  /**
   * 设置群成员是否可以修改群信息
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 群成员修改群信息设置:  false - 群成员不能修改群信息(默认), true - 群成员可以修改群信息
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateAllowMemberModify" %}{% endlanying_code_snippet %}
   */
  asyncUpdateAllowMemberModify: http.groupSettingsAllowmembermodify,
  /**
   * 设置群是否开启已读模式
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 是否开启群消息已读功能:  false - 不开启, true - 开启
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateEnableReadack" %}{% endlanying_code_snippet %}
   */
  asyncUpdateEnableReadack: http.groupSettingsEnablereadack,
  /**
   * 设置群历史是否可见
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.value 设置群历史是否可见:  false - 不可见, true - 可见
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateHistoryVisible" %}{% endlanying_code_snippet %}
   */
  asyncUpdateHistoryVisible: http.groupSettingsHistoryvisible,
  /**
   * 设置入群是否需要申请
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {boolean} params.apply_approval 入群申请审批设置, 0:同意所有申请 1:需要管理员确认 2:拒绝所有申请
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateRequireadminapproval" %}{% endlanying_code_snippet %}
   */
  asyncUpdateRequireadminapproval: http.groupSettingsRequireadminapproval,
  /**
   * 全员禁言，只允许管理员发消息
   * @function
   * @param {object} params 参数
   * @param {number} params.duration - 禁言时长，单位为分钟,int64
   * @param {number} params.group_id - 群id,int64
   * @returns {Promise.<module:types~GroupBanAllResponse>} 结果
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncBanAll" %}{% endlanying_code_snippet %}
   */
  asyncBanAll: http.groupSettingsBanAll,
  /**
   * 取消全员禁言
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id - 群id,int64
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUnBanAll" %}{% endlanying_code_snippet %}
   */
  asyncUnBanAll: http.groupSettingsUnBanAll,
  /**
   * 更换群主
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {number} params.new_owner 新群主的用户ID
   * @returns {Promise.<module:types~GroupUserRelationResponse>} 结果
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncOwnerTransfer" %}{% endlanying_code_snippet %}
   */
  asyncOwnerTransfer: http.groupTransfer,

  /**
   * 获取用户的群组列表
   * @function
   * @param {object} params 参数, 空对象
   * @returns {Promise.<Array.<number>>} 群ID的列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetUserJoined" %}{% endlanying_code_snippet %}
   */
  asyncGetUserJoined: http.groupUserjoined, //todo ..可能有了，优化下

  /**
   * 申请加入群
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.reason 申请入群原因
   * @returns {Promise.<module:types~GroupUserRelationResponse>} 结果
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncApply" %}{% endlanying_code_snippet %}
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
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncApplyHandle" %}{% endlanying_code_snippet %}
   */
  asyncApplyHandle: http.groupApplyHandle,
  /**
   * 获取群黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupBlockedListItem>>} 群黑名单列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGroupBockedlist" %}{% endlanying_code_snippet %}
   */
  asyncGroupBockedlist: http.groupBockedlist,
  /**
   * 将成员加入黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGroupBlock" %}{% endlanying_code_snippet %}
   */
  asyncGroupBlock: http.groupBlock,
  /**
   * 解除黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGroupUnblock" %}{% endlanying_code_snippet %}
   */
  asyncGroupUnblock: http.groupUnblock,
  /**
   * 踢出群组
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncKick" %}{% endlanying_code_snippet %}
   */
  asyncKick: http.groupKick,
  /**
   * 获取群邀请列表
   * @function
   * @returns {Promise.<Array.<module:types~GroupInvitation>>} 群邀请列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetInvitationList" %}{% endlanying_code_snippet %}
   */
  asyncGetInvitationList: http.groupInvitationlist,
  /**
   * 邀请成员加入群
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupUserRelationResponse>>} 结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncInvite" %}{% endlanying_code_snippet %}
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
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncInviteHandle" %}{% endlanying_code_snippet %}
   */
  asyncInviteHandle: http.groupInviteHandle,
  /**
   * 批量获取群成员的群名片
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.user_list 群成员列表
   * @returns {Promise.<Array.<module:types~GroupMember>>} 群成员列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetMemberDisplayName" %}{% endlanying_code_snippet %}
   */
  asyncGetMemberDisplayName: http.groupMembersDidpayname,
  /**
   * 退出群
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncLeave" %}{% endlanying_code_snippet %}
   */
  asyncLeave: http.groupLeave,
  /**
   * 修改群名片
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {string} params.value 新名片
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncUpdateDisplayName" %}{% endlanying_code_snippet %}
   */
  asyncUpdateDisplayName: http.groupDisplayname,
  /**
   * 获取群申请列表
   * @function
   * @param {object} params 参数
   * @param {Array.<number>} params.group_list 群列表
   * @returns {Promise.<Array.<module:types~GroupApplication>>} 群申请列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asncGetApplicationList" %}{% endlanying_code_snippet %}
   */
  asncGetApplicationList: http.groupApplicationlist,
  /**
   * 获取群文件列表
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<Array.<module:types~GroupSharedFile>>} 群文件列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncGetFileList" %}{% endlanying_code_snippet %}
   */
  asyncGetFileList: http.groupFilelist,
  /**
   * 删除群文件
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @param {Array.<number>} params.file_list 文件ID列表
   * @returns {Promise.<Array.<module:types~GroupSharedFileResponse>>} 结果列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncFileDelete" %}{% endlanying_code_snippet %}
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
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="groupManage",function="asyncFileUpload" %}{% endlanying_code_snippet %}
   */
  asyncFileUpload: http.groupFileupload
};
