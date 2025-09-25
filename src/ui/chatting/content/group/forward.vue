<template>
  <div class="forwardMemberList" v-if="getShowForwardList">
    <div class="category">
      <a v-if="!isSending" @click="clickBatchForward">批量转发</a>
      <span v-else>发送中 {{ progressNow }} / {{ progressTotal }}</span>
      <div @click="cancelForward" class="closer">x</div>
    </div>
    <div class="sep">
      <span class="name">--- 好友 ---</span>
      <input v-model="rosterSelectAll" @change="touchRosterAllCheck()" type="checkbox" />
    </div>
    <div class="forwardItem" v-bind:key="roster.id" v-for="roster in getRosterList">
      <img :src="roster.avatar" class="avatar" />
      <span class="name">{{ roster.name }}</span>
      <span v-if="sentList.indexOf(roster.id) >= 0">已转发</span>
      <input v-else :checked="selRosterIdList.indexOf(roster.id) >= 0" @change="changeCheck" @click.stop="touchRosterCheck(roster.id)" type="checkbox" />
    </div>
    <div class="sep">
      <span class="name">--- 群组 ---</span>
      <input v-model="groupSelectAll" @change="touchGroupAllCheck()" type="checkbox" />
    </div>
    <div class="forwardItem" v-bind:key="group.id" v-for="group in getGroupList">
      <img :src="group.avatar" class="avatar" />
      <span class="name">{{ group.name }}</span>
      <span v-if="sentList.indexOf(group.id) >= 0">已转发</span>
      <input v-else :checked="selGroupIdList.indexOf(group.id) >= 0" @change="changeCheck" @click.stop="touchGroupCheck(group.id)" type="checkbox" />
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
      selCount: 0,
      rosterSelectAll: false,
      groupSelectAll: false,
      sentList: [],
      isSending: false,
      progressNow: 0,
      progressTotal: 0,
      progressTime: null,
      sendInterval: 200
    };
  },

  computed: {
    ...mapGetters('content', ['getSid', 'getMessages', 'getMessageTime']),
    ...mapGetters('forward', ['getRosterList', 'getGroupList', 'getShowForwardList', 'getShowMultiForwardStatus', 'getMultiForwardMessages', 'getMessageForwardMaxUserNum'])
  },

  methods: {
    cancelForward() {
      this.clearSelectList();
      this.sentList = [];
      this.$store.dispatch('forward/actionCancelForward', false);
    },

    clickMemberForwardMember(id, type) {
      if (!this.getShowMultiForwardStatus) {
        this.clearSelectList();
        this.sentList = [];
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

    touchRosterAllCheck() {
      if (this.rosterSelectAll) {
        for (let i in this.getRosterList) {
          let roster = this.getRosterList[i];
          if (this.selCount < this.getMessageForwardMaxUserNum && this.selRosterIdList.indexOf(roster.id) == -1) {
            if (this.sentList.indexOf(roster.id) == -1) {
              this.touchRosterCheck(roster.id);
            }
          }
        }
      } else {
        for (let i in this.getRosterList) {
          let roster = this.getRosterList[i];
          if (this.selCount > 0 && this.selRosterIdList.indexOf(roster.id) >= 0) {
            this.touchRosterCheck(roster.id);
          }
        }
      }
    },

    touchGroupAllCheck() {
      if (this.groupSelectAll) {
        for (let i in this.getGroupList) {
          let group = this.getGroupList[i];
          if (this.selCount < this.getMessageForwardMaxUserNum && this.selGroupIdList.indexOf(group.id) == -1) {
            if (this.sentList.indexOf(group.id) == -1) {
              this.touchGroupCheck(group.id);
            }
          }
        }
      } else {
        for (let i in this.getGroupList) {
          let group = this.getGroupList[i];
          if (this.selCount > 0 && this.selGroupIdList.indexOf(group.id) >= 0) {
            this.touchGroupCheck(group.id);
          }
        }
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
      if (messageCount == 0) {
        this.$message.error('请选择要转发的消息');
        return;
      }
      if (this.selRosterIdList.length == 0 && this.selGroupIdList.length == 0) {
        this.$message.error('请选择要转发给的人或群');
        return;
      }
      this.progressNow = 0;
      this.progressTotal = 0;
      this.progressTime = Date.now();
      let expectTime = this.progressTime;
      this.isSending = true;
      this.selRosterIdList.forEach((id) => {
        this.progressTotal += 1;
        setTimeout(() => {
          this.$store.dispatch('forward/actionMultiForwardMessages', {
            type: 'roster',
            id
          });
          if (expectTime == this.progressTime) {
            this.sentList.push(id);
            this.progressNow += 1;
          }
        }, (count += messageCount * this.sendInterval));
      });
      this.selGroupIdList.forEach((id) => {
        this.progressTotal += 1;
        setTimeout(() => {
          this.$store.dispatch('forward/actionMultiForwardMessages', {
            type: 'group',
            id
          });
          if (expectTime == this.progressTime) {
            this.progressNow += 1;
            this.sentList.push(id);
          }
        }, (count += messageCount * this.sendInterval));
      });
      setTimeout(() => {
        if (expectTime == this.progressTime) {
          this.$message.success('转发完成');
          this.clearSelectList();
        }
      }, count + this.sendInterval);
    },

    signalMessageBatchForward() {
      let count = 0;
      this.progressNow = 0;
      this.progressTotal = 0;
      this.progressTime = Date.now();
      let expectTime = this.progressTime;
      this.isSending = true;
      this.selRosterIdList.forEach((id) => {
        this.progressTotal += 1;
        setTimeout(() => {
          this.$store.dispatch('forward/actionForwardMessage', {
            type: 'roster',
            id
          });
          if (expectTime == this.progressTime) {
            this.progressNow += 1;
            this.sentList.push(id);
          }
        }, (count += this.sendInterval));
      });
      this.selGroupIdList.forEach((id) => {
        this.progressTotal += 1;
        setTimeout(() => {
          this.$store.dispatch('forward/actionForwardMessage', {
            type: 'group',
            id
          });
          if (expectTime == this.progressTime) {
            this.progressNow += 1;
            this.sentList.push(id);
          }
        }, (count += this.sendInterval));
      });
      setTimeout(() => {
        if (expectTime == this.progressTime) {
          this.$message.success('转发完成');
          this.clearSelectList();
        }
      }, count + this.sendInterval);
    },

    clearSelectList() {
      this.selRosterIdList = [];
      this.selGroupIdList = [];
      this.selCount = 0;
      this.rosterSelectAll = false;
      this.groupSelectAll = false;
      this.isSending = false;
      this.progressNow = 0;
      this.progressTotal = 0;
      this.progressTime = null;
    }

    //methods finish
  }
};
</script>

<style scoped></style>
