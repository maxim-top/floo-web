<template>
  <div class="navigation-chat-index">
    <div class="container floating-icon" @mouseenter="enterContainer" @mouseleave="leaveContainer">
      <div class="icon-button vendor" id="vendor" @click="clickIcon">
        <img class="avatar" :src="manufacturer.show_avatar" @mouseenter="enterIcon" @mouseleave="leaveIcon" />
        <div class="online-text">{{ manufacturer.description.title }}</div>
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
              <img :src="manufacturer.wechat.description.official_account" alt="二维码" />
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

export default {
  name: 'Navigation',
  components: {},

  data() {
    return {
      hasParseManufacturer: false,
      delayPost: false,
      manufacturer: {
        show_avatar: '',
        avatar: 'https://www.lanyingim.com/img/logo-single-color-little-shadow.png',
        hover_avatar: 'https://www.lanyingim.com/img/logo-single-color-little-shadow.png',
        description: {
          title: '在线咨询',
          detail_list: ['7*24小时实时在线服务', '解答售前 售后问题']
        },
        bussiness: {
          show_icon: '',
          icon: 'https://www.lanyingim.com/img/phone_black.png',
          hover_icon: 'https://www.lanyingim.com/img/phone_blue.png',
          description: {
            title: '商务联系',
            detail_list: ['官方电话', '400-666-0162']
          }
        },
        wechat: {
          show_icon: '',
          icon: 'https://www.lanyingim.com/img/qrcode_black.png',
          hover_icon: 'https://www.lanyingim.com/img/qrcode_blue.png',
          description: {
            title: '企业微信',
            official_account: 'https://www.lanyingim.com/img/wecom_qrcode.jpg',
            detail_title: '添加企业微信',
            detail_list: ['沟通产品技术和细节，', '进群交流大模型AI等话题']
          }
        }
      }
    };
  },

  mounted() {
    this.initCss();
    this.updateConversationRosterInfo();
  },
  computed: {
    ...mapGetters('login', ['getLoginInStatus']),
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
    }
  },
  methods: {
    updateConversationRosterInfo() {
      this.$store.getters.im.rosterManage.asyncGetRosterInfo(this.getApp().getLinkUid(), true).then((res) => {
        this.parseManufacturer();
      });
    },
    initCss() {
      document.getElementById('app').style = 'width:100%; height:100%;min-width:75px;min-height:200px;margin-left:0px;background-color: transparent;';
      document.body.style = 'background-color: transparent; margin:0px !important;';
      if (this.checkMobile) {
        document.getElementById('app').style.borderRadius = '0px';
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
              if (!public_info.manufacturer.bussiness) {
                this.manufacturer.bussiness = {};
              }
              if (!public_info.manufacturer.wechat) {
                this.manufacturer.wechat = {};
              }
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

    enterContainer() {
      let _this = this;
      if (!this.delayPost) {
        this.delayPost = true;
        setTimeout(() => {
          _this.delayPost = false;
        }, 200);
        parent.postMessage(
          JSON.stringify({
            type: 'tooltip',
            state: 'show'
          }),
          '*'
        );
      }
    },

    leaveContainer() {
      let _this = this;
      if (!this.delayPost) {
        this.delayPost = true;
        setTimeout(() => {
          _this.delayPost = false;
        }, 200);
        parent.postMessage(
          JSON.stringify({
            type: 'tooltip',
            state: 'hidden'
          }),
          '*'
        );
      }
    },

    clickIcon() {
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
  width: 30px;
  height: 250px;
  background: transparent;
}

.container {
  display: flex;
  align-items: center;
  color: #333333;
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
  width: 340px;
  height: 340px;
  overflow: hidden;
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

/* 浮动图标容器 */
.floating-icon {
  pointer-events: auto;
  width: 40px;
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
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* 图标按钮样式 */
.icon-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  min-width: 40px;
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
  background: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 4px;
  display: none;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.tooltip p {
  font-size: 12px;
  margin-top: 0px; /* 增量为5px，你可以根据需要调整 */
  margin-bottom: 5px; /* 增量为5px，你可以根据需要调整 */
}

/* 特定元素的样式 */
.wechat .tooltip {
  left: -274px;
  top: -50px;
  width: 240px;
}

.vendor .tooltip {
  left: -175px;
  top: 10px;
  padding: 20px;
}

.relation .tooltip {
  top: -10px;
  left: -122px;
  padding: 20px;
}

.icon-button:hover .tooltip {
  display: block;
}

.wechat_tooltip_container {
  display: flex;
  align-items: center;
}

.wechat_tooltip_container .qrcode {
  flex: 1;
}

.wechat_tooltip_container .qrcode img {
  max-width: 100%;
  height: auto;
}

.wechat_tooltip_container .text {
  flex: 2;
  padding: 10px;
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
