<template>
  <div class="support-content">
    <audio id="audio_player" />
    <RosterInfo v-if="getViewType == 'rosterinfo'" />
    <GroupInfo v-if="getViewType == 'groupinfo'" />
    <RosterChat v-if="getViewType == 'rosterchat'" />
    <GroupChat v-if="getViewType == 'groupchat'" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

import RosterInfo from './roster/info';
import GroupInfo from './group/info';
import RosterChat from './roster/index';
import GroupChat from './group/index';

export default {
  name: 'contentIndex',
  components: {
    RosterInfo,
    GroupInfo,
    RosterChat,
    GroupChat
  },
  computed: {
    ...mapGetters('chat', ['getViewType'])
  },
  methods: {}
};
</script>
