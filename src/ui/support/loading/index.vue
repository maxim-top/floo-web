<template>
  <div class="chat-index support-content-chat-index">
    <Header />
    <div class="loading-ui">加载中...</div>
  </div>
</template>

<script>
import Header from '../header';

export default {
  name: 'Loading',
  components: {
    Header
  },
  mounted() {
    this.initCss();
  },
  computed: {},
  methods: {
    initCss() {
      document.getElementById('app').style = 'width:100%; height:100%;min-width:100px;min-height:200px;margin-left:0px;';
      document.body.style = 'background-color: transparent; margin:0px !important;';
      if (this.checkMobile()) {
        document.getElementById('app').style.borderRadius = '0px';
      }
    },
    checkMobile() {
      let u = navigator.userAgent;
      let isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1;
      let isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
      if (isAndroid || isIOS || (document.body.clientHeight > document.body.clientWidth && document.body.clientWidth < 500)) {
        return true;
      } else {
        return false;
      }
    }
  }
};
</script>

<style scoped>
.loading-ui {
  font-size: 20px;
  text-align: center;
  height: 100%;
  vertical-align: middle;
}
</style>
