<template>
  <div class="support-content">
    <audio id="audio_player" />
    <RosterInfo v-if="getViewType == 'rosterinfo'" />

    <RosterChat v-if="getViewType == 'rosterchat'" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

import RosterInfo from './roster/info';
import RosterChat from './roster/index';

export default {
  name: 'contentIndex',
  components: {
    RosterInfo,
    RosterChat
  },
  computed: {
    ...mapGetters('chat', ['getViewType'])
  },
  methods: {}
};
</script>
