<template>
  <div @click="closeLayer" class="video_layer">
    <video :src="getVideoUrl" autoplay class="video" v-if="getShowing == 'video'" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  data() {
    return {};
  },
  name: 'video',
  mounted() {},

  computed: {
    ...mapGetters('layer', ['getShowing']),
    ...mapGetters('layer', ['getVideoUrl']),
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    im() {
      return this.$store.state.im;
    }
  },
  methods: {
    clickJoinGroupCloseHandler() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },
    closeLayer() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    }

    //finish
  },
  beforeDestroy() {}
};
</script>

<style scoped>
.closer {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 34px;
  font-weight: bold;
  color: white;
}
</style>
