<template>
  <div class="add_friend_layer">
    <div class="layer">
      <div class="layer_header">
        {{ $t('加入群组') }}
        <div @click="clickJoinGroupCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content add_friend_content">
        <div class="add_friend_intro">
          <div class="add_friend_title">{{ $t('输入群 ID 搜索目标群组') }}</div>
          <div class="add_friend_subtitle">{{ $t('找到群后可直接发起入群申请。') }}</div>
        </div>
        <div class="add_friend_form">
          <div class="add_friend_field">
            <label class="add_friend_label" for="join-group-id">{{ $t('群 ID') }}</label>
            <div class="add_friend_input_row">
              <input id="join-group-id" :placeholder="$t('输入 group id')" type="text" v-model.trim="group_id" @keydown.enter.prevent="search" />
              <button @click="search" class="button add_friend_button" type="button">{{ $t('搜索') }}</button>
            </div>
          </div>
        </div>
        <div class="add_friend_result_card" v-if="hasSearchResult">
          <div class="add_friend_result_item">
            <div class="add_friend_result_main">
              <span class="add_friend_result_name">{{ displayName }}</span>
              <span class="add_friend_result_meta">ID: {{ searchObj.group_id }}</span>
            </div>
            <span class="add_friend_result_state" v-if="isJoined">{{ $t('已加入') }}</span>
          </div>
          <div class="add_friend_result_actions" v-if="!isJoined">
            <div class="add_friend_result_actions_spacer" aria-hidden="true"></div>
            <button @click="clickJoinHandler" class="add_friend_submit" type="button">{{ $t('申请加入') }}</button>
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
      group_id: '',
      searchObj: {}
    };
  },
  name: 'contentIndex',
  mounted() {},
  components: {},
  computed: {
    ...mapGetters('contact', ['getGroupList']),
    hasSearchResult() {
      return !!(this.searchObj && this.searchObj.group_id > 0);
    },
    displayName() {
      return this.searchObj.name || this.searchObj.group_name || this.searchObj.group_id || '';
    },
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    isJoined() {
      return this.getGroupList.findIndex((x) => x.group_id === this.searchObj.group_id) >= 0;
    }
  },
  methods: {
    clickJoinGroupCloseHandler() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },
    search() {
      this.searchObj = {};
      const group_id = this.group_id - 0;
      if (group_id <= 0) {
        alert(this.$t('请输入'));
        return;
      }
      this.$store.getters.im.groupManage
        .asyncGetInfo({ group_id })
        .then((res) => {
          this.searchObj = res;
        })
        .catch((ex) => {
          this.serr(ex);
        });
    },

    clickJoinHandler() {
      const group_id = this.group_id - 0;
      this.$store.getters.im.groupManage.asyncApply({ group_id, reason: this.$t('申请加入群') }).then(() => {
        alert(this.$t('请求已发送成功!'));
        this.clickJoinGroupCloseHandler();
      });
    }

    //finish
  }
};
</script>

<style scoped></style>
