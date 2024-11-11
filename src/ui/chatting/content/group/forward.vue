<template>
  <div class="forwardMemberList" v-if="getShowForwardList">
    <div @click="cancelForward" class="closer">x</div>
    <div class="category">
      <a @click="clickBatchForward">批量转发</a>
    </div>
    <div class="sep">---好友---</div>
    <div class="forwardItem" v-bind:key="roster.id" v-for="roster in getRosterList">
      <img :src="roster.avatar" class="avatar" />
      <span class="name">{{ roster.name }}</span>
      <input :checked="selRosterIdList.indexOf(roster.id) >= 0" @change="changeCheck" @click.stop="touchRosterCheck(roster.id)" type="checkbox" />
    </div>
    <div class="sep">---群---</div>
    <div class="forwardItem" v-bind:key="group.id" v-for="group in getGroupList">
      <img :src="group.avatar" class="avatar" />
      <span class="name">{{ group.name }}</span>
      <input :checked="selGroupIdList.indexOf(group.id) >= 0" @change="changeCheck" @click.stop="touchGroupCheck(group.id)" type="checkbox" />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'RosterForward',
  mounted() {
    this.$store.dispatch('forward/actionGetForwardList');
  },
  data() {
    return {
      // status: "login"
      selRosterIdList: [],
      selGroupIdList: [],
      selCount: 0
    };
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime']),
    ...mapGetters('forward', ['getRosterList', 'getGroupList', 'getShowForwardList', 'getShowMultiForwardStatus', 'getMultiForwardMessages', 'getMessageForwardMaxUserNum'])
  },

  methods: {
    cancelForward() {
      this.clearSelectList();
      this.$store.dispatch('forward/actionCancelForward', false);
    },

    clickMemberForwardMember(id, type) {
      if (!this.getShowMultiForwardStatus) {
        this.clearSelectList();
        this.$store.dispatch('forward/actionForwardMessage', {
          type,
          id
        });
        this.$store.dispatch('forward/actionFinishForward');
      }
    },

    changeCheck(e) {
      if (this.selCount > this.getMessageForwardMaxUserNum) {
        e.target.checked = false;
        this.selCount--;
        this.$message({
          message: '转发消息用户数量超过限制',
          type: 'warning',
          duration: 2500
        });
      }
    },

    touchRosterCheck(uid) {
      const idx = this.selRosterIdList.indexOf(uid);
      if (idx >= 0) {
        this.selRosterIdList.splice(idx, 1);
        this.selCount--;
      } else {
        if (this.selCount < this.getMessageForwardMaxUserNum) {
          this.selRosterIdList.push(uid);
        }
        this.selCount++;
      }
    },

    touchGroupCheck(gid) {
      const idx = this.selGroupIdList.indexOf(gid);
      if (idx >= 0) {
        this.selGroupIdList.splice(idx, 1);
        this.selCount--;
      } else {
        if (this.selCount < this.getMessageForwardMaxUserNum) {
          this.selGroupIdList.push(gid);
        }
        this.selCount++;
      }
    },

    clickBatchForward() {
      if (this.getShowMultiForwardStatus) {
        this.multiMessagesBatchForward();
      } else {
        this.signalMessageBatchForward();
      }
    },

    multiMessagesBatchForward() {
      let count = 0;
      let messageCount = this.getMultiForwardMessages.length;
      this.selRosterIdList.forEach((id) => {
        setTimeout(() => {
          this.$store.dispatch('forward/actionMultiForwardMessages', {
            type: 'roster',
            id
          });
        }, (count += messageCount * 100));
      });
      this.selGroupIdList.forEach((id) => {
        setTimeout(() => {
          this.$store.dispatch('forward/actionMultiForwardMessages', {
            type: 'group',
            id
          });
        }, (count += messageCount * 100));
      });
      setTimeout(() => {
        this.$store.dispatch('forward/actionFinishForward');
      }, count + 100);
      this.clearSelectList();
    },

    signalMessageBatchForward() {
      let count = 0;
      this.selRosterIdList.forEach((id) => {
        setTimeout(() => {
          this.$store.dispatch('forward/actionForwardMessage', {
            type: 'roster',
            id
          });
        }, (count += 100));
      });
      this.selGroupIdList.forEach((id) => {
        setTimeout(() => {
          this.$store.dispatch('forward/actionForwardMessage', {
            type: 'group',
            id
          });
        }, (count += 100));
      });
      this.clearSelectList();
    },

    clearSelectList() {
      this.selRosterIdList = [];
      this.selGroupIdList = [];
    }

    //methods finish
  }
};
</script>

<style scoped></style>
