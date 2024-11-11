<template>
  <div>
    <Login :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'login'" />
    <Regedit :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'regedit'" />
    <VerifyInfo :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'verifyinfo'" />

    <Bindacc :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'bindacc'" />
    <Bindreg :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'bindreg'" />
    <Codelogin :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'codelogin'" />
    <Qrlogin :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'qrlogin'" />
    <Bind :appid="appid" :sdkok="sdkok" v-if="sappStatus == 'bind'" />
  </div>
</template>

<script>
import Login from './login.vue';
import Regedit from './regedit.vue';
import VerifyInfo from './verifyinfo.vue';

import Bindacc from './bindacc.vue';
import Bindreg from './bindreg.vue';
import Codelogin from './codelogin.vue';
import Qrlogin from './qrlogin.vue';
import Bind from './bind.vue';

import { mapGetters } from 'vuex';

export default {
  name: 'index',
  props: ['sdkok', 'appid'],
  data() {
    return {};
  },
  components: {
    Login,
    Regedit,
    VerifyInfo,
    Bindacc,
    Bindreg,
    Codelogin,
    Qrlogin,
    Bind
  },
  computed: {
    ...mapGetters('login', ['getAppStatus']),

    sappStatus() {
      return this.getAppStatus;
    }
  },
  methods: {
    changeAppID(presentAppID) {
      this.$store.dispatch('layer/actionSetAppID', presentAppID);
      this.$store.dispatch('layer/actionSetShowing', 'changeappid');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    }
    // ...mapActions("login", ["alertName"])
  },
  watch: {}
};
</script>

<style scoped></style>
