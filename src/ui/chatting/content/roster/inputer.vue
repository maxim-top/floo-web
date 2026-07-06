<template>
  <div class="inputer_frame" ref="rosterInputer" v-if="getSid !== 0">
    <div class="composer_surface">
      <div class="attach">
        <input @change="fileChangeHandler" ref="fileRef" type="file" />
        <div class="attach_toggle" @click.stop="toggleActionMenu" tabindex="0">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="attach_toggle_icon">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div v-if="showActionMenu" class="attach_menu" @click.stop>
          <div @click="imageUploadClickHandler" class="attach_menu_item">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="attach_menu_icon">
              <rect x="4" y="5" width="16" height="14" rx="2"></rect>
              <circle cx="9" cy="10" r="1.5"></circle>
              <path d="M7 16l3.5-3.5L13 15l2-2 2 3"></path>
            </svg>
            <span>{{ $t('发送图片') }}</span>
          </div>
          <div @click="fileUploadClickHandler" class="attach_menu_item">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="attach_menu_icon">
              <path d="M8 3h6l4 4v13a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
              <path d="M14 3v5h5"></path>
            </svg>
            <span>{{ $t('发送文件') }}</span>
          </div>
          <div @click="locationClickHandler" class="attach_menu_item">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="attach_menu_icon">
              <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11z"></path>
              <circle cx="12" cy="10" r="2"></circle>
            </svg>
            <span>{{ $t('发送位置') }}</span>
          </div>
          <div @click="videoCallClickHandler" class="attach_menu_item">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="attach_menu_icon">
              <rect x="4" y="7" width="11" height="10" rx="2"></rect>
              <path d="M15 10l5-3v10l-5-3z"></path>
            </svg>
            <span>{{ $t('视频通话') }}</span>
          </div>
          <div @click="audioCallClickHandler" class="attach_menu_item">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="attach_menu_icon">
              <path d="M6.5 5.5h3l2 4-2.5 2.5a14 14 0 0 0 5 5L16.5 14l4 2v3c0 1-1 2-2 2A16 16 0 0 1 3 5.5c0-1 1-2 2-2h1.5z"></path>
            </svg>
            <span>{{ $t('语音通话') }}</span>
          </div>
        </div>
      </div>
      <div class="input">
        <textarea
          @blur="inputBlurHandler"
          @focus="inputFocusHandler"
          @input="handleTextareaInput"
          @keydown="textareaKeyDown"
          class="input_text"
          v-model="message"
          wrap="hard"
          ref="inputTextRef"
        ></textarea>
      </div>
      <div class="button">
        <div @click="handleSendMessage" :class="message && !/^\s*$/.test(message) ? 'im_send_full' : 'im_send_empty'"></div>
      </div>
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
      fileType: '',
      showActionMenu: false,
      rosterInputerHandlersBound: false
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
    document.addEventListener('click', this.closeActionMenu);
    this.bindRosterInputerEvents();
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeActionMenu);
    this.unbindRosterInputerEvents();
  },
  watch: {
    getSid() {
      this.loadConversationDraft();
      this.$nextTick(() => {
        this.bindRosterInputerEvents();
      });
    }
  },
  methods: {
    bindRosterInputerEvents() {
      const rosterInputer = this.$refs.rosterInputer;
      if (!rosterInputer || this.rosterInputerHandlersBound) {
        return;
      }

      rosterInputer.addEventListener('paste', this.handleRosterInputerPaste);
      rosterInputer.addEventListener('drop', this.handleRosterInputerDrop);
      rosterInputer.addEventListener('dragover', this.handleRosterInputerDragover);
      this.rosterInputerHandlersBound = true;
    },
    unbindRosterInputerEvents() {
      const rosterInputer = this.$refs.rosterInputer;
      if (!rosterInputer || !this.rosterInputerHandlersBound) {
        this.rosterInputerHandlersBound = false;
        return;
      }

      rosterInputer.removeEventListener('paste', this.handleRosterInputerPaste);
      rosterInputer.removeEventListener('drop', this.handleRosterInputerDrop);
      rosterInputer.removeEventListener('dragover', this.handleRosterInputerDragover);
      this.rosterInputerHandlersBound = false;
    },
    handleRosterInputerPaste(event) {
      const clipboardData = event.clipboardData || window.clipboardData;
      const items = clipboardData && clipboardData.items;
      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            event.preventDefault();
            const blob = item.getAsFile();
            const file = new File([blob], blob.name, {
              type: blob.type
            });
            this.fileType = 'file';
            if (item.type.indexOf('image') >= 0) {
              this.fileType = 'image';
            }
            this.sendFileInBackground(file);
          }
        }
      }
    },
    handleRosterInputerDrop(event) {
      event.preventDefault();
      const items = event.dataTransfer.files;
      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          this.fileType = 'file';
          if (item.type.indexOf('image') >= 0) {
            this.fileType = 'image';
          }
          this.sendFileInBackground(item);
        }
      }
    },
    handleRosterInputerDragover(event) {
      event.preventDefault();
    },
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
      this.closeActionMenu();
      this.fileType = 'image';
      this.$refs.fileRef.click();
    },
    fileUploadClickHandler() {
      this.closeActionMenu();
      this.fileType = 'file';
      this.$refs.fileRef.click();
    },
    toggleActionMenu() {
      this.showActionMenu = !this.showActionMenu;
    },
    closeActionMenu() {
      this.showActionMenu = false;
    },

    locationClickHandler() {
      this.closeActionMenu();
      const message = {
        uid: this.getSid,
        content: '',
        type: 'location',
        attachment: {
          lat: 40.024422,
          lon: 116.398376,
          addr: this.$t('奥林匹克森林公园')
        }
      };
      this.im.sysManage.sendRosterMessage(message);
    },

    videoCallClickHandler() {
      this.closeActionMenu();
      this.$store.dispatch('layer/actionSetShowing', 'videocall');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('contact/actionSetCallId', this.im.userManage.getUid().toString() + '_' + Date.now());
    },

    audioCallClickHandler() {
      this.closeActionMenu();
      this.$store.dispatch('layer/actionSetShowing', 'audiocall');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('contact/actionSetCallId', this.im.userManage.getUid().toString() + '_' + Date.now());
    },

    handleSendMessage() {
      if (/^\s*$/.test(this.message)) {
        this.message = '';
        this.syncDraft('');
        return;
      }

      // 如果需要自定义消息，直接使用 ext 字段即可
      this.im.sysManage.sendRosterMessage({
        content: this.message,
        uid: this.getSid
        // ext: "自定义消息字段",
      });
      this.syncDraft('');
      setTimeout(() => {
        this.message = '';
        this.$nextTick(() => {
          this.autoResizeTextarea();
        });
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
    },

    inputBlurHandler() {
      this.im.sysManage.sendInputStatusMessage(this.getSid, 'nothing');
    },

    handleTextareaInput() {
      this.autoResizeTextarea();
      this.syncDraft(this.message);
    },

    initIntentMessage() {
      if (this.getIntentMessage) {
        this.message = this.getIntentMessage;
        this.$nextTick(() => {
          this.$refs.inputTextRef.focus();
          this.autoResizeTextarea();
        });
      } else {
        this.loadConversationDraft();
      }
      this.$nextTick(() => {
        this.autoResizeTextarea();
      });
    },

    loadConversationDraft() {
      this.unbindRosterInputerEvents();
      this.message = this.im.sysManage.getConversationDraft(this.getSid, 'roster');
      this.$nextTick(() => {
        this.autoResizeTextarea();
      });
    },

    syncDraft(message) {
      const draft = typeof message === 'string' ? message : '';
      this.im.sysManage.saveConversationDraft(this.getSid, 'roster', draft, Date.now());
    },

    autoResizeTextarea() {
      const textarea = this.$refs.inputTextRef;
      if (!textarea) return;
      textarea.style.height = '36px';
      const nextHeight = Math.min(Math.max(textarea.scrollHeight, 36), 150);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > 150 ? 'auto' : 'hidden';
    }
    //methods finish
  }
};
</script>

<style scoped></style>
