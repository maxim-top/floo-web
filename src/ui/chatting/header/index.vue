<template>
  <div class="header">
    <div class="searchArea">
      <input @input="handleSearch" placeHolder="搜索会话" type="text" v-model="kw" />
      <div @click="headerAddChickHandler" class="addBtn"></div>
    </div>
    <div class="tab">
      <div @click="touchRecent" class="stab"><img :src="convImage" /></div>
      <div @click="touchContact" class="stab"><img :src="contactImage" /></div>
      <div @click="touchSetting" class="stab"><img :src="settingImage" /></div>
    </div>
    <div class="profile">
      <img :src="avatar" @click="touchSetting" class="proAvater" />
      <div @click="touchSetting" class="proname">{{ username }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  mounted() {
    this.$store.dispatch('header/actionLazyGetHeaderProfile');
    this.changeStabImage(this.getHeaderStatus);
  },

  data() {
    return {
      kw: '',
      convImage: '',
      contactImage: '',
      settingImage: '',
      username: '',
      avatar: ''
    };
  },
  watch: {
    getUserProfile(profile) {
      this.avatar = this.$store.state.im.sysManage.getImage({
        avatar: profile.avatar,
        type: 'roster'
      });
      this.username = profile.username;
    },
    getHeaderStatus(selected) {
      this.changeStabImage(selected);
    }
  },
  computed: {
    ...mapGetters('header', ['getHeaderStatus', 'getUserProfile']),

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
