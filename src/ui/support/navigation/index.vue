<template>
  <div class="navigation-chat-index">
    <div class="container floating-icon" :class="{ 'floating-icon--latin': isLatinSupportLabel }" @mouseenter="enterContainer" @mouseleave="leaveContainer">
      <div class="icon-button vendor" id="vendor" @click="clickIcon">
        <img class="avatar" :src="manufacturer.show_avatar" @mouseenter="enterIcon" @mouseleave="leaveIcon" />
        <div class="online-text" :class="{ 'online-text--latin': isLatinSupportLabel }">{{ manufacturer.description.title }}</div>
        <div class="tooltip" v-if="manufacturer.description.detail_list.length">
          <p v-for="(item, index) in manufacturer.description.detail_list" v-bind:key="index">{{ item }}</p>
        </div>
      </div>
      <div class="icon-button relation" id="relation" v-if="manufacturer.bussiness.show_icon" @click="clickPhone">
        <div class="icon">
          <img :src="manufacturer.bussiness.show_icon" @mouseenter="enterPhone" @mouseleave="leavePhone" />
        </div>
        <div class="icon-text">{{ manufacturer.bussiness.description.title }}</div>
        <div class="tooltip" v-if="manufacturer.bussiness.description.detail_list.length">
          <p v-for="(item, index) in manufacturer.bussiness.description.detail_list" v-bind:key="index">{{ item }}</p>
        </div>
      </div>
      <div class="icon-button wechat" id="wechat" v-if="manufacturer.wechat.show_icon">
        <div class="icon">
          <img :src="manufacturer.wechat.show_icon" @mouseenter="enterWeChat" @mouseleave="leaveWeChat" />
        </div>
        <div class="icon-text">{{ manufacturer.wechat.description.title }}</div>
        <div
          class="tooltip"
          v-if="manufacturer.wechat.description.official_account || manufacturer.wechat.description.detail_title || manufacturer.wechat.description.detail_list.length"
        >
          <div class="wechat_tooltip_container">
            <div class="qrcode">
              <img :src="manufacturer.wechat.description.official_account" :alt="$t('二维码')" />
            </div>
            <div class="text">
              <p class="summary">{{ manufacturer.wechat.description.detail_title }}</p>
              <p v-for="(item, index) in manufacturer.wechat.description.detail_list" v-bind:key="index">{{ item }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="icon-button packup" id="packup" @click="clickPackup">
        <div class="icon">
          <img src="/image/im_packup.png" class="packup" alt="Packup Icon" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

function buildEmptyManufacturer() {
  return {
    show_avatar: '',
    avatar: '',
    hover_avatar: '',
    description: {
      title: '',
      detail_list: []
    },
    bussiness: {
      show_icon: '',
      icon: '',
      hover_icon: '',
      description: {
        title: '',
        detail_list: []
      }
    },
    wechat: {
      show_icon: '',
      icon: '',
      hover_icon: '',
      description: {
        title: '',
        official_account: '',
        detail_title: '',
        detail_list: []
      }
    }
  };
}

export default {
  name: 'Navigation',
  components: {},

  data() {
    return {
      hasParseManufacturer: false,
      delayPost: false,
      manufacturer: buildEmptyManufacturer()
    };
  },

  mounted() {
    this.manufacturer = this.buildDefaultManufacturer();
    this.initCss();
    this.updateConversationRosterInfo();
  },
  computed: {
    ...mapGetters('login', ['getLoginInStatus']),
    isLatinSupportLabel() {
      return this.$i18n.locale === 'en-US';
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
  },
  watch: {
    getLoginInStatus() {
      this.parseManufacturer();
    },
    '$i18n.locale'() {
      if (!this.hasParseManufacturer) {
        this.manufacturer = this.buildDefaultManufacturer();
        this.initAvatar();
      }
    }
  },
  methods: {
    buildDefaultManufacturer() {
      return {
        show_avatar: '',
        avatar: 'https://www.lanyingim.com/img/logo-single-color-little-shadow.png',
        hover_avatar: 'https://www.lanyingim.com/img/logo-single-color-little-shadow.png',
        description: {
          title: this.$t('在线咨询'),
          detail_list: [this.$t('7*24小时实时在线服务'), this.$t('解答售前 售后问题')]
        },
        bussiness: {
          show_icon: '',
          icon: 'https://www.lanyingim.com/img/phone_black.png',
          hover_icon: 'https://www.lanyingim.com/img/phone_blue.png',
          description: {
            title: this.$t('商务联系'),
            detail_list: [this.$t('官方电话'), '400-666-0162']
          }
        },
        wechat: {
          show_icon: '',
          icon: 'https://www.lanyingim.com/img/qrcode_black.png',
          hover_icon: 'https://www.lanyingim.com/img/qrcode_blue.png',
          description: {
            title: this.$t('企业微信'),
            official_account: 'https://www.lanyingim.com/img/wecom_qrcode.jpg',
            detail_title: this.$t('添加企业微信'),
            detail_list: [this.$t('沟通产品技术和细节，'), this.$t('进群交流大模型AI等话题')]
          }
        }
      };
    },
    applyViewportSize(width, height = '75px') {
      const html = document.documentElement;
      const body = document.body;
      const app = document.getElementById('app');
      const uiRoot = document.querySelector('.ui-index');
      const viewportStyle = `width:${width};height:${height};min-width:${width};min-height:${height};max-width:${width};max-height:${height};margin:0;background-color:transparent;overflow:visible;`;
      const compactStyle = `${viewportStyle}position:fixed;right:0;bottom:0;left:auto;top:auto;transform:none;`;

      html && (html.style.cssText = viewportStyle);
      body && (body.style.cssText = viewportStyle);
      app && (app.style.cssText = compactStyle);
      uiRoot && (uiRoot.style.cssText = compactStyle);
      html && html.style.setProperty('background', 'transparent', 'important');
      html && html.style.setProperty('background-color', 'transparent', 'important');
      body && body.style.setProperty('background', 'transparent', 'important');
      body && body.style.setProperty('background-color', 'transparent', 'important');
      app && app.style.setProperty('background', 'transparent', 'important');
      app && app.style.setProperty('background-color', 'transparent', 'important');
      uiRoot && uiRoot.style.setProperty('background', 'transparent', 'important');
      uiRoot && uiRoot.style.setProperty('background-color', 'transparent', 'important');
    },
    updateConversationRosterInfo() {
      this.$store.getters.im.rosterManage.asyncGetRosterInfo(this.getApp().getLinkUid(), true).then((res) => {
        this.parseManufacturer();
      });
    },
    initCss() {
      this.applyViewportSize('75px');
      if (this.checkMobile) {
        const app = document.getElementById('app');
        app && (app.style.borderRadius = '0px');
      }
    },
    mergeJson(obj1, obj2) {
      let merged = { ...obj1 };
      for (let key in obj2) {
        if (Object.prototype.hasOwnProperty.call(obj2, key)) {
          if (typeof obj2[key] === 'object' && obj2[key] !== null && !Array.isArray(obj2[key])) {
            if (typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key])) {
              merged[key] = this.mergeJson(merged[key], obj2[key]);
            } else {
              merged[key] = this.mergeJson({}, obj2[key]);
            }
          } else {
            merged[key] = obj2[key];
          }
        }
      }
      return merged;
    },

    initAvatar() {
      if (this.manufacturer && !this.hasParseManufacturer) {
        if (!this.manufacturer.avatar) {
          this.manufacturer.avatar = 'https://www.lanyingim.com/img/logo-single-color-little-shadow.png';
        }
        if (this.manufacturer.avatar) {
          this.manufacturer.show_avatar = this.manufacturer.avatar;
        }
        if (this.manufacturer.bussiness.icon) {
          this.manufacturer.bussiness.show_icon = this.manufacturer.bussiness.icon;
        }
        if (this.manufacturer.wechat.icon) {
          this.manufacturer.wechat.show_icon = this.manufacturer.wechat.icon;
        }
      }
    },

    parseManufacturer() {
      if (!this.hasParseManufacturer && this.getApp().isIMLogin() && this.getApp().getLinkUid()) {
        let info = this.$store.getters.im.rosterManage.getRosterInfo(this.getApp().getLinkUid());
        if (info && info.public_info) {
          try {
            let public_info = JSON.parse(info.public_info);
            if (!public_info.manufacturer) {
              this.initAvatar();
            } else {
              //console.log('Use manufacturer:', JSON.stringify(public_info.manufacturer));
              this.manufacturer = this.mergeJson(this.manufacturer, public_info.manufacturer);
              //console.log('mergeJson finish:', JSON.stringify(this.manufacturer));
              this.initAvatar();
              this.hasParseManufacturer = true;
            }
          } catch (ex) {
            this.initAvatar();
          }
        } else {
          this.initAvatar();
        }
      } else {
        this.initAvatar();
      }
    },
    getApp() {
      return this.$parent;
    },

    notifySnapbarResize(state) {
      parent.postMessage(
        JSON.stringify({
          type: 'tooltip',
          state
        }),
        '*'
      );
    },

    enterContainer() {
      let _this = this;
      this.applyViewportSize('640px', '360px');
      if (!this.delayPost) {
        this.delayPost = true;
        setTimeout(() => {
          _this.delayPost = false;
        }, 200);
        this.notifySnapbarResize('show');
      }
    },

    leaveContainer() {
      let _this = this;
      this.applyViewportSize('75px');
      if (!this.delayPost) {
        this.delayPost = true;
        setTimeout(() => {
          _this.delayPost = false;
        }, 200);
        this.notifySnapbarResize('hidden');
      }
    },

    clickIcon() {
      this.applyViewportSize('640px', '360px');
      this.notifySnapbarResize('show');
      this.$store.dispatch('login/actionChangeAppStatus', 'support');
      parent.postMessage(
        JSON.stringify({
          type: 'lanying_toggle_chat',
          size: 'large'
        }),
        '*'
      );
    },

    enterIcon() {
      if (this.manufacturer && this.manufacturer.hover_avatar) {
        this.manufacturer.show_avatar = this.manufacturer.hover_avatar;
      }
    },

    leaveIcon() {
      if (this.manufacturer && this.manufacturer.avatar) {
        this.manufacturer.show_avatar = this.manufacturer.avatar;
      }
    },

    clickPhone() {
      var phone_number = this.manufacturer.bussiness.phone_number;
      if (!phone_number && this.manufacturer.bussiness.description.detail_list.length > 0) {
        phone_number = this.manufacturer.bussiness.description.detail_list[1];
      }
      parent.postMessage(
        JSON.stringify({
          type: 'phone',
          number: phone_number.replaceAll('-', '')
        }),
        '*'
      );
    },

    enterPhone() {
      if (this.manufacturer && this.manufacturer.bussiness && this.manufacturer.bussiness.hover_icon) {
        this.manufacturer.bussiness.show_icon = this.manufacturer.bussiness.hover_icon;
      }
    },

    leavePhone() {
      if (this.manufacturer && this.manufacturer.bussiness && this.manufacturer.bussiness.icon) {
        this.manufacturer.bussiness.show_icon = this.manufacturer.bussiness.icon;
      }
    },

    enterWeChat() {
      if (this.manufacturer && this.manufacturer.wechat && this.manufacturer.wechat.hover_icon) {
        this.manufacturer.wechat.show_icon = this.manufacturer.wechat.hover_icon;
      }
    },

    leaveWeChat() {
      if (this.manufacturer && this.manufacturer.wechat && this.manufacturer.wechat.icon) {
        this.manufacturer.wechat.show_icon = this.manufacturer.wechat.icon;
      }
    },

    clickPackup() {
      this.applyViewportSize('75px');
      this.notifySnapbarResize('hidden');
      this.$store.dispatch('login/actionChangeAppStatus', 'minimize');
      parent.postMessage(
        JSON.stringify({
          type: 'lanying_toggle_chat',
          size: 'minimize'
        }),
        '*'
      );
    }
  }
};
</script>

<style scoped>
.navigation-chat-index {
  width: 75px;
  height: 75px;
  min-width: 75px;
  min-height: 75px;
  background: transparent;
  overflow: visible;
}

.container {
  display: flex;
  align-items: center;
  color: #333333;
  width: 72px;
  height: 300px;
}

.im_packup {
  width: 20px;
  height: 10px;
  cursor: pointer;
  background-image: url(/image/im_packup.png);
  background-size: 20px 10px;
  position: fixed;
  bottom: 350px;
  right: 35px;
}

.qrcode {
  flex: 1;
}

.qrcode img {
  max-width: 100%;
  height: auto;
}

.text {
  flex: 2;
  padding: 10px;
}

.text p {
  margin: 0;
}

body {
  pointer-events: none;
  width: 75px;
  height: 75px;
  overflow: visible;
}

/* 客服头像（包括阴影效果和圆形形状） */
.avatar {
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0);
  /* margin-bottom: 5px; */
}

/* 在线咨询文字（竖排显示，每行一个字） */
.online-text {
  font-weight: bold;
  font-size: 16px;
  color: #0000bf;
  writing-mode: vertical-rl;
  text-orientation: upright;
  padding-top: 5px;
  /* padding-bottom: 5px; */
  letter-spacing: 5px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
  -moz-user-select: none; /* Firefox */
  -webkit-user-select: none; /* Chrome, Safari, and Opera */
  -ms-user-select: none; /* Internet Explorer/Edge */
}

.online-text--latin {
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  font-size: 10px;
  line-height: 1.15;
  letter-spacing: 0;
  padding-top: 0;
  white-space: normal;
  text-overflow: clip;
  overflow: visible;
  overflow-wrap: normal;
  word-break: keep-all;
  text-align: center;
  max-width: 36px;
  margin: 0 auto;
}

/* 浮动图标容器 */
.floating-icon {
  pointer-events: auto;
  width: 40px;
  height: auto;
  min-height: 0;
  max-height: 260px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.3); /* 调整阴影参数以偏向右下角 */
  border-radius: 50px; /* 将 border-radius 设置为 50px，使其成为长药丸形状 */
  border: 1px solid rgba(0, 0, 0, 0.2);
  padding-top: 14px;
  padding-bottom: 4px;
  padding-left: 5px;
  padding-right: 5px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer; /* 添加鼠标指针样式以表示可以点击 */
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.floating-icon--latin {
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  height: auto;
  min-height: 184px;
  border-radius: 27px;
  box-sizing: border-box;
  padding-left: 6px;
  padding-right: 6px;
  padding-top: 10px;
  padding-bottom: 10px;
  align-items: center;
  justify-content: center;
}

.floating-icon--latin .icon-button {
  min-width: 0;
}

.floating-icon--latin .icon-button.vendor {
  width: 100%;
  flex: 1;
  min-height: 0;
  justify-content: space-evenly;
}

.floating-icon--latin .avatar {
  width: 40px;
  height: 40px;
}

/* 图标按钮样式 */
.icon-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  min-width: 42px;
  overflow: visible;
  /* margin-bottom: 5px; */
}

.icon-button .icon:hover {
  background-color: rgba(215, 215, 215, 0.8);
  border-radius: 50%; /* 设置为50%以使头像成为圆形 */
}

.icon {
  padding: 4px;
  width: 26px;
  height: 26px;
}

.icon img {
  width: 100%;
  height: 100%;
  text-align: center;
}

.packup {
  padding-right: 0.5px;
  max-width: 85%;
  max-height: 85%;
}

.wechat .icon img {
  margin-top: 10%;
  width: 80%;
  height: 80%;
}

.icon-text {
  font-size: 10px;
}

.text {
  font-size: 12px;
}

/* 提示浮层样式 */
.tooltip {
  position: absolute;
  right: calc(100% + 12px);
  left: auto;
  background: rgba(19, 41, 75, 0.96);
  color: var(--ly-bg-white);
  padding: 10px 12px;
  border-radius: 12px;
  display: none;
  border: 1px solid rgba(19, 41, 75, 0.2);
  box-shadow: 0 12px 32px rgba(19, 41, 75, 0.14);
  backdrop-filter: blur(8px);
  min-width: 212px;
  z-index: 1001;
  box-sizing: border-box;
  white-space: nowrap;
}

.tooltip p {
  font-size: 12px;
  line-height: 1.5;
  margin-top: 0px; /* 增量为5px，你可以根据需要调整 */
  margin-bottom: 5px; /* 增量为5px，你可以根据需要调整 */
}

/* 特定元素的样式 */
.wechat .tooltip {
  top: -50px;
  width: 272px;
  min-width: 272px;
  white-space: normal;
}

.vendor .tooltip {
  top: 10px;
  padding: 20px;
}

.relation .tooltip {
  top: -10px;
  padding: 20px;
}

.icon-button:hover .tooltip {
  display: block;
}

.wechat_tooltip_container {
  display: flex;
  align-items: center;
  white-space: normal;
}

.wechat_tooltip_container .qrcode {
  flex: 1;
  min-width: 84px;
}

.wechat_tooltip_container .qrcode img {
  max-width: 100%;
  height: auto;
}

.wechat_tooltip_container .text {
  flex: 2;
  min-width: 156px;
  padding: 10px;
  color: var(--ly-bg-white);
}

.wechat_tooltip_container .text p {
  margin: 0;
}

.summary {
  font-weight: bold;
  font-size: 14px;
}

.parent {
  pointer-events: none; /* 背景不响应鼠标事件 */
  background: transparent;
}
.body {
  background: transparent;
  pointer-events: none; /* 背景不响应鼠标事件 */
}
.floating-icon {
  pointer-events: auto; /* 背景不响应鼠标事件 */
}
html {
  background: transparent;
  pointer-events: none; /* 背景不响应鼠标事件 */
}
</style>
