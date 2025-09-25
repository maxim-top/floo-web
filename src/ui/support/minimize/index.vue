<template>
  <div class="chat-index support-content-chat-index">
    <div class="minimize-ui" @click="clickMinimize">
      <img :src="avatar" class="avatar" />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
export default {
  name: 'Minimize',
  components: {},

  data() {
    return {
      avatar: 'https://www.lanyingim.com/img/logo-single-color-little-shadow.png',
      parseAvatar: false
    };
  },
  mounted() {
    this.initCss();
    this.updateIcon();
  },

  computed: {
    ...mapGetters('login', ['getLoginInStatus'])
  },

  watch: {
    getLoginInStatus() {
      this.updateIcon();
    }
  },

  methods: {
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

    initCss() {
      document.getElementById('app').style = 'width:100%; height:100%;min-width:75px;min-height:75px;margin-left:0px;background-color: transparent;';
      document.body.style = 'background-color: transparent; margin:0px !important;';
      if (this.checkMobile()) {
        document.getElementById('app').style.borderRadius = '0px';
      }
    },

    clickMinimize() {
      if (this.getApp().isIMLogin()) {
        this.$store.dispatch('login/actionChangeAppStatus', 'navigation');
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_toggle_chat',
            size: 'navigation'
          }),
          '*'
        );
      } else {
        window.location.reload();
      }
    },

    updateIcon() {
      if (!this.parseAvatar && this.getApp().isIMLogin() && this.getApp().getLinkUid()) {
        let info = this.$store.getters.im.rosterManage.getRosterInfo(this.getApp().getLinkUid());
        if (info && info.public_info) {
          let jManufacturer = {};
          try {
            jManufacturer = JSON.parse(info.public_info);
            if (jManufacturer && jManufacturer.manufacturer && jManufacturer.manufacturer.avatar) {
              this.avatar = jManufacturer.manufacturer.avatar;
              this.parseAvatar = true;
            }
          } catch (ex) {
            //
          }
        }
      }
    },

    getApp() {
      return this.$parent;
    }
  }
};
</script>

<style scoped>
.minimize-ui {
  position: fixed;
  bottom: 20px;
  right: 20px;
  height: 52px;
  width: 52px;
  display: grid;
  place-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.3); /* 调整阴影参数以偏向右下角 */
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.avatar {
  width: 40px;
  height: 40px;
}
</style>
