const REGISTER_ERROR_MESSAGES = {
  10002: '用户名仅支持字母、数字、下划线、中文组合，且不能是纯数字，不能以 maxim、mta 开头',
  10004: '用户已存在，请直接登录',
  11011: '用户名已被使用，请更换用户名',
  30021: 'License 无效，请联系管理员',
  30022: 'License 已过期，请联系管理员续费',
  30023: 'License 用户数已达上限，请联系管理员',
  40000: 'AppID 不存在，请检查 AppID',
  40001: '当前应用未开放注册，请使用已有账号登录或联系管理员',
  40002: '当前APP用户数已达上限，请使用已有账号登录或联系管理员开通商业版',
  40003: '当前应用状态异常，请联系管理员'
};

export const canLoginAfterRegisterError = (err) => err && (err.code === 10004 || err.code === 11011);

export const getRegisterErrorMessage = (err) => {
  if (!err || !err.code) {
    return t('注册失败，请稍后重试');
  }

  if (err.code === 10002 && err.message && err.message.indexOf('invalid request parameter') < 0) {
    return err.message;
  }

  return t(REGISTER_ERROR_MESSAGES[err.code] || err.message || '注册失败，请检查用户名和密码');
};
import { t } from '../../i18n';
