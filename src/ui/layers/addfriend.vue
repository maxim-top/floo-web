<template>
  <div class="add_friend_layer">
    <div class="layer">
      <div class="layer_header">
        添加好友
        <div @click="clickAddrosterCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content">
        <p class="inputer">
          <input placeHolder="输入username" type="text" v-model="username" />
          <a @click="searchNameClickHandler" class="button">搜索name</a>
        </p>
        <p class="inputer">
          <input placeHolder="输入userid" type="text" v-model="user_id" />
          <a @click="searchIdClickHandler" class="button">搜索id</a>
        </p>
        <div class="search_item" v-if="searchResult.user_id > 0">
          <span class="name" v-if="isFriend">{{ searchResult.username }} (已是好友)</span>
          <div v-if="!isFriend">
            <span class="name">{{ searchResult.username }}</span>
            <div class="action_item">
              <input placeHolder="别名" type="text" v-model="alias" />
              <span @click="clickUserHandler">添加好友</span>
            </div>
          </div>
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
      searchResult: {},
      user_id: '',
      username: '',
      alias: ''
    };
  },
  name: 'contentIndex',
  mounted() {},
  components: {},
  computed: {
    ...mapGetters('layer', ['getShowing']),
    ...mapGetters('contact', ['getRosterList']),
    isFriend() {
      const friends = this.getRosterList || [];
      return friends.findIndex((x) => x.user_id === this.searchResult.user_id) >= 0;
    }
  },
  methods: {
    clickAddrosterCloseHandler() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },

    searchNameClickHandler() {
      const username = this.username;
      if (!username) {
        alert('请输入要搜索的用户名');
        return;
      }
      this.$store.getters.im.rosterManage
        .asyncSearchRosterByName({ username })
        .then((res) => {
          this.searchResult = res;
        })
        .catch((ex) => {
          this.serr(ex);
        });
    },
    searchIdClickHandler() {
      this.searchedObj = null;
      let user_id = this.user_id;
      if (!user_id) {
        alert('请输入要搜索的用户ID');
        return;
      }
      try {
        user_id = user_id - 0;
      } catch (e) {
        //
      }
      if (!user_id > 0) {
        alert('输入不正确');
        return;
      }
      this.$store.getters.im.rosterManage
        .asyncSearchRosterById({ user_id })
        .then((res) => {
          this.searchResult = res;
        })
        .catch((ex) => {
          this.serr(ex);
        });
    },

    clickUserHandler() {
      const { user_id, username } = this.searchResult;
      const alias = this.alias || username;
      this.$store.getters.im.rosterManage.asyncApply({ user_id, alias }).then(() => {
        alert('请求已发送成功!');
      });
    }
    //finish
  }
};
</script>

<style scoped></style>
