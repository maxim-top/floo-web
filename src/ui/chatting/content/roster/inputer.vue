<template>
  <div class="inputer_frame">
    <div class="attach">
      <input @change="fileChangeHandler" ref="fileRef" type="file" />
      <span v-popover:tooltip.top="'发送图片'" @click="imageUploadClickHandler" class="ico image"></span>
      <span v-popover:tooltip.top="'发送文件'" @click="fileUploadClickHandler" class="ico file"></span>
      <span v-popover:tooltip.top="'发送位置'" @click="locationClickHandler" class="ico location"></span>
      <span v-popover:tooltip.top="'视频通话'" @click="videoCallClickHandler" class="ico videocall"></span>
      <span v-popover:tooltip.top="'语音通话'" @click="audioCallClickHandler" class="ico audiocall"></span>
    </div>
    <div class="input">
      <textarea
        @blur="inputBlurHandler"
        @focus="inputFocusHandler"
        @keydown="textareaKeyDown"
        class="input_text"
        placeholder="Type a message!"
        v-model="message"
        wrap="hard"
        ref="inputTextRef"
      ></textarea>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'rosterInputer',
  data() {
    return {
      message: '',
      fileType: ''
    };
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getSid', 'getIntentMessage']),
    im() {
      return this.$store.state.im;
    }
  },
  mounted() {
    this.initIntentMessage();
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
        uid: this.getSid,
        content: '',
        type: 'location',
        attachment: {
          lat: 40.024422,
          lon: 116.398376,
          addr: '奥林匹克森林公园'
        }
      };
      this.im.sysManage.sendRosterMessage(message);
    },

    videoCallClickHandler() {
      this.$store.dispatch('layer/actionSetShowing', 'videocall');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('contact/actionSetCallId', this.im.userManage.getUid().toString() + '_' + Date.now());
    },

    audioCallClickHandler() {
      this.$store.dispatch('layer/actionSetShowing', 'audiocall');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('contact/actionSetCallId', this.im.userManage.getUid().toString() + '_' + Date.now());
    },

    handleSendMessage() {
      if (/^\s*$/.test(this.message)) {
        this.message = '';
        return;
      }

      // 如果需要自定义消息，直接使用 ext 字段即可
      this.im.sysManage.sendRosterMessage({
        content: this.message,
        uid: this.getSid
        // ext: "自定义消息字段",
      });
      setTimeout(() => {
        this.message = '';
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
          chatType: 'roster',
          processCallback: function (res) {
            console.log('fileChangeHandler roster chat file upload percent :' + Math.floor(100 * (res.loaded / res.total)));
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
          this.im.sysManage.sendRosterMessage({
            type: this.fileType,
            uid: this.getSid,
            content: '',
            attachment: fileInfo
          });
          this.$refs.fileRef.value = '';
        })
        .catch(() => {
          this.$refs.fileRef.value = '';
        });
    },
    inputFocusHandler() {
      this.im.sysManage.sendInputStatusMessage(this.getSid, 'typing');
    },

    inputBlurHandler() {
      this.im.sysManage.sendInputStatusMessage(this.getSid, 'nothing');
    },

    initIntentMessage() {
      if (this.getIntentMessage) {
        this.message = this.getIntentMessage;
        this.$nextTick(() => {
          this.$refs.inputTextRef.focus();
        });
      }
    }
    //methods finish
  }
};
</script>

<style scoped></style>
