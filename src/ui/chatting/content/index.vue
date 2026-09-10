<template>
  <div class="content">
    <tooltip />
    <!--   for tooltip in input -->
    <audio id="audio_player" />
    <EmptyState v-if="showEmptyChat" variant="chat" title="欢迎来到蓝莺IM" description="从左侧列表选择一位好友开始聊天，或进入群组继续交流。" />
    <RosterInfo v-if="getViewType == 'rosterinfo'" />
    <GroupInfo v-if="getViewType == 'groupinfo'" />

    <RosterChat v-if="getViewType == 'rosterchat'" />
    <GroupChat v-if="getViewType == 'groupchat'" />

    <Setting v-if="getViewType == 'setting'" @subpage-change="$emit('settings-subpage-change', $event)" />
    <Verification v-if="getViewType == 'verification'" />

    <RosterNotice v-if="getViewType == 'rosterNotice'" />
    <SystemNotice v-if="getViewType == 'systemNotice'" />
    <GroupInviteNotice v-if="getViewType == 'groupInviteNotice'" />
    <GroupApplyNotice v-if="getViewType == 'grpupApplyNotice'" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

import RosterInfo from './roster/info';
import GroupInfo from './group/info';
import RosterChat from './roster/index';
import GroupChat from './group/index';
import Setting from './setting/index';
import Verification from './verification/index';
import RosterNotice from './notice/rosterNotice';
import SystemNotice from './notice/systemNotice';
import GroupInviteNotice from './notice/groupInvitationNotice';
import GroupApplyNotice from './notice/groupApplyNotice';
import EmptyState from '../../components/emptyState';

export default {
  name: 'contentIndex',
  components: {
    EmptyState,
    RosterInfo,
    GroupInfo,
    RosterChat,
    GroupChat,
    Setting,
    Verification,
    RosterNotice,
    SystemNotice,
    GroupInviteNotice,
    GroupApplyNotice
  },
  mounted() {
    const im = this.$store.getters.im;
    this.contentSendingMessageStatusListener = (event) => this.handleSendingMessageStatusChanged(event);
    if (im) im.on('onSendingMessageStatusChanged', this.contentSendingMessageStatusListener);
  },
  destroyed() {
    const im = this.$store.getters.im;
    if (im && this.contentSendingMessageStatusListener) {
      im.off('onSendingMessageStatusChanged', this.contentSendingMessageStatusListener);
    }
  },
  computed: {
    ...mapGetters('content', ['getViewType', 'getMessages']),
    showEmptyChat() {
      return !this.getViewType;
    }
  },
  methods: {
    getSendingFailureReason({ message, errorReason }) {
      let reason = errorReason;
      const status = message && message.status;
      if (!reason && status && status.reason) reason = status.reason;

      const normalizedReason = (reason || '').toLowerCase().trim();
      if (normalizedReason.indexOf('network disconnected') > -1 || normalizedReason.indexOf('message send timeout') > -1) {
        return this.$t('message.sendFailedNetwork', { origin: '网络连接不可用，消息发送失败' });
      }
      if (normalizedReason.indexOf('antispam') > -1) return this.$t('消息包含敏感词，请修改后再发送');
      if (normalizedReason.indexOf('account_verify_needed') > -1 || normalizedReason.indexOf('verify_needed') > -1) {
        return this.$t('无法发送消息，您已被限制使用，请先完成实名认证。');
      }
      if (normalizedReason.indexOf('you have been blocked by the recipient') > -1) return this.$t('你已被对方加入黑名单，无法发送消息');
      if (normalizedReason.indexOf('your relation with target does not allow chat') > -1) return this.$t('你与对方还不是好友，请先添加对方为好友后再聊天');
      return reason || this.$t('消息发送失败');
    },
    handleSendingMessageStatusChanged({ status, mid, message, errorCode, errorReason }) {
      if (status === 'sent') {
        this.$store.dispatch('content/actionUpdateMessage', { message, mid });
        return;
      }
      if (status !== 'failed') return;

      const currentMessage = (this.getMessages || []).find((item) => `${item.id}` === `${mid}`);
      const reason = this.getSendingFailureReason({ message, errorReason });
      this.$store.dispatch('content/actionPatchMessage', {
        mid,
        patch: {
          isSending: false,
          sendFailed: true,
          sendFailedCode: errorCode,
          sendFailedRawReason: errorReason,
          sendFailedReason: reason
        }
      });
      if (currentMessage) {
        console.error('Sending Message status changed to failed mid: ', mid, 'code:', errorCode, 'reason:', errorReason || reason);
        this.$message.error(reason);
      }
    }
  }
};
</script>

<style scoped></style>
