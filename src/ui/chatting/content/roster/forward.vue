<template>
  <div class="forwardMemberList" v-if="getShowForwardList">
    <div @click="cancelForward" class="closer">x</div>
    <div class="sep">--- 好友 ---</div>
    <div @click="clickMemberForwardMember(roster.id, 'roster')" class="forwardItem" v-bind:key="roster.id" v-for="roster in getRosterList">
      <img :src="rImage(roster.avatar)" class="avatar" />
      <span class="name">{{ roster.name }}</span>
    </div>
    <div class="sep">--- 群组 ---</div>
    <div @click="clickMemberForwardMember(group.id, 'group')" class="forwardItem" v-bind:key="group.id" v-for="group in getGroupList">
      <img :src="rImage(group.avatar)" class="avatar" />
      <span class="name">{{ group.name }}</span>
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
    },

    rImage(avatar) {
      return this.$store.getters.im.sysManage.getImage({
        avatar
      });
    }

    //methods finish
  }
};
</script>

<style scoped></style>
