<template>
  <div class="header" ref="imHeader">
    <div class="desktop_app_rail" v-if="!isMobile">
      <div class="desktop_app_rail__brand">
        <img alt="LanyingIM" class="desktop_app_rail__logo" src="/image/logo-color-notext.png" />
      </div>
      <div class="desktop_app_rail__nav">
        <button :class="{ stab: true, active: getHeaderStatus === 'conversation' }" @click="touchRecent" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="desktop_app_rail__icon">
            <path d="M5 6.5h14v8H8l-3 3v-11z"></path>
          </svg>
          <span class="desktop_app_rail__label">{{ $t('会话') }}</span>
          <span :class="{ none: getTotalUnread === '' }" class="unread_number">{{ getTotalUnread }}</span>
        </button>
        <button :class="{ stab: true, active: getHeaderStatus === 'contact' }" @click="touchContact" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="desktop_app_rail__icon">
            <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path>
            <path d="M5 20a7 7 0 0 1 14 0"></path>
          </svg>
          <span class="desktop_app_rail__label">{{ $t('联系人') }}</span>
        </button>
      </div>
      <div class="desktop_app_rail__footer">
        <button class="desktop_app_rail__ghost addBtn" @mouseenter="handleDesktopAddEnter" @mouseleave="handleDesktopAddLeave" @click="headerAddChickHandler" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="desktop_app_rail__icon">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
          </svg>
        </button>
        <button :class="{ stab: true, active: getHeaderStatus === 'setting' }" @click="touchSetting" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="desktop_app_rail__icon">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"></path>
            <path
              d="M19 12l2 1-2 3-2-.5a7.8 7.8 0 0 1-1.5 1L15 19h-6l-.5-2.5a7.8 7.8 0 0 1-1.5-1L5 16 3 13l2-1v-2L3 9l2-3 2 .5a7.8 7.8 0 0 1 1.5-1L9 3h6l.5 2.5a7.8 7.8 0 0 1 1.5 1L19 6l2 3-2 1v2z"
            ></path>
          </svg>
          <span class="desktop_app_rail__label">{{ $t('设置') }}</span>
        </button>
        <button :class="{ stab: true, active: getHeaderStatus === 'about_us' }" @click="touchAboutUs" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="desktop_app_rail__icon">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 10v6"></path>
            <path d="M12 7h.01"></path>
          </svg>
          <span class="desktop_app_rail__label">{{ $t('关于') }}</span>
        </button>
        <el-tooltip :content="trustBadgeText || $t('认证信息')" placement="right" effect="dark" :open-delay="120">
          <button class="desktop_app_rail__auth" @click="touchAboutUs" type="button" :aria-label="trustBadgeText || $t('认证信息')">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="desktop_app_rail__icon desktop_app_rail__icon--teal">
              <path d="M12 3l7 3v5c0 4.5-2.7 7.9-7 10-4.3-2.1-7-5.5-7-10V6l7-3z"></path>
              <path d="M9.5 12.5l1.8 1.8 3.7-4"></path>
            </svg>
          </button>
        </el-tooltip>
        <button class="desktop_app_rail__profile" @click="touchSetting" type="button">
          <img v-if="avatar" :src="avatar" alt="" class="desktop_app_rail__avatar" />
          <svg v-else viewBox="0 0 24 24" aria-hidden="true" class="desktop_app_rail__icon">
            <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path>
            <path d="M5 20a7 7 0 0 1 14 0"></path>
          </svg>
        </button>
      </div>
    </div>
    <div class="mobile_nav" v-if="isMobile">
      <button class="mobile_nav_button" @click="handleMobileLeadingAction" type="button">
        <svg v-if="showMobileBack" viewBox="0 0 24 24" aria-hidden="true" class="mobile_nav_icon">
          <path d="M15 5l-7 7 7 7"></path>
        </svg>
        <img v-else alt="LanyingIM" class="mobile_nav_logo" src="/image/logo-color-notext.png" />
      </button>
      <div class="mobile_nav_title">{{ mobileTitle }}</div>
      <button v-if="showMobileAddButton" class="mobile_nav_button mobile_nav_button--add" @click="headerAddChickHandler" type="button" :aria-label="$t('新增')">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="mobile_nav_icon">
          <path d="M12 5v14"></path>
          <path d="M5 12h14"></path>
        </svg>
      </button>
      <span v-else class="mobile_nav_spacer" aria-hidden="true"></span>
    </div>
    <div class="searchArea">
      <input @input="handleSearch" :placeHolder="$t('搜索会话')" type="text" v-model="kw" />
      <div @click="headerAddChickHandler" class="addBtn"></div>
    </div>
    <div class="tab">
      <div @click="touchRecent" class="stab">
        <img :src="convImage" />
        <span :class="{ none: getTotalUnread === '' }" class="unread_number">{{ getTotalUnread }}</span>
      </div>
      <div @click="touchContact" class="stab"><img :src="contactImage" /></div>
      <div @click="touchSetting" class="stab"><img :src="settingImage" /></div>
      <div @click="touchAboutUs" class="stab"><img :src="aboutUsImage" /></div>
      <div @click="touchSafariAudioSupport" class="stab" v-if="checkSafari">
        <img :src="audioImage" />
        <span class="supportname" v-if="showSafariTips">{{ $t('点击获取振铃权限') }}</span>
      </div>
    </div>
    <div class="profile">
      <img :src="avatar" @click="touchSetting" class="proAvater" />
      <div @click="touchSetting" class="proname">{{ name }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

const clearGlobalAddpopCloseTimer = () => {
  if (typeof window === 'undefined') return;
  if (window.__lyAddpopCloseTimer) {
    clearTimeout(window.__lyAddpopCloseTimer);
    window.__lyAddpopCloseTimer = null;
  }
};

export default {
  mounted() {
    this.$store.dispatch('header/actionLazyGetHeaderProfile');
    this.changeStabImage(this.getHeaderStatus);
    this.syncViewport();
    if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') == -1) {
      this.checkSafari = true;
    }
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },

  data() {
    return {
      kw: '',
      convImage: '',
      contactImage: '',
      settingImage: '',
      aboutUsImage: '',
      audioImage: '',
      name: '',
      avatar: '',
      checkSafari: false,
      showSafariTips: true,
      isMobile: false
    };
  },
  watch: {
    getUserProfile(profile) {
      this.avatar = this.$store.state.im.sysManage.getImage({
        avatar: profile.avatar,
        type: 'roster'
      });
      this.name = profile.alias || (this.notEmpty(profile.nick_name) ? profile.nick_name : profile.username) || profile.user_id;
      if (this.name.length > 20) {
        this.name = this.name.substring(0, 20) + '...';
      }
    },
    getHeaderStatus(selected) {
      this.changeStabImage(selected);
    },
    getSupportSafariAudio(state) {
      this.checkSafari = !state;
    },
    getViewType() {
      this.syncViewport();
    }
  },
  computed: {
    ...mapGetters('header', ['getHeaderStatus', 'getUserProfile', 'getSupportSafariAudio']),
    ...mapGetters('contact', ['getTotalUnread', 'getConversationList', 'getConversationScroll']),
    ...mapGetters('content', ['getViewType']),
    showMobileBack() {
      if (!this.isMobile || !this.getViewType) return false;
      return !['setting', 'verification'].includes(this.getViewType);
    },
    showMobileAddButton() {
      if (!this.isMobile || this.showMobileBack) return false;
      return this.getHeaderStatus === 'contact';
    },
    mobileTitle() {
      if (!this.showMobileBack && this.getHeaderStatus === 'conversation') {
        return this.$t('蓝莺');
      }
      if (this.getHeaderStatus === 'setting' || this.getViewType === 'setting') {
        return this.$t('设置');
      }
      if (this.getHeaderStatus === 'about_us' || this.getViewType === 'verification') {
        return this.$t('关于');
      }
      if (this.showMobileBack && (this.getViewType === 'rosterinfo' || this.getViewType === 'groupinfo')) {
        return this.$t('资料');
      }
      if (this.showMobileBack && this.getViewType === 'groupchat') {
        return this.$t('群聊');
      }
      if (this.showMobileBack && this.getViewType === 'rosterchat') {
        return this.$t('聊天');
      }
      if (this.getHeaderStatus === 'contact') {
        return this.$t('联系人');
      }
      return this.$t('会话');
    },

    // avatar() {
    //   return this.$store.state.im.sysManage.getImage({
    //     avatar: this.getUserProfile.avatar,
    //     type: 'roster'
    //   });
    // },
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    trustBadgeText() {
      const im = this.$store.getters.im;
      if (!im) return this.$t('认证信息');
      const appid = im.userManage.getAppid();
      const accountVerification = im.sysManage.getAccountVerification(appid);
      if (!accountVerification) return this.$t('认证信息');

      let prefix = '';
      if (!accountVerification.type || accountVerification.type !== 'enterprise') {
        prefix = `${this.$translateText('个人开发者：').replace(/：$/, '')} `;
      } else if (accountVerification.status === 'unverified' && !accountVerification.name) {
        prefix = `${this.$translateText('公司')} `;
      }

      const statusPrefixMap = {
        verified: this.$t('已认证：'),
        expired: this.$t('认证失败：'),
        unverified: this.$t('未认证开发者：')
      };

      return prefix + (statusPrefixMap[accountVerification.status] || '') + (accountVerification.name || this.$t('认证信息'));
    }
  },

  methods: {
    syncViewport() {
      this.isMobile = window.innerWidth <= 768;
    },
    handleResize() {
      this.syncViewport();
      this.$nextTick(() => {
        const width = this.$refs.imHeader ? this.$refs.imHeader.offsetWidth : 0;
        this.showSafariTips = width >= 900;
      });
    },
    notEmpty(str) {
      return !(!str || /^\s*$/.test(str));
    },

    changeStabImage(selected) {
      this.convImage = '/image/conv.png';
      this.contactImage = '/image/contact.png';
      this.settingImage = '/image/setting.png';
      this.aboutUsImage = '/image/about_us.png';
      this.audioImage = '/image/speaker_off.png';

      if (selected === 'contact') {
        this.contactImage = '/image/contact-s.png';
      } else if (selected === 'conversation') {
        this.convImage = '/image/conv-s.png';
      } else if (selected === 'setting') {
        this.settingImage = '/image/setting-s.png';
      } else if (selected === 'about_us') {
        this.aboutUsImage = '/image/about_us-s.png';
      } else if (selected === 'audio') {
        this.audioImage = '/image/speaker_on.png';
      } else {
        //what are you doing??
        this.touchContact();
      }
    },
    touchRecent() {
      let headStatus = this.getHeaderStatus;
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('chat/actionSetType', { type: 'restore' });
      this.closeOtherLayers();
      this.gotoUnreadConversation(headStatus);
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
    touchAboutUs() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'about_us');
      this.$store.dispatch('chat/actionSetType', { type: 'verification' });
      this.closeOtherLayers();
    },
    touchSafariAudioSupport() {
      const au = document.querySelector('#phone_ring_player');
      au.muted = false;
      au.loop = false;
      au.pause();
      this.checkSafari = false;
      alert(this.$t('Safari 浏览器开启语音视频通话振铃'));
    },

    closeOtherLayers() {
      this.$store.dispatch('contact/actionSetSearchkeyword', '');

      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },

    headerAddChickHandler() {
      this.$store.dispatch('layer/actionSetShowing', 'addpop');
    },
    handleDesktopAddEnter() {
      if (this.isMobile) return;
      clearGlobalAddpopCloseTimer();
      this.$store.dispatch('layer/actionSetShowing', 'addpop');
    },
    handleDesktopAddLeave() {
      if (this.isMobile) return;
      clearGlobalAddpopCloseTimer();
      window.__lyAddpopCloseTimer = setTimeout(() => {
        this.$store.dispatch('layer/actionSetShowing', '');
        this.$store.dispatch('layer/actionSetShowmask', false);
      }, 120);
    },
    handleMobileLeadingAction() {
      if (this.showMobileBack) {
        if (this.getHeaderStatus === 'contact' && ['rosterinfo', 'groupinfo', 'rosterNotice', 'systemNotice', 'groupInviteNotice', 'grpupApplyNotice'].includes(this.getViewType)) {
          this.$store.dispatch('content/actionSetType', { sid: undefined });
        } else {
          this.$store.dispatch('content/actionSetType', { sid: undefined });
          this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
        }
      } else {
        this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
        this.$store.dispatch('content/actionSetType', { sid: undefined, type: '' });
        this.closeOtherLayers();
      }
    },
    handleSearch(e) {
      const kw = e.target.value;
      this.$store.dispatch('contact/actionSetSearchkeyword', kw);
    },
    gotoUnreadConversation(headStatus) {
      let scroll = 0;
      let convList = this.getConversationList;
      let minScroll = -1;
      if (headStatus == 'conversation') {
        minScroll = this.getConversationScroll;
      }
      let nextScroll = -1;
      let convHeight = 61;
      for (let i in convList) {
        let conv = convList[i];
        if (conv.unread !== 0) {
          if (nextScroll == -1) {
            nextScroll = scroll;
          }
          if (scroll > minScroll) {
            nextScroll = scroll;
            break;
          } else {
            scroll += convHeight;
          }
        } else {
          scroll += convHeight;
        }
      }
      if (nextScroll >= 0) {
        this.$store.dispatch('contact/actionSetConversationScroll', nextScroll);
      }
    }
  }
};
</script>

<style scoped></style>
