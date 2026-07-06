<template>
  <BaseNoticeList :item-key="itemKey" :notices="notices" :empty-text="$t('暂无好友申请')" :subtitle="$t('处理新的好友申请请求。')" :title="$t('好友通知')">
    <template #item="{ notice }">
      <div class="notice_card_body">
        <div class="notice_card_title">{{ notice.user_name }}</div>
        <div class="notice_card_desc">{{ noticeMessage(notice) }}</div>
        <div :class="['notice_card_status', noticeStatusClass(notice)]" v-if="notice.status || notice.expired_time < time">
          {{ noticeStatusText(notice) }}
        </div>
      </div>
      <div class="notice_card_actions" v-if="!notice.status && notice.expired_time >= time">
        <button @click="declineHandler(notice.user_id)" class="notice_action_button notice_action_button--secondary" type="button">{{ $t('拒绝') }}</button>
        <button @click="agreeHandler(notice.user_id)" class="notice_action_button" type="button">{{ $t('同意') }}</button>
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
      return `${notice.user_id || 'roster'}-${notice.expired_time || 0}-${notice.status || 0}-${index}`;
    },
    noticeMessage(notice) {
      if (notice.status === 1) return this.$t('你已同意{user}的好友申请', { user: notice.user_name });
      if (notice.status === 2) return this.$t('你已拒绝{user}的好友申请', { user: notice.user_name });
      if (notice.expired_time < this.time) return this.$t('{user}想加您为好友，请求已过期', { user: notice.user_name });
      return this.$t('{user}想加您为好友', { user: notice.user_name });
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
        alert(this.$t('您已通过该好友的申请'));
        this.requireNotice();
      });
    },
    declineHandler(user_id) {
      this.im.rosterManage.asyncDecline({ user_id }).then(() => {
        alert(this.$t('您已拒绝该好友的申请'));
        this.requireNotice();
      });
    }

    //methods finish
  }
};
</script>

<style scoped></style>
