<template>
  <div @click="closeLayer" class="image_layer">
    <img :src="getImageUrl" class="image" v-if="getShowing == 'image'" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  data() {
    return {};
  },
  name: 'image2',
  mounted() {},

  computed: {
    ...mapGetters('layer', ['getShowing']),
    ...mapGetters('layer', ['getImageUrl']),
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
