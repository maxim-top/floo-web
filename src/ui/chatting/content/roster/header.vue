<template>
  <div class="header">
    <span @click="touchUserNameHandler">{{ rosterName }}</span>
    <span class="typing" style="padding-left: 10px; color: #ddd; font-size: 10px" v-if="status">正在输入...</span>
    <div class="delete_button" @click="deleteConversation(getSid)">删除会话</div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'RosterChat',
  data() {
    return {
      status: false
    };
  },
  mounted() {
    this.$store.getters.im.on('onInputStatusMessage', (message) => {
      const { from, ext } = message;
      if (from == this.getSid) {
        const { input_status } = ext;
        if (input_status == 'nothing') {
          this.status = false;
        } else {
          this.status = true;
        }
      }
    });
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getRosterInfo', 'getSid']),
    rosterName() {
      return this.getRosterInfo.nick_name || this.getRosterInfo.username;
    }
  },
  methods: {
    touchUserNameHandler() {
      this.$store.dispatch('content/actionSetType', {
        sid: this.getSid,
        type: 'rosterinfo'
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
    }
  }
};
</script>

<style scoped></style>
