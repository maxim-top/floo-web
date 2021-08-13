<template>
  <div class="chat-index">
    <Header />
    <Chat />
    <Inputer />
    <Forward />
  </div>
</template>

<script>
import Chat from './chat.vue';
import Inputer from './inputer.vue';
import Header from './header.vue';
import Forward from './forward.vue';

import { mapGetters } from 'vuex';

export default {
  name: 'RosterChat',
  data() {
    return {
      // status: "login"
    };
  },
  mounted() {
    this.requireUserInfo();
  },
  components: {
    Header,
    Chat,
    Inputer,
    Forward
  },
  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime'])
  },
  methods: {
    requireUserInfo() {
      this.$store.dispatch('content/actionUpdateRoster');
    }
  },
  watch: {
    getSid(a, b) {
      if (a !== b) {
        this.requireUserInfo();
      }
    }
  }
};
</script>

<style scoped></style>
