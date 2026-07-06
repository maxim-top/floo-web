<template>
  <div class="header" :style="{ 'border-radius': checkMobile ? '0px' : '10px 10px 0 0' }">
    <!-- <div class="header_title">{{ rosterName }}</div> -->
    <div class="profile-container">
      <el-popover placement="right" trigger="hover" width="170" :visible-arrow="false" :append-to-body="true">
        <div class="profile-name">{{ rosterName }}</div>
        <div v-if="isGroup">
          <div class="profile-bio">{{ $t('群ID') }}: {{ this.getGroupInfo.group_id }}</div>
          <div class="profile-bio" v-if="cardName">{{ $t('群名片') }}: {{ cardName }}</div>
          <hr v-if="this.getGroupInfo.description" />
          <div v-if="this.getGroupInfo.description" class="profile-bio">{{ this.getGroupInfo.description }}</div>
        </div>
        <div v-else>
          <div v-if="this.getRosterInfo.nick_name" class="profile-bio">{{ $t('昵称') }}: {{ this.getRosterInfo.nick_name }}</div>
          <div class="profile-bio">{{ $t('用户名') }}: {{ this.getRosterInfo.username }}</div>
          <div class="profile-bio">{{ $t('ID') }}: {{ this.getRosterInfo.user_id }}</div>
          <hr v-if="this.getRosterInfo.description" />
          <div v-if="this.getRosterInfo.description">{{ this.getRosterInfo.description }}</div>
        </div>
        <div slot="reference">
          <div class="profile-picture-wrap">
            <img
              :src="getRosterAvatar"
              class="profile-picture"
              :style="{
                filter: useDefaultAvatar ? 'brightness(0) saturate(100%) invert(16%) sepia(22%) saturate(1286%) hue-rotate(186deg) brightness(92%) contrast(91%)' : 'none'
              }"
            />
            <span class="profile-online-dot" aria-hidden="true"></span>
          </div>
        </div>
      </el-popover>
      <div class="profile-info">
        <div class="support-header-title-row">
          <div class="name">{{ rosterName }}</div>
          <span class="support-header-badge" v-if="showSupportBadge">
            <span class="support-header-badge__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l6 2.5V11c0 4.2-2.7 8.1-6 10-3.3-1.9-6-5.8-6-10V5.5L12 3z"></path>
                <path d="M9.5 12.3l1.7 1.8 3.6-4"></path>
              </svg>
            </span>
            <span>{{ $t('客服') }}</span>
          </span>
        </div>
        <div class="bio">{{ supportStatusText }}</div>
      </div>
    </div>
    <div class="support_header_action support_header_action--wechat" @click="touchWechat" :aria-label="$t('微信与打开方式')" role="button" tabindex="0">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="support_header_action_icon">
        <path d="M8.5 7.5C5.46 7.5 3 9.66 3 12.33c0 1.46.73 2.77 1.9 3.67L4.5 19l2.7-1.35c.42.1.85.15 1.3.15 3.04 0 5.5-2.16 5.5-4.82S11.54 7.5 8.5 7.5z"></path>
        <path d="M15.5 5C19.09 5 22 7.51 22 10.6c0 1.7-.9 3.22-2.32 4.24L20 18l-3.1-1.55c-.45.1-.91.15-1.4.15-1 0-1.95-.2-2.8-.57"></path>
      </svg>
    </div>
    <el-popover v-model="popVisible" placement="bottom-end" trigger="click" width="220" :visible-arrow="false" :append-to-body="true" popper-class="support-header-popover">
      <div class="support_header_popover_group">
        <div class="support_header_popover_title">{{ $t('最近会话') }}</div>
        <div
          :class="{ sel: getSid == conversation.sid }"
          @click="touchConversation(conversation)"
          class="conversation-item"
          v-bind:key="conversation.sid + '-' + index"
          v-for="(conversation, index) in recentConversationList"
        >
          <img class="conversation-avatar" :src="conversation.avatar" />
          <div class="conversation-name">{{ conversation.name }}</div>
          <div class="conversation-unread" v-if="conversation.unread">{{ conversation.unread }}</div>
        </div>
      </div>
      <hr class="support_header_popover_divider" />
      <div class="support_header_popover_group">
        <div class="support_header_popover_title">{{ $t('更多操作') }}</div>
        <div v-if="checkMicroMessenger">
          <div @click="touchChoice(index, 'weixin')" class="conversation-item conversation-item--action" v-bind:key="index" v-for="(item, index) in weixinItemList">
            <div class="item-name">{{ item }}</div>
          </div>
        </div>
        <div v-else-if="checkMobile">
          <div @click="touchChoice(index, 'mobile')" class="conversation-item conversation-item--action" v-bind:key="index" v-for="(item, index) in mobileItemList">
            <div class="item-name">{{ item }}</div>
          </div>
        </div>
        <div v-else>
          <div @click="touchChoice(index, 'pc')" class="conversation-item conversation-item--action" v-bind:key="index" v-for="(item, index) in pcItemList">
            <div class="item-name">{{ item }}</div>
          </div>
        </div>
      </div>
      <div slot="reference">
        <div class="support_header_action support_header_action--recent" :aria-label="$t('最近会话与更多')" role="button" tabindex="0">
          <el-popover v-model="showPop" placement="left-start" trigger="manual" width="160" :visible-arrow="true" :append-to-body="true">
            <div @click="clickNewMessageConversation" v-if="unreadConversation">
              <p class="show-pop-title">{{ unreadConversation.name }}</p>
              <p class="show-pop-content">{{ $t('点击查看新消息') }}</p>
            </div>
            <div slot="reference" class="support_header_action_badge">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="support_header_action_icon">
                <path d="M12 7v5l3 2"></path>
                <circle cx="12" cy="12" r="8"></circle>
              </svg>
              <span class="unread_number_right" :style="{ 'background-color': blinkBackgroundColor }">{{ getTotalUnread }}</span>
            </div>
          </el-popover>
        </div>
      </div>
    </el-popover>
    <div @click="clickClose" class="support_header_action support_header_action--close" :aria-label="$t('最小化')" role="button" tabindex="0">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="support_header_action_icon">
        <path d="M6 12h12"></path>
      </svg>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  mounted() {
    if (this.getApp().isIMLogin()) {
      this.$store.dispatch('header/actionLazyGetHeaderProfile');
      this.changeStabImage(this.getHeaderStatus);
      this.refreshSupportContacts();
      this.startBlink();
    }
  },

  updated() {
    let that = this;
    if (this.getTotalUnread > 0 && this.autoShowPop && !this.showPop) {
      setTimeout(() => {
        if (that.getConversationList.length > 1) {
          that.showPop = true;
          let item = that.getConversationList.find((item) => item.unread > 0);
          that.unreadConversation = item ? item : null;
          that.unreadConversationList = that.getConversationList.filter((item) => item.unread > 0);
        }
      }, 200);
      this.clearPopTimer();
      this.startBlink();
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
      popVisible: false,
      autoShowPop: true,
      showPop: false,
      showPopTimer: null,
      showPopTimeout: 5000,
      blinkTimeout: 500,
      blinkStopTimeout: 5000,
      blinkTimer: null,
      blinkBackgroundColor: 'red',
      unreadConversation: null,
      unreadConversationList: [],
      supportUserIds: []
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
    },
    getTotalUnread() {
      let that = this;
      if (this.getTotalUnread > 0) {
        if (this.showPop === false) {
          that.setShowPopTimer();
        } else {
          let item = that.getConversationList.find((item) => item.unread > 0);
          that.unreadConversation = item ? item : null;
          that.clearPopTimer();
        }
        that.unreadConversationList = that.getConversationList.filter((item) => item.unread > 0);
        that.startBlink();
      } else {
        this.showPop = false;
      }
    }
  },
  computed: {
    ...mapGetters('content', ['getRosterInfo', 'getGroupInfo', 'getSid', 'getMemberList']),
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

    cardName() {
      if (this.isGroup) {
        const uid = this.$store.getters.im.userManage.getUid();
        const user = this.getMemberList.find((x) => x.user_id === uid);
        return user && user.display_name ? user.display_name.trim() : '';
      } else {
        return '';
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
    },

    checkMobileMicroMessenger() {
      return /mobile/i.test(navigator.userAgent.toLowerCase());
    },

    recentConversationList() {
      return (this.getConversationList || []).slice(0, 10);
    },

    weixinItemList() {
      return [this.$t('其他账号登录'), this.$t('打开完整版')];
    },

    mobileItemList() {
      return [this.$t('其他账号登录'), this.$t('打开完整版'), this.$t('打开客户端')];
    },

    pcItemList() {
      return [this.$t('其他账号登录'), this.$t('打开完整版'), this.$t('打开客户端')];
    },

    supportStatusText() {
      return rosterDescriptionOrDefault(this.rosterDescription, this.$t.bind(this));
    },

    showSupportBadge() {
      if (this.isGroup || !this.getSid) {
        return false;
      }
      return this.supportUserIds.findIndex((x) => `${x}` === `${this.getSid}`) >= 0;
    }
  },

  methods: {
    refreshSupportContacts() {
      const im = this.$store.getters.im;
      im.sysManage
        .asyncGetStaticContact()
        .then((res) => {
          this.supportUserIds = (res || []).map((item) => item.user_id);
        })
        .catch(() => {
          this.supportUserIds = [];
        });
    },

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
      if (this.checkMobile) {
        this.$store.dispatch('login/actionChangeAppStatus', 'minimize');
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_toggle_chat',
            size: 'minimize'
          }),
          '*'
        );
      } else {
        this.$store.dispatch('login/actionChangeAppStatus', 'navigation');
        parent.postMessage(
          JSON.stringify({
            type: 'lanying_toggle_chat',
            size: 'navigation'
          }),
          '*'
        );
      }
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

    switchAccount() {
      this.$store.dispatch('layer/actionSetShowing', 'linklogin');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },

    openConversation(conversation) {
      if (conversation && this.getSid !== conversation.sid) {
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
    },

    setShowPopTimer() {
      let that = this;
      setTimeout(() => {
        if (that.getConversationList.length > 1) {
          that.showPop = true;
          that.autoShowPop = true;
          let item = that.getConversationList.find((item) => item.unread > 0);
          that.unreadConversation = item ? item : null;
        }
      }, 200);
      this.clearPopTimer();
    },

    clearPopTimer() {
      let that = this;
      clearTimeout(this.showPopTimer);
      this.showPopTimer = setTimeout(() => {
        that.autoShowPop = false;
        that.showPop = false;
      }, this.showPopTimeout);
    },

    clickNewMessageConversation() {
      this.openConversation(this.unreadConversation);
      this.clearPopTimer();
    },

    startBlink() {
      let that = this;
      if (that.getTotalUnread) {
        clearTimeout(that.blinkTimer);
        that.blinkTimer = setInterval(() => {
          if (that.blinkBackgroundColor === 'red') {
            that.blinkBackgroundColor = '';
          } else {
            that.blinkBackgroundColor = 'red';
          }
        }, that.blinkTimeout);
        setTimeout(() => {
          clearTimeout(that.blinkTimer);
          that.blinkTimer = null;
          that.blinkBackgroundColor = 'red';
        }, that.blinkStopTimeout);
      } else {
        clearTimeout(that.blinkTimer);
        that.blinkTimer = null;
      }
    },

    touchConversation(conversation) {
      this.openConversation(conversation);
      this.$nextTick(() => {
        this.popVisible = false;
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
        if (this.checkMobileMicroMessenger) {
          this.getApp().linkLaunchWXMP();
        } else {
          this.getApp().alert(this.$t('微信PC端不支持URL link'));
        }
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
            this.switchAccount();
          } else if (index === 1) {
            this.openH5NewChatWindows();
          }
          break;
        case 'mobile':
          if (index === 0) {
            this.switchAccount();
          } else if (index === 1) {
            this.openH5NewChatWindows();
          } else if (index === 2) {
            this.openMobileApp();
          }
          break;
        case 'pc':
          if (index === 0) {
            this.switchAccount();
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
        alert(this.$t('请您在浏览器中打开，即可下载'));
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

function rosterDescriptionOrDefault(description, translate) {
  return description && description.trim() ? description : translate('在线咨询');
}
</script>

<style scoped>
.support_header_action {
  position: absolute;
  top: 50%;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(193, 198, 200, 0.8);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--ly-text-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  z-index: 3;
  transform: translateY(-50%);
  appearance: none;
  -webkit-appearance: none;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.support_header_action:hover {
  background: rgba(51, 51, 204, 0.08);
  border-color: rgba(51, 51, 204, 0.18);
  color: var(--ly-primary);
}

.support_header_action--wechat {
  right: 104px;
}

.support_header_action--recent {
  right: 60px;
}

.support_header_action--close {
  right: 16px;
}

.support_header_action_badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.support_header_action_icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.unread_number_right {
  position: absolute;
  top: -10px;
  right: -10px;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 0 5px;
  border-radius: 10px;
  line-height: 14px;
  min-width: 6px;
  text-align: center;
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  line-height: normal;
  min-width: 0;
  min-height: 64px;
  width: 100%;
  box-sizing: border-box;
}

.profile-container {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 140px 0 16px;
  min-height: 64px;
  box-sizing: border-box;
}

.profile-picture-wrap {
  position: relative;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  margin-right: 12px;
}

.profile-picture {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: block;
}

.profile-online-dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid var(--ly-bg-white);
  box-sizing: border-box;
}

.profile-info {
  flex: 1;
  min-width: 0;
  width: auto;
}

.support-header-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}

.support-header-title-row .name {
  min-width: 0;
  flex: 0 1 auto;
}

.support-header-badge {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(24, 163, 127, 0.1);
  color: #12795f;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.support-header-badge__icon {
  width: 12px;
  height: 12px;
  display: inline-flex;
}

.support-header-badge__icon svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/deep/ .el-popover {
  padding: 10px;
  border: 1px solid rgba(193, 198, 200, 0.7);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(19, 41, 75, 0.14);
}

/deep/ .el-popper[x-placement^='right'] {
  margin-left: 0px;
}

/deep/ .el-popper[x-placement^='bottom'] {
  margin-top: 6px;
  margin-right: 8px;
  max-height: 360px;
  overflow: auto;
  scrollbar-width: none;
}

.profile-name {
  font-size: 18px;
  font-weight: bold;
  line-height: 24px;
  color: black;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
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
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 8px 10px;
  border-radius: 12px;
  box-sizing: border-box;
  cursor: pointer;
}

.conversation-item:hover {
  background: rgba(51, 51, 204, 0.05);
}

.conversation-avatar {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  overflow: hidden;
  margin-left: 0;
  border-radius: 10px;
  background-size: 28px 28px;
}

.conversation-name {
  margin-left: 0;
  flex: 1;
  min-width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.conversation-unread {
  width: 14px;
  color: white;
  background-color: red;
  margin-left: 2px;
  font-size: 10px;
  border-radius: 10px;
  line-height: 14px;
  text-align: center;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.item-name {
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  text-align: left;
}

.name {
  font-size: 18px;
  font-weight: bold;
  line-height: 24px;
  top: 0px;
  color: var(--ly-text-dark);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
}

.bio {
  font-size: 12px;
  line-height: 18px;
  top: 0px;
  color: var(--ly-text-muted);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
}

.support_header_popover_title {
  padding: 4px 10px 8px;
  font-size: 12px;
  color: var(--ly-text-muted);
}

.support_header_popover_divider {
  margin: 8px 0;
  border: none;
  border-top: 1px solid var(--ly-border-light);
}

.conversation-item--action {
  min-height: 38px;
}

.show-pop-title {
  font-size: 14px;
  font-weight: bold;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin-block: auto;
}

.show-pop-content {
  font-size: 12px;
  margin-block-start: 5px;
  margin-block-end: 5px;
}

@media (max-width: 768px) {
  .profile-container {
    padding: 0 124px 0 0;
    min-width: 0;
  }

  .support-header-title-row {
    gap: 6px;
  }

  .support-header-badge {
    padding: 0 7px;
    font-size: 10px;
  }
}

@media (max-width: 520px) {
  .profile-container {
    padding-right: 116px;
  }

  .support_header_action {
    width: 32px;
    height: 32px;
  }

  .support_header_action--wechat {
    right: 88px;
  }

  .support_header_action--recent {
    right: 52px;
  }

  .support_header_action--close {
    right: 16px;
  }

  .support_header_action_icon {
    width: 16px;
    height: 16px;
  }
}
</style>
