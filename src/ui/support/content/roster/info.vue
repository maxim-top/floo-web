<template>
  <div class="user_setting">
    <div class="avatar">
      <img :src="userInfo.avatar" class="av" />
    </div>

    <div class="line">
      <span class="ll">用户id</span>
      <p class="lr">{{ userInfo.user_id }}</p>
    </div>

    <div class="line">
      <span class="ll">用户名称</span>
      <p class="lr">{{ rosterName }}</p>
    </div>

    <div class="line">
      <span class="ll">用户昵称</span>
      <p class="lr">{{ nickName }}</p>
    </div>

    <div class="line">
      <span class="ll">备注名称</span>
      <p @click="setAlias" class="lr">{{ aliasName || '点击设置' }}</p>
    </div>

    <div @click="chatRemoveHandler" class="logout mt15" v-if="isFriend">删除好友</div>
    <div @click="addFriendHandler" class="logout mt15" v-else>添加好友</div>
    <div @click="chatClickHandler" class="logout mt15" v-if="isFriend">开始聊天</div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'rosterInfo',
  data() {
    return {
      userInfo: {}
    };
  },
  mounted() {
    this.refreshUserInfo(this.getSid);

    this.$store.getters.im.on('onRosterInfoUpdate', (ids) => {
      if (Array.isArray(ids) && ids.includes(this.getSid)) {
        this.refreshUserInfo(this.getSid);
      }
    });
  },
  watch: {
    getSid(newSid) {
      this.refreshUserInfo(newSid);
    }
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getSid']),
    ...mapGetters('contact', ['getRosterList']),
    aliasName() {
      return this.userInfo.alias;
    },
    rosterName() {
      return this.userInfo.username;
    },
    nickName() {
      return this.userInfo.nick_name;
    },
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    isFriend() {
      const index = this.getRosterList.findIndex((x) => x.user_id === this.getSid);
      return index >= 0;
    }
  },
  methods: {
    refreshUserInfo(newSid) {
      this.$store.getters.im.rosterManage.asyncSearchRosterById({ user_id: newSid }).then((res) => {
        res.avatar = this.$store.getters.im.sysManage.getImage({
          avatar: res.avatar,
          type: 'roster'
        });
        this.userInfo = res;
      });
    },
    chatRemoveHandler() {
      this.$store.getters.im.rosterManage.asyncDeleteRoster({ user_id: this.getSid }).then(() => {
        alert('好友已删除');
      });

      const also_delete_other_devices = true;
      this.$store.getters.im.sysManage.deleteConversation(this.getSid, also_delete_other_devices);
    },
    addFriendHandler() {
      const { user_id } = this.userInfo;
      const alias = '';
      this.$store.getters.im.rosterManage.asyncApply({ user_id, alias }).then(() => {
        alert('请求已发送成功!');
      });
    },

    chatClickHandler() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('content/actionSetType', {
        sid: this.getSid,
        type: 'rosterchat'
      });
    },
    setAlias() {
      const im = this.$store.getters.im;
      this.$prompt('请输入备注名称', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(({ value }) => {
          if (!value) {
            value = '';
          }
          im.rosterManage.asyncUpdateRosterAlias({ user_id: this.userInfo.user_id, alias: value }).then(() => {
            this.refreshUserInfo(this.getSid);
            this.$message.success('修改成功');
          });
        })
        .catch(() => {});
    }
  }
};
</script>

<style scoped>
.mt15 {
  margin-top: 15px !important;
}
</style>
