<template>
  <div class="chat-index">
    <MemberList />
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
import MemberList from './memberList';

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
  },
  components: {
    Header,
    Chat,
    Inputer,
    Forward,
    MemberList
  },
  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime'])
  },
  methods: {
    requireGroups() {
      // 获取 memberlist  admin, 拉新数据
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
