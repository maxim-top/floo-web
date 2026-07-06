<template>
  <div class="chat-index support-content-chat-index" @click="clickLoading">
    <div class="loading-ui"></div>
  </div>
</template>

<script>
export default {
  name: 'Loading',
  components: {},
  mounted() {
    this.initCss();
  },
  computed: {},
  methods: {
    initCss() {
      const html = document.documentElement;
      const body = document.body;
      const app = document.getElementById('app');
      const uiRoot = document.querySelector('.ui-index');
      const shellStyle =
        'width:100%;height:100%;min-width:100px;min-height:200px;max-width:none;max-height:none;margin:0;background-color:transparent;position:fixed;left:0;top:0;right:0;bottom:0;transform:none;';

      html && (html.style.cssText = 'width:100%;height:100%;margin:0;background-color: transparent;overflow:hidden;');
      body && (body.style.cssText = 'width:100%;height:100%;margin:0 !important;background-color: transparent;overflow:hidden;');
      app && (app.style.cssText = shellStyle);
      uiRoot && (uiRoot.style.cssText = shellStyle);
      if (this.checkMobile()) {
        app && (app.style.borderRadius = '0px');
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
    },

    clickLoading() {
      if (this.checkMobile()) {
        this.$store.dispatch('login/actionChangeAppStatus', 'navigation');
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_toggle_chat',
            size: 'navigation'
          }),
          '*'
        );
      } else {
        // do nothing.
      }
    }
  }
};
</script>

<style scoped>
.loading-ui {
  height: 100%;
  background: rgb(43, 46, 204);
  background-image: url(/image/splash.png);
  background-size: 50px;
  background-position: center;
  background-repeat: no-repeat;
}
</style>
