import * as statics from '../utils/static';
import log from '../utils/log';
import io from '../core/base/io/index';
import { groupStore, infoStore, messageStore, noticeStore, rosterStore } from '../utils/store';
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
import { fire } from '../utils/cusEvent';
import { STATIC_MESSAGE_STATUS } from '../utils/static';

/**
 * @module sysManage
 */

const getStaticVars = () => statics;

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
  io.sendMessage(msgFrm);
  const { id } = meta;
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
  io.sendMessage(msgFrm);
  const { id } = meta;
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
const requireHistoryMessage = (uid, sid, amount) => {
  const msgFrm = makeHistorySyncul(uid, sid, amount);
  io.sendMessage(msgFrm);
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
  io.sendMessage(msgFrm);
  const { id } = meta;
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
  const attach = message.attach;
  if (attach && attach.url) {
    let sign = attach.url.split('sign=')[1];
    const atoken = infoStore.getToken();
    io.fileForward({
      file_sign: sign,
      'access-token': atoken,
      to_id: (uid || gid) - 0,
      to_type: uid ? 1 : 2
    }).then((res) => {
      message.attach.url = res;
      const msgFrm = makeForwardMessage(uid, gid, message);
      const smeta = msgFrm.payload.meta;
      if (uid) {
        messageStore.saveSendingRosterMessage(smeta);
      } else {
        messageStore.saveSendingGroupMessage(smeta);
      }
      io.sendMessage(msgFrm);
      const { id } = smeta;
      return id;
    });
  } else {
    const msgFrm = makeForwardMessage(uid, gid, message);
    const smeta = msgFrm.payload.meta;
    if (uid) {
      messageStore.saveSendingRosterMessage(smeta);
    } else {
      messageStore.saveSendingGroupMessage(smeta);
    }
    io.sendMessage(msgFrm);
    const { id } = smeta;
    return id;
  }
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
      if (username.indexOf(kw) >= 0) {
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
      if (name.indexOf(kw) >= 0) {
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
    const { group_id, to_id, toType, file, fileType, chatType, processCallback } = param;
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
    if (fileType) sendParam.file_type = fileTypes.indexOf(fileType) + 100;
    if (sendParam < 100) sendParam.file_type = fileTypes2.indexOf(fileType) + 200;

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
            success({ url: res.download_url });
          })
          .catch((err) => {
            log.error('Fail to upload file due to ', err);
          });
      })
      .catch((err) => {
        rej(err);
      });
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
  if (/^\//.test(avatar)) {
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
    operation: 'download_file'
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

export default {
  getStaticVars,
  sendRosterMessage,
  sendGroupMessage,
  sendMentionMessage,
  sendInputStatusMessage,
  sendMessage: io.sendMessage,
  getNoticeMessage: noticeStore.getNotice(),
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
  asyncGetStaticContact: io.getStaticContact,
  getImage,
  getAudio,
  getChatFile,
  downloadAudio,
  getServers: dnsManager.getServers,
  getLinkServer: infoStore.getLinkServer,
  getAppConfig: dnsManager.getAppConfig,
  asyncWechatUnbind: io.wechatUnbind,
  asyncWechatIsbind: io.wechatIsbind,
  asyncWechatBind: io.wechatBind,
  aysncParseLink: io.parseLink,

  deleteConversation
};
