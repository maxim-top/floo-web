<template>
  <div
    :class="{ 'chat-index': true, 'chat-viewport': true, 'group-chat-layout': true, 'member-drawer-open': showMemberDrawer, 'is-selecting': getShowMultiForwardStatus }"
    @click="handleClick"
  >
    <div class="group-chat-main">
      <Header @toggle-members="toggleMemberDrawer" />
      <Chat />
      <ForwardSelectionBar />
      <Inputer />
    </div>
    <div class="group-member-overlay" v-if="showMemberDrawer" @click="closeMemberDrawer"></div>
    <div class="group-chat-sidebar">
      <MemberList />
    </div>
  </div>
</template>

<script>
import Chat from './chat.vue';
import Inputer from './inputer.vue';
import Header from './header.vue';
import ForwardSelectionBar from '../components/forwardSelectionBar.vue';
import MemberList from './memberList';

import { mapGetters } from 'vuex';

export default {
  name: 'GroupChat',
  data() {
    return {
      showMemberDrawer: false
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
    Header,
    Chat,
    Inputer,
    ForwardSelectionBar,
    MemberList
  },
  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime']),
    ...mapGetters('forward', ['getShowMultiForwardStatus'])
  },
  methods: {
    requireGroups() {
      // 获取 memberlist  admin, 拉新数据
    },

    handleClick(event) {
      if (this.showMemberDrawer) {
        const target = event && event.target;
        if (target && !target.closest('.group-chat-sidebar') && !target.closest('.header_more')) {
          this.showMemberDrawer = false;
        }
      }
      this.$store.state.im.groupManage.consumeGroupAtStatus(this.getSid);
    },

    toggleMemberDrawer() {
      this.showMemberDrawer = !this.showMemberDrawer;
    },

    closeMemberDrawer() {
      this.showMemberDrawer = false;
    }
  },
  watch: {
    getSid(a, b) {
      if (a !== b) {
        this.$store.dispatch('content/actionOpenGroup');
        this.showMemberDrawer = false;
      }
    }
  }
};
</script>

<style scoped></style>
