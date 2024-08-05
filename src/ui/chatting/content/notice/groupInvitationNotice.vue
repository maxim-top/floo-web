<template>
  <div class="roster_notice_list">
    <div :key="index" class="item" v-for="(notice, index) in this.notices">
      <span v-if="notice.status === 1">{{ notice.user_name }} 邀请您加入群 {{ notice.group_name }} ，您已同意</span>
      <span v-else-if="notice.status === 2">{{ notice.user_name }} 邀请您加入群 {{ notice.group_name }} ，您已拒绝</span>
      <span v-else-if="notice.expired_time < time">{{ notice.user_name }} 邀请您加入群 {{ notice.group_name }} ，请求已过期</span>
      <span v-else>
        {{ notice.user_name }} 邀请您加入群 {{ notice.group_name }}
        <span @click="agreeHandler(notice.group_id)" class="agree">同意</span>
        或者
        <span @click="declineHandler(notice.group_id)" class="decline">拒绝</span>
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
      this.im.groupManage.asyncGetInvitationList({}).then((res) => {
        this.prepareNotice(res);
      });
    },

    prepareNotice(applicationlist) {
      const allRosterMap = this.im.rosterManage.getAllRosterDetail();
      const allGroupMap = this.im.groupManage.getAllGroupDetail();

      const rosterIds = [];
      const groupIds = [];

      applicationlist.forEach((x) => {
        const { inviter_id, group_id } = x;
        if (allRosterMap[inviter_id] && allRosterMap[inviter_id].username) {
          //
        } else {
          rosterIds.push(inviter_id);
        }
        if (!allGroupMap[group_id]) {
          groupIds.push(group_id);
        }
      });

      const promistAllAarr = [];
      if (groupIds.length) {
        promistAllAarr.push(this.im.groupManage.asyncGetGroupListDetail(groupIds));
      }
      if (groupIds.length) {
        promistAllAarr.push(this.im.rosterManage.asnycGetRosterListDetailByIds(rosterIds));
      }

      if (promistAllAarr.length) {
        Promise.all(promistAllAarr).then(() => {
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
        const { group_id, inviter_id, expired_time, status } = item;
        const suser = rmap[inviter_id] || {};
        const user_name = suser.nick_name || suser.username || item.inviter_id;
        const sgroup = gmap[group_id] || {};
        const group_name = sgroup.name || item.group_id;
        return {
          user_name,
          group_name,
          group_id,
          expired_time,
          user_id: inviter_id,
          status
        };
      });
      this.notices = sret;
    },

    agreeHandler(group_id) {
      const user_id = this.im.userManage.getUid();
      this.inviteHandler({
        approval: true,
        user_id,
        group_id
      });
    },
    declineHandler(group_id) {
      const user_id = this.im.userManage.getUid();
      this.inviteHandler({
        approval: true,
        user_id,
        group_id
      });
    },
    inviteHandler(p) {
      const { approval } = p;
      this.im.groupManage.asyncInviteHandle(p).then(() => {
        alert('您已' + (approval ? '同意' : '拒绝') + '加入该群');
        this.requireNotice();
      });
    }

    //methods finish
  }
};
</script>

<style scoped></style>
