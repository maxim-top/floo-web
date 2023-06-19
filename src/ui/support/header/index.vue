<template>
  <div class="header">
    <div class="header_title">{{ rosterName }}</div>
    <div @click="openMax" class="im_max" />
    <div @click="clickClose" class="im_closer" />
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
      settingImage: ''
    };
  },
  watch: {
    getHeaderStatus(selected) {
      this.changeStabImage(selected);
    }
  },
  computed: {
    ...mapGetters('content', ['getRosterInfo', 'getSid']),
    ...mapGetters('header', ['getHeaderStatus', 'getUserProfile']),

    rosterName() {
      let name = this.getRosterInfo.alias || this.getRosterInfo.nick_name;
      name = this.isEmpty(name) ? this.getRosterInfo.username : name;
      if (name && name.length > 20) {
        name = name.substring(0, 20) + '...';
      }

      return name || this.getRosterInfo.user_id;
    },

    token() {
      return this.$store.getters.im.userManage.getToken();
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
    openMax() {
      var url = window.location + '';
      url = url.replaceAll('action=support', 'action=chat');
      window.open(url);
    }
  }
};
</script>

<style scoped>
.im_closer {
  position: absolute;
  width: 25px;
  height: 25px;
  right: 8px;
  top: 0px;
  cursor: pointer;
  background-image: url(/image/im_closer.png);
  background-size: 25px 25px;
  filter: brightness(0) invert(0.9);
  margin-top: 10px;
}

.im_max {
  position: absolute;
  width: 25px;
  height: 25px;
  right: 42px;
  top: 0px;
  cursor: pointer;
  background-image: url(/image/im_max.png);
  background-size: 25px 25px;
  filter: brightness(0.9);
  margin-top: 10px;
}

.header {
  line-height: 50px;
}

.header_title {
  position: absolute;
  margin-left: 20px;
  top: 0px;
  font-size: 18px;
  color: white;
}
</style>
