import * as statics from '../utils/static';
import log from '../utils/log';
import io from '../core/base/io/index';
import { groupStore, infoStore, messageStore, noticeStore, recentStore, rosterStore } from '../utils/store';
import dnsManager from './dnsManager';
import queryString from 'query-string';
import {
  makeForwardMessage,
  makeGroupMessage,
  makeHistorySyncul,
  makeMentionMessage,
  makeRosterMessage,
  makeTypingMessage,
  makeConversationOperation
} from '../core/base/messageMaker';
import { bind, fire } from '../utils/cusEvent';
import { STATIC_MESSAGE_STATUS } from '../utils/static';
import { tryUrlsWithTimeout } from '../utils/speedTest';
import { createHistoryRequestGate } from '../utils/historyRequestGate';

/**
 * @module sysManage
 */

const getStaticVars = () => statics;

const getConversationDraft = (id, type) => {
  const conversation = recentStore.getRecentByConversation(id, type);
  return (conversation && conversation.draft) || '';
};

const getConversationDraftMention = (id, type) => {
  const conversation = recentStore.getRecentByConversation(id, type);
  const draftMention = (conversation && conversation.draftMention) || {};
  return {
    mentionAll: draftMention.mentionAll === true,
    mentionList: Array.isArray(draftMention.mentionList) ? [].concat(draftMention.mentionList) : [],
    tokens: Array.isArray(draftMention.tokens) ? draftMention.tokens.map((token) => Object.assign({}, token)) : []
  };
};

const saveConversationDraft = (id, type, draft, forcedTimestamp = '', draftMention = {}) => {
  recentStore.saveDraft(id, type, draft, forcedTimestamp, draftMention);
};

const staticContactCache = {
  appId: '',
  token: '',
  list: null,
  promise: null
};

const quickReplyCache = {
  appId: '',
  token: '',
  uid: '',
  list: null,
  promise: null
};

const clearStaticContactCache = () => {
  staticContactCache.appId = '';
  staticContactCache.token = '';
  staticContactCache.list = null;
  staticContactCache.promise = null;
};

const clearQuickReplyCache = () => {
  quickReplyCache.appId = '';
  quickReplyCache.token = '';
  quickReplyCache.uid = '';
  quickReplyCache.list = null;
  quickReplyCache.promise = null;
};

const asyncGetStaticContact = (force) => {
  const appId = infoStore.getAppid() || '';
  const token = infoStore.getToken() || '';

  if (!force && staticContactCache.list && staticContactCache.appId === appId && staticContactCache.token === token) {
    return Promise.resolve(staticContactCache.list);
  }

  if (!force && staticContactCache.promise && staticContactCache.appId === appId && staticContactCache.token === token) {
    return staticContactCache.promise;
  }

  if (staticContactCache.appId !== appId || staticContactCache.token !== token) {
    clearStaticContactCache();
    staticContactCache.appId = appId;
    staticContactCache.token = token;
  }

  staticContactCache.promise = io
    .getStaticContact()
    .then((res) => {
      staticContactCache.list = Array.isArray(res) ? res : [];
      return staticContactCache.list;
    })
    .catch((err) => {
      staticContactCache.promise = null;
      throw err;
    });

  return staticContactCache.promise.finally(() => {
    staticContactCache.promise = null;
  });
};

const asyncGetQuickReplyList = (force) => {
  const appId = infoStore.getAppid() || '';
  const token = infoStore.getToken() || '';
  const uid = infoStore.getUid() || '';

  if (!force && quickReplyCache.list && quickReplyCache.appId === appId && quickReplyCache.token === token && quickReplyCache.uid === uid) {
    return Promise.resolve(quickReplyCache.list);
  }

  if (!force && quickReplyCache.promise && quickReplyCache.appId === appId && quickReplyCache.token === token && quickReplyCache.uid === uid) {
    return quickReplyCache.promise;
  }

  if (quickReplyCache.appId !== appId || quickReplyCache.token !== token || quickReplyCache.uid !== uid) {
    clearQuickReplyCache();
    quickReplyCache.appId = appId;
    quickReplyCache.token = token;
    quickReplyCache.uid = uid;
  }

  quickReplyCache.promise = io
    .quickReplyList()
    .then((res) => {
      quickReplyCache.list = Array.isArray(res && res.list) ? res.list : [];
      return quickReplyCache.list;
    })
    .catch((err) => {
      quickReplyCache.promise = null;
      throw err;
    });

  return quickReplyCache.promise.finally(() => {
    quickReplyCache.promise = null;
  });
};

const asyncCreateQuickReply = (params = {}) => {
  return io.quickReplyCreate(params).then((res) => {
    clearQuickReplyCache();
    return res;
  });
};

const asyncUpdateQuickReply = (id, params = {}) => {
  return io.quickReplyUpdate(id, params).then((res) => {
    clearQuickReplyCache();
    return res;
  });
};

const asyncDeleteQuickReply = (id) => {
  return io.quickReplyDelete(id).then((res) => {
    clearQuickReplyCache();
    return res;
  });
};

const asyncCanUseQuickReply = (forceSupportRefresh = false) => {
  const appId = infoStore.getAppid();
  const uid = `${infoStore.getUid() || ''}`;
  if (!uid) {
    return Promise.resolve(false);
  }

  const readEnableCs = () => {
    const appConfig = dnsManager.getAppConfig(appId) || {};
    if (typeof appConfig.enable_cs === 'boolean') {
      return appConfig.enable_cs;
    }
    return null;
  };

  const checkSupportIdentity = () => {
    return asyncGetStaticContact(forceSupportRefresh).then((list = []) => {
      return list.some((item) => `${item.user_id || ''}` === uid);
    });
  };

  const enableCs = readEnableCs();
  if (enableCs === false) {
    return Promise.resolve(false);
  }

  if (enableCs === true) {
    return checkSupportIdentity();
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(readEnableCs() === true);
    }, 400);
  }).then((enabled) => {
    if (!enabled) {
      return false;
    }
    return checkSupportIdentity();
  });
};

const touchConversation = (id, type, forcedTimestamp = '') => {
  recentStore.saveUnreadRecent([id], type, forcedTimestamp);
};

const markMessageUnread = (cid, mid, isGroup = false) => {
  const stored = isGroup ? messageStore.getGroupMessageById(cid, mid) : messageStore.getRosterMessageById(cid, mid);
  if (!stored) {
    return null;
  }

  const changed = {
    ...stored,
    status: STATIC_MESSAGE_STATUS.UNREAD
  };

  if (isGroup) {
    messageStore.saveGroupMessage(changed);
  } else {
    messageStore.saveRosterMessage(changed);
  }

  return changed;
};

/**
 * 发送单聊消息
 * @static
 * @param {object} msg 消息体
 * @param {string} msg.uid 接收者ID
 * @param {string} msg.content 消息内容
 * @param {string} msg.type 消息类型： text - 文本, image - 图片， audio - 语音, video - 视频，file - 文件, location - 位置， command - 命令, forward - 转发
 * @param {(string|object)} msg.ext 扩展字段
 * @param {(string|object)} msg.attachment 附件信息
 * @returns {number} 客户端生成的消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="sendRosterMessage" %}{% endlanying_code_snippet %}
 */
const sendRosterMessage = (msg) => {
  const msgFrm = makeRosterMessage(msg);
  const meta = msgFrm.payload.meta;
  messageStore.saveSendingRosterMessage(meta);
  const { id } = meta;
  if (!io.isConnected()) {
    messageStore.failSendingRosterMessage(meta);
    return id;
  }
  io.sendMessage(msgFrm);
  fire('prioritizeUnreadSync', msg.uid);
  return id;
};

/**
 * 发送群聊消息
 * @static
 * @param {object} msg 发送消息体
 * @param {string} msg.gid 群组ID
 * @param {string} msg.content 消息内容
 * @param {string} msg.type 消息类型： text - 文本, image - 图片， audio - 语音, video - 视频，file - 文件, location - 位置， command - 命令, forward - 转发
 * @param {(string|object)} msg.ext 扩展字段
 * @param {(string|object)} msg.attachment 附件信息
 * @param {number} msg.priority 设置消息的扩散优先级，默认为0。0表示扩散，数字越小扩散的越多。
 * @returns {number} 客户端生成的消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="sendGroupMessage" %}{% endlanying_code_snippet %}
 */
const sendGroupMessage = (msg) => {
  const msgFrm = makeGroupMessage(msg);
  const meta = msgFrm.payload.meta;
  messageStore.saveSendingGroupMessage(meta);
  const { id } = meta;
  if (!io.isConnected()) {
    messageStore.failSendingGroupMessage(meta);
    return id;
  }
  io.sendMessage(msgFrm);
  fire('prioritizeUnreadSync', msg.gid);
  return id;
};

/**
 * 请求历史消息
 * @static
 * @param {number} uid 会话ID
 * @param {number} sid 消息ID: 从哪个消息向前拉取，传0表示从最新一条消息开始拉取。
 * @param {number} amount 拉取的条数
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="requireHistoryMessage" %}{% endlanying_code_snippet %}
 */
const historyRequestGate = createHistoryRequestGate();
const HISTORY_REQUEST_TIMEOUT = 30000;
const historyRequestTimers = new Map();

const finishHistoryRequest = (sid) => {
  const key = `${sid}`;
  const timer = historyRequestTimers.get(key);
  if (timer) clearTimeout(timer);
  historyRequestTimers.delete(key);
  historyRequestGate.finish(key);
};

const resetHistoryRequests = () => {
  historyRequestTimers.forEach((timer) => clearTimeout(timer));
  historyRequestTimers.clear();
  historyRequestGate.reset();
};

bind('imHistoryBatchComplete', ({ sid } = {}) => finishHistoryRequest(sid));
bind('imHistoryBatchFailed', ({ sid } = {}) => finishHistoryRequest(sid));
bind('loginSuccess', resetHistoryRequests);
bind('logout', resetHistoryRequests);

const requireHistoryMessage = (uid, sid, amount) => {
  if (!io.isConnected()) return false;
  if (!historyRequestGate.begin(uid)) {
    log.warn('History request is already in flight:', `${uid}`);
    return false;
  }
  try {
    const msgFrm = makeHistorySyncul(uid, sid, amount);
    io.sendMessage(msgFrm);
    fire('prioritizeUnreadSync', uid);
    const key = `${uid}`;
    historyRequestTimers.set(
      key,
      setTimeout(() => {
        historyRequestTimers.delete(key);
        log.warn('History request timeout, wait for response or reconnect before retrying:', key, `${sid}`);
        fire('imHistoryRequestBlocked', { sid: key, reason: 'history_request_timeout' });
      }, HISTORY_REQUEST_TIMEOUT)
    );
    return true;
  } catch (error) {
    finishHistoryRequest(uid);
    throw error;
  }
};

/**
 * 群发送@消息
 * @static
 * @param {object} params
 * @param {number} params.gid 群ID
 * @param {string} params.txt 消息文本内容
 * @param {boolean} params.mentionAll 是否@所有人
 * @param {Array.<number>} params.mentionList @的成员ID列表
 * @param {string} params.mentionedMessage @消息的显示内容
 * @param {string} params.mentionedMessage @消息的推送内容
 * @param {string} params.senderNickname 发送者昵称
 * @returns {number} 客户端生成的消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="sendMentionMessage" %}{% endlanying_code_snippet %}
 */
const sendMentionMessage = (params) => {
  const msgFrm = makeMentionMessage(params);
  const meta = msgFrm.payload.meta;
  messageStore.saveSendingGroupMessage(meta);
  const { id } = meta;
  if (!io.isConnected()) {
    messageStore.failSendingGroupMessage(meta);
    return id;
  }
  io.sendMessage(msgFrm);
  return id;
};

/**
 * 发送输入状态消息
 * @static
 * @param {number} uid 会话ID
 * @param {string} status 状态： nothing - 未输入， typing - 正在输入
 * @returns {number} 客户端生成的消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="sendInputStatusMessage" %}{% endlanying_code_snippet %}
 */
const sendInputStatusMessage = (uid, status) => {
  const msgFrm = makeTypingMessage(uid, status);
  const meta = msgFrm.payload.meta;
  // messageStore.saveSendingRosterMessage(meta);
  io.sendMessage(msgFrm);
  const { id } = meta;
  return id;
};

/**
 * 转发消息
 * @static
 * @param {object} param 参数
 * @param {number} param.uid 接收方用户ID（仅转发单聊时设置）
 * @param {number} param.gid 接收方群组ID（仅转发群聊时设置）
 * @param {number} param.mid 要转发的消息ID
 * @returns {number} 客户端生成的消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="forwardMessage" %}{% endlanying_code_snippet %}
 */
const forwardMessage = function (param) {
  //FIXME: bad style param
  const { uid, gid, message } = param;
  const msgFrm = makeForwardMessage(uid, gid, message);
  const meta = msgFrm.payload.meta;
  const { id } = meta;
  let forwardMessageSaved = false;
  const saveForwardMessage = () => {
    if (forwardMessageSaved) return;
    forwardMessageSaved = true;
    if (uid) {
      messageStore.saveSendingRosterMessage(meta);
    } else {
      messageStore.saveSendingGroupMessage(meta);
    }
  };
  const failForwardMessage = (errorReason) => {
    if (uid) {
      messageStore.failSendingRosterMessage(meta, errorReason);
    } else {
      messageStore.failSendingGroupMessage(meta, errorReason);
    }
  };

  if (!io.isConnected()) {
    saveForwardMessage();
    failForwardMessage();
    return id;
  }

  const attach = message.attach;
  if (attach && attach.url) {
    let sign = attach.url.split('sign=')[1];
    const atoken = infoStore.getToken();
    io.fileForward({
      file_sign: sign,
      'access-token': atoken,
      to_id: (uid || gid) - 0,
      to_type: uid ? 1 : 2
    })
      .then((res) => {
        meta.payload.attachment = JSON.stringify({
          ...attach,
          url: res
        });
        saveForwardMessage();
        if (!io.isConnected()) {
          failForwardMessage();
          return;
        }
        io.sendMessage(msgFrm);
      })
      .catch((error) => {
        saveForwardMessage();
        failForwardMessage(error && error.message ? error.message : 'Forward file failed');
      });
  } else {
    saveForwardMessage();
    io.sendMessage(msgFrm);
  }
  return id;
};

const makeSearch = (kw) => {
  const rosterArr = [];
  const groupArr = [];
  // for roster ...
  const allRosterList = rosterStore.getRosterInfoList() || [];
  allRosterList.forEach((roster) => {
    let has = false;
    const { user_id, username, avatar } = roster;
    const allRosterMessage = messageStore.getRosterMessage(user_id) || [];
    allRosterMessage.forEach((meta) => {
      if (has) return;
      const { payload = {} } = meta;
      const { content = '' } = payload;
      if (content.indexOf(kw) >= 0) {
        has = true;
        rosterArr.push({
          user_id,
          username,
          avatar,
          content
        });
      }
    });
    if (!has) {
      if (username && username.indexOf(kw) >= 0) {
        rosterArr.push({
          user_id,
          username,
          avatar
        });
      }
    }
  });
  // for group ...
  const allGroupList = groupStore.getGroupInfoList();
  allGroupList.forEach((group) => {
    let has = false;
    const { group_id, name } = group;
    const allGroupMessage = messageStore.getGroupMessage(group_id) || [];
    allGroupMessage.forEach((meta) => {
      if (has) return;
      const { payload = {} } = meta;
      const { content = '' } = payload;
      if (content.indexOf(kw) >= 0) {
        has = true;
        groupArr.push({
          group_id,
          name,
          content
        });
      }
    });
    if (!has) {
      if (name && name.indexOf(kw) >= 0) {
        groupArr.push({
          group_id,
          name
        });
      }
    }
  });
  return {
    rosterArr,
    groupArr
  };
};

/**
 * 获取消息的状态
 * @static
 * @param {number} cid 会话ID
 * @param {number} mid 消息ID
 * @param {boolean} isGroup 是否是群聊
 * @returns {string} 消息状态:   unread - 未读， delivered - 已投递， read - 已读
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="getMessageStatus" %}{% endlanying_code_snippet %}
 */
const getMessageStatus = (cid, mid, isGroup = false) => {
  let message = {};
  if (isGroup) {
    message = messageStore.getGroupMessageById(cid, mid);
  } else {
    message = messageStore.getRosterMessageById(cid, mid);
  }

  if (message) {
    const status = Object.keys(STATIC_MESSAGE_STATUS)[message.status || 0];
    return status ? status.toLowerCase() : undefined;
  } else {
    return undefined;
  }
};

/**
 * 上传文件
 * @static
 * @param {object} param 参数
 * @param {number} param.group_d 群组ID
 * @param {number} param.toType 接收者类型：rosterAvatar - 用户头像， chat - 聊天文件， groupAvatar - 群头像
 * @param {number} param.to_id 接收者ID
 * @param {File} param.file 文件
 * @param {string} param.fileType 文件类型：file - 普通聊天文件, audio - 语音聊天文件(amr格式),image - 图片聊天文件, video - 视频聊天文件, audio-mp3 - 语音聊天文件(mp3格式), shareFile - 普通共享文件, shareAudio - 语音共享文件, shareImage - 图片共享文件, shareVideo - 视频共享文件
 * @param {number} param.chatType 聊天类型： roster - 单聊, group - 群聊
 * @param {module:types~fileUploadProgress} param.processCallback 上传进度回调
 * @returns {Promise.<module:types~FileUploadResult>} 文件上传结果
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="asyncFileUpload" %}{% endlanying_code_snippet %}
 */
const asyncFileUpload = (param) => {
  return new Promise((success, rej) => {
    const { group_id, to_id, toType, file: origFile, fileType, chatType, processCallback } = param;

    preprocessImage(origFile, fileType, toType)
      .then(function (preprocessed) {
        const { file, width, height } = preprocessed;
        let target = '';
        if (toType === 'rosterAvatar') {
          target = 'fileUploadAvatarUrl';
        } else if (toType == 'chat') {
          target = 'fileUploadChatFileUrl';
        } else {
          // groupAvatar
          target = 'fileUploadGroupAvatarUrl';
        }

        const sendParam = {};
        const token = infoStore.getToken();
        if (toType === 'groupAvatar') {
          sendParam['access-token'] = token;
        }

        // 文件类型 100: 普通聊天文件, 101: 语音聊天文件(amr格式),102: 图片聊天文件, 103: 视频聊天文件, 104: 语音聊天文件(mp3格式)
        // 200: 普通共享文件, 201: 语音共享文件, 202: 图片共享文件, 203: 视频共享文件
        const fileTypes = ['file', 'audio', 'image', 'video', 'audio-mp3'];
        const fileTypes2 = ['shareFile', 'shareAudio', 'shareImage', 'shareVideo'];
        const chatFileTypeIndex = fileTypes.indexOf(fileType);
        const sharedFileTypeIndex = fileTypes2.indexOf(fileType);
        if (chatFileTypeIndex >= 0) sendParam.file_type = chatFileTypeIndex + 100;
        else if (sharedFileTypeIndex >= 0) sendParam.file_type = sharedFileTypeIndex + 200;

        if (group_id) sendParam.group_id = group_id;
        if (chatType == 'group') sendParam.to_type = 2;
        if (chatType == 'roster') sendParam.to_type = 1;
        if (to_id) sendParam.to_id = to_id;
        io[target](sendParam)
          .then((res) => {
            let param = new FormData();
            //Oss has this param, ceph not.
            if (res.oss_body_param && res.oss_body_param.key) {
              param.append('OSSAccessKeyId', res.oss_body_param.OSSAccessKeyId);
              param.append('policy', res.oss_body_param.policy);
              param.append('signature', res.oss_body_param.signature);
              param.append('callback', res.oss_body_param.callback);
              param.append('key', res.oss_body_param.key);
            }
            param.append('file', file);

            let config = {
              headers: { 'Content-Type': 'multipart/form-data' }
            };

            io.asyncFileUpload(res.upload_url, param, config, processCallback)
              .then(() => {
                success({ url: res.download_url, name: file.name, size: file.size, width, height });
              })
              .catch((err) => {
                log.error('Fail to upload file due to ', err);
                rej(err);
              });
          })
          .catch((err) => {
            rej(err);
          });
      })
      .catch(rej); // 预处理出错也 reject
  });
};

/**
 * 拼装图片路径
 * @static
 * @param {object} param
 * @param {string} param.avatar 文件地址
 * @param {string} param.type 类型： roster - 用户, group - 群
 * @param {boolean} param.thumbnail 是否缩略图：默认为true
 * @param {string} param.sdefault 默认图片地址
 * @returns {string} 图片地址
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="getImage" %}{% endlanying_code_snippet %}
 */
const getImage = ({ avatar = '', type = 'roster', thumbnail = true, sdefault = '' }) => {
  if (/^(\/|data:|blob:)/.test(avatar)) {
    return avatar;
  }
  if (!avatar) {
    if (type === 'roster') {
      return sdefault || '/image/roster.png';
    } else {
      return sdefault || '/image/group.png';
    }
  }

  let url = avatar;
  let params = {};
  if (avatar.indexOf('http') !== 0) {
    const app_id = infoStore.getAppid();
    let { ratel } = dnsManager.getServers(app_id) || {};
    if (!/\/$/.test(ratel) && ratel.length > 5) {
      url = ratel + '/file/download/avatar';
    }

    params = Object.assign(params, {
      object_name: avatar
    });
  }

  if (thumbnail) {
    params = Object.assign(params, {
      image_type: 2
    });
  }

  return getChatFile({
    url,
    type: 'image',
    params
  });
};

const getAudio = ({ url, type = 'audio' }) => {
  return getChatFile({
    url,
    type,
    params: {
      format: 'mp3'
    }
  });
};

const getChatFile = ({ url = '', params = {} }) => {
  // console.log("Get chat file: ", type, " ", url);
  if (!url) return '';
  const token = infoStore.getToken();
  const app_id = infoStore.getAppid();
  params = Object.assign(params, {
    'access-token': token,
    app_id
  });

  if (url.indexOf('?') > 0) {
    url += '&';
  } else {
    url += '?';
  }
  return url + queryString.stringify(params);
};

const downloadAudio = ({ url = '', type = 'audio', processCallback = undefined }) => {
  return downloadChatFile({
    url,
    type,
    params: {
      format: 'mp3'
    },
    processCallback
  });
};

const downloadChatFile = ({ url = '', type = '', params = {}, processCallback = undefined }) => {
  console.log('Download chat file: ', type, ' ', url);
  if (!url) return '';
  let config = {
    operation: 'download_file',
    responseType: 'blob'
  };
  return io.fileDownloadChatFileUrl(url, params, config, processCallback);
};

/**
 * 删除会话
 * @static
 * @param {number} id 会话ID
 * @param {boolean} other_devices 是否同时删除其它设备上的会话
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="deleteConversation" %}{% endlanying_code_snippet %}
 */
const deleteConversation = function (id, other_devices = true) {
  fire('deleteConversation', { id, other_devices, source: 'user_operation' });

  const operation = makeConversationOperation(id, other_devices);
  io.sendMessage(operation);
};

/**
 * 解析蓝莺link
 * @static
 * @param {string} link 蓝莺link
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="sysManage",function="aysncParseLinkV2" %}{% endlanying_code_snippet %}
 */
const aysncParseLinkV2 = function (link) {
  let linkServers = dnsManager.getLinkServerList();
  let urls = [];
  for (let i in linkServers) {
    urls.push('https://' + linkServers[i].domain + '/info');
  }
  if (urls.length == 0) {
    urls.push('https://lanyinglink.com/info');
  }
  return tryUrlsWithTimeout(urls, (url) => io.parseLink(url, { link }), 1000, 20000);
};

// ==============================
// 图片预处理函数
// ==============================
const EMPTY_IMAGE_SIZE = { width: 0, height: 0 };
const MAX_MAIN_THREAD_IMAGE_PIXELS = 16 * 1024 * 1024;

const preprocessImage = function (file, fileType, toType) {
  const isImageTarget = fileType == 'image' || fileType == 'shareImage' || toType == 'rosterAvatar' || toType == 'groupAvatar';
  if (!isImageTarget || !file.type.startsWith('image/')) return Promise.resolve({ file, ...EMPTY_IMAGE_SIZE });

  if (file.type !== 'image/webp') {
    return getImageDimensions(file)
      .catch(() => EMPTY_IMAGE_SIZE)
      .then((size) => ({ file, ...size }));
  }

  return getExtendedWebPInfo(file).then(function (info) {
    if (!info.isExtended) {
      return getImageDimensions(file)
        .catch(() => EMPTY_IMAGE_SIZE)
        .then((size) => ({ file, ...size }));
    }
    return webpToPng(file, info);
  });
};

const getExtendedWebPInfo = function (file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const bytes = new Uint8Array(e.target.result);
      const header = String.fromCharCode(...bytes.slice(8, 16)); // 取 WEBP + VP8X
      const isExtended = header === 'WEBPVP8X';
      resolve({
        isExtended,
        width: isExtended ? 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16) : 0,
        height: isExtended ? 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) : 0
      });
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, 30));
  });
};

const getImageDimensionsWithElement = function (file) {
  return new Promise(function (resolve, reject) {
    const objectUrl = window.URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => window.URL.revokeObjectURL(objectUrl);
    img.onload = function () {
      const size = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
      cleanup();
      resolve(size);
    };
    img.onerror = function (error) {
      cleanup();
      reject(error);
    };
    img.src = objectUrl;
  });
};

const getImageDimensions = function (file) {
  if (typeof window.createImageBitmap !== 'function') return getImageDimensionsWithElement(file);
  return window
    .createImageBitmap(file)
    .then((bitmap) => {
      const size = { width: bitmap.width, height: bitmap.height };
      if (bitmap.close) bitmap.close();
      return size;
    })
    .catch(() => getImageDimensionsWithElement(file));
};

const canConvertImageInWorker = function () {
  return (
    typeof window.Worker === 'function' &&
    typeof window.OffscreenCanvas === 'function' &&
    typeof window.createImageBitmap === 'function' &&
    typeof window.OffscreenCanvas.prototype.convertToBlob === 'function'
  );
};

const pngFileName = function (name) {
  const sourceName = typeof name === 'string' && name ? name : 'image';
  if (/\.[^./\\]+$/.test(sourceName)) return sourceName.replace(/\.[^./\\]+$/, '.png');
  return `${sourceName}.png`;
};

const webpToPngInWorker = function (file) {
  return new Promise(function (resolve, reject) {
    const workerSource = `
      self.onmessage = function (event) {
        createImageBitmap(event.data)
          .then(function (bitmap) {
            var width = bitmap.width;
            var height = bitmap.height;
            var canvas = new OffscreenCanvas(width, height);
            canvas.getContext('2d').drawImage(bitmap, 0, 0);
            if (bitmap.close) bitmap.close();
            return canvas.convertToBlob({ type: 'image/png' }).then(function (blob) {
              self.postMessage({ blob: blob, width: width, height: height });
            });
          })
          .catch(function (error) {
            self.postMessage({ error: error && error.message ? error.message : 'Fail to convert WebP image' });
          });
      };
    `;
    const workerUrl = window.URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }));
    let worker;
    try {
      worker = new window.Worker(workerUrl);
    } catch (error) {
      window.URL.revokeObjectURL(workerUrl);
      reject(error);
      return;
    }
    const cleanup = () => {
      worker.terminate();
      window.URL.revokeObjectURL(workerUrl);
    };
    worker.onmessage = function (event) {
      const result = event.data || {};
      cleanup();
      if (result.error || !result.blob) {
        reject(new Error(result.error || 'Fail to convert WebP image'));
        return;
      }
      resolve({
        file: new File([result.blob], pngFileName(file.name), { type: 'image/png' }),
        width: result.width,
        height: result.height
      });
    };
    worker.onerror = function (error) {
      cleanup();
      reject(error);
    };
    worker.postMessage(file);
  });
};

const webpToPngOnMainThread = function (file) {
  return new Promise(function (resolve, reject) {
    const objectUrl = window.URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => window.URL.revokeObjectURL(objectUrl);
    img.onload = function () {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob(function (blob) {
          cleanup();
          if (!blob) {
            reject(new Error('Fail to convert WebP image'));
            return;
          }
          const newFile = new File([blob], pngFileName(file.name), { type: 'image/png' });
          resolve({ file: newFile, width, height });
        }, 'image/png');
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    img.onerror = function (error) {
      cleanup();
      reject(error);
    };
    img.src = objectUrl;
  });
};

const imageTooLargeForMainThread = function () {
  const error = new Error('Image is too large to convert safely in this browser');
  error.code = 'IMAGE_CONVERSION_TOO_LARGE';
  return error;
};

const webpToPng = function (file, info) {
  if (canConvertImageInWorker()) {
    return webpToPngInWorker(file).catch(() => {
      if (info.width * info.height > MAX_MAIN_THREAD_IMAGE_PIXELS) {
        throw imageTooLargeForMainThread();
      }
      return webpToPngOnMainThread(file);
    });
  }
  if (info.width * info.height > MAX_MAIN_THREAD_IMAGE_PIXELS) {
    return Promise.reject(imageTooLargeForMainThread());
  }
  return webpToPngOnMainThread(file);
};

export default {
  getStaticVars,
  getConversationDraft,
  getConversationDraftMention,
  saveConversationDraft,
  touchConversation,
  markMessageUnread,
  sendRosterMessage,
  sendGroupMessage,
  sendMentionMessage,
  sendInputStatusMessage,
  sendMessage: io.sendMessage,
  getNoticeMessage: noticeStore.getNotice,
  getMessageStatus,
  forwardMessage,

  asyncFileUpload,
  requireHistoryMessage,
  makeSearch,
  asyncGetUserAvatarUploadUrl: io.fileUploadAvatarUrl,
  /**
   * 获取上传群头像URL
   * @function
   * @param {object} params 参数
   * @param {number} params.group_id 群组ID
   * @returns {Promise.<module:types~FileUpload>} 文件上传信息
   */
  asyncGetGroupAvatarUploadUrl: io.fileUploadGroupAvatarUrl,
  /**
   * 获取聊天文件上传地址
   * @function
   * @param {object} params 参数
   * @param {number} params.file_type 文件类型: 100 - 普通聊天文件, 101 - 语音聊天文件(amr格式),102 - 图片聊天文件, 103 - 视频聊天文件, 104 - 语音聊天文件(mp3格式)200 - 普通共享文件, 201 - 语音共享文件, 202 - 图片共享文件, 203 - 视频共享文件
   * @param {number} params.to_type 会话类型： 1 - 用户，2 - 群组
   * @param {number} params.to_id 会话ID
   * @returns {Promise.<module:types~FileUpload>} 文件上传信息
   */
  asyncGetFileUploadChatFileUrl: io.fileUploadChatFileUrl,
  asyncQrcode: io.qrcode,
  asyncQrlogin: io.qrlogin,
  asyncQrcodeGroupsign: io.qrcodeGroupsign,
  asyncQrcodeGroupinvite: io.qrcodeGroupinvite,
  asyncWoaQrcode: io.woaqrcode,
  asyncWoaQrcodeStatus: io.woaqrcodestatus,
  asyncWoaQrlogin: io.woaqrlogin,
  asyncWoaIsBind: io.woaIsBind,
  asyncWxlogin: io.wxlogin,
  asyncWxbind: io.wxbind,
  asyncGetStaticContact,
  asyncCanUseQuickReply,
  asyncGetQuickReplyList,
  asyncCreateQuickReply,
  asyncUpdateQuickReply,
  asyncDeleteQuickReply,
  getImage,
  getAudio,
  getChatFile,
  downloadAudio,
  getServers: dnsManager.getServers,
  getLinkServer: infoStore.getLinkServer,
  getAppConfig: dnsManager.getAppConfig,
  getAppStatus: dnsManager.getAppStatus,
  getAccountVerification: dnsManager.getAccountVerification,
  getServerIp: dnsManager.getServerIp,
  asyncWechatUnbind: io.wechatUnbind,
  asyncWechatIsbind: io.wechatIsbind,
  asyncWechatBind: io.wechatBind,
  aysncParseLink: io.parseLink,
  aysncParseLinkV2,
  deleteConversation
};
