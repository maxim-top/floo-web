<template>
  <div class="user_setting">
    <div class="avatar">
      <img :src="avatar" @click="touchedAvatar" class="av" />
      <img @click="viewQrcode" class="qrcode" src="/image/qr.png" />
    </div>
    <input @change="fileChangeHandler" ref="fileRef" type="file" />
    <div class="line">
      <span class="ll">手机号码</span>
      <p @click="settingMobile" class="lr">{{ mobile || '点击设置' }}</p>
      <!-- <input type="text" v-model="mobile" /><a @click="saveMobile">保存</a> -->
    </div>
    <div class="line">
      <span class="ll">昵称</span>
      <p @click="settingNick" class="lr">{{ nick_name || '点击设置' }}</p>
      <!-- <input type="text" v-model="nick_name" /><a @click="saveNick">保存</a> -->
    </div>
    <div class="line">
      <span class="ll">ID</span>
      <p class="lr">{{ user_id }}</p>
      <!-- <input type="text" v-model="nick_name" /><a @click="saveNick">保存</a> -->
    </div>
    <div class="line">
      <span class="ll">好友验证</span>
      <i :class="['r', auth_mode ? 'switcher_on' : 'switcher_off']" @click="rosterSwitchTouch" class="switcher"></i>
    </div>
    <div class="line">
      <span class="ll">群邀请验证</span>
      <i :class="['r', group_confirm ? 'switcher_on' : 'switcher_off']" @click="groupSwitchTouch" class="switcher"></i>
    </div>

    <div @click="logout" class="logout">退出</div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'rosterInfo',
  data() {
    return {
      avatar: '',
      mobile: '',
      nick_name: '',
      auth_mode: 0,
      group_confirm: false,
      user_id: ''
    };
  },
  mounted() {
    this.$store.dispatch('setting/actionGetProfile');
    this.$store.dispatch('setting/actionGetSettingInfo');
  },
  components: {},
  computed: {
    ...mapGetters('setting', ['getSettingInfo', 'getProfileInfo']),

    token() {
      return this.$store.getters.im.userManage.getToken();
    }
  },
  methods: {
    touchedAvatar() {
      this.$refs.fileRef.click();
    },

    fileChangeHandler(e) {
      const file = e.target.files[0];
      console.log('Choose file: ', file);
      this.$store.getters.im.sysManage
        .asyncFileUpload({
          file,
          toType: 'rosterAvatar'
        })
        .then((res) => {
          this.$refs.fileRef.value = '';
          this.updateAvatarUrl(res.url);
        })
        .catch(() => {
          this.$refs.fileRef.value = '';
        });
    },

    updateAvatarUrl(avatar) {
      this.$store.getters.im.userManage
        .asyncUpdateAvatar({
          avatar
        })
        .then(() => {
          this.$store.dispatch('setting/actionGetProfile');
          alert('更新头像完成');
        });
    },
    saveMobile() {
      const value = this.mobile || '';
      if (!value) return;
      this.$store.getters.im.userManage
        .asyncUpdateMobile({
          mobile: value
        })
        .then(() => {
          alert('修改成功');
        });
    },
    saveNick() {
      const value = this.nick_name || '';
      // if (!value) return;
      this.$store.getters.im.userManage
        .asyncUpdateNickName({
          nick_name: value
        })
        .then(() => {
          alert('修改成功');
        });
    },
    getApp() {
      return this.$parent.$parent.$parent;
    },
    logout() {
      this.getApp().imLogout();
      this.$store.dispatch('login/actionChangeAppStatus', 'login');
      this.$store.dispatch('header/actionChangeHeaderUserProfile', {});
    },
    rosterSwitchTouch() {
      const auth_mode = this.auth_mode === 1 ? 0 : 1;
      const user_id = this.$store.state.im.userManage.getUid();
      this.$store.state.im.userManage.asyncUpdateSettings({ auth_mode, user_id }).then(() => {
        this.auth_mode = auth_mode;
      });
    },
    groupSwitchTouch() {
      const group_confirm = !this.group_confirm;
      const user_id = this.$store.state.im.userManage.getUid();
      this.$store.state.im.userManage.asyncUpdateSettings({ group_confirm, user_id }).then(() => {
        this.group_confirm = group_confirm;
      });
    },
    updateInfos() {
      this.avatar = this.$store.getters.im.sysManage.getImage({
        avatar: this.getProfileInfo.avatar
      });
      this.mobile = this.getProfileInfo.mobile;
      this.nick_name = this.getProfileInfo.nick_name;

      this.auth_mode = this.getSettingInfo.auth_mode || 0;
      this.group_confirm = this.getSettingInfo.group_confirm;
      this.user_id = this.getSettingInfo.user_id;
    },
    viewQrcode() {
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('layer/actionSetShowing', 'qrprofile');
    },
    settingMobile() {
      this.$prompt('请输入手机号', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^((13[0-9])|(14[0-9])|(15[^4,\\D])|(166)|(17[0-9])|(18[0-9]))\\d{8}$/,
        inputErrorMessage: '手机号格式不正确'
      })
        .then(({ value }) => {
          if (!value) return;
          this.$store.getters.im.userManage.asyncUpdateMobile({ mobile: value }).then(() => {
            this.mobile = value;
            alert('修改成功');
          });
        })
        .catch(() => {});
    },
    settingNick() {
      const im = this.$store.getters.im;
      this.$prompt('请输入昵称', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(({ value }) => {
          if (!value) return;
          im.userManage.asyncUpdateNickName({ nick_name: value }).then(() => {
            this.nick_name = value;
            alert('修改成功');
          });
        })
        .catch(() => {});
    }
    //methods finish
  },

  watch: {
    getSettingInfo() {
      this.updateInfos();
    },
    getProfileInfo() {
      this.updateInfos();
    }
  }
};
</script>

<style scoped></style>
