import Vue from 'vue';
import App from './App.vue';

import store from './ui/store';
import axios from 'axios';

import './css/index.css';

import ElementUI from 'element-ui';

Vue.config.productionTip = false;
Vue.prototype.axios = axios;
Vue.use(ElementUI);

import VPopover from 'vue-js-popover';
Vue.use(VPopover, { tooltip: true });

Vue.prototype.serr = (err) => {
  let msg = '操作失败';
  if (err.message) {
    msg = err.code ? '错误码:' + err.code + '\n错误:' + err.message : '错误:' + err.message;
  }
  alert(msg);
};

new Vue({
  render: (h) => h(App),
  store
}).$mount('#app');
