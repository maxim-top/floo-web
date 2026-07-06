<template>
  <BaseNoticeList :item-key="itemKey" :notices="notices" :empty-text="$t('暂无系统消息')" :subtitle="$t('查看系统通知、账号提醒与群组动态。')" :title="$t('系统消息')">
    <template #item="{ notice }">
      <div class="notice_card_body">
        <div class="notice_card_title">{{ notice.title }}</div>
        <div class="notice_card_desc">{{ notice.description }}</div>
        <div class="notice_card_meta">{{ notice.category }} · {{ notice.timeText }}</div>
      </div>
    </template>
  </BaseNoticeList>
</template>

<script>
import moment from 'moment';
import BaseNoticeList from './baseNoticeList.vue';

export default {
  name: 'SystemNotice',
  components: {
    BaseNoticeList
  },
  data() {
    return {
      notices: []
    };
  },
  mounted() {
    this.refreshNotices();
    const im = this.im;
    if (!im) return;
    this.bindImEvents(im);
  },
  destroyed() {
    const im = this.im;
    if (!im) return;
    this.unbindImEvents(im);
  },
  computed: {
    im() {
      return this.$store.state.im;
    }
  },
  watch: {
    im(im, previousIm) {
      if (previousIm && previousIm !== im) {
        this.unbindImEvents(previousIm);
      }
      if (!im || im === previousIm) {
        return;
      }
      this.refreshNotices();
      this.bindImEvents(im);
    }
  },
  methods: {
    bindImEvents(im) {
      if (!im || typeof im.on !== 'function') {
        return;
      }
      const refresh = this.refreshNotices;
      im.on('onRosterRemoved', refresh);
      im.on('onRosterDeclined', refresh);
      im.on('onGroupDestoryed', refresh);
      im.on('onGroupApplyed', refresh);
      im.on('onGroupApplyDeclined', refresh);
      im.on('onGroupInvited', refresh);
      im.on('onGroupInvitedDeclined', refresh);
      im.on('onGroupKicked', refresh);
      im.on('onGroupLeaved', refresh);
      im.on('onGroupBlocked', refresh);
      im.on('flooNotice', refresh);
    },
    unbindImEvents(im) {
      if (!im || typeof im.off !== 'function') {
        return;
      }
      im.off({
        onRosterRemoved: '',
        onRosterDeclined: '',
        onGroupDestoryed: '',
        onGroupApplyed: '',
        onGroupApplyDeclined: '',
        onGroupInvited: '',
        onGroupInvitedDeclined: '',
        onGroupKicked: '',
        onGroupLeaved: '',
        onGroupBlocked: '',
        flooNotice: ''
      });
    },
    getStatic(name) {
      return (this.im && this.im.sysManage.getStaticVars()[name]) || {};
    },
    itemKey(notice, index) {
      return `${notice.id || 0}-${notice.timestamp || 0}-${index}`;
    },
    refreshNotices() {
      const im = this.im;
      if (!im || !im.sysManage) {
        this.notices = [];
        return;
      }
      const items = im.sysManage.getNoticeMessage();
      this.ensureReferencedDetails(items).then(() => {
        this.notices = items
          .map((item) => this.normalizeNotice(item))
          .filter(Boolean)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
    },
    ensureReferencedDetails(items = []) {
      const im = this.im;
      if (!im || !Array.isArray(items) || !items.length) {
        return Promise.resolve();
      }

      const rosterMap = im.rosterManage.getAllRosterDetail() || {};
      const groupMap = im.groupManage.getAllGroupDetail() || {};
      const rosterIds = [];
      const groupIds = [];

      items.forEach((item) => {
        const payload = item.payload || {};
        const fromUid = payload.from && typeof payload.from.uid !== 'undefined' ? Number(payload.from.uid) : 0;
        const to = Array.isArray(payload.to) ? payload.to : [];
        const gid = payload.gid && typeof payload.gid.uid !== 'undefined' ? Number(payload.gid.uid) : 0;

        if (fromUid > 0 && !(rosterMap[fromUid] && rosterMap[fromUid].username)) {
          rosterIds.push(fromUid);
        }
        to.forEach((entry) => {
          const uid = entry && typeof entry.uid !== 'undefined' ? Number(entry.uid) : 0;
          if (uid > 0 && !(rosterMap[uid] && rosterMap[uid].username)) {
            rosterIds.push(uid);
          }
        });
        if (gid > 0 && !groupMap[gid]) {
          groupIds.push(gid);
        }
      });

      const requests = [];
      const uniqueRosterIds = Array.from(new Set(rosterIds));
      const uniqueGroupIds = Array.from(new Set(groupIds));

      if (uniqueRosterIds.length) {
        requests.push(im.rosterManage.asnycGetRosterListDetailByIds(uniqueRosterIds));
      }
      if (uniqueGroupIds.length) {
        requests.push(im.groupManage.asyncGetGroupListDetail(uniqueGroupIds));
      }

      if (!requests.length) {
        return Promise.resolve();
      }
      return Promise.all(requests).catch(() => Promise.resolve());
    },
    normalizeNotice(meta) {
      if (!meta || !meta.payload) return null;
      return {
        id: meta.id,
        timestamp: Number(meta.timestamp || 0),
        timeText: this.formatTime(meta.timestamp),
        category: this.noticeCategory(meta),
        title: this.noticeTitle(meta),
        description: this.noticeDescription(meta)
      };
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      return moment(Number(timestamp)).format('YYYY-MM-DD HH:mm');
    },
    noticeCategory(meta) {
      const STATIC_META_NAMESPACE = this.getStatic('STATIC_META_NAMESPACE');
      if (meta.ns === STATIC_META_NAMESPACE.GROUP_NOTICE) return this.$t('群通知');
      if (meta.ns === STATIC_META_NAMESPACE.ROSTER_NOTICE) return this.$t('好友通知');
      if (meta.ns === STATIC_META_NAMESPACE.USER_NOTICE) return this.$t('账号通知');
      return this.$t('系统通知');
    },
    noticeTitle(meta) {
      const STATIC_META_NAMESPACE = this.getStatic('STATIC_META_NAMESPACE');
      const payload = meta.payload || {};
      if (meta.ns === STATIC_META_NAMESPACE.GROUP_NOTICE) {
        return this.getGroupName(payload.gid && payload.gid.uid);
      }
      if (meta.ns === STATIC_META_NAMESPACE.ROSTER_NOTICE) {
        return this.getRosterName(this.getPrimaryRosterUid(meta));
      }
      return this.$t('账号通知');
    },
    noticeDescription(meta) {
      const STATIC_META_NAMESPACE = this.getStatic('STATIC_META_NAMESPACE');
      const payload = meta.payload || {};
      if (meta.ns === STATIC_META_NAMESPACE.ROSTER_NOTICE) {
        return this.describeRosterNotice(payload);
      }
      if (meta.ns === STATIC_META_NAMESPACE.GROUP_NOTICE) {
        return this.describeGroupNotice(payload);
      }
      if (meta.ns === STATIC_META_NAMESPACE.USER_NOTICE) {
        return this.describeUserNotice(payload);
      }
      return this.$t('收到新的系统通知');
    },
    getPrimaryRosterUid(meta) {
      const STATIC_ROSTERNONTICE_TYPE = this.getStatic('STATIC_ROSTERNONTICE_TYPE');
      const payload = meta.payload || {};
      const fromUid = payload.from && typeof payload.from.uid !== 'undefined' ? Number(payload.from.uid) : 0;
      const to = Array.isArray(payload.to) ? payload.to : [];
      if (payload.type === STATIC_ROSTERNONTICE_TYPE.ACCEPTED || payload.type === STATIC_ROSTERNONTICE_TYPE.DECLINED) {
        return (to[0] && Number(to[0].uid)) || fromUid;
      }
      return fromUid || (to[0] && Number(to[0].uid)) || 0;
    },
    getRosterName(uid) {
      if (!uid) return this.$t('系统');
      const rosterMap = (this.im && this.im.rosterManage.getAllRosterDetail()) || {};
      const roster = rosterMap[uid] || {};
      return roster.alias || roster.nick_name || roster.username || uid;
    },
    getGroupName(gid) {
      if (!gid) return this.$t('群组通知');
      const groupMap = (this.im && this.im.groupManage.getAllGroupDetail()) || {};
      const group = groupMap[gid] || {};
      return group.name || this.$t('群 {id}', { id: gid });
    },
    describeRosterNotice(payload) {
      const STATIC_ROSTERNONTICE_TYPE = this.getStatic('STATIC_ROSTERNONTICE_TYPE');
      const name = this.getRosterName(this.getPrimaryRosterUid({ payload }));
      switch (payload.type) {
        case STATIC_ROSTERNONTICE_TYPE.ADDED:
          return this.$t('{name}已成为你的好友', { name });
        case STATIC_ROSTERNONTICE_TYPE.REMOVED:
          return this.$t('{name}已不再是你的好友', { name });
        case STATIC_ROSTERNONTICE_TYPE.ACCEPTED:
          return this.$t('{name}通过了你的好友申请', { name });
        case STATIC_ROSTERNONTICE_TYPE.DECLINED:
          return this.$t('{name}拒绝了你的好友申请', { name });
        case STATIC_ROSTERNONTICE_TYPE.APPLIED:
          return this.$t('{name}请求添加你为好友', { name });
        case STATIC_ROSTERNONTICE_TYPE.BANNED:
          return this.$t('{name}已将你加入黑名单', { name });
        case STATIC_ROSTERNONTICE_TYPE.UNBANNED:
          return this.$t('{name}已将你移出黑名单', { name });
        case STATIC_ROSTERNONTICE_TYPE.INFO_UPDATED:
          return this.$t('{name}更新了资料信息', { name });
        case STATIC_ROSTERNONTICE_TYPE.MUTED:
          return this.$t('{name}已开启免打扰', { name });
        case STATIC_ROSTERNONTICE_TYPE.UNMUTED:
          return this.$t('{name}已关闭免打扰', { name });
        default:
          return this.$t('{name}带来了新的好友通知', { name });
      }
    },
    describeGroupNotice(payload) {
      const STATIC_GROUPNOTICE_TYPE = this.getStatic('STATIC_GROUPNOTICE_TYPE');
      const groupName = this.getGroupName(payload.gid && payload.gid.uid);
      const fromUid = payload.from && typeof payload.from.uid !== 'undefined' ? Number(payload.from.uid) : 0;
      const fromName = this.getRosterName(fromUid);
      switch (payload.type) {
        case STATIC_GROUPNOTICE_TYPE.DESTROYED:
          return this.$t('{group}已被解散', { group: groupName });
        case STATIC_GROUPNOTICE_TYPE.APPLYED:
          return this.$t('{name}申请加入{group}', { name: fromName, group: groupName });
        case STATIC_GROUPNOTICE_TYPE.APPLY_ACCEPTED:
          return this.$t('{name}已通过入群申请，相关成员已加入{group}', { name: fromName, group: groupName });
        case STATIC_GROUPNOTICE_TYPE.APPLY_DECLINED:
          return this.$t('{name}的入群申请已被拒绝', { name: fromName });
        case STATIC_GROUPNOTICE_TYPE.INVITED:
          return this.$t('{name}发起了加入{group}的群邀请', { name: fromName, group: groupName });
        case STATIC_GROUPNOTICE_TYPE.INVITE_ACCEPTED:
          return this.$t('{name}已接受加入{group}的邀请', { name: fromName, group: groupName });
        case STATIC_GROUPNOTICE_TYPE.INVITE_DECLINED:
          return this.$t('{name}已拒绝加入{group}的邀请', { name: fromName, group: groupName });
        case STATIC_GROUPNOTICE_TYPE.KICKED:
          return this.$t('你已被移出{group}', { group: groupName });
        case STATIC_GROUPNOTICE_TYPE.LEAVED:
          return this.$t('你已离开{group}', { group: groupName });
        case STATIC_GROUPNOTICE_TYPE.BLOCKED:
          return this.$t('你已被{group}拉黑', { group: groupName });
        case STATIC_GROUPNOTICE_TYPE.UNBLOCKED:
          return this.$t('你已被{group}解除拉黑', { group: groupName });
        default:
          return this.$t('{group}有新的群组通知', { group: groupName });
      }
    },
    describeUserNotice(payload) {
      const STATIC_USERNOTICE_TYPE = this.getStatic('STATIC_USERNOTICE_TYPE');
      switch (payload.type) {
        case STATIC_USERNOTICE_TYPE.PASSWORD_CHANGED:
          return this.$t('你的账号密码已更新');
        case STATIC_USERNOTICE_TYPE.FROZEN:
          return this.$t('你的账号已被冻结');
        case STATIC_USERNOTICE_TYPE.REMOVED:
          return this.$t('你的账号已被移除');
        case STATIC_USERNOTICE_TYPE.KICK_BY_SAME_DEVICE:
          return this.$t('相同设备上的新登录已使当前连接下线');
        case STATIC_USERNOTICE_TYPE.KICKED_BY_OTHER_DEVICE:
          return this.$t('你的账号已在其他设备登录');
        case STATIC_USERNOTICE_TYPE.INFO_UPDATED:
          return this.$t('你的账号资料已更新');
        case STATIC_USERNOTICE_TYPE.DEVICE_LOGIN:
          return this.$t('检测到新的设备登录');
        case STATIC_USERNOTICE_TYPE.DEVICE_LOGOUT:
          return this.$t('有设备已退出登录');
        case STATIC_USERNOTICE_TYPE.DEVICE_ADDED:
          return this.$t('你的账号新增了一台设备');
        case STATIC_USERNOTICE_TYPE.DEVICE_REMOVED:
          return this.$t('你的账号移除了一台设备');
        case STATIC_USERNOTICE_TYPE.CLUSTER_CHANGED:
          return this.$t('服务节点已变更，请重新连接');
        case STATIC_USERNOTICE_TYPE.DNS_UPDATE:
          return this.$t('服务配置已更新');
        case STATIC_USERNOTICE_TYPE.TRAFFIC_LIMIT_EXCEEDED:
          return this.$t('账号流量已超出限制');
        default:
          return this.$t('收到新的账号通知');
      }
    }
  }
};
</script>

<style scoped></style>
