<template>
  <div class="chat-index">
    <tooltip />
    <!--   for tooltip in input -->
    <Chat />
    <Inputer />
  </div>
</template>

<script>
import Chat from './chat.vue';
import Inputer from './inputer.vue';
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
    Chat,
    Inputer
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
