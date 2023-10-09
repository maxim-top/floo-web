import http from '../core/base/io/index';
import { fire } from '../utils/cusEvent';
import { infoStore, messageStore, recentStore, rosterStore } from '../utils/store';
import { formatJson } from '../utils/tools';
import { makeDeleteMessage, makeRecallMessage, makeUnreadMessage, makeContentAppendMessage, makeReplaceMessage } from '../core/base/messageMaker';

/**
 * 好友管理
 * @module rosterManage
 */

/**
 * 获取好友id列表
 * @static
 * @param {boolean} force 是否强制从服务器拉取：true - 从服务器获取， false - 从本地存储获取
 * @returns {Promise.<Array.<number>>} 用户ID列表
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncGetRosterIdList" %}{% endlanying_code_snippet %}
 */
const asyncGetRosterIdList = (force) => {
  if (force) {
    return http.rosterList({}).then((res) => {
      rosterStore.saveRosterList(res);
      return res.map((roster) => roster.user_id || roster);
    });
  }
  return Promise.resolve(rosterStore.getRosterList());
};

/**
 * 获取好友信息
 * @static
 * @param {number} roster_id 好友ID
 * @param {boolean} force 是否强制从服务器拉取： true - 从服务器拉取， false - 优先从本地存储获取
 * @returns {Promise.<module:types~RosterItem>} 好友信息
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncGetRosterInfo" %}{% endlanying_code_snippet %}
 */
const asyncGetRosterInfo = (roster_id, force) => {
  const ret = rosterStore.getRosterInfo(roster_id);
  if (ret && ret.username && !force) {
    return Promise.resolve(ret);
  }

  return http
    .rosterListPost({
      list: [roster_id]
    })
    .then((res) => {
      rosterStore.saveRosterInfo(res);
      fire('onRosterInfoUpdate', [roster_id]);
      return (res.length && res[0]) || {};
    });
};

const asyncRegester = (opt) => http.userRegister(opt);

/**
 * 删除好友
 * @static
 * @param {object} param 参数
 * @param {number} param.user_id 好友的用户ID
 * @returns {Promise.<boolean>} 请求结果
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncDeleteRoster" %}{% endlanying_code_snippet %}
 */
const asyncDeleteRoster = (param) => {
  return http.rosterDelete(param).then((res) => {
    rosterStore.removeRoster(param.user_id);
    recentStore.deleteRecentById(param.user_id);
    fire('onRosterListUpdate');
    return res;
  });
};

/**
 * 根据id列表获取用户详细信息
 * @static
 * @param {Array.<number>} roster_ids 用户ID列表
 * @returns {Promise.<Array.<module:types~RosterItem>>} 用户详细信息列表
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asnycGetRosterListDetailByIds" %}{% endlanying_code_snippet %}
 */
const asnycGetRosterListDetailByIds = (roster_ids) => {
  // todo ... fix一下
  if (!roster_ids || !roster_ids.length) {
    return Promise.resolve({});
  }
  const allMap = rosterStore.getAllRosterInfos();
  const sret = [];
  roster_ids.forEach((item) => {
    const ritem = allMap[item];
    if (!ritem || !ritem.username) {
      sret.push(item);
    }
  });
  const setArr = Array.from(new Set(sret));
  if (!setArr.length) {
    return Promise.resolve();
  } else {
    return http
      .rosterListPost({
        list: setArr
      })
      .then((res) => {
        rosterStore.saveRosterInfo(res);
        fire('onRosterInfoUpdate', setArr);
        return res;
      });
  }
};

/**
 * 获取缓存的所有用户详细信息
 * @static
 * @returns {Array.<module:types~RosterItem>} 用户详细信息列表
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="getAllRosterDetail" %}{% endlanying_code_snippet %}
 */
const getAllRosterDetail = () => rosterStore.getAllRosterInfos();

/**
 * 获取自己的用户信息
 * @static
 * @param {boolean} force 是否强制从服务器拉取： true - 从服务器拉取， false - 优先从本地存储获取
 * @returns {Promise.<module:types~UserProfile>} 用户信息
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncGetUserProfile" %}{% endlanying_code_snippet %}
 */
const asyncGetUserProfile = (force) => {
  const item = infoStore.getProfile();
  if (item && (item.name || item.mobile) && !force) {
    return Promise.resolve(item);
  }
  return http.userProfile().then((res) => {
    infoStore.saveProfile(res);
    return res;
  });
};

/**
 * 根据会话ID获取聊天消息
 * @static
 * @param {number} uid 会话ID
 * @returns {Array.<module:types~Meta>} 聊天消息列表
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="getRosterMessageByRid" %}{% endlanying_code_snippet %}
 */
const getRosterMessageByRid = (uid) => messageStore.getRosterMessage(uid);

/**
 * 修改消息状态为已读
 * @static
 * @param {number} roster_id 会话ID
 * @param {number} mid 消息ID： 如果不设置 表示把这个会话所有消息设为已读
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="readRosterMessage" %}{% endlanying_code_snippet %}
 */
const readRosterMessage = (roster_id, mid) => {
  fire('imReadRosterMessage', {
    roster_id,
    mid
  });
};

/**
 * 撤回消息，只能撤回5分钟内的
 * @static
 * @param {number} uid 会话ID
 * @param {number} mid 消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="recallMessage" %}{% endlanying_code_snippet %}
 */
const recallMessage = (uid, mid) => {
  const smessage = makeRecallMessage(uid, mid);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

/**
 * 设置消息成未读
 * @static
 * @param {number} uid 会话ID
 * @param {number} mid 消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="unreadMessage" %}{% endlanying_code_snippet %}
 */
const unreadMessage = (uid, mid) => {
  const smessage = makeUnreadMessage(uid, mid);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

/**
 * 删除消息
 * @static
 * @param {number} uid 会话ID
 * @param {number} mid 消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="deleteMessage" %}{% endlanying_code_snippet %}
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
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="appendMessageContent" %}{% endlanying_code_snippet %}
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
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="replaceMessage" %}{% endlanying_code_snippet %}
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
 * 获取好友信息
 * @static
 * @param {number} rid 好友ID
 * @returns {module:types~RosterItem} 好友信息
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="getRosterInfo" %}{% endlanying_code_snippet %}
 */
const getRosterInfo = (rid) => rosterStore.getRosterInfo(rid);

/**
 * 获取指定会话的未读数
 * @static
 * @param {number} uid 会话ID
 * @returns {number} 未读数
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="getUnreadCount" %}{% endlanying_code_snippet %}
 */
const getUnreadCount = (uid) => messageStore.getUnreadByRosterId(uid);

export default {
  asyncGetRosterIdList,
  asyncGetRosterInfo,
  asyncRegester,
  asnycGetRosterListDetailByIds,
  asyncGetUserProfile,
  getRosterMessageByRid,
  readRosterMessage,
  asyncDeleteRoster,
  getAllRosterDetail,
  recallMessage,
  deleteMessage,
  appendMessageContent,
  replaceMessage,
  getUnreadCount,
  unreadMessage,
  getRosterInfo,
  /**
   * 获取好友申请列表
   * @function
   * @param {object} params 参数
   * @param {number} params.cursor 从哪开始获取：可以传空字符串表示从头开始取
   * @returns {Promise.<Array.<module:types~RosterApplication>>} 好友申请列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncGetApplyList" %}{% endlanying_code_snippet %}
   */
  asyncGetApplyList: http.rosterApplylist,
  /**
   * 获取黑名单
   * @function
   * @param {object} params 参数：空对象
   * @returns {Promise.<Array.<number>>} 用户ID列表
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncGetBlockedlist" %}{% endlanying_code_snippet %}
   */
  asyncGetBlockedlist: http.rosterBlockedlist,
  /**
   * 加入黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.user_id 用户ID
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncBlockeAdd" %}{% endlanying_code_snippet %}
   */
  asyncBlockeAdd: http.rosterBlockedAdd,
  /**
   * 移除黑名单
   * @function
   * @param {object} params 参数
   * @param {number} params.user_id 用户ID
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncBlockeRemove" %}{% endlanying_code_snippet %}
   */
  asyncBlockeRemove: http.rosterBlockeRemove,
  /**
   * 请求加为好友
   * @function
   * @param {object} params 参数
   * @param {number} params.user_id 用户ID
   * @param {string} params.alias 备注
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncApply" %}{% endlanying_code_snippet %}
   */
  asyncApply: http.rosterApply,
  /**
   * 通过好友申请
   * @function
   * @param {object} params 参数
   * @param {number} params.user_id 用户ID
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncAccept" %}{% endlanying_code_snippet %}
   */
  asyncAccept: http.rosterAccept,
  /**
   * 拒绝好友申请
   * @function
   * @param {object} params 参数
   * @param {number} params.user_id 用户ID
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncDecline" %}{% endlanying_code_snippet %}
   */
  asyncDecline: http.rosterDecline,
  /**
   * 修改好友扩展字段
   * @function
   * @param {object} params 参数
   * @param {number} params.user_id 用户ID
   * @param {string} params.ext 扩展字段
   * @param {string} params.alias 备注名称
   * @param {boolean} params.mute_notification 是否接收消息提醒
   * @returns {Promise.<boolean>} 是否成功
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncUpdateRosterExt" %}{% endlanying_code_snippet %}
   */
  asyncUpdateRosterExt: http.rosterExt,
  /**
   * 按名称搜索用户
   * @function
   * @param {object} params 参数
   * @param {string} params.username 用户名
   * @returns {Promise.<module:types~RosterItem>} 用户信息
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncSearchRosterByName" %}{% endlanying_code_snippet %}
   */
  asyncSearchRosterByName: http.rosterName,
  /**
   * 按ID搜索用户
   * @function
   * @param {object} params 参数
   * @param {number} params.user_id 用户ID
   * @returns {Promise.<module:types~RosterItem>} 用户信息
   * @example
   * {% lanying_code_snippet repo="lanying-im-web",class="rosterManage",function="asyncSearchRosterById" %}{% endlanying_code_snippet %}
   */
  asyncSearchRosterById: http.rosterId
};
