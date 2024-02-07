<template>
  <div class="group_memberlist">
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
          <div class="name">{{ roster.display_name || roster.user_name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

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
    touchRoster(sid) {
      const uid = this.$store.getters.im.userManage.getUid();
      if (uid + '' === sid + '') {
        return;
      }
      this.$store.dispatch('content/actionSetType', {
        sid,
        type: 'rosterinfo'
      });
    },
    rImage(avatar) {
      return this.im.sysManage.getImage({
        avatar
      });
    }
  }
};
</script>

<style scoped></style>
