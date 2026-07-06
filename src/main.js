import Vue from 'vue';
import App from './App.vue';

import store from './ui/store';
import axios from 'axios';

import './css/index.css';

import ElementUI from 'element-ui';
import i18n, { setupI18n, t } from './i18n';

Vue.config.productionTip = false;
Vue.prototype.axios = axios;
Vue.use(ElementUI);
setupI18n(Vue);

import VPopover from 'vue-js-popover';
Vue.use(VPopover, { tooltip: true });

Vue.prototype.serr = (err) => {
  let msg = t('error.operationWithReason', { reason: '' }).replace(/:\s*$/, '');
  if (err.message) {
    msg = err.code ? t('common.errorCodeMessage', { code: err.code, message: err.message }) : t('error.genericWithMessage', { message: err.message });
  }
  alert(msg);
};

const app = new Vue({
  render: (h) => h(App),
  store,
  i18n
}).$mount('#app');

export default app;
