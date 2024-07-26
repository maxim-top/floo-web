<template>
  <div class="chat-index support-content-chat-index">
    <div class="skipping-ui">
      <div class="show">
        <img class="logo4" src="/image/splash.png" />
        <div class="tips">
          <div>即将跳转到小程序</div>
          <div>{{ count }}s...</div>
        </div>
        <div class="button" @click="cancleSkip">取消</div>
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
      timer: null
    };
  },
  components: {},
  mounted() {
    this.initCss();
    this.timer = setInterval(() => {
      if (this.count > 1) {
        this.count--;
      } else {
        this.timer && clearInterval(this.timer);
        this.timer = null;
        this.getApp().linkLaunchWXMP();
      }
    }, 1000);
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

    getApp() {
      return this.$parent;
    },

    cancleSkip() {
      this.getApp().setAutoSkip();
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
  height: 40px;
  padding-bottom: 10px;
}
</style>
