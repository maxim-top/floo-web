<template>
  <div class="header" :style="{ 'border-radius': checkMobile ? '0px' : '10px 10px 0 0' }">
    <!-- <div class="header_title">{{ rosterName }}</div> -->
    <div class="profile-container">
      <el-popover placement="right" trigger="click" width="170" :visible-arrow="false" :append-to-body="false">
        <div class="profile-name">{{ rosterName }}</div>
        <div v-if="!isGroup" class="profile-bio">昵称：{{ this.getRosterInfo.nick_name }}</div>
        <div v-if="!isGroup" class="profile-bio">用户名：{{ this.getRosterInfo.username }}</div>
        <div v-if="!isGroup" class="profile-bio">ID: {{ this.getRosterInfo.user_id }}</div>
        <div v-if="isGroup" class="profile-bio">群id: {{ this.getGroupInfo.group_id }}</div>
        <div v-if="isGroup" class="profile-bio">群主id: {{ this.getGroupInfo.owner_id }}</div>
        <hr />
        <div>
          <span class="profile-tip">公开信息：</span>
          <span v-if="!isGroup" class="profile-bio">{{ this.getRosterInfo.public_info }}</span>
          <span v-if="isGroup" class="profile-bio">{{ this.getGroupInfo.description }}</span>
        </div>
        <div slot="reference">
          <img :src="getRosterAvatar" class="profile-picture" :style="{ filter: useDefaultAvatar ? 'brightness(0) invert(1)' : 'none' }" />
        </div>
      </el-popover>
      <div class="profile-info">
        <el-popover v-model="clVisible" placement="left" trigger="click" width="140" :visible-arrow="false" :append-to-body="false">
          <div
            :class="{ sel: getSid == conversation.sid }"
            @click="touchConversation(index)"
            class="conversation-item"
            v-bind:key="index"
            v-for="(conversation, index) in getConversationList"
          >
            <img class="conversation-avatar" :src="conversation.avatar" />
            <div class="conversation-name">{{ conversation.name }}</div>
          </div>
          <div slot="reference">
            <div class="name">{{ rosterName }}</div>
          </div>
        </el-popover>
        <div class="bio">{{ rosterDescription }}</div>
      </div>
    </div>
    <div class="im_wechat" @click="touchWechat"></div>
    <el-popover v-model="popVisible" placement="bottom-end" trigger="click" width="100" :visible-arrow="false" :append-to-body="false">
      <div v-if="checkMicroMessenger">
        <div @click="touchChoice(index, 'weixin')" class="conversation-item" v-bind:key="index" v-for="(item, index) in weixinItemList">
          <div class="conversation-name">{{ item }}</div>
        </div>
      </div>
      <div v-else-if="checkMobile">
        <div @click="touchChoice(index, 'mobile')" class="conversation-item" v-bind:key="index" v-for="(item, index) in mobileItemList">
          <div class="conversation-name">{{ item }}</div>
        </div>
      </div>
      <div v-else>
        <div @click="touchChoice(index, 'pc')" class="conversation-item" v-bind:key="index" v-for="(item, index) in pcItemList">
          <div class="conversation-name">{{ item }}</div>
        </div>
      </div>
      <div slot="reference">
        <div class="im_popover">
          <span class="unread_number_right">{{ getTotalUnread }}</span>
        </div>
      </div>
    </el-popover>

    <div @click="clickClose" class="im_closer" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  mounted() {
    if (this.getApp().isIMLogin()) {
      this.$store.dispatch('header/actionLazyGetHeaderProfile');
      this.changeStabImage(this.getHeaderStatus);
    }
  },

  data() {
    return {
      kw: '',
      convImage: '',
      contactImage: '',
      settingImage: '',
      rosterAvatar: '',
      isGroup: false,
      useDefaultAvatar: false,
      clVisible: false,
      popVisible: false,
      weixinItemList: ['已有账号登录', '打开完整版'],
      mobileItemList: ['已有账号登录', '打开完整版', '打开客户端'],
      pcItemList: ['已有账号登录', '打开完整版', '打开客户端']
    };
  },
  watch: {
    getHeaderStatus(selected) {
      this.changeStabImage(selected);
    },
    getRosterInfo(rosterInfo) {
      this.rosterAvatar =
        this.$store.state.im.sysManage.getImage({
          avatar: rosterInfo.avatar,
          type: 'roster'
        }) || '/image/roster.png';
      if (this.rosterAvatar === '/image/roster.png') {
        this.useDefaultAvatar = true;
      } else {
        this.useDefaultAvatar = false;
      }
    },
    getGroupInfo(groupInfo) {
      this.rosterAvatar =
        this.$store.state.im.sysManage.getImage({
          avatar: groupInfo.avatar,
          type: 'group'
        }) || '/image/group.png';
      if (this.rosterAvatar === '/image/group.png') {
        this.useDefaultAvatar = true;
      } else {
        this.useDefaultAvatar = false;
      }
    }
  },
  computed: {
    ...mapGetters('content', ['getRosterInfo', 'getGroupInfo', 'getSid']),
    ...mapGetters('header', ['getHeaderStatus', 'getUserProfile']),
    ...mapGetters('contact', ['getTotalUnread']),
    ...mapGetters('contact', ['getConversationList']),

    rosterName() {
      if (this.isGroup) {
        return this.getGroupInfo.name;
      } else {
        let name = this.getRosterInfo.alias || this.getRosterInfo.nick_name;
        name = this.isEmpty(name) ? this.getRosterInfo.username : name;
        if (name && name.length > 20) {
          name = name.substring(0, 20) + '...';
        }
        return name || this.getRosterInfo.user_id;
      }
    },

    rosterDescription() {
      if (this.isGroup) {
        return this.getGroupInfo.description || '';
      } else {
        return this.getRosterInfo.description || '';
      }
    },

    getRosterAvatar() {
      return this.rosterAvatar || '/image/roster.png';
    },

    token() {
      return this.$store.getters.im.userManage.getToken();
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

    checkMicroMessenger() {
      return /microMessenger/i.test(navigator.userAgent.toLowerCase()) || typeof navigator.wxuserAgent !== 'undefined';
    }
  },

  methods: {
    isEmpty(str) {
      return !str || /^\s*$/.test(str);
    },

    changeStabImage(selected) {
      this.convImage = '/image/conv.png';
      this.contactImage = '/image/contact.png';
      this.settingImage = '/image/setting.png';

      if (selected === 'contact') {
        this.contactImage = '/image/contact-s.png';
      } else if (selected === 'conversation') {
        this.convImage = '/image/conv-s.png';
      } else if (selected === 'setting') {
        this.settingImage = '/image/setting-s.png';
      } else {
        //what are you doing??
        this.touchContact();
      }
    },
    touchRecent() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('chat/actionSetType', { type: 'x' });
      this.closeOtherLayers();
    },
    touchContact() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'contact');
      this.$store.dispatch('chat/actionSetType', { type: 'x' });
      this.closeOtherLayers();
    },
    touchSetting() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'setting');
      this.$store.dispatch('chat/actionSetType', { type: 'setting' });
      this.closeOtherLayers();
    },

    closeOtherLayers() {
      this.$store.dispatch('contact/actionSetSearchkeyword', '');

      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },

    clickClose() {
      parent.postMessage('lanying_toggle_chat', '*');
    },
    handleSearch(e) {
      const kw = e.target.value;
      this.$store.dispatch('contact/actionSetSearchkeyword', kw);
    },

    getApp() {
      return this.$parent.$parent;
    },

    openNewMax() {
      const im = this.$store.getters.im;
      const loginInfo = this.getApp().getLoginInfo();
      im.userManage
        .asyncGenerateSecretInfo({
          expire_seconds: 60,
          secret_text: JSON.stringify({
            username: loginInfo.username,
            password: loginInfo.password
          })
        })
        .then((res) => {
          let currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('action', 'chat');
          currentUrl.searchParams.set('code', res.code);
          setTimeout(() => {
            window.open(currentUrl.toString(), '_blank');
          }, 100);
        })
        .catch(() => {});
    },

    openMax() {
      const _this = this;
      const im = this.$store.getters.im;
      im.sysManage
        .asyncWoaIsBind()
        .then((res) => {
          _this.openNewMax();
        })
        .catch(() => {
          im.sysManage
            .asyncWxbind()
            .then((res) => {
              _this.openNewMax();
            })
            .catch(() => {
              _this.$store.dispatch('layer/actionSetShowing', 'linklogin');
              _this.$store.dispatch('layer/actionSetShowmask', 'true');
            });
        });
    },

    touchConversation(index) {
      let conversation = this.getConversationList[index];
      if (this.getSid !== conversation.sid) {
        this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
        this.$store.dispatch('content/actionSetType', {
          sid: conversation.sid,
          type: conversation.type === 'group' ? 'groupchat' : 'rosterchat'
        });
        if (conversation.type === 'group' && conversation.hasAt) {
          this.$store.state.im.groupManage.consumeGroupAtStatus(conversation.sid);
        }
        if (conversation.type === 'group') {
          this.isGroup = true;
        } else {
          this.isGroup = false;
        }
      }
      this.$nextTick(() => {
        this.clVisible = false;
      });
    },

    openNewChatWindow() {
      const loginInfo = this.getApp().getLoginInfo();
      this.$store.getters.im.userManage
        .asyncGenerateSecretInfo({
          expire_seconds: 60,
          secret_text: JSON.stringify({
            username: loginInfo.username,
            password: loginInfo.password
          })
        })
        .then((res) => {
          let currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('action', 'chat');
          currentUrl.searchParams.set('code', res.code);
          setTimeout(() => {
            window.open(currentUrl.toString(), '_blank');
          }, 100);
        })
        .catch((err) => {
          console.log('获取登录凭证 code 异常: code ' + err.code + ' : ' + err.message);
        });
    },

    openMobileApp() {
      const loginInfo = this.getApp().getLoginInfo();
      let that = this;
      this.$store.getters.im.userManage
        .asyncGenerateSecretInfo({
          expire_seconds: 60,
          secret_text: JSON.stringify({
            username: loginInfo.username,
            password: loginInfo.password
          })
        })
        .then((res) => {
          const url = that.getApp().intent.link + '&code=' + res.code;
          that.openApp(url, that.goDownload);
        })
        .catch((err) => {
          console.log('获取登录凭证 code 异常: code ' + err.code + ' : ' + err.message);
        });
    },

    openH5NewChatWindows() {
      // H5网页地址需要通过设置 baseUrl 来指定。
      let baseUrl = 'https://chat-h5.lanyingim.com/?link=';
      const loginInfo = this.getApp().getLoginInfo();
      let that = this;
      this.$store.getters.im.userManage
        .asyncGenerateSecretInfo({
          expire_seconds: 60,
          secret_text: JSON.stringify({
            username: loginInfo.username,
            password: loginInfo.password
          })
        })
        .then((res) => {
          const url = that.getApp().intent.link + '&code=' + res.code;
          setTimeout(() => {
            window.open(baseUrl + url, '_top');
          }, 200);
        })
        .catch((err) => {
          console.log('获取登录凭证 code 异常: code ' + err.code + ' : ' + err.message);
        });
    },

    viewWXMPQrCode() {
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('layer/actionSetShowing', 'qrwxmp');
    },

    touchWechat() {
      if (this.checkMicroMessenger) {
        this.getApp().linkLaunchWXMP();
      } else if (this.checkMobile) {
        this.getApp().linkLaunchWXMP();
      } else {
        this.viewWXMPQrCode();
      }
    },

    touchChoice(index, type) {
      switch (type) {
        case 'weixin':
          if (index === 0) {
            this.openMax();
          } else if (index === 1) {
            this.openH5NewChatWindows();
          }
          break;
        case 'mobile':
          if (index === 0) {
            this.openMax();
          } else if (index === 1) {
            this.openH5NewChatWindows();
          } else if (index === 2) {
            this.openMobileApp();
          }
          break;
        case 'pc':
          if (index === 0) {
            this.openMax();
          } else if (index === 1) {
            this.openNewChatWindow();
          } else if (index === 2) {
            window.open('https://www.lanyingim.com/downloads/', '_blank');
          }
          break;
        default:
          break;
      }
      this.$nextTick(() => {
        this.popVisible = false;
      });
    },

    judgePhoneType() {
      let isAndroid = false;
      let isIOS = false;
      let isIOS9 = false;
      let version = '';
      let u = navigator.userAgent;
      let ua = u.toLowerCase();

      if (u.indexOf('Android') > -1 || u.indexOf('Adr') > -1) {
        isAndroid = true;
      }

      if (ua.indexOf('like mac os x') > 0) {
        let regStr_saf = /os [\d._]*/gi;
        let verinfo = ua.match(regStr_saf);
        version = (verinfo + '').replace(/[^0-9|_.]/gi, '').replace(/_/gi, '.');
      }

      let version_str = version + '';
      if (version_str !== 'undefined' && version_str.length > 0) {
        version = parseInt(version);
        if (version >= 8) {
          isIOS9 = true;
        } else {
          isIOS = true;
        }
      }

      return { isAndroid, isIOS, isIOS9 };
    },

    isWeixin() {
      return /microMessenger/i.test(navigator.userAgent.toLowerCase()) || typeof navigator.wxuserAgent !== 'undefined';
    },

    openApp(url, callback) {
      let { isAndroid, isIOS, isIOS9 } = this.judgePhoneType();
      if (this.isWeixin()) {
        alert('请您在浏览器中打开，即可下载');
        return;
      }

      if (isAndroid || isIOS) {
        let hasApp = true;
        let t = 1000;
        let t1 = Date.now();
        let ifr = document.createElement('iframe');
        setTimeout(() => {
          if (!hasApp) {
            callback && callback();
          }
          document.body.removeChild(ifr);
        }, 2000);
        if (isAndroid) {
          ifr.setAttribute('src', 'lanying:sc?link=' + url);
        } else {
          ifr.setAttribute('src', 'lanying:sc?link=' + url);
        }
        ifr.style.display = 'none';
        document.body.appendChild(ifr);

        setTimeout(() => {
          let t2 = Date.now();
          if (t2 - t1 < t + 100) {
            hasApp = false;
          }
        }, t);
      }

      if (isIOS9) {
        let applink = document.createElement('a');
        applink.setAttribute('href', 'https://package.maximtop.com/sc?link=' + url);
        applink.setAttribute('target', '_blank');
        document.body.appendChild(applink);

        setTimeout(() => {
          applink.click();
        }, 250);
        setTimeout(() => {
          callback && callback();
        }, 500);
        setTimeout(() => {
          document.body.removeChild(applink);
        }, 1000);
      }
    },

    isNeizhi() {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.match(/MicroMessenger/i) == 'micromessenger') {
        return 'weixin';
      } else if (ua.match(/QQ/i) == 'qq') {
        return 'qq';
      } else if (ua.match(/Alipay/i) == 'alipay') {
        return 'alipay';
      }
      return false;
    },

    verifyBrand() {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIphone = userAgent.match(/iphone|ipad|ipod/i);
      const isHuawei = userAgent.match(/huawei/i);
      const isHonor = userAgent.match(/honor/i);
      const isOppo = userAgent.match(/oppo/i);
      const isOppoR15 = userAgent.match(/PACM00/i);
      const isVivo = userAgent.match(/vivo/i);
      const isXiaomi = userAgent.match(/mi\s/i);
      const isXIAOMI = userAgent.match(/xiaomi/i);
      const isXiaomi2s = userAgent.match(/mix\s/i);
      const isRedmi = userAgent.match(/redmi/i);

      if (isIphone) {
        return 'iphone';
      } else if (isHuawei || isHonor) {
        return 'huawei';
      } else if (isOppo || isOppoR15) {
        return 'oppo';
      } else if (isVivo) {
        return 'vivo';
      } else if (isXiaomi || isXIAOMI || isXiaomi2s || isRedmi) {
        return 'xiaomi';
      } else {
        return 'other';
      }
    },

    iosDownload(iosLinkUrl) {
      let downloadlink = document.createElement('a');
      downloadlink.setAttribute('href', iosLinkUrl);
      downloadlink.setAttribute('target', '_blank');
      document.body.appendChild(downloadlink);

      setTimeout(() => {
        downloadlink.click();
      }, 250);
      setTimeout(() => {
        document.body.removeChild(downloadlink);
      }, 1000);
    },

    goDownload() {
      if (this.isNeizhi()) {
        return;
      }

      const iosLinkUrl = 'https://apps.apple.com/cn/app/%E8%93%9D%E8%8E%BAim/id1518165517';
      const androidLinkUrl = 'https://sj.qq.com/appdetail/top.maxim.im';
      const huaweiLinkUrl = '';
      const oppoLinkUrl = '';
      const vivoLinkUrl = '';
      const xiaomiLinkUrl = '';

      switch (this.verifyBrand()) {
        case 'iphone':
          this.iosDownload(iosLinkUrl);
          break;
        case 'huawei':
          window.location.href = androidLinkUrl;
          break;
        case 'oppo':
          window.location.href = androidLinkUrl;
          break;
        case 'vivo':
          window.location.href = androidLinkUrl;
          break;
        case 'xiaomi':
          window.location.href = androidLinkUrl;
          break;
        default:
          window.location.href = androidLinkUrl;
          break;
      }
    }
  }
};
</script>

<style scoped>
.im_closer {
  position: absolute;
  width: 12px;
  height: 12px;
  right: 18px;
  top: 9px;
  cursor: pointer;
  background-image: url(/image/minimize.png);
  background-size: 12px 12px;
  filter: brightness(0) invert(0.9);
  margin-top: 10px;
}

.im_wechat {
  position: absolute;
  width: 20px;
  height: 20px;
  top: 3px;
  right: 90px;
  cursor: pointer;
  margin-top: 10px;
  background-image: url(/image/im_wechat.png);
  background-size: 20px 20px;
}

.im_popover {
  position: absolute;
  width: 12px;
  height: 12px;
  right: 55px;
  top: 8px;
  cursor: pointer;
  background-image: url(/image/im_popover.png);
  background-size: 12px 12px;
  filter: brightness(0.9);
  margin-top: 10px;
}

.unread_number_left {
  position: absolute;
  top: -10px;
  left: -10px;
  color: white;
  background: red;
  font-size: 10px;
  font-weight: bold;
  padding: 0 5px;
  border-radius: 10px;
  line-height: 14px;
  min-width: 6px;
  text-align: center;
}

.unread_number_right {
  position: absolute;
  top: -10px;
  right: -10px;
  color: white;
  background: red;
  font-size: 10px;
  font-weight: bold;
  padding: 0 5px;
  border-radius: 10px;
  line-height: 14px;
  min-width: 6px;
  text-align: center;
}

.header {
  line-height: 50px;
  min-width: 360px;
}

.header_title {
  position: absolute;
  margin-left: 20px;
  top: 0px;
  font-size: 18px;
  color: white;
}

.profile-container {
  display: flex;
  align-items: center;
  padding: 2px 10px;
  max-width: calc(100% - 170px);
  min-width: 200px;
  height: 48px;
}

.profile-picture {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
  margin-top: 15px;
}

.profile-info {
  flex: 1;
  width: calc(100% - 50px);
}

/deep/ .el-popover {
  padding: 5px;
}

/deep/ .el-popper[x-placement^='right'] {
  margin-left: 0px;
}

/deep/ .el-popper[x-placement^='bottom'] {
  margin-top: 0px;
}

.profile-name {
  font-size: 18px;
  font-weight: bold;
  line-height: 24px;
  color: black;
}

.profile-bio {
  font-size: 12px;
  line-height: 20px;
}

.profile-tip {
  font-size: 12px;
  line-height: 20px;
  color: black;
}

.conversation-item {
  line-height: 30px;
  display: flex;
  align-items: center;
  border-radius: 6px;
}

.conversation-avatar {
  width: 26px;
  height: 24px;
  overflow: hidden;
  padding-left: 3px;
  border-radius: 3px;
  background-size: 24px 24px;
}

.conversation-name {
  padding-left: 10px;
  width: 135px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.name {
  font-size: 18px;
  font-weight: bold;
  line-height: 24px;
  top: 0px;
  color: white;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: calc(100% - 20px);
}

.bio {
  font-size: 12px;
  line-height: 20px;
  top: 0px;
  color: white;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: calc(100% - 20px);
}
</style>
