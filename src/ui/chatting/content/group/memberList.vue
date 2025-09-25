<template>
  <div class="group_memberlist" v-if="!getShowMultiForwardStatus">
    <div class="infos">
      群组成员
      <span class="group_count">{{ getMemberList.length }}人</span>
      <span class="setting">
        <span @click="settingClicked">设置</span>
      </span>
    </div>
    <!-- <div class="search">
      <input type="text" placeholder="Search" />
    </div> -->
    <div class="gm_list">
      <div class="gm_scroll_list" ref="imgContainer">
        <div @click="touchRoster(roster.user_id)" class="item" v-bind:key="roster.user_id" v-for="roster in getMemberList">
          <img :src="rImage(roster.avatar)" class="avatar" />
          <div class="name">{{ displayName(roster) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import CryptoJS from 'crypto-js';

export default {
  data() {
    return {
      token: this.$store.state.im.userManage.getToken()
    };
  },

  mounted() {
    this.$store.getters.im.on('onGroupMemberChanged', (/*gid*/) => {
      this.$store.dispatch('content/actionUpdateMemberList');
    });
  },

  computed: {
    ...mapGetters('forward', ['getShowMultiForwardStatus']),
    ...mapGetters('content', ['getSid', 'getGroupInfo', 'getMemberList', 'getAdminList']),
    isAdmin() {
      const uid = this.$store.getters.im.userManage.getUid();
      return this.getAdminList.filter((x) => x.user_id === uid).length > 0;
    },
    isOwner() {
      const uid = this.$store.getters.im.userManage.getUid();
      return this.getGroupInfo.owner_id === uid;
    },
    im() {
      return this.$store.getters.im;
    }
  },

  methods: {
    settingClicked() {
      if (this.isOwner || this.isAdmin) {
        this.$store.dispatch('layer/actionSetShowing', 'groupsetting');
        this.$store.dispatch('layer/actionSetShowmask', 'true');
      } else {
        alert('只有群主或管理员才可设置');
      }
    },

    checkHideMemberInfo(user_id) {
      let hide = true;
      let hide_member_info = this.getGroupInfo.hide_member_info;
      let app_hide_member_info = false;
      const uid = this.im.userManage.getUid();
      let appConfig = this.im.sysManage.getAppConfig(this.im.userManage.getAppid());
      if (appConfig) {
        app_hide_member_info = appConfig.hide_member_info;
      }
      if (app_hide_member_info) {
        if (!hide_member_info) {
          hide = false;
        }
      } else {
        hide = false;
      }

      return hide;
    },

    touchRoster(sid) {
      if (!this.checkHideMemberInfo(sid)) {
        const uid = this.$store.getters.im.userManage.getUid();
        if (uid + '' === sid + '') {
          return;
        }
        this.$store.dispatch('content/actionSetType', {
          sid,
          type: 'rosterinfo'
        });
      }
    },

    rImage(avatar) {
      return this.im.sysManage.getImage({
        avatar
      });
    },

    calucateHideMemberName(roster) {
      let original = roster.display_name + roster.user_id;
      const md5hash = CryptoJS.MD5(original);
      let output = md5hash.toString(CryptoJS.enc.Base64);
      if (output.length > 12) {
        output = output.substring(0, 12);
      }
      return output;
    },

    displayName(roster) {
      if (this.checkHideMemberInfo(roster.user_id) && !roster.has_nick) {
        return this.calucateHideMemberName(roster);
      } else {
        return roster.display_name;
      }
    }
  }
};
</script>

<style scoped></style>
