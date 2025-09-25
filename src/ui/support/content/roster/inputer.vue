<template>
  <div class="inputer_frame" ref="rosterInputer">
    <div class="input">
      <div class="attach">
        <input @change="fileChangeHandler" ref="fileRef" type="file" />
        <span v-popover:tooltip.top="'发送图片'" @click="imageUploadClickHandler" class="ico image"></span>
        <span v-popover:tooltip.top="'发送文件'" @click="fileUploadClickHandler" class="ico file"></span>
      </div>
      <div>
        <textarea
          @blur="inputBlurHandler"
          @focus="inputFocusHandler"
          @keydown="textareaKeyDown"
          @keyup="textareaKeyUp"
          class="input_text"
          :placeholder="[[placeholder]]"
          v-model="message"
          wrap="hard"
          ref="inputTextRef"
          focus
        ></textarea>
        <div class="button">
          <div id="roster_send_button" @click="handleSendMessage" class="im_send_empty" />
        </div>
      </div>
    </div>
    <div class="support_link">
      <el-tooltip placement="top" effect="light" :visible-arrow="false">
        <div slot="content">
          <span>AppID:{{ appid }}</span>
          <br />
          <span>{{ verifyInfo }}</span>
        </div>
        <span class="im_tips"></span>
      </el-tooltip>
      <a href="https://www.lanyingim.com" target="_blank">打造你的智能聊天APP，使用蓝莺IM SDK</a>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'rosterInputer',
  data() {
    return {
      placeholder: '',
      message: '',
      fileType: '',
      button: null,
      verifyInfo: ''
    };
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getSid', 'getIntentMessage']),
    im() {
      return this.$store.state.im;
    },
    appid() {
      return this.$store.state.im.userManage.getAppid();
    }
  },
  mounted() {
    this.initIntentMessage();
    let _this = this;

    // paste
    this.$refs.rosterInputer.addEventListener('paste', function (event) {
      const clipboardData = event.clipboardData || window.clipboardData;
      const items = clipboardData.items;
      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            event.preventDefault();
            const blob = item.getAsFile();
            const file = new File([blob], blob.name, {
              type: blob.type
            });
            _this.fileType = 'file';
            if (item.type.indexOf('image') >= 0) {
              _this.fileType = 'image';
            }
            _this.sendFileInBackground(file);
          }
        }
      }
    });

    // drop
    this.$refs.rosterInputer.addEventListener('drop', function (event) {
      event.preventDefault();
      const items = event.dataTransfer.files;
      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          _this.fileType = 'file';
          if (item.type.indexOf('image') >= 0) {
            _this.fileType = 'image';
          }
          _this.sendFileInBackground(item);
        }
      }
    });

    // dragover
    this.$refs.rosterInputer.addEventListener('dragover', function (event) {
      event.preventDefault();
    });

    let accountVerification = this.im.sysManage.getAccountVerification(this.im.userManage.getAppid());
    if (accountVerification) {
      if (accountVerification.status) {
        switch (accountVerification.status) {
          case 'unverified':
            this.verifyInfo += '未认证开发者：';
            break;
          case 'verified':
            this.verifyInfo += '已认证：';
            break;
          case 'expired':
            this.verifyInfo += '认证失败：';
            break;
          default:
            this.verifyInfo += '未认证开发者：';
            break;
        }
      }
      if (accountVerification.type && accountVerification.type == 'enterprise') {
        //
      } else {
        this.verifyInfo += '个人开发者 ';
      }
      this.verifyInfo += accountVerification.name;
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
    textareaKeyUp() {
      this.changeSendButtonBackground();
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
        this.message = this.placeholder;
        if (/^\s*$/.test(this.message)) return;
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
      this.sendFileInBackground(file);
    },

    sendFileInBackground(file) {
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
      this.changeSendButtonBackground();
    },

    inputBlurHandler() {
      this.im.sysManage.sendInputStatusMessage(this.getSid, 'nothing');
      this.changeSendButtonBackground();
    },

    initIntentMessage() {
      if (this.getIntentMessage) {
        this.placeholder = this.getIntentMessage;
        this.$nextTick(() => {
          this.$refs.inputTextRef.focus();
        });
      }
      this.button = document.getElementById('roster_send_button');
    },

    changeSendButtonBackground() {
      if (/^\s*$/.test(this.message)) {
        this.button.className = 'im_send_empty';
      } else {
        this.button.className = 'im_send_full';
      }
    }
    //methods finish
  }
};
</script>
