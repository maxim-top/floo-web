<template>
  <div class="header">
    <div class="searchArea">
      <input @input="handleSearch" placeHolder="搜索会话" type="text" v-model="kw" />
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
        <span class="supportname">点击获取振铃权限</span>
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

export default {
  mounted() {
    this.$store.dispatch('header/actionLazyGetHeaderProfile');
    this.changeStabImage(this.getHeaderStatus);
    if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') == -1) {
      this.checkSafari = true;
    }
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
      checkSafari: false
    };
  },
  watch: {
    getUserProfile(profile) {
      this.avatar = this.$store.state.im.sysManage.getImage({
        avatar: profile.avatar,
        type: 'roster'
      });
      this.name = this.notEmpty(profile.nick_name) ? profile.nick_name : profile.username || profile.user_id;
      if (this.name.length > 20) {
        this.name = this.name.substring(0, 20) + '...';
      }
    },
    getHeaderStatus(selected) {
      this.changeStabImage(selected);
    },
    getSupportSafariAudio(state) {
      this.checkSafari = !state;
    }
  },
  computed: {
    ...mapGetters('header', ['getHeaderStatus', 'getUserProfile', 'getSupportSafariAudio']),
    ...mapGetters('contact', ['getTotalUnread']),

    // avatar() {
    //   return this.$store.state.im.sysManage.getImage({
    //     avatar: this.getUserProfile.avatar,
    //     type: 'roster'
    //   });
    // },
    token() {
      return this.$store.getters.im.userManage.getToken();
    }
  },

  methods: {
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
      alert('Safari 浏览器开启语音视频通话振铃');
    },

    closeOtherLayers() {
      this.$store.dispatch('contact/actionSetSearchkeyword', '');

      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },

    headerAddChickHandler() {
      this.$store.dispatch('layer/actionSetShowing', 'addpop');
    },
    handleSearch(e) {
      const kw = e.target.value;
      this.$store.dispatch('contact/actionSetSearchkeyword', kw);
    }
  }
};
</script>

<style scoped></style>
