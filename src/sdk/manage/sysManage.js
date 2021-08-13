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

const getStaticVars = () => statics;

const sendRosterMessage = (msg) => {
  const msgFrm = makeRosterMessage(msg);
  const meta = msgFrm.payload.meta;
  messageStore.saveSendingRosterMessage(meta);
  io.sendMessage(msgFrm);
};

const sendGroupMessage = (msg) => {
  const msgFrm = makeGroupMessage(msg);
  const meta = msgFrm.payload.meta;
  messageStore.saveSendingGroupMessage(meta);
  io.sendMessage(msgFrm);
};

const requireHistoryMessage = (uid, sid, amount) => {
  const msgFrm = makeHistorySyncul(uid, sid, amount);
  io.sendMessage(msgFrm);
};

const sendMentionMessage = (params) => {
  const msgFrm = makeMentionMessage(params);
  const meta = msgFrm.payload.meta;
  messageStore.saveSendingGroupMessage(meta);
  io.sendMessage(msgFrm);
};

const sendInputStatusMessage = (uid, status) => {
  const msgFrm = makeTypingMessage(uid, status);
  // const meta = msgFrm.payload.meta;
  // messageStore.saveSendingRosterMessage(meta);
  io.sendMessage(msgFrm);
};

const forwardMessage = function (param) {
  //FIXME: bad style param
  const { uid, mid, gid } = param;

  let message = undefined;
  if (uid) {
    message = messageStore.getRosterMessageById(uid, mid);
  } else {
    message = messageStore.getGroupMessageById(gid, mid);
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

const getMessageStatus = (cid, mid, isGroup = false) => {
  let message = {};
  if (isGroup) {
    message = messageStore.getGroupMessageById(cid, mid);
  } else {
    message = messageStore.getRosterMessageById(cid, mid);
  }

  const status = Object.keys(STATIC_MESSAGE_STATUS)[message.status];
  return status ? status.toLowerCase() : undefined;
};

const asyncFileUpload = (param) => {
  return new Promise((success, rej) => {
    const { group_id, to_id, toType, file, fileType, chatType } = param;
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

        io.asyncFileUpload(res.upload_url, param, config)
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

const downloadAudio = ({ url = '', type = 'audio' }) => {
  return downloadChatFile({
    url,
    type,
    params: {
      format: 'mp3'
    }
  });
};

const downloadChatFile = ({ url = '', type = '', params = {} }) => {
  console.log('Download chat file: ', type, ' ', url);
  if (!url) return '';
  let config = {
    operation: 'download_file'
  };
  return io.fileDownloadChatFileUrl(url, params, config);
};

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
  asyncGetGroupAvatarUploadUrl: io.fileUploadGroupAvatarUrl,
  asyncGetFileUploadChatFileUrl: io.fileUploadChatFileUrl,
  asyncQrcode: io.qrcode,
  asyncQrlogin: io.qrlogin,
  asyncQrcodeGroupsign: io.qrcodeGroupsign,
  asyncQrcodeGroupinvite: io.qrcodeGroupinvite,
  asyncWxlogin: io.wxlogin,
  asyncWxbind: io.wxbind,
  asyncGetStaticContact: io.getStaticContact,
  getImage,
  getAudio,
  getChatFile,
  downloadAudio,
  getServers: dnsManager.getServers,
  asyncWechatUnbind: io.wechatUnbind,
  asyncWechatIsbind: io.wechatIsbind,
  asyncWechatBind: io.wechatBind,

  deleteConversation
};
