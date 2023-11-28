<template>
  <div class="header">
    <!-- <div class="header_title">{{ rosterName }}</div> -->
    <div class="profile-container">
      <img :src="getRosterAvatar" class="profile-picture" />
      <div class="profile-info">
        <div class="name">{{ rosterName }}</div>
        <div class="bio">{{ rosterDescription }}</div>
      </div>
    </div>
    <div @click="openMax" class="im_max">
      <span v-bind:class="{ unread_number: getTotalUnread }">{{ getTotalUnread }}</span>
    </div>
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
      settingImage: '',
      rosterAvatar: ''
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
    }
  },
  computed: {
    ...mapGetters('content', ['getRosterInfo', 'getSid']),
    ...mapGetters('header', ['getHeaderStatus', 'getUserProfile']),
    ...mapGetters('contact', ['getTotalUnread']),

    rosterName() {
      let name = this.getRosterInfo.alias || this.getRosterInfo.nick_name;
      name = this.isEmpty(name) ? this.getRosterInfo.username : name;
      if (name && name.length > 20) {
        name = name.substring(0, 20) + '...';
      }

      return name || this.getRosterInfo.user_id;
    },

    rosterDescription() {
      return this.getRosterInfo.description || '7*24小时在线';
    },

    getRosterAvatar() {
      return this.rosterAvatar || '/image/roster.png';
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

    getApp() {
      return this.$parent.$parent;
    },

    openMax() {
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
          let url = window.location + '';
          url = url.replaceAll('action=support', 'action=chat');
          url = url.concat('&code=' + res.code);
          window.open(url);
        })
        .catch(() => {});
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

.unread_number {
  position: absolute;
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

.profile-container {
  display: flex;
  align-items: center;
  padding: 2px 10px;
  max-width: calc(100% - 90px);
  min-width: 220px;
}

.profile-picture {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #3498db; /* 蓝色背景，你可以替换为实际图片 */
  margin-right: 10px;
}

.profile-info {
  flex: 1;
  width: calc(100% - 50px);
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
