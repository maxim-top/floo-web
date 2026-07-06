<template>
  <div class="chat-index support-content-chat-index">
    <div class="skipping-ui">
      <div class="show">
        <img class="logo4" src="/image/splash.png" />
        <div class="tips">
          <div>{{ $t('即将跳转到小程序') }}</div>
          <div>{{ count }}s...</div>
        </div>
        <div class="button" @click="cancleSkip">{{ $t('common.cancel', { origin: '取消' }) }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Skipping',
  data() {
    return {
      count: 3,
      timer: null,
      launched: false,
      cancelled: false
    };
  },
  components: {},
  mounted() {
    this.initCss();
    this.getApp()
      .prepareWXMPLaunch()
      .then((url) => {
        this.tryLaunchWXMP(url);
      })
      .catch((err) => {
        const stage = err && err.url && err.url.indexOf('/app/generate_url_link') > -1 ? 'generate_url_link' : 'secret_info';
        this.getApp().fallbackFromWXMPSkipping(err, stage);
      });
    this.timer = setInterval(() => {
      if (this.launched || this.cancelled || this.getApp().getAppStatus !== 'skipping') {
        this.timer && clearInterval(this.timer);
        this.timer = null;
        return;
      }
      if (this.count > 1) {
        this.count--;
      } else {
        this.timer && clearInterval(this.timer);
        this.timer = null;
        this.count = 0;
        this.getApp().linkLaunchWXMP();
      }
    }, 1000);
  },
  beforeDestroy() {
    this.cancelled = true;
    this.timer && clearInterval(this.timer);
    this.timer = null;
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

    getApp() {
      return this.$parent;
    },

    tryLaunchWXMP(url) {
      if (this.launched || this.cancelled || this.getApp().getAppStatus !== 'skipping') {
        return;
      }
      if (!url || this.getApp().wxmpLaunchUrl !== url || this.getApp().wxmpLaunchLink !== this.getApp().intent.link) {
        return;
      }
      this.launched = true;
      this.timer && clearInterval(this.timer);
      this.timer = null;
      this.getApp().launchWXMPByUrl(url);
    },

    cancleSkip() {
      this.cancelled = true;
      this.getApp().setAutoSkip();
      this.getApp().clearWXMPLaunchState();
      this.timer && clearInterval(this.timer);
      this.timer = null;
      this.$store.dispatch('login/actionChangeAppStatus', 'support');
    }
  }
};
</script>

<style scoped>
.skipping-ui {
  background: rgb(43, 46, 204);
  height: 100%;
}

.show {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tips {
  font-size: 16px;
  line-height: 30px;
  text-align: center;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
}

.button {
  text-align: center;
  border: 0.5px solid gray;
  border-radius: 5px;
  width: 45px;
  color: #fff;
  margin-top: 8px;
}

.logo4 {
  height: 68px;
  width: auto;
  padding-bottom: 14px;
}
</style>
