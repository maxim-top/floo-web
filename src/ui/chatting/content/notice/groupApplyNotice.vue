<template>
  <div class="roster_notice_list">
    <div :key="index" class="item" v-for="(notice, index) in this.notices">
      <span v-if="notice.status === 1">你同意了 {{ notice.user_name }} 申请加入 {{ notice.group_name }} 群的请求</span>
      <span v-else-if="notice.status === 2">你拒绝了 {{ notice.user_name }} 申请加入 {{ notice.group_name }} 群的请求</span>
      <span v-else-if="notice.expired_time < time">{{ notice.user_name }} 想要加入群 {{ notice.group_name }} ，请求已过期</span>
      <span v-else>
        {{ notice.user_name }} 请求加入群 {{ notice.group_name }}
        <span @click="agreeHandler(notice.applicant_id, notice.group_id)" class="agree">同意</span>
        或者
        <span @click="declineHandler(notice.applicant_id, notice.group_id)" class="decline">拒绝</span>
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
      this.im.groupManage.asyncGetJoinedGroups().then((res) => {
        const group_list = res.map((item) => item.group_id || item);
        this.im.groupManage.asncGetApplicationList({ group_list }).then((rs) => {
          this.prepareNotice(rs);
        });
      });
    },

    prepareNotice(applicationlist) {
      const allRosterMap = this.im.rosterManage.getAllRosterDetail();
      const rosterIds = [];
      applicationlist.forEach((x) => {
        const { applicant_id } = x;
        if (allRosterMap[applicant_id] && allRosterMap[applicant_id].username) {
          //
        } else {
          rosterIds.push(applicant_id);
        }
      });

      if (rosterIds.length) {
        this.im.rosterManage.asnycGetRosterListDetailByIds(rosterIds).then(() => {
          this.dealNoticeList(applicationlist);
        });
      } else {
        this.dealNoticeList(applicationlist);
      }
    },

    dealNoticeList(applicationlist) {
      const rmap = this.im.rosterManage.getAllRosterDetail();
      const gmap = this.im.groupManage.getAllGroupDetail();
      const sret = applicationlist.map((item) => {
        const { status, group_id, applicant_id, expired_time, reason } = item;
        const suser = rmap[applicant_id] || {};
        const user_name = suser.nick_name || suser.username || item.inviter_id;
        const sgroup = gmap[group_id] || {};
        const group_name = sgroup.name || item.group_id;
        return {
          user_name,
          group_name,
          group_id,
          expired_time,
          applicant_id,
          status,
          reason
        };
      });
      this.notices = sret;
    },

    agreeHandler(user_id, group_id) {
      this.inviteHandler({
        approval: true,
        user_id,
        group_id
      });
    },
    declineHandler(user_id, group_id) {
      this.inviteHandler({
        approval: false,
        user_id,
        group_id
      });
    },
    inviteHandler(p) {
      const { approval } = p;
      this.im.groupManage.asyncApplyHandle(p).then(() => {
        alert('您已' + (approval ? '同意' : '拒绝') + '该申请');
        this.requireNotice();
      });
    }

    //methods finish
  }
};
</script>

<style scoped></style>
