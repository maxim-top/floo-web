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

  /**
   * 获取设备序号
   * @function
   * @returns {number} 设备序号
   */
  getDeviceSN,
  /**
   * 绑定推送设备
   * @function
   * @param {object} param  绑定请求
   * @param {number} param.device_sn 设备序号
   * @param {string} param.notifier_name 证书名称，即在蓝莺IM控制台内上传证书时候设置的名称。
   * @param {string} param.device_token 推送设备Token
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncBindDeviceToken: http.bindDeviceToken,
  /**
   * 解绑推送设备
   * @function
   * @param {object} param  解绑请求
   * @param {number} param.deviceSn 设备序号
   * @returns {Promise.<boolean>} 是否成功
   */
  asyncUnbindDeviceToken: http.unbindDeviceToken,

  asyncTokenUser: http.tokenUser,
  asyncTokenId: http.tokenId,
  /**
   * 用户注册
   * @function
   * @param {object} opt  用户信息
   * @param {string} opt.username 用户名
   * @param {string} opt.password 密码
   * @returns {Promise.<module:types~UserSettings>} 用户设置
   */
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
