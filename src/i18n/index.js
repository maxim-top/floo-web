import Vue from 'vue';
import VueI18n from 'vue-i18n';
import ElementLocale from 'element-ui/lib/locale';
import elementEn from 'element-ui/lib/locale/lang/en';
import elementZhCn from 'element-ui/lib/locale/lang/zh-CN';
import elementZhTw from 'element-ui/lib/locale/lang/zh-TW';
import { LANGUAGE_OPTIONS, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, messages } from './messages';

Vue.use(VueI18n);

const localeState = Vue.observable({
  locale: resolveInitialLocale()
});

const elementLocaleMap = {
  'zh-CN': elementZhCn,
  'en-US': elementEn,
  'zh-TW': elementZhTw
};

function interpolate(text, params = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => (typeof params[key] === 'undefined' ? `{${key}}` : params[key]));
}

function matchPattern(source, locale) {
  const translators = [
    [/^群id:\s*(.+)$/i, (value) => ({ 'zh-CN': `群id: ${value}`, 'en-US': `Group ID: ${value}`, 'zh-TW': `群ID: ${value}` })],
    [/^群名片:\s*(.+)$/i, (value) => ({ 'zh-CN': `群名片: ${value}`, 'en-US': `Group Card: ${value}`, 'zh-TW': `群名片: ${value}` })],
    [/^昵称[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `昵称: ${value}`, 'en-US': `Nickname: ${value}`, 'zh-TW': `暱稱: ${value}` })],
    [/^用户名[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `用户名: ${value}`, 'en-US': `Username: ${value}`, 'zh-TW': `使用者名稱: ${value}` })],
    [/^服务需要续费:\s*(.+)$/i, (value) => ({ 'zh-CN': `服务需要续费: ${value}`, 'en-US': `Service renewal required: ${value}`, 'zh-TW': `服務需要續費: ${value}` })],
    [/^操作错误:\s*(.+)$/i, (value) => ({ 'zh-CN': `操作错误: ${value}`, 'en-US': `Operation failed: ${value}`, 'zh-TW': `操作錯誤: ${value}` })],
    [/^DNS错误:\s*(.+)$/i, (value) => ({ 'zh-CN': `DNS错误: ${value}`, 'en-US': `DNS error: ${value}`, 'zh-TW': `DNS錯誤: ${value}` })],
    [/^用户错误:\s*(.+)$/i, (value) => ({ 'zh-CN': `用户错误: ${value}`, 'en-US': `User error: ${value}`, 'zh-TW': `使用者錯誤: ${value}` })],
    [/^设备绑定成功:\s*(.+)$/i, (value) => ({ 'zh-CN': `设备绑定成功: ${value}`, 'en-US': `Device bound: ${value}`, 'zh-TW': `裝置綁定成功: ${value}` })],
    [/^设备解绑成功:\s*(.+)$/i, (value) => ({ 'zh-CN': `设备解绑成功: ${value}`, 'en-US': `Device unbound: ${value}`, 'zh-TW': `裝置解除綁定成功: ${value}` })],
    [/^设备绑定失败:\s*(.+)$/i, (value) => ({ 'zh-CN': `设备绑定失败: ${value}`, 'en-US': `Device bind failed: ${value}`, 'zh-TW': `裝置綁定失敗: ${value}` })],
    [/^设备解绑失败:\s*(.+)$/i, (value) => ({ 'zh-CN': `设备解绑失败: ${value}`, 'en-US': `Device unbind failed: ${value}`, 'zh-TW': `裝置解除綁定失敗: ${value}` })],
    [/^Link无效[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `Link无效： ${value}`, 'en-US': `Invalid link: ${value}`, 'zh-TW': `Link無效： ${value}` })],
    [/^认证失败[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `认证失败：${value}`, 'en-US': `Verification failed: ${value}`, 'zh-TW': `認證失敗：${value}` })],
    [/^绑定失败[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `绑定失败：${value}`, 'en-US': `Bind failed: ${value}`, 'zh-TW': `綁定失敗：${value}` })],
    [/^密码验证失败[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `密码验证失败：${value}`, 'en-US': `Password verification failed: ${value}`, 'zh-TW': `密碼驗證失敗：${value}` })],
    [/^发送失败[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `发送失败：${value}`, 'en-US': `Send failed: ${value}`, 'zh-TW': `發送失敗：${value}` })],
    [/^错误[:：]\s*(.+)$/i, (value) => ({ 'zh-CN': `错误:${value}`, 'en-US': `Error: ${value}`, 'zh-TW': `錯誤:${value}` })],
    [/^您已绑定手机号\s*(.+)$/i, (value) => ({ 'zh-CN': `您已绑定手机号 ${value}`, 'en-US': `Current bound phone ${value}`, 'zh-TW': `您已綁定手機號 ${value}` })],
    [/^第(\d+)登录重试中\.\.\.$/, (value) => ({ 'zh-CN': `第${value}登录重试中...`, 'en-US': `Retrying login ${value}...`, 'zh-TW': `第${value}次登入重試中...` })]
  ];

  for (const [pattern, formatter] of translators) {
    const matched = source.match(pattern);
    if (matched) {
      const result = formatter(matched[1], matched);
      return result[locale] || result['zh-CN'] || source;
    }
  }

  return null;
}

export function normalizeLocale(input) {
  if (!input || typeof input !== 'string') {
    return 'zh-CN';
  }

  const locale = input.trim();
  if (SUPPORTED_LOCALES.includes(locale)) {
    return locale;
  }

  const lower = locale.toLowerCase();
  if (lower.startsWith('zh-hk') || lower.startsWith('zh-mo') || lower.startsWith('zh-tw') || lower.includes('hant')) {
    return 'zh-TW';
  }
  if (lower.startsWith('en')) {
    return 'en-US';
  }
  if (lower.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'zh-CN';
}

function readStoredLocale() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY) || '';
  } catch (ex) {
    return '';
  }
}

function writeStoredLocale(locale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (ex) {
    //
  }
}

function resolveInitialLocale() {
  const stored = readStoredLocale();
  if (stored) {
    return normalizeLocale(stored);
  }
  if (typeof navigator !== 'undefined') {
    const list = Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : [navigator.language];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'string') {
        continue;
      }
      const locale = item.trim();
      if (!locale) {
        continue;
      }
      const lower = locale.toLowerCase();
      if (SUPPORTED_LOCALES.includes(locale)) {
        return locale;
      }
      if (lower.startsWith('zh-hk') || lower.startsWith('zh-mo') || lower.startsWith('zh-tw') || lower.includes('hant')) {
        return 'zh-TW';
      }
      if (lower.startsWith('en')) {
        return 'en-US';
      }
      if (lower.startsWith('zh')) {
        return 'zh-CN';
      }
    }
  }
  return 'zh-CN';
}

function getLocaleTable(locale = localeState.locale) {
  return messages[locale] || messages['zh-CN'] || {};
}

function syncDocumentLanguage(locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale);
  }
}

function syncElementLocale(locale) {
  ElementLocale.use(elementLocaleMap[locale] || elementZhCn);
}

export const i18n = new VueI18n({
  locale: localeState.locale,
  fallbackLocale: 'zh-CN',
  silentFallbackWarn: true,
  messages
});

syncDocumentLanguage(localeState.locale);
syncElementLocale(localeState.locale);

export function getLocale() {
  return localeState.locale;
}

export function te(key) {
  return i18n.te(key, localeState.locale) || i18n.te(key, 'zh-CN');
}

export function t(key, params) {
  if (te(key)) {
    return i18n.t(key, params);
  }
  return interpolate(key, params);
}

export function translateText(input, locale = getLocale()) {
  if (typeof input !== 'string') {
    return input;
  }

  const source = input.trim();
  if (!source) {
    return input;
  }

  const table = getLocaleTable(locale);
  const sourceTable = messages['zh-CN'] || {};
  let translated = null;
  if (Object.prototype.hasOwnProperty.call(table, source)) {
    translated = table[source];
  } else if (Object.prototype.hasOwnProperty.call(sourceTable, source)) {
    translated = (messages[locale] || sourceTable)[source] || sourceTable[source];
  } else {
    translated = matchPattern(source, locale) || source;
  }

  const prefix = input.match(/^\s*/)[0];
  const suffix = input.match(/\s*$/)[0];
  return `${prefix}${translated}${suffix}`;
}

function translateOptions(options = {}) {
  const next = Object.assign({}, options);
  ['message', 'title', 'confirmButtonText', 'cancelButtonText', 'inputErrorMessage'].forEach((field) => {
    if (typeof next[field] === 'string') {
      next[field] = translateText(next[field]);
    }
  });
  return next;
}

function patchAlert() {
  if (typeof window === 'undefined' || window.__ly_i18n_alert_patched__) return;
  const nativeAlert = window.alert.bind(window);
  window.alert = (message) => nativeAlert(translateText(message));
  window.__ly_i18n_alert_patched__ = true;
}

function patchMessageApi(VueRef) {
  const originalMessage = VueRef.prototype.$message;
  if (!originalMessage || originalMessage.__ly_i18n_patched__) return;

  const wrapMessageInput = (input) => {
    if (typeof input === 'string') {
      return translateText(input);
    }
    if (input && typeof input === 'object') {
      return translateOptions(input);
    }
    return input;
  };

  const wrapped = function wrappedMessage(input) {
    return originalMessage.call(this, wrapMessageInput(input));
  };

  ['success', 'warning', 'info', 'error'].forEach((level) => {
    if (typeof originalMessage[level] === 'function') {
      wrapped[level] = (input) => originalMessage[level](wrapMessageInput(input));
    }
  });

  wrapped.closeAll = originalMessage.closeAll ? originalMessage.closeAll.bind(originalMessage) : undefined;
  wrapped.__ly_i18n_patched__ = true;
  VueRef.prototype.$message = wrapped;

  const wrapBoxMethod = (methodName) => {
    const original = VueRef.prototype[methodName];
    if (typeof original !== 'function' || original.__ly_i18n_patched__) return;

    const wrappedMethod = function wrappedBox(message, title, options) {
      return original.call(this, translateText(message), translateText(title), translateOptions(options));
    };

    wrappedMethod.__ly_i18n_patched__ = true;
    VueRef.prototype[methodName] = wrappedMethod;
  };

  wrapBoxMethod('$confirm');
  wrapBoxMethod('$prompt');
}

export function setLocale(locale) {
  const normalized = normalizeLocale(locale);
  localeState.locale = normalized;
  i18n.locale = normalized;
  writeStoredLocale(normalized);
  syncDocumentLanguage(normalized);
  syncElementLocale(normalized);
}

export function setupI18n(VueRef) {
  VueRef.prototype.$setLocale = function setAppLocale(locale) {
    setLocale(locale);
  };
  VueRef.prototype.$getLocale = function getAppLocale() {
    return getLocale();
  };
  VueRef.prototype.$localeState = localeState;
  VueRef.prototype.$translateText = function translateSourceText(text) {
    return translateText(text);
  };

  patchAlert();
  patchMessageApi(VueRef);
}

export function formatLocaleLabel(locale) {
  return i18n.t(`settings.languageOption.${normalizeLocale(locale)}`);
}

export { LANGUAGE_OPTIONS, localeState };

export default i18n;
