<template>
  <div :class="{ 'chat-index': true, 'chat-viewport': true, 'is-selecting': getShowMultiForwardStatus }">
    <Header />
    <Chat />
    <ForwardSelectionBar />
    <Inputer />
  </div>
</template>

<script>
import Chat from './chat.vue';
import Inputer from './inputer.vue';
import Header from './header.vue';
import ForwardSelectionBar from '../components/forwardSelectionBar.vue';

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
    ForwardSelectionBar
  },
  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime']),
    ...mapGetters('forward', ['getShowMultiForwardStatus'])
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
