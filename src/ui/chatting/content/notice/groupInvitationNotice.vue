<template>
  <BaseNoticeList :item-key="itemKey" :notices="notices" :empty-text="$t('暂无群邀请')" :subtitle="$t('查看并处理收到的入群邀请。')" :title="$t('群邀请通知')">
    <template #item="{ notice }">
      <div class="notice_card_body">
        <div class="notice_card_title">{{ notice.group_name }}</div>
        <div class="notice_card_desc">{{ noticeMessage(notice) }}</div>
        <div :class="['notice_card_status', noticeStatusClass(notice)]" v-if="notice.status || notice.expired_time < time">
          {{ noticeStatusText(notice) }}
        </div>
      </div>
      <div class="notice_card_actions" v-if="!notice.status && notice.expired_time >= time">
        <button @click="declineHandler(notice.group_id)" class="notice_action_button notice_action_button--secondary" type="button">{{ $t('拒绝') }}</button>
        <button @click="agreeHandler(notice.group_id)" class="notice_action_button" type="button">{{ $t('同意') }}</button>
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
      return `${notice.group_id || 'group'}-${notice.user_id || 0}-${notice.expired_time || 0}-${notice.status || 0}-${index}`;
    },
    noticeMessage(notice) {
      if (notice.status === 1) return this.$t('{user}邀请您加入群{group}，您已同意', { user: notice.user_name, group: notice.group_name });
      if (notice.status === 2) return this.$t('{user}邀请您加入群{group}，您已拒绝', { user: notice.user_name, group: notice.group_name });
      if (notice.expired_time < this.time) return this.$t('{user}邀请您加入群{group}，请求已过期', { user: notice.user_name, group: notice.group_name });
      return this.$t('{user}邀请您加入群{group}', { user: notice.user_name, group: notice.group_name });
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
        const user_name = suser.alias || suser.nick_name || suser.username || item.inviter_id;
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
        approval: false,
        user_id,
        group_id
      });
    },
    inviteHandler(p) {
      const { approval } = p;
      this.im.groupManage.asyncInviteHandle(p).then(() => {
        alert(approval ? this.$t('您已同意加入该群') : this.$t('您已拒绝加入该群'));
        this.requireNotice();
      });
    }

    //methods finish
  }
};
</script>

<style scoped></style>
