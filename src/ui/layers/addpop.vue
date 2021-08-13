<template>
  <div class="header_add_layer">
    <p @click="clickAddFriend">添加好友</p>
    <p @click="clickCreateGroup">新建群组</p>
    <p @click="clickJoinGroup">加入群组</p>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'contentIndex',
  components: {},
  computed: {
    ...mapGetters('layer', ['showing', 'showmask'])
  },
  methods: {
    clickAddFriend() {
      this.$store.dispatch('layer/actionSetShowing', 'addfriend');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },
    clickCreateGroup() {
      this.$store.dispatch('layer/actionSetShowing', 'creategroup');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },
    clickJoinGroup() {
      this.$store.dispatch('layer/actionSetShowing', 'joingroup');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },

    mouseLeave() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    }
  }
};
</script>

<style scoped></style>
