<template>
  <div class="inputer_frame" ref="groupInputer">
    <ChatFileUploadStatus :tasks="visibleChatFileUploadTasks(getSid, 'group')" @retry="retryChatFileUpload" @dismiss="dismissChatFileUpload" />
    <div class="composer_surface">
      <div v-if="canUseQuickReply" class="composer_toolbar">
        <button class="quick_reply_button" type="button" @click="quickReplyVisible = true">
          <span class="quick_reply_icon_text" aria-hidden="true">⚡</span>
          <span>{{ $t('快捷回复') }}</span>
        </button>
      </div>
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
        </div>
      </div>
      <div class="input">
        <textarea
          @input="handleTextareaInput"
          @keydown="textareaKeyDown"
          class="input_text"
          :placeholder="[[placeholder]]"
          v-model="message"
          wrap="hard"
          ref="inputTextRef"
          focus
        ></textarea>
      </div>
      <div class="button">
        <div id="group_send_button" @click="handleSendMessage" class="im_send_empty" />
      </div>
    </div>
    <QuickReplyPanel :im="im" :visible="quickReplyVisible" @close="quickReplyVisible = false" @select="handleQuickReplySelect" />
    <div class="support_link">
      <el-tooltip placement="top" effect="light" :visible-arrow="false">
        <div slot="content">
          <span>AppID:{{ appid }}</span>
          <br />
          <span>{{ verifyInfoText }}</span>
        </div>
        <span class="trust_badge">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="trust_badge_icon">
            <path d="M12 3l7 3v5c0 5-3.4 8.8-7 10-3.6-1.2-7-5-7-10V6l7-3z"></path>
            <path d="M9 12.2l2 2 4-4.2"></path>
          </svg>
          <span class="trust_badge_text">{{ verifyInfoText || $t('认证信息') }}</span>
        </span>
      </el-tooltip>
      <a href="https://www.lanyingim.com" target="_blank">{{ $t('打造你的智能聊天APP，使用蓝莺IM SDK') }}</a>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import QuickReplyPanel from '../../../components/quickReplyPanel';
import ChatFileUploadStatus from '../../../components/chatFileUploadStatus';
import chatFileUpload from '../../../mixins/chatFileUpload';

export default {
  name: 'groupInputer',
  mixins: [chatFileUpload],
  data() {
    return {
      placeholder: '',
      message: '',
      fileType: '',
      button: null,
      showActionMenu: false,
      canUseQuickReply: false,
      quickReplyVisible: false,
      textareaResizeFrame: null
    };
  },
  components: {
    QuickReplyPanel,
    ChatFileUploadStatus
  },
  computed: {
    ...mapGetters('content', ['getSid', 'getIntentMessage']),
    im() {
      return this.$store.state.im;
    },
    appid() {
      return this.$store.state.im.userManage.getAppid();
    },
    verifyInfoText() {
      const accountVerification = this.im.sysManage.getAccountVerification(this.im.userManage.getAppid());
      if (!accountVerification) return '';
      const statusPrefixMap = {
        unverified: this.$t('未认证开发者：'),
        verified: this.$t('已认证：'),
        expired: this.$t('认证失败：')
      };
      const typePrefix = accountVerification.type && accountVerification.type === 'enterprise' ? '' : `${this.$t('个人开发者：').replace(/：$/, '')} `;
      return `${typePrefix}${statusPrefixMap[accountVerification.status] || this.$t('未认证开发者：')}${accountVerification.name || ''}`;
    }
  },
  mounted() {
    this.initIntentMessage();
    document.addEventListener('click', this.closeActionMenu);
    this.initQuickReplyEligibility();
    let _this = this;

    // paste
    this.$refs.groupInputer.addEventListener('paste', function (event) {
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
    this.$refs.groupInputer.addEventListener('drop', function (event) {
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
    this.$refs.groupInputer.addEventListener('dragover', function (event) {
      event.preventDefault();
    });
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeActionMenu);
    if (this.textareaResizeFrame) {
      cancelAnimationFrame(this.textareaResizeFrame);
      this.textareaResizeFrame = null;
    }
  },
  methods: {
    textareaKeyDown(evt) {
      if (evt.isComposing || evt.keyCode === 229) return;
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

    handleTextareaInput() {
      this.scheduleTextareaResize();
      this.changeSendButtonBackground();
    },
    toggleActionMenu() {
      this.showActionMenu = !this.showActionMenu;
    },
    closeActionMenu() {
      this.showActionMenu = false;
    },
    initQuickReplyEligibility() {
      this.im.sysManage
        .asyncCanUseQuickReply()
        .then((value) => {
          this.canUseQuickReply = !!value;
        })
        .catch(() => {
          this.canUseQuickReply = false;
        });
    },
    handleQuickReplySelect(content) {
      const nextMessage = `${content || ''}`.trim();
      this.quickReplyVisible = false;
      if (!nextMessage) {
        return;
      }
      this.message = nextMessage;
      this.$nextTick(() => {
        this.autoResizeTextarea();
        this.changeSendButtonBackground();
        if (this.$refs.inputTextRef) {
          this.$refs.inputTextRef.focus();
        }
      });
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

    handleSendMessage() {
      if (/^\s*$/.test(this.message)) {
        this.message = this.placeholder;
        if (/^\s*$/.test(this.message)) return;
      }

      // 如果需要自定义消息，直接使用 ext 字段即可
      this.im.sysManage.sendGroupMessage({
        // type: 'text', // image , file， 默认 text， 可省略
        content: this.message,
        gid: this.getSid,
        // ext: "自定义消息字段",
        priority: 0
      });

      setTimeout(() => {
        this.message = '';
        this.$nextTick(() => {
          this.autoResizeTextarea();
          this.changeSendButtonBackground();
        });
      }, 200);
    },

    fileChangeHandler(e) {
      const file = e.target.files[0];
      this.sendFileInBackground(file);
    },

    sendFileInBackground(file) {
      this.startChatFileUpload(file, this.fileType, 'group', this.getSid);
      if (this.$refs.fileRef) this.$refs.fileRef.value = '';
    },

    initIntentMessage() {
      if (this.getIntentMessage) {
        this.placeholder = this.getIntentMessage;
        this.$nextTick(() => {
          this.$refs.inputTextRef.focus();
          this.autoResizeTextarea();
        });
      }
      this.button = document.getElementById('group_send_button');
      this.$nextTick(() => {
        this.autoResizeTextarea();
        this.changeSendButtonBackground();
      });
    },

    changeSendButtonBackground() {
      if (!this.button) return;
      if (/^\s*$/.test(this.message)) {
        this.button.className = 'im_send_empty';
      } else {
        this.button.className = 'im_send_full';
      }
    },

    scheduleTextareaResize() {
      if (this.textareaResizeFrame) return;
      this.textareaResizeFrame = requestAnimationFrame(() => {
        this.textareaResizeFrame = null;
        this.autoResizeTextarea();
      });
    },

    autoResizeTextarea() {
      const textarea = this.$refs.inputTextRef;
      if (!textarea) return;
      textarea.style.height = '40px';
      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(Math.max(scrollHeight, 40), 150);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = scrollHeight > 150 ? 'auto' : 'hidden';
    }
    //methods finish
  }
};
</script>

<style scoped>
.composer_toolbar {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 6;
}

.quick_reply_button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #c4daf8;
  border-radius: 999px;
  background: #ffffff;
  color: #1862cc;
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 3px 8px rgba(60, 115, 186, 0.18);
}

.quick_reply_icon_text {
  font-size: 13px;
  line-height: 1;
}

.composer_surface {
  position: relative;
}
</style>
