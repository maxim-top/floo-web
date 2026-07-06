<template>
  <div class="add_friend_layer">
    <div class="layer">
      <div class="layer_header">
        {{ $t('添加好友') }}
        <div @click="clickAddrosterCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content add_friend_content">
        <div class="add_friend_intro">
          <div class="add_friend_title">{{ $t('搜索用户名或用户 ID') }}</div>
          <div class="add_friend_subtitle">{{ $t('找到目标账号后，可直接发送好友申请并附带别名。') }}</div>
        </div>
        <div class="add_friend_form">
          <div class="add_friend_field">
            <label class="add_friend_label" for="add-friend-username">{{ $t('用户名') }}</label>
            <div class="add_friend_input_row">
              <input id="add-friend-username" :placeholder="$t('输入 username')" type="text" v-model.trim="username" @keydown.enter.prevent="searchNameClickHandler" />
              <button @click="searchNameClickHandler" class="button add_friend_button" type="button">{{ $t('搜索') }}</button>
            </div>
          </div>
          <div class="add_friend_field">
            <label class="add_friend_label" for="add-friend-userid">{{ $t('用户 ID') }}</label>
            <div class="add_friend_input_row">
              <input id="add-friend-userid" :placeholder="$t('输入 user id')" type="text" v-model.trim="user_id" @keydown.enter.prevent="searchIdClickHandler" />
              <button @click="searchIdClickHandler" class="button add_friend_button" type="button">{{ $t('搜索') }}</button>
            </div>
          </div>
        </div>
        <div class="add_friend_result_card" v-if="hasSearchResult">
          <div class="add_friend_result_item">
            <div class="add_friend_result_main">
              <span class="add_friend_result_name">{{ displayName }}</span>
              <span class="add_friend_result_meta">ID: {{ searchResult.user_id }}</span>
            </div>
            <span class="add_friend_result_state" v-if="isFriend">{{ $t('已是好友') }}</span>
          </div>
          <div class="add_friend_result_actions" v-if="!isFriend">
            <input :placeholder="$t('设置别名（可选）')" type="text" v-model.trim="alias" @keydown.enter.prevent="clickUserHandler" />
            <button @click="clickUserHandler" class="add_friend_submit" type="button">{{ $t('发送申请') }}</button>
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
    hasSearchResult() {
      return !!(this.searchResult && this.searchResult.user_id > 0);
    },
    displayName() {
      return this.searchResult.alias || this.searchResult.nick_name || this.searchResult.username || this.searchResult.user_id || '';
    },
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
        alert(this.$t('请输入要搜索的用户名'));
        return;
      }
      this.user_id = '';
      this.alias = '';
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
      this.searchResult = {};
      let user_id = this.user_id;
      if (!user_id) {
        alert(this.$t('请输入要搜索的用户ID'));
        return;
      }
      try {
        user_id = user_id - 0;
      } catch (e) {
        //
      }
      if (!user_id > 0) {
        alert(this.$t('输入不正确'));
        return;
      }
      this.username = '';
      this.alias = '';
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
      const { user_id } = this.searchResult;
      const alias = this.alias;
      this.$store.getters.im.rosterManage.asyncApply({ user_id, alias }).then(() => {
        alert(this.$t('请求已发送成功!'));
        this.clickAddrosterCloseHandler();
      });
    }
    //finish
  }
};
</script>

<style scoped></style>
