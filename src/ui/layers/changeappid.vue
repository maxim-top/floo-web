<template>
  <div class="change_appid_layer">
    <div class="layer">
      <div class="layer_header">
        <span @click="changeAppID(appID)" class="hint">请输入新的 AppID</span>
        <div @click="close" class="closer">x</div>
      </div>
      <div class="layer_content">
        <div class="iptFrame">
          <input autocomplete="false" placeholder="appID" type="text" v-model="appID" />
        </div>
        <div class="layer_footer">
          <a @click="changeAppID" class="button-ok">确定</a>
          <a @click="close" class="button-cancel">取消</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'changeappid',
  data() {
    return {
      appID: ''
    };
  },
  computed: {
    ...mapGetters('layer', ['getShowing', 'getShowmask', 'getAppID'])
  },
  watch: {
    getAppID: {
      handler(presentAppID) {
        this.appID = presentAppID;
      },
      immediate: true
    }
  },
  methods: {
    changeAppID() {
      console.log('changeAppID to', this.appID);
      this.$store.dispatch('actionChangeAppID', this.appID);
      // this.$emit("appid-changed", this.appID);
      this.close();
    },
    close() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    }
  }
};
</script>

<style scoped></style>
