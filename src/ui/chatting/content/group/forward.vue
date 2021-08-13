<template>
  <div class="forwardMemberList" v-if="getShowForwardList">
    <div @click="cancelForward" class="closer">X</div>
    <div class="sep">---好友---</div>
    <div @click="clickMemberForwardMember(roster.id, 'roster')" v-bind:key="roster.id" v-for="roster in getRosterList">
      {{ roster.name }}
    </div>
    <div class="sep">---群---</div>

    <div @click="clickMemberForwardMember(group.id, 'group')" v-bind:key="group.id" v-for="group in getGroupList">
      {{ group.name }}
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'RosterForward',
  mounted() {
    this.$store.dispatch('forward/actionGetForwardList');
  },
  data() {
    return {
      // status: "login"
    };
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime']),
    ...mapGetters('forward', ['getRosterList', 'getGroupList', 'getShowForwardList'])
  },

  methods: {
    cancelForward() {
      this.$store.dispatch('forward/actionCancelForward', false);
    },

    clickMemberForwardMember(id, type) {
      this.$store.dispatch('forward/actionForwardMessage', {
        type,
        id
      });
    }
    //methods finish
  }
};
</script>

<style scoped></style>
