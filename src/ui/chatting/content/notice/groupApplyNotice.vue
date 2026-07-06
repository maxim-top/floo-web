<template>
  <BaseNoticeList :item-key="itemKey" :notices="notices" :empty-text="$t('暂无入群申请')" :subtitle="$t('审核成员加入群组的申请。')" :title="$t('入群申请')">
    <template #item="{ notice }">
      <div class="notice_card_body">
        <div class="notice_card_title">{{ notice.user_name }}</div>
        <div class="notice_card_desc">{{ noticeMessage(notice) }}</div>
        <div class="notice_card_meta" v-if="notice.reason">{{ $t('申请说明：') }}{{ notice.reason }}</div>
        <div :class="['notice_card_status', noticeStatusClass(notice)]" v-if="notice.status || notice.expired_time < time">
          {{ noticeStatusText(notice) }}
        </div>
      </div>
      <div class="notice_card_actions" v-if="!notice.status && notice.expired_time >= time">
        <button @click="declineHandler(notice.applicant_id, notice.group_id)" class="notice_action_button notice_action_button--secondary" type="button">{{ $t('拒绝') }}</button>
        <button @click="agreeHandler(notice.applicant_id, notice.group_id)" class="notice_action_button" type="button">{{ $t('同意') }}</button>
      </div>
    </template>
  </BaseNoticeList>
</template>

<script>
import { mapGetters } from 'vuex';
import BaseNoticeList from './baseNoticeList.vue';

export default {
  name: 'RosterNotice',
  components: {
    BaseNoticeList
  },
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
    itemKey(notice, index) {
      return `${notice.group_id || 'group'}-${notice.applicant_id || 0}-${notice.expired_time || 0}-${notice.status || 0}-${index}`;
    },
    noticeMessage(notice) {
      if (notice.status === 1) return this.$t('你已同意{user}申请加入{group}群', { user: notice.user_name, group: notice.group_name });
      if (notice.status === 2) return this.$t('你已拒绝{user}申请加入{group}群', { user: notice.user_name, group: notice.group_name });
      if (notice.expired_time < this.time) return this.$t('{user}想要加入群{group}，请求已过期', { user: notice.user_name, group: notice.group_name });
      return this.$t('{user}请求加入群{group}', { user: notice.user_name, group: notice.group_name });
    },
    noticeStatusText(notice) {
      if (notice.status === 1) return this.$t('已同意');
      if (notice.status === 2) return this.$t('已拒绝');
      if (notice.expired_time < this.time) return this.$t('已过期');
      return '';
    },
    noticeStatusClass(notice) {
      if (notice.status === 1) return 'is-approved';
      if (notice.status === 2) return 'is-declined';
      if (notice.expired_time < this.time) return 'is-expired';
      return '';
    },
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
        const user_name = suser.alias || suser.nick_name || suser.username || item.inviter_id;
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
        alert(approval ? this.$t('您已同意该申请') : this.$t('您已拒绝该申请'));
        this.requireNotice();
      });
    }

    //methods finish
  }
};
</script>

<style scoped></style>
