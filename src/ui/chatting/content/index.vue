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

    <Setting v-if="getViewType == 'setting'" />
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
  computed: {
    ...mapGetters('content', ['getViewType']),
    showEmptyChat() {
      return !this.getViewType;
    }
  },
  methods: {}
};
</script>

<style scoped></style>
