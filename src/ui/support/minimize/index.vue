<template>
  <div class="chat-index support-content-chat-index">
    <div class="minimize-ui" :class="{ 'minimize-ui--disabled': isPendingNavigationLoad }" @click="clickMinimize">
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
      parseAvatar: false,
      autoOpeningNavigation: false
    };
  },
  mounted() {
    this.initCss();
    this.updateIcon();
    this.maybeAutoOpenNavigation();
  },

  computed: {
    ...mapGetters('login', ['getLoginInStatus']),
    isPendingNavigationLoad() {
      if (!this.getApp()) {
        return false;
      }
      return this.autoOpeningNavigation || (this.getApp().shouldAutoExpandSupportNavigation && this.getApp().shouldAutoExpandSupportNavigation());
    }
  },

  watch: {
    getLoginInStatus() {
      this.updateIcon();
      this.maybeAutoOpenNavigation();
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
      const html = document.documentElement;
      const body = document.body;
      const app = document.getElementById('app');
      const uiRoot = document.querySelector('.ui-index');
      const compactStyle = 'width:75px;height:75px;min-width:75px;min-height:75px;max-width:75px;max-height:75px;margin:0;background-color:transparent;overflow:visible;';
      const fixedCompactStyle = `${compactStyle}position:fixed;right:0;bottom:0;left:auto;top:auto;transform:none;`;

      html && (html.style.cssText = compactStyle);
      body && (body.style.cssText = compactStyle);
      app && (app.style.cssText = fixedCompactStyle);
      uiRoot && (uiRoot.style.cssText = fixedCompactStyle);
      html && html.style.setProperty('background', 'transparent', 'important');
      html && html.style.setProperty('background-color', 'transparent', 'important');
      body && body.style.setProperty('background', 'transparent', 'important');
      body && body.style.setProperty('background-color', 'transparent', 'important');
      app && app.style.setProperty('background', 'transparent', 'important');
      app && app.style.setProperty('background-color', 'transparent', 'important');
      uiRoot && uiRoot.style.setProperty('background', 'transparent', 'important');
      uiRoot && uiRoot.style.setProperty('background-color', 'transparent', 'important');
      if (this.checkMobile()) {
        app && (app.style.borderRadius = '0px');
      }
    },

    clickMinimize() {
      if (this.isPendingNavigationLoad) {
        return;
      }
      if (this.getApp().isIMLogin() || this.getLoginInStatus) {
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

    maybeAutoOpenNavigation() {
      if (!this.getApp().shouldAutoExpandSupportNavigation || !this.getApp().shouldAutoExpandSupportNavigation()) {
        return;
      }
      if (this.autoOpeningNavigation) {
        return;
      }
      if (!this.getApp().isIMLogin() || !this.getApp().getLinkUid()) {
        return;
      }
      this.autoOpeningNavigation = true;
      this.$store.getters.im.rosterManage
        .asyncGetRosterInfo(this.getApp().getLinkUid(), true)
        .catch(() => {
          //
        })
        .finally(() => {
          this.updateIcon();
          this.getApp().consumeAutoExpandSupportNavigation && this.getApp().consumeAutoExpandSupportNavigation();
          this.autoOpeningNavigation = false;
          this.$store.dispatch('login/actionChangeAppStatus', 'navigation');
          parent.postMessage(
            JSON.stringify({
              type: 'lanying_toggle_chat',
              size: 'navigation'
            }),
            '*'
          );
        });
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
  overflow: hidden;
}

.minimize-ui--disabled {
  pointer-events: none;
}

.avatar {
  width: 40px;
  height: 40px;
  object-fit: contain;
  background-color: transparent;
}
</style>
