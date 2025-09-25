import { request } from '../../../utils/request';
import dnsManager from '../../../manage/dnsManager';
import { infoStore } from '../../../utils/store';

// dns
const getServers = (url, params) => request(url, 'get', params, ['app_id'], true);

// app config
const getAppConfig = (params) => request('/app/config', 'get', params, ['platform']);

// link
const parseLink = (url, params) => request(url, 'get', params, ['link'], true);

// logins
const tokenUser = (params) => request('/token/user', 'post', params, [['mobile', 'name'], 'password']);
const tokenId = (params) => request('/token/id', 'post', params, ['user_id', 'password']);
const userRegister = (params) => request('/user/register/v2', 'post', params, ['username', 'password']);
const userRegisterAnonymous = (params) => request('/user/register/anonymous', 'post', params, ['username', 'password']);
const userBindMobile = (params) => request('/app/user/mobile_bind', 'post', params, ['captcha', 'mobile']);
const userUpdateMobile = (params) => request('/app/user/mobile_update', 'post', params, ['mobile']);
const userGenerateSecretInfo = (params) => request('/app/secret_info', 'post', params, ['expire_seconds', 'secret_text']);
const userSendSecretInfo = (params) => request('/app/secret_info', 'get', params, [], true);

const userSendSms = (params) => request('/app/captcha/sms', 'get', params, ['mobile'], true);
const userNameCheck = (params) => request('/app/user/name_check', 'get', params, ['username'], true);
const userMobileBind = (params) => request('/app/user/mobile_bind', 'post', params, ['captcha', 'mobile']);
const userMobileBindSign = (params) => request('/app/user/mobile_bind_with_sign', 'post', params, ['sign', 'mobile']);
const userMobileLogin = (params) => request('/app/user/info_pwd', 'get', params, ['captcha', 'mobile'], true);
const captchaImagePost = (params) => request('/app/captcha/image', 'post', params, []);
const captchaSms = (params) => request('/app/captcha/sms_web', 'get', params, ['captcha', 'image_id', 'mobile'], true);
const userChangeMobileCheckPassword = (params) => request('/app/user/mobile_prechange_by_password', 'post', params, ['password']);
const userChangeMobileCheckMobile = (params) => request('/app/user/mobile_prechange_by_mobile', 'post', params, ['captcha', 'mobile']);
const userChangeMobile = (params) => request('/app/user/mobile_change', 'post', params, ['captcha', 'mobile', 'sign']);

// wx url link
const generateWXUrlLink = (params) => request('/app/generate_url_link', 'post', params, ['path', 'query']);

// rosters
const rosterAccept = (params) => request('/roster/accept', 'post', params, ['user_id'], true);
const rosterApply = (params) => request('/roster/apply', 'post', params, ['user_id', 'alias']);
const rosterDecline = (params) => request('/roster/decline', 'post', params, ['user_id']);
const rosterDelete = (params) => request('/roster/delete', 'post', params, ['user_id'], true);
const rosterExt = (params) => request('/roster/ext', 'post', params, ['user_id', 'ext']);
const rosterAlias = (params) => request('/roster/ext', 'post', params, ['user_id', 'alias']);
const rosterId = (params) => request('/roster/id', 'get', params, ['user_id']); // 暂时没用
const rosterList = (params) => request('/roster/list', 'get', params, []);
const rosterListPost = (params) => request('/roster/list', 'post', params, ['list']);
const rosterName = (params) => request('/roster/name', 'get', params, ['username']);
const rosterApplylist = (params) => request('/roster/apply/list', 'get', params, ['cursor'], true);
const rosterBlockedlist = (params) => request('/roster/blocked_list', 'get', params, [''], true);
const rosterBlockedAdd = (params) => request('/roster/block', 'post', params, ['user_id'], true);
const rosterBlockeRemove = (params) => request('/roster/unblock', 'post', params, ['user_id'], true);

//groups
const groupAdminAdd = (params) => request('/group/admin/add', 'post', params, ['group_id', 'user_list']);
const groupAdminList = (params) => request('/group/admin_list', 'get', params, ['group_id'], true);
const groupAdminRemove = (params) => request('/group/admin/remove', 'post', params, ['group_id', 'user_list']);
const groupAnnouncement = (params) => request('/group/announcement', 'get', params, ['announcement_id', 'group_id']);
const groupAnnouncementDelete = (params) => request('/group/announcement/delete', 'post', params, ['announcement_id', 'group_id'], true);
const groupAnnouncementEdit = (params) => request('/group/announcement/edit', 'post', params, ['group_id', 'content', 'title']);
const groupAnnouncementList = (params) => request('/group/announcement/list', 'get', params, ['group_id'], true);
const groupCreate = (params) => request('/group/create', 'post', params, ['name']);
const groupDestroy = (params) => request('/group/destroy', 'post', params, ['group_id'], true);
const groupInfo = (params) => request('/group/info', 'get', params, ['group_id']);
const groupInfoAvatar = (params) => request('/group/info/avatar', 'post', params, ['group_id', 'value']);
const groupInfoDdscription = (params) => request('/group/info/description', 'post', params, ['group_id', 'value']);
const groupInfoExt = (params) => request('/group/info/ext', 'post', params, ['group_id', 'value']);
const groupInfoName = (params) => request('/group/info/name', 'post', params, ['group_id', 'value']);
const groupMemberlist = (params) => request('/group/member_list', 'get', params, ['group_id']);
const groupMsgMutemode = (params) => request('/group/msg/mute_mode', 'post', params, ['group_id', 'msg_mute_mode']);
const groupMsgNotdisturb = (params) => request('/group/msg/not_disturb', 'post', params, ['group_id', 'value']);
const groupPubliclist = () => request('/group/public_list', 'get', {}, []);
const groupBannedList = (params) => request('/group/banned_list', 'get', params, ['group_id']);
const groupBab = (params) => request('/group/ban', 'post', params, ['group_id', 'duration', 'user_list']);
const groupUnban = (params) => request('/group/unban', 'post', params, ['group_id', 'user_list']);
const groupSettings = (params) => request('/group/settings', 'get', params, ['group_id']);
const groupSettingsAllowmemberinvitation = (params) => request('/group/settings/allow_member_invitation', 'post', params, ['group_id', 'value']);
const groupSettingsAllowmembermodify = (params) => request('/group/settings/allow_member_modify', 'post', params, ['group_id', 'value']);
const groupSettingsEnablereadack = (params) => request('/group/settings/enable_read_ack', 'post', params, ['group_id', 'value']);
const groupSettingsHistoryvisible = (params) => request('/group/settings/history_visible', 'post', params, ['group_id', 'value']);
const groupSettingsHideMemberInfo = (params) => request('/group/settings/hide_member_info', 'post', params, ['group_id', 'value']);
const groupSettingsRequireadminapproval = (params) => request('/group/settings/require_admin_approval', 'post', params, ['group_id', 'apply_approval']);
const groupSettingsBanAll = (params) => request('/group/settings/ban_all', 'post', params, ['group_id', 'duration']);
const groupSettingsUnBanAll = (params) => request('/group/settings/unban_all', 'post', params, ['group_id']);
const groupTransfer = (params) => request('/group/transfer', 'post', params, ['group_id', 'new_owner']);
const groupUserjoined = (params) => request('/group/user_joined', 'get', params);
const groupApply = (params) => request('/group/apply', 'post', params, ['group_id']);

const groupApplyHandle = (params) => request('/group/apply/handle', 'post', params, ['approval', 'group_id', 'user_id']);

const groupBockedlist = (params) => request('/group/blocked_list', 'get', params, ['group_id']);
const groupBlock = (params) => request('/group/block', 'post', params, ['user_list', 'group_id']);
const groupUnblock = (params) => request('/group/unblock', 'post', params, ['user_list', 'group_id']);
const groupKick = (params) => request('/group/kick', 'post', params, ['user_list', 'group_id']);

///group/blacklist
const groupInvite = (params) => request('/group/invite', 'post', params, ['user_list', 'group_id']);
const groupInviteHandle = (params) => request('/group/invite/handle', 'post', params, ['approval', 'user_id', 'group_id']);
const groupInfoBatch = (params) => request('/group/info/batch', 'post', params, ['group_list']);
const groupMembersDidpayname = (params) => request('/group/members/display_name', 'post', params, ['group_id', 'user_list']);
const groupLeave = (params) => request('/group/leave', 'post', params, ['group_id'], true);
const groupDisplayname = (params) => request('/group/display_name', 'post', params, ['group_id', 'value']);

const groupApplicationlist = (params) => request('/group/application_list', 'post', params, ['group_list']);
const groupInvitationlist = () => request('/group/invitation_list', 'get', {}, []);
const groupFilelist = (params) => request('/group/file/list', 'get', params, ['group_id'], true);
const groupFiledelete = (params) => request('/group/file/delete', 'post', params, ['file_list', 'group_id']);
const groupFileupload = (params) => request('/group/file/upload', 'post', params, ['name', 'size', 'url', 'group_id']);

//
///group/info/batch
const userAuthmode = (params) => request('/user/authmode', 'post', params, ['value'], true);
const userAvatar = (params) => request('/user/avatar', 'post', params, ['avatar']);
const userMobile = (params) => request('/user/mobile', 'post', params, ['mobile'], true);
const userNickname = (params) => request('/user/nickname', 'post', params, ['nick_name'], true);
const userProfile = () => request('/user/profile', 'get', {}, []);
const userProfilePost = (params) => request('/user/profile', 'post', params, []);
const userPush = (params) => request('/user/push', 'post', params, ['value']);
const userPushDetail = (params) => request('/user/push/detail', 'post', params, ['value']);
const userPushLimit = (params) => request('/user/push/limit', 'post', params, ['no_push_end_hour', 'no_push_start_hour']);
const userPushNickname = (params) => request('/user/push/nickname', 'post', params, ['value']);
const userSettings = () => request('/user/settings', 'get', {}, []);
const userSettingsPost = (params) => request('/user/settings', 'post', params, ['user_id']);
const userSounds = (params) => request('/user/sounds', 'post', params, ['value']);
const userVibratory = (params) => request('/user/vibratory', 'post', params, ['value']);
const userChangePassword = (params) => request('/user/change_password', 'post', params, ['old_password', 'new_password']);

const bindDeviceToken = (params) => request('/user/token/bind', 'post', params, ['device_sn', 'device_token', 'notifier_name']);
const unbindDeviceToken = (params) => request('/user/token/unbind', 'post', params, [], true);
const userDelete = (params) => request('/user/delete', 'post', params, ['password']);
const userDeviceList = (params) => request('/user/device/list', 'get', params, [], true);
const userKick = (params) => request('/user/kick', 'post', params, ['device_sn']);

// file upload
const fileForward = (params) => maybeUpdateDownloadUrl(request('/file/upload/forward', 'get', params, ['file_sign', 'access-token', 'to_id', 'to_type'], true));
const asyncFileUpload = (url, params, config, processCallback) => maybeUpdateDownloadUrl(request(maybeRemoveFileDomain(url), 'post', params, [], false, config, processCallback));

//avatar ....
const fileUploadAvatarUrl = (params) => maybeUpdateDownloadUrl(request('/file/upload/avatar/user', 'get', params, [], true));
const fileUploadGroupAvatarUrl = (params) => maybeUpdateDownloadUrl(request('/file/upload/avatar/group', 'get', params, ['group_id'], true));
const fileUploadChatFileUrl = (params) => maybeUpdateDownloadUrl(request('/file/upload/chat', 'get', params, ['file_type', 'to_id', 'to_type'], true));

// file download
const fileDownloadChatFileUrl = (url, params, config, processCallback) => request(maybeRemoveFileDomain(url), 'get', params, [], true, config, processCallback);

// qrcode
const qrcode = (params) => request('/app/qr_code', 'get', params, []);
const qrlogin = (params) => request('/app/qr_login', 'get', params, ['qr_code']);
const qrcodeGroupsign = (params) => request('/app/qrcode/group_sign', 'get', params, ['group_id'], true);
const qrcodeGroupinvite = (params) => request('/app/qrcode/group_invite', 'get', params, ['qr_info'], true);

//wechat official accounts
const woaqrcode = (params) => request('/app/official_account/qrcode', 'get', params, [], true);
const woaqrcodestatus = (params) => request('/app/official_account/qrcode_status', 'get', params, ['qrcode_id'], true);
const woaqrlogin = (params) => request('/app/official_account/login', 'get', params, ['code'], true);
const woaIsBind = () => request('/app/official_account/is_bind', 'get');

// wechat miniprogram
const wxbind = (params) => request('/user/bind_openid', 'get', params, ['open_id'], true);
const wxlogin = (params) => request('/app/wechat_login', 'get', params, ['code'], true);
const getStaticContact = (params) => request('/app/support_staff', 'get', params, [], true);

const wechatUnbind = () => request('/app/wechat/unbind', 'post');
const wechatIsbind = () => request('/app/wechat/is_bind', 'get');
const wechatBind = (params) => request('/app/wechat/bind', 'post', params, ['open_id', 'type']); //type ==== 1 小程序

const getUserVerification = () => request('/app/user_verification', 'get');
const userVerificationByMobile = (params) => request('/app/user_verification_by_mobile', 'post', params, ['mobile', 'captcha']);

const maybeRemoveFileDomain = (url) => {
  if (url && (url.includes('maximtop.com.cn') || url.includes('maximtop.cn'))) {
    var new_url = url.replace(/^https?:\/\/[^/]+/, '');
    return new_url;
  }
  return url;
};

const maybeUpdateDownloadUrl = (requestPromise) => {
  return new Promise((resolve, reject) => {
    requestPromise
      .then((res) => {
        if (res && res.download_url) {
          let url = res.download_url;
          let new_url = maybeRemoveFileDomain(url);
          if (new_url != url) {
            let appId = infoStore.getAppid();
            new_url = dnsManager.getServers(appId).ratel + new_url;
            res.download_url = new_url;
          }
        }
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
export {
  getServers,
  getAppConfig,
  parseLink,
  tokenUser,
  tokenId,
  userRegister,
  userRegisterAnonymous,
  userBindMobile,
  userGenerateSecretInfo,
  userSendSecretInfo,
  userSendSms,
  userNameCheck,
  userMobileBind,
  userMobileBindSign,
  userMobileLogin,
  userUpdateMobile,
  captchaImagePost,
  captchaSms,
  generateWXUrlLink,
  rosterAccept,
  rosterApply,
  rosterDecline,
  rosterDelete,
  rosterExt,
  rosterAlias,
  rosterId,
  rosterList,
  rosterListPost,
  rosterName,
  rosterApplylist,
  rosterBlockedlist,
  rosterBlockedAdd,
  rosterBlockeRemove,
  groupAdminAdd,
  groupAdminList,
  groupAdminRemove,
  groupAnnouncement,
  groupAnnouncementDelete,
  groupAnnouncementEdit,
  groupAnnouncementList,
  groupCreate,
  groupDestroy,
  groupInfo,
  groupInfoAvatar,
  groupInfoDdscription,
  groupInfoExt,
  groupInfoName,
  groupMemberlist,
  groupMsgMutemode,
  groupMsgNotdisturb,
  groupPubliclist,
  groupBannedList,
  groupBab,
  groupUnban,
  groupSettings,
  groupSettingsAllowmemberinvitation,
  groupSettingsAllowmembermodify,
  groupSettingsEnablereadack,
  groupSettingsHistoryvisible,
  groupSettingsHideMemberInfo,
  groupSettingsRequireadminapproval,
  groupSettingsBanAll,
  groupSettingsUnBanAll,
  groupTransfer,
  groupUserjoined,
  groupApply,
  groupApplicationlist,
  groupInvitationlist,
  groupApplyHandle,
  groupBockedlist,
  groupBlock,
  groupUnblock,
  groupKick,
  groupInvite,
  groupInviteHandle,
  groupInfoBatch,
  groupMembersDidpayname,
  groupLeave,
  groupDisplayname,
  groupFilelist,
  groupFiledelete,
  groupFileupload,
  userAuthmode,
  userAvatar,
  userMobile,
  userNickname,
  userProfile,
  userProfilePost,
  userPush,
  userPushDetail,
  userPushLimit,
  userPushNickname,
  userSettings,
  userSettingsPost,
  userSounds,
  userVibratory,
  userChangePassword,
  bindDeviceToken,
  unbindDeviceToken,
  userDelete,
  userDeviceList,
  userKick,
  fileForward,
  asyncFileUpload,
  fileUploadAvatarUrl,
  fileUploadGroupAvatarUrl,
  fileUploadChatFileUrl,
  fileDownloadChatFileUrl,
  qrcode,
  qrlogin,
  qrcodeGroupsign,
  qrcodeGroupinvite,
  woaqrcode,
  woaqrcodestatus,
  woaqrlogin,
  woaIsBind,
  wxbind,
  wxlogin,
  getStaticContact,
  wechatUnbind,
  wechatIsbind,
  wechatBind,
  getUserVerification,
  userVerificationByMobile,
  userChangeMobileCheckPassword,
  userChangeMobileCheckMobile,
  userChangeMobile
};
