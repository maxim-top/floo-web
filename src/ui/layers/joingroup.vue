<template>
  <div class="add_friend_layer">
    <div class="layer">
      <div class="layer_header">
        加入群
        <div @click="clickJoinGroupCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content">
        <p class="inputer">
          <input placeHolder="输入group id" type="text" v-model="group_id" />
          <a @click="search" class="button">搜索</a>
        </p>
        <div class="search_item" v-if="searchObj.group_id > 0">
          <div class="item" v-if="isJoined">
            <span class="name">{{ searchObj.name }}</span>
            <span class="rname">已加入</span>
          </div>
          <div class="item" v-if="!isJoined">
            <span class="name">{{ searchObj.name }}</span>
            <span @click="clickJoinHandler" class="rname">申请</span>
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
      const group_id = this.group_id - 0;
      if (group_id <= 0) {
        alert('请输入');
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
      this.$store.getters.im.groupManage.asyncApply({ group_id, reason: '申请加入群' }).then(() => {
        alert('请求已发送成功!');
      });
    }

    //finish
  }
};
</script>

<style scoped></style>
