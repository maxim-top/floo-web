<template>
  <div class="chat-index" @click="handleClick">
    <tooltip />
    <Chat />
    <Inputer />
  </div>
</template>

<script>
import Chat from './chat.vue';
import Inputer from './inputer.vue';

import { mapGetters } from 'vuex';

export default {
  name: 'GroupChat',
  data() {
    return {
      // status: "login"
    };
  },
  mounted() {
    this.requireGroups();
    this.$store.dispatch('content/actionOpenGroup');

    this.$store.getters.im.on('onGroupMemberChanged', (/*gid*/) => {
      this.$store.dispatch('content/actionUpdateMemberList');
    });

    this.$store.state.im.groupManage.consumeGroupAtStatus(this.getSid);
  },
  components: {
    Chat,
    Inputer
  },
  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime'])
  },
  methods: {
    requireGroups() {
      // 获取 memberlist  admin, 拉新数据
    },

    handleClick() {
      this.$store.state.im.groupManage.consumeGroupAtStatus(this.getSid);
    }
  },
  watch: {
    getSid(a, b) {
      if (a !== b) {
        this.$store.dispatch('content/actionOpenGroup');
      }
    }
  }
};
</script>

<style scoped></style>
