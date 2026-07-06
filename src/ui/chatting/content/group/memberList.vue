<template>
  <div class="group_memberlist" v-if="!getShowMultiForwardStatus">
    <div class="infos">
      {{ $t('群组成员') }}
      <span class="group_count">{{ $t('{count}人', { count: getMemberList.length }) }}</span>
      <span class="setting">
        <button class="setting_button" type="button" @click="settingClicked">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="setting_icon">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"></path>
            <path
              d="M19 12l2 1-2 3-2-.5a7.8 7.8 0 0 1-1.5 1L15 19h-6l-.5-2.5a7.8 7.8 0 0 1-1.5-1L5 16 3 13l2-1v-2L3 9l2-3 2 .5a7.8 7.8 0 0 1 1.5-1L9 3h6l.5 2.5a7.8 7.8 0 0 1 1.5 1L19 6l2 3-2 1v2z"
            ></path>
          </svg>
        </button>
      </span>
    </div>
    <!-- <div class="search">
      <input type="text" placeholder="Search" />
    </div> -->
    <div class="gm_list">
      <div class="gm_scroll_list" ref="imgContainer">
        <div @click="touchRoster(roster.user_id)" class="item member-list-item" v-bind:key="roster.user_id" v-for="roster in getMemberList">
          <img :src="rImage(roster.avatar)" class="avatar" />
          <div class="member_meta">
            <div class="name">{{ displayName(roster) }}</div>
          </div>
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
        alert(this.$t('只有群主或管理员才可设置'));
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

    getMemberDisplayName(roster) {
      return roster.display_name || roster.alias || roster.nick_name || roster.username || roster.user_id;
    },

    displayName(roster) {
      if (this.checkHideMemberInfo(roster.user_id) && !roster.has_nick) {
        return this.calucateHideMemberName(roster);
      } else {
        return this.getMemberDisplayName(roster);
      }
    }
  }
};
</script>

<style scoped></style>
