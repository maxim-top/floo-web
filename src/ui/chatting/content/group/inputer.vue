<template>
  <div class="inputer_frame">
    <div class="attach">
      <div class="mentionList" v-if="this.filteredMentionRosters.length > 0">
        <div :key="roster.user_id" @click="clickMemberListHander(roster.user_id)" class="mentionItem" v-for="roster in this.filteredMentionRosters">
          <img :src="rImage(roster.avatar)" class="avatar" />
          <span class="name">{{ displayName(roster) }}</span>
        </div>
      </div>
      <input @change="fileChangeHandler" ref="fileRef" type="file" />
      <span v-popover:tooltip.top="'发送图片'" @click="imageUploadClickHandler" class="ico image"></span>
      <span v-popover:tooltip.top="'发送文件'" @click="fileUploadClickHandler" class="ico file"></span>
      <span v-popover:tooltip.top="'发送位置'" @click="locationClickHandler" class="ico location"></span>
    </div>
    <el-alert v-if="hasBan" title="您已被禁言，请联系管理员" type="info" center :closable="false"></el-alert>
    <div class="input">
      <textarea v-if="!this.hasBan" @keydown="textareaKeyDown" @keyup="textKeyUp" class="input_text" v-model="message" wrap="hard"></textarea>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import CryptoJS from 'crypto-js';

export default {
  name: 'rosterInputer',
  data() {
    return {
      message: '',
      fileType: '',
      mentionSelectedUids: [],
      willsendMessage: '',
      filteredMentionRosters: [],
      hasBan: false,
      expired_time: 0,
      banCheckTimer: null
    };
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getSid', 'getGroupInfo', 'getMemberList']),
    im() {
      return this.$store.state.im;
    }
  },
  mounted() {
    let that = this;
    this.hasBan = false;
    this.chechBan(this.getSid);

    this.$store.getters.im.on('onGroupBaned', (meta) => {
      const { groupId, toUids, content } = meta;
      if (that.getSid === groupId) {
        if (Array.isArray(toUids) && toUids.length && parseInt(content)) {
          toUids.forEach((id) => {
            if (id === this.im.userManage.getUid()) {
              that.hasBan = true;
              that.expired_time = Date.now() + parseInt(content) * 60 * 1000;
              that.startBanCheck();
            }
          });
        }
      }
    });

    this.$store.getters.im.on('onGroupUnbaned', (meta) => {
      const { groupId, toUids } = meta;
      if (that.getSid === groupId) {
        if (Array.isArray(toUids) && toUids.length) {
          toUids.forEach((id) => {
            if (id === this.im.userManage.getUid()) {
              that.stopBanCheck();
            }
          });
        }
      }
    });
  },
  destroyed() {
    this.stopBanCheck();
  },
  watch: {
    getSid(newSid) {
      this.hasBan = false;
      this.chechBan(newSid);
    }
  },
  methods: {
    textareaKeyDown(evt) {
      if (evt.keyCode === 13 && !evt.shiftKey) {
        this.handleSendMessage();
        if (evt && evt.stopPropagation) {
          evt.preventDefault();
        } else {
          window.event.cancelBubble = true;
          return false;
        }
      }
    },
    textKeyUp() {
      const varr = (this.message.split && this.message.split('@')) || [];
      if (varr.length >= 2) {
        const str = varr[varr.length - 1];
        if (str.indexOf(' ') == -1) {
          //不包含空格，表示@状态
          this.filterMemberList(str);
        } else {
          //包含空格，表示被截断，非@状态
          this.filteredMentionRosters = [];
          this.calcMentionIds();
        }
      } else {
        this.filteredMentionRosters = [];
      }
    },
    filterMemberList(str) {
      let ret = [];
      if (!str) {
        ret = [].concat(
          this.getMemberList.filter((x) => {
            return x.user_id != this.im.userManage.getUid();
          })
        );
      } else {
        let that = this;
        ret = this.getMemberList.filter((x) => {
          if (x.user_id != that.im.userManage.getUid()) {
            return x.display_name.indexOf(str) >= 0;
          }
        });
      }
      this.filteredMentionRosters = [].concat(ret);
    },
    rImage(avatar) {
      return this.im.sysManage.getImage({
        avatar
      });
    },
    calcMentionIds() {
      if (!this.message) return;
      let mentionArr = (this.message.split && this.message.split(' ')) || [];
      // mentionArr = mentionArr.filter(x => x.indexOf('@') !== -1);
      const selArray = [];
      let retStr = '';
      mentionArr.forEach((mention) => {
        if (mention.indexOf('@') === -1) {
          if (mention) {
            retStr += mention + ' ';
          }
        } else {
          const marr = mention.split('@');
          const nickName = marr[marr.length - 1];
          const rosters = this.getMemberList.filter((x) => this.displayName(x) === nickName);
          if (!rosters || rosters.length <= 0) {
            retStr += mention + ' ';
          } else {
            const realRoster = rosters.find((x) => this.mentionSelectedUids.indexOf(x.user_id + '') > -1) || rosters[0];
            marr[marr.length - 1] = '{' + realRoster.user_id + '}';
            retStr += marr.join('@') + ' ';
            selArray.push(realRoster.user_id);
          }
        }
      });
      this.willsendMessage = retStr;
      this.mentionSelectedUids = [].concat(selArray);
    },

    imageUploadClickHandler() {
      this.fileType = 'image';
      this.$refs.fileRef.click();
    },
    fileUploadClickHandler() {
      this.fileType = 'file';
      this.$refs.fileRef.click();
    },

    locationClickHandler() {
      const message = {
        gid: this.getSid,
        content: '',
        type: 'location',
        attachment: {
          lat: 40.024422,
          lon: 116.398376,
          addr: '奥林匹克森林公园'
        }
      };
      this.im.sysManage.sendGroupMessage(message);
    },

    handleSendMessage() {
      const txt = this.message;
      if (/^\s*$/.test(txt)) {
        this.message = '';
        return;
      }
      if (this.willsendMessage && this.mentionSelectedUids.length) {
        //mention消息
        /**
         static const std::string kMentionAll = “mentionAll”;              // bool
         static const std::string kMentionList = “mentionList”;            // vector<int64_t>
         static const std::string kMentionedMessage = “mentionedMessage”;  // string
         static const std::string kPushMessage = “pushMessage”;            // string
         static const std::string kSenderNickname = “senderNickname”;      // string
         */
        const mentionAll = false;
        const mentionList = this.mentionSelectedUids.map((x) => x - 0);
        const mentionedMessage = '';
        const pushMessage = '';
        const uid = this.im.userManage.getUid();
        const rInfo = this.im.rosterManage.getRosterInfo(uid);
        const senderNickname = rInfo.username || rInfo.user_id + '';
        this.im.sysManage.sendMentionMessage({
          gid: this.getSid,
          // txt: this.willsendMessage,
          txt: this.message,
          mentionAll,
          mentionList,
          mentionedMessage,
          pushMessage,
          senderNickname
        });
      } else {
        if (!txt) return;

        // 如果需要自定义消息，直接使用 ext 字段即可
        this.im.sysManage.sendGroupMessage({
          // type: 'text', // image , file， 默认 text， 可省略
          content: txt,
          gid: this.getSid,
          // ext: "自定义消息字段",
          priority: 0
        });
      }
      setTimeout(() => {
        this.message = [];
        this.willsendMessage = '';
        this.mentionSelectedUids = [];
        this.filteredMentionRosters = [];
      }, 200);
    },

    fileChangeHandler(e) {
      const file = e.target.files[0];
      this.im.sysManage
        .asyncFileUpload({
          file,
          fileType: this.fileType,
          to_id: this.getSid,
          toType: 'chat',
          chatType: 'group',
          processCallback: function (res) {
            console.log('fileChangeHandler group chat file upload percent :' + 100 * (res.loaded / res.total));
          }
        })
        .then((res) => {
          const fileInfo = {
            dName: file.name,
            fLen: file.size,
            width: 0,
            height: 0
          };
          fileInfo.url = res.url;
          this.im.sysManage.sendGroupMessage({
            type: this.fileType,
            gid: this.getSid,
            content: '',
            attachment: fileInfo,
            //ext: '自定义消息字段',
            priority: 0
          });
          this.$refs.fileRef.value = '';
        })
        .catch(() => {
          this.$refs.fileRef.value = '';
        });
    },
    clickMemberListHander(uid) {
      const set = new Set(this.mentionSelectedUids);
      set.add(uid);
      const arr = Array.from(set);
      if (arr.length !== this.mentionSelectedUids.length) {
        this.mentionSelectedUids = [].concat(arr);
        const roster = this.getMemberList.find((x) => x.user_id + '' === uid + '');
        const sarr = (this.message.split && this.message.split('@')) || [];
        sarr[sarr.length - 1] = this.displayName(roster);
        this.message = sarr.join('@') + ' ';
        this.textKeyUp();
      }
    },
    chechBan(newSid) {
      let that = this;
      this.im.groupManage.asyncGroupBannedList({ group_id: newSid }).then((res) => {
        if (Array.isArray(res) && res.length) {
          res.forEach((item) => {
            if (item.user_id === this.im.userManage.getUid() && item.expired_time > Date.now()) {
              that.hasBan = true;
              that.expired_time = item.expired_time;
              that.startBanCheck();
            }
          });
        }
      });
    },

    startBanCheck() {
      this.banCheckTimer = setInterval(() => {
        if (this.expired_time > Date.now()) {
          // do nothing.
        } else {
          this.stopBanCheck();
        }
      }, 5000);
    },

    stopBanCheck() {
      clearInterval(this.banCheckTimer);
      this.banCheckTimer = null;
      this.hasBan = false;
    },

    checkHideMemberInfo(user_id) {
      let hide = true;
      let hide_member_info = this.getGroupInfo.hide_member_info;
      let app_hide_member_info = false;
      const uid = this.im.userManage.getUid();
      let appConfig = this.im.sysManage.getAppConfig(this.im.userManage.getAppid());
      if (appConfig) {
        app_hide_member_info = appConfig.hide_member_info;
      }
      if (app_hide_member_info) {
        if (!hide_member_info) {
          hide = false;
        }
      } else {
        hide = false;
      }

      return hide;
    },

    calucateHideMemberName(roster) {
      let original = roster.display_name + roster.user_id;
      const md5hash = CryptoJS.MD5(original);
      let output = md5hash.toString(CryptoJS.enc.Base64);
      if (output.length > 12) {
        output = output.substring(0, 12);
      }
      return output;
    },

    displayName(roster) {
      if (this.checkHideMemberInfo(roster.user_id) && !roster.has_nick) {
        return this.calucateHideMemberName(roster);
      } else {
        return roster.display_name;
      }
    }
    //methods finish
  }
};
</script>

<style scoped></style>
