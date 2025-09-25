<template>
  <div class="roster_notice_list">
    <div :key="index" class="item" v-for="(notice, index) in this.notices">
      <span v-if="notice.status === 1">你同意了 {{ notice.user_name }} 的好友申请</span>
      <span v-else-if="notice.status === 2">你拒绝觉了 {{ notice.user_name }} 的好友申请</span>
      <span v-else-if="notice.expired_time < time">{{ notice.user_name }} 想加您为好友，请求已过期</span>
      <span v-else>
        {{ notice.user_name }} 想加您为好友，
        <span @click="agreeHandler(notice.user_id)" class="agree">同意</span>
        或者
        <span @click="declineHandler(notice.user_id)" class="decline">拒绝</span>
      </span>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'RosterNotice',
  mounted() {
    this.requireNotice();
  },
  data() {
    return {
      notices: []
    };
  },

  computed: {
    ...mapGetters('content', ['getSid']),
    im() {
      return this.$store.state.im;
    },
    time() {
      return new Date().getTime();
    }
  },

  methods: {
    requireNotice() {
      this.im.rosterManage.asyncGetApplyList({ cursor: '' }).then((res = []) => {
        const rosterMaps = this.im.rosterManage.getAllRosterDetail();
        res.forEach((r) => {
          const suser = rosterMaps[r.user_id] || {};
          r.user_name = suser.alias || suser.nick_name || suser.username || r.user_id;
        });
        this.notices = res;
      });
    },

    agreeHandler(user_id) {
      this.im.rosterManage.asyncAccept({ user_id }).then(() => {
        alert('您已通过该好友的申请');
        this.requireNotice();
      });
    },
    declineHandler(user_id) {
      this.im.rosterManage.asyncDecline({ user_id }).then(() => {
        alert('您已拒绝该好友的申请');
        this.requireNotice();
      });
    }

    //methods finish
  }
};
</script>

<style scoped></style>
