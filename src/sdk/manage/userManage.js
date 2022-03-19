import http from '../core/base/io/index';
import { infoStore, recentStore } from '../utils/store';
/**
 * @module userManage
 */
/**
 * 获取登录用户的token
 * @static
 * @returns {string} 用户的token
 */
const getToken = () => infoStore.getToken();
/**
 * 获取登录用户的uid
 * @static
 * @returns {number} 用户ID
 */
const getUid = () => infoStore.getUid();
/**
 * 获取appid
 * @static
 * @returns {string} APP ID
 */
const getAppid = () => infoStore.getAppid();
/**
 * 获取最近会话列表
 * @static
 * @returns {Array.<module:types~ConversationItem>}
 */
const getConversationList = () => recentStore.getRecents();
const getDeviceSN = () => infoStore.getDeviceSN();

export default {
  getToken,
  getUid,
  getAppid,
  getConversationList,
  deleteToken: infoStore.deleteToken,

  getDeviceSN,
  asyncBindDeviceToken: http.bindDeviceToken,
  asyncUnbindDeviceToken: http.unbindDeviceToken,

  asyncTokenUser: http.tokenUser,
  asyncTokenId: http.tokenId,
  asyncRegister: http.userRegister,
  asyncUserBindMobile: http.userBindMobile,
  asyncUserUpdateMobile: http.userUpdateMobile,
  asyncUserSendSms: http.userSendSms,
  asyncCaptchaSms: http.captchaSms,
  asyncUserNameCheck: http.userNameCheck,
  asyncUserMobileBind: http.userMobileBind,
  asyncUserMobileBindSign: http.userMobileBindSign,
  asyncUserMobileLogin: http.userMobileLogin,
  asyncCaptchaImagePost: http.captchaImagePost,
  asyncUpdateAuthmode: http.userAuthmode,
  /**
   * 更新头像
   * @function
   * @param {object} params 参数
   * @param {string} params.avatar 头像 url
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateAvatar: http.userAvatar,
  asyncUpdateMobile: http.userMobile,
  /**
   * 更新昵称
   * @function
   * @param {object} params 参数
   * @param {string} params.nick_name 昵称
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateNickName: http.userNickname,
  /**
   * 获取用户profile
   * @function
   * @returns {Promise.<module:types~UserProfile>} 用户信息
   */
  asyncGetProfile: http.userProfile,
  /**
   * 更新用户profile
   * @function
   * @param {object} params
   * @param {string} params.description - 描述信息
   * @param {string} params.nick_name - 昵称
   * @param {string} params.private_info - 私有信息，仅自己可见
   * @param {string} params.public_info - 公开信息，好友和陌生人可见
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateProfile: http.userProfilePost,
  /**
   * 获取用户设置信息
   * @function
   * @returns {Promise.<module:types~UserSettings>} 用户信息
   */
  asyncGetSettings: http.userSettings,
  /**
   * 修改用户设置
   * @function
   * @param {module:types~UserSettings} settings 更新的设置
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUpdateSettings: http.userSettingsPost
};
