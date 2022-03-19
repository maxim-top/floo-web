<template>
  <div class="inputer_frame">
    <div class="attach">
      <input @change="fileChangeHandler" ref="fileRef" type="file" />
      <span @click="imageUploadClickHandler" class="ico image"></span>
      <span @click="fileUploadClickHandler" class="ico file"></span>
      <span @click="locationClickHandler" class="ico location"></span>
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
    ...mapGetters('content', ['getSid']),
    im() {
      return this.$store.state.im;
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
    }
    //methods finish
  }
};
</script>

<style scoped></style>
