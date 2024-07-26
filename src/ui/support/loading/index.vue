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
      document.getElementById('app').style = 'width:100%; height:100%;min-width:100px;min-height:200px;margin-left:0px;background-color: transparent;';
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
