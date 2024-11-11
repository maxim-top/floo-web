<template>
  <div class="content">
    <tooltip />
    <!--   for tooltip in input -->
    <audio id="audio_player" />
    <RosterInfo v-if="getViewType == 'rosterinfo'" />
    <GroupInfo v-if="getViewType == 'groupinfo'" />

    <RosterChat v-if="getViewType == 'rosterchat'" />
    <GroupChat v-if="getViewType == 'groupchat'" />

    <Setting v-if="getViewType == 'setting'" />
    <Verification v-if="getViewType == 'verification'" />

    <RosterNotice v-if="getViewType == 'rosterNotice'" />
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
import GroupInviteNotice from './notice/groupInvitationNotice';
import GroupApplyNotice from './notice/groupApplyNotice';

export default {
  name: 'contentIndex',
  components: {
    RosterInfo,
    GroupInfo,
    RosterChat,
    GroupChat,
    Setting,
    Verification,
    RosterNotice,
    GroupInviteNotice,
    GroupApplyNotice
  },
  computed: {
    ...mapGetters('chat', ['getViewType'])
  },
  methods: {}
};
</script>

<style scoped></style>
