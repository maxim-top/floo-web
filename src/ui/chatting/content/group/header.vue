<template>
  <div class="header">
    <div class="header_items">
      <span class="name" @click="touchUserNameHandler">{{ groupName }}</span>
      <span class="typing" style="padding-left: 20px; color: #ddd"></span>
      <div class="multi_forward_button" @click="multiMessagesForward()">批量转发</div>
      <div class="delete_button" @click="deleteConversation(getSid)">删除会话</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'GroupChat',
  data() {
    return {};
  },
  mounted() {},
  components: {},
  computed: {
    ...mapGetters('content', ['getGroupInfo', 'getSid']),
    ...mapGetters('forward', ['getShowMultiForwardStatus']),
    groupName() {
      let name = this.getGroupInfo.name;
      if (!name) {
        this.$store.dispatch('content/actionUpdateGroup');
      }
      return name;
    }
  },
  methods: {
    touchUserNameHandler() {
      this.$store.dispatch('content/actionSetType', {
        sid: this.getSid,
        type: 'groupinfo'
      });
    },

    deleteConversation(id) {
      const also_delete_other_devices = true;
      this.$store.getters.im.sysManage.deleteConversation(id, also_delete_other_devices);
      alert('会话删除成功');

      this.$store.dispatch('contact/actionGetConversationList');
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('content/actionSetType', {
        sid: undefined
      });
    },

    multiMessagesForward() {
      let status = !this.getShowMultiForwardStatus;
      this.$store.dispatch('forward/actionShowMultiForwardStatus', status);
    }

    //finish
  }
};
</script>

<style scoped></style>
