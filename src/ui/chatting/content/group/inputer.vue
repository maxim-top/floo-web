<template>
  <div class="inputer_frame" ref="groupInputer">
    <ChatFileUploadStatus :tasks="visibleChatFileUploadTasks(getSid, 'group')" @retry="retryChatFileUpload" @dismiss="dismissChatFileUpload" />
    <div class="composer_surface">
      <div v-if="canUseQuickReply && !(this.hasBan || this.hasAllBan)" class="composer_toolbar">
        <button class="quick_reply_button" type="button" @click="quickReplyVisible = true">
          <span class="quick_reply_icon_text" aria-hidden="true">⚡</span>
          <span>{{ $t('快捷回复') }}</span>
        </button>
      </div>
      <div class="attach">
        <div class="mentionList" v-if="(this.canMentionAll && this.showMentionAllOption) || this.filteredMentionRosters.length > 0">
          <div @click="clickMentionAllHandler" class="mentionItem" v-if="this.canMentionAll && this.showMentionAllOption">
            <span class="avatar mention_all_avatar" aria-hidden="true">@</span>
            <span class="name">{{ mentionAllLabel }}</span>
          </div>
          <div :key="roster.user_id" @click="clickMemberListHander(roster.user_id)" class="mentionItem" v-for="roster in this.filteredMentionRosters">
            <img :src="rImage(roster.avatar)" class="avatar" />
            <span class="name">{{ displayName(roster) }}</span>
          </div>
        </div>
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
        </div>
      </div>
      <div class="input">
        <textarea
          v-if="!(this.hasBan || this.hasAllBan)"
          @beforeinput="handleTextareaBeforeInput"
          @input="handleTextareaInput"
          @keydown="textareaKeyDown"
          class="input_text"
          v-model="message"
          wrap="hard"
          ref="inputTextRef"
        ></textarea>
      </div>
      <div v-if="!(this.hasBan || this.hasAllBan)" class="button">
        <div @click="handleSendMessage" :class="message && !/^\s*$/.test(message) ? 'im_send_full' : 'im_send_empty'"></div>
      </div>
    </div>
    <QuickReplyPanel :im="im" :visible="quickReplyVisible" @close="quickReplyVisible = false" @select="handleQuickReplySelect" />
    <el-alert v-if="hasBan || hasAllBan" :title="$t('您已被禁言，请联系管理员')" type="info" center :closable="false"></el-alert>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import CryptoJS from 'crypto-js';
import QuickReplyPanel from '../../../components/quickReplyPanel';
import ChatFileUploadStatus from '../../../components/chatFileUploadStatus';
import chatFileUpload from '../../../mixins/chatFileUpload';

const DRAFT_SYNC_DELAY = 300;

export default {
  name: 'groupInputer',
  mixins: [chatFileUpload],
  data() {
    return {
      message: '',
      fileType: '',
      mentionTokens: [],
      mentionMessageSnapshot: '',
      pendingMentionEdit: null,
      mentionSelectedUids: [],
      mentionAllSelected: false,
      mentionAllPermissionLoaded: false,
      mentionAllPermissionRequestId: 0,
      willsendMessage: '',
      filteredMentionRosters: [],
      showMentionAllOption: false,
      hasBan: false,
      expired_time: 0,
      hasAllBan: false,
      banCheckTimer: null,
      showActionMenu: false,
      canUseQuickReply: false,
      quickReplyVisible: false,
      draftSyncTimer: null,
      pendingDraftSync: null,
      textareaResizeFrame: null
    };
  },
  components: {
    QuickReplyPanel,
    ChatFileUploadStatus
  },
  computed: {
    ...mapGetters('content', ['getSid', 'getGroupInfo', 'getMemberList', 'getAdminList']),
    isAdmin() {
      const uid = this.$store.getters.im.userManage.getUid();
      return this.getAdminList.some((x) => `${x.user_id}` === `${uid}`);
    },
    isOwner() {
      const uid = this.$store.getters.im.userManage.getUid();
      return `${this.getGroupInfo.owner_id}` === `${uid}`;
    },
    canMentionAll() {
      return this.mentionAllPermissionLoaded && (this.isOwner || this.isAdmin);
    },
    mentionAllLabel() {
      return this.$t('mention.all', { origin: '所有人' });
    },
    im() {
      return this.$store.state.im;
    }
  },
  mounted() {
    document.addEventListener('click', this.closeActionMenu);
    window.addEventListener('pagehide', this.flushDraftSync);
    this.initQuickReplyEligibility();
    this.refreshMentionAllPermission();
    this.im.on('onGroupAdminGranted', this.handleGroupRoleChanged);
    this.im.on('onGroupAdminRevoked', this.handleGroupRoleChanged);
    this.im.on('onGroupOwnerAssigned', this.handleGroupRoleChanged);
    let _this = this;

    //todo later. need ban fix.
    /*
    this.chechBan(this.getSid);

    this.$store.getters.im.on('onGroupBaned', (meta) => {
      const { groupId, toUids, content, all = false } = meta;
      if (_this.getSid === groupId && !this.isAdmin) {
        if (all) {
          _this.hasAllBan = true;
        } else if (Array.isArray(toUids) && toUids.length && parseInt(content)) {
          toUids.forEach((id) => {
            if (id === this.im.userManage.getUid()) {
              _this.hasBan = true;
              _this.expired_time = Date.now() + parseInt(content) * 60 * 1000;
              _this.startBanCheck();
            }
          });
        }
      }
    });

    this.$store.getters.im.on('onGroupUnbaned', (meta) => {
      const { groupId, toUids, all = false } = meta;
      if (_this.getSid === groupId && !this.isAdmin) {
        if (all) {
          _this.hasAllBan = false;
        } else if (Array.isArray(toUids) && toUids.length) {
          toUids.forEach((id) => {
            if (id === this.im.userManage.getUid()) {
              _this.stopBanCheck();
            }
          });
        }
      }
    });
    */

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

    this.$nextTick(() => {
      this.loadConversationDraft();
      this.autoResizeTextarea();
    });
  },
  destroyed() {
    document.removeEventListener('click', this.closeActionMenu);
    window.removeEventListener('pagehide', this.flushDraftSync);
    this.im.off('onGroupAdminGranted', this.handleGroupRoleChanged);
    this.im.off('onGroupAdminRevoked', this.handleGroupRoleChanged);
    this.im.off('onGroupOwnerAssigned', this.handleGroupRoleChanged);
    this.flushDraftSync();
    if (this.textareaResizeFrame) {
      cancelAnimationFrame(this.textareaResizeFrame);
      this.textareaResizeFrame = null;
    }
    //todo later. need ban fix.
    //this.stopBanCheck();
  },
  watch: {
    getSid(newSid) {
      this.flushDraftSync();
      this.loadConversationDraft();
      this.refreshMentionAllPermission();
      this.quickReplyVisible = false;
      //todo later. need ban fix.
      //this.chechBan(newSid);
    },
    canMentionAll(value) {
      if (!value) {
        this.showMentionAllOption = false;
        return;
      }
      const mentionStart = this.message.lastIndexOf('@');
      if (mentionStart < 0) return;
      const fragment = this.message.slice(mentionStart + 1);
      if (fragment.indexOf(' ') === -1) {
        this.showMentionAllOption = this.mentionAllLabel.indexOf(fragment) >= 0;
      }
    }
  },
  methods: {
    refreshMentionAllPermission() {
      const sid = this.getSid;
      const requestId = ++this.mentionAllPermissionRequestId;
      this.mentionAllPermissionLoaded = false;
      return Promise.all([this.$store.dispatch('content/actionGetGroupAdminList', { sid }), this.$store.dispatch('content/actionUpdateGroup', { sid, force: true })])
        .then(([adminListLoaded]) => {
          if (requestId === this.mentionAllPermissionRequestId && `${this.getSid}` === `${sid}` && adminListLoaded === true) {
            this.mentionAllPermissionLoaded = true;
          }
        })
        .catch(() => {
          // Fail closed when the current role cannot be confirmed.
        });
    },
    handleGroupRoleChanged() {
      this.refreshMentionAllPermission();
    },
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
    updateMentionState() {
      this.reconcileMentionTokens(this.mentionMessageSnapshot, this.message, this.pendingMentionEdit);
      this.pendingMentionEdit = null;
      this.mentionMessageSnapshot = this.message;
      this.refreshMentionState();
      const varr = (this.message.split && this.message.split('@')) || [];
      if (varr.length >= 2) {
        const str = varr[varr.length - 1];
        if (str.indexOf(' ') == -1) {
          //不包含空格，表示@状态
          this.filterMemberList(str);
        } else {
          //包含空格，表示被截断，非@状态
          this.filteredMentionRosters = [];
          this.showMentionAllOption = false;
        }
      } else {
        this.filteredMentionRosters = [];
        this.showMentionAllOption = false;
      }
    },
    handleTextareaInput(evt) {
      this.scheduleTextareaResize();
      if (evt && evt.target.composing) {
        this.pendingMentionEdit = null;
        return;
      }
      this.updateMentionState();
      this.syncDraft(this.message);
    },
    handleTextareaBeforeInput(evt) {
      const target = evt && evt.target;
      if (!target || typeof target.selectionStart !== 'number' || typeof target.selectionEnd !== 'number') {
        this.pendingMentionEdit = null;
        return;
      }
      this.pendingMentionEdit = {
        start: target.selectionStart,
        end: target.selectionEnd,
        inputType: evt.inputType || ''
      };
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
      this.willsendMessage = '';
      this.mentionTokens = [];
      this.mentionMessageSnapshot = this.message;
      this.mentionSelectedUids = [];
      this.mentionAllSelected = false;
      this.filteredMentionRosters = [];
      this.showMentionAllOption = false;
      this.syncDraft(this.message);
      this.$nextTick(() => {
        this.autoResizeTextarea();
        if (this.$refs.inputTextRef) {
          this.$refs.inputTextRef.focus();
        }
      });
    },
    filterMemberList(str) {
      this.showMentionAllOption = this.canMentionAll && this.mentionAllLabel.indexOf(str) >= 0;
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
    reconcileMentionTokens(previousMessage, nextMessage, edit = null) {
      if (previousMessage === nextMessage || !this.mentionTokens.length) return;
      let changedStart = edit && Number.isInteger(edit.start) ? edit.start : -1;
      let previousChangedEnd = edit && Number.isInteger(edit.end) ? edit.end : -1;
      let inferredEdit = false;
      if (changedStart < 0 || previousChangedEnd < changedStart || previousChangedEnd > previousMessage.length) {
        inferredEdit = true;
        changedStart = 0;
        const maxPrefixLength = Math.min(previousMessage.length, nextMessage.length);
        while (changedStart < maxPrefixLength && previousMessage[changedStart] === nextMessage[changedStart]) {
          changedStart++;
        }
        let suffixLength = 0;
        const maxSuffixLength = Math.min(previousMessage.length - changedStart, nextMessage.length - changedStart);
        while (suffixLength < maxSuffixLength && previousMessage[previousMessage.length - 1 - suffixLength] === nextMessage[nextMessage.length - 1 - suffixLength]) {
          suffixLength++;
        }
        previousChangedEnd = previousMessage.length - suffixLength;
      }
      const removedLength = previousMessage.length - nextMessage.length;
      if (changedStart === previousChangedEnd && removedLength > 0) {
        if (edit.inputType.indexOf('Backward') >= 0) {
          changedStart = Math.max(0, previousChangedEnd - removedLength);
        } else if (edit.inputType.indexOf('Forward') >= 0) {
          previousChangedEnd = Math.min(previousMessage.length, changedStart + removedLength);
        } else {
          this.mentionTokens = [];
          return;
        }
      }
      if (inferredEdit && this.mentionTokens.some((token) => token.end > changedStart && token.start < previousChangedEnd)) {
        this.mentionTokens = [];
        return;
      }
      const offset = nextMessage.length - previousMessage.length;
      this.mentionTokens = this.mentionTokens.reduce((tokens, token) => {
        if (token.end <= changedStart) {
          tokens.push(token);
        } else if (token.start >= previousChangedEnd) {
          tokens.push(Object.assign({}, token, { start: token.start + offset, end: token.end + offset }));
        }
        return tokens;
      }, []);
    },
    refreshMentionState() {
      this.mentionTokens = this.mentionTokens.filter((token) => this.message.slice(token.start, token.end) === `@${token.label}`);
      this.mentionAllSelected = this.mentionTokens.some((token) => token.type === 'all');
      this.mentionSelectedUids = [...new Set(this.mentionTokens.filter((token) => token.type === 'member').map((token) => `${token.uid}`))];
      this.willsendMessage = this.mentionTokens.length ? this.message : '';
    },
    insertMentionToken(token) {
      const previousMessage = this.message;
      const mentionStart = previousMessage.lastIndexOf('@');
      if (mentionStart < 0) return;
      this.message = previousMessage.slice(0, mentionStart + 1) + token.label + ' ';
      this.reconcileMentionTokens(previousMessage, this.message, {
        start: mentionStart + 1,
        end: previousMessage.length,
        inputType: 'insertReplacementText'
      });
      this.mentionTokens.push(
        Object.assign({}, token, {
          start: mentionStart,
          end: mentionStart + token.label.length + 1
        })
      );
      this.mentionTokens.sort((a, b) => a.start - b.start);
      this.mentionMessageSnapshot = this.message;
      this.refreshMentionState();
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

    locationClickHandler() {
      this.closeActionMenu();
      const message = {
        gid: this.getSid,
        content: '',
        type: 'location',
        attachment: {
          lat: 40.024422,
          lon: 116.398376,
          addr: this.$t('奥林匹克森林公园')
        }
      };
      this.im.sysManage.sendGroupMessage(message);
    },

    handleSendMessage() {
      const txt = this.message;
      if (/^\s*$/.test(txt)) {
        this.message = '';
        this.syncDraft('', true);
        return;
      }
      const mentionAll = this.mentionAllSelected && this.canMentionAll;
      if (this.willsendMessage && (mentionAll || this.mentionSelectedUids.length)) {
        //mention消息
        /**
         static const std::string kMentionAll = “mentionAll”;              // bool
         static const std::string kMentionList = “mentionList”;            // vector<int64_t>
         static const std::string kMentionedMessage = “mentionedMessage”;  // string
         static const std::string kPushMessage = “pushMessage”;            // string
         static const std::string kSenderNickname = “senderNickname”;      // string
         */
        const mentionList = mentionAll ? [] : this.mentionSelectedUids.map((x) => x - 0);
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
      this.syncDraft('', true);
      setTimeout(() => {
        this.message = '';
        this.willsendMessage = '';
        this.mentionTokens = [];
        this.mentionMessageSnapshot = '';
        this.mentionSelectedUids = [];
        this.mentionAllSelected = false;
        this.filteredMentionRosters = [];
        this.showMentionAllOption = false;
        this.$nextTick(() => {
          this.autoResizeTextarea();
        });
      }, 200);
    },

    loadConversationDraft() {
      this.message = this.im.sysManage.getConversationDraft(this.getSid, 'group');
      const draftMention = this.im.sysManage.getConversationDraftMention(this.getSid, 'group');
      this.mentionTokens = draftMention.tokens;
      this.mentionMessageSnapshot = this.message;
      this.pendingMentionEdit = null;
      this.refreshMentionState();
      this.filteredMentionRosters = [];
      this.showMentionAllOption = false;
      this.$nextTick(() => {
        this.autoResizeTextarea();
      });
    },

    syncDraft(message, immediate = false) {
      const draft = typeof message === 'string' ? message : '';
      this.pendingDraftSync = {
        sid: this.getSid,
        draft,
        draftMention: {
          mentionAll: this.mentionAllSelected,
          mentionList: this.mentionSelectedUids.map((uid) => `${uid}`),
          tokens: this.mentionTokens.map((token) => Object.assign({}, token))
        }
      };
      if (this.draftSyncTimer) {
        clearTimeout(this.draftSyncTimer);
        this.draftSyncTimer = null;
      }
      if (immediate) {
        this.flushDraftSync();
        return;
      }
      this.draftSyncTimer = setTimeout(this.flushDraftSync, DRAFT_SYNC_DELAY);
    },

    flushDraftSync() {
      if (this.draftSyncTimer) {
        clearTimeout(this.draftSyncTimer);
        this.draftSyncTimer = null;
      }
      const pending = this.pendingDraftSync;
      this.pendingDraftSync = null;
      if (!pending) return;
      this.im.sysManage.saveConversationDraft(pending.sid, 'group', pending.draft, Date.now(), pending.draftMention);
      this.$store.dispatch('contact/actionGetConversationList', { immediate: true });
    },

    scheduleTextareaResize() {
      if (this.textareaResizeFrame) return;
      this.textareaResizeFrame = requestAnimationFrame(() => {
        this.textareaResizeFrame = null;
        this.autoResizeTextarea();
      });
    },

    fileChangeHandler(e) {
      const file = e.target.files[0];
      this.sendFileInBackground(file);
    },

    sendFileInBackground(file) {
      this.startChatFileUpload(file, this.fileType, 'group', this.getSid);
      if (this.$refs.fileRef) this.$refs.fileRef.value = '';
    },

    clickMemberListHander(uid) {
      const roster = this.getMemberList.find((x) => x.user_id + '' === uid + '');
      if (!roster) return;
      this.insertMentionToken({
        type: 'member',
        uid: `${uid}`,
        label: this.displayName(roster)
      });
      this.filteredMentionRosters = [];
      this.showMentionAllOption = false;
      this.syncDraft(this.message);
      this.$nextTick(this.scheduleTextareaResize);
    },
    clickMentionAllHandler() {
      if (!this.canMentionAll) return;
      this.insertMentionToken({
        type: 'all',
        label: this.mentionAllLabel
      });
      this.filteredMentionRosters = [];
      this.showMentionAllOption = false;
      this.syncDraft(this.message);
      this.$nextTick(this.scheduleTextareaResize);
    },
    //todo later. need ban fix.
    /*
    chechBan(newSid) {
      let that = this;
      that.hasBan = false;
      that.hasAllBan = this.getGroupInfo.ban_expire_time && this.getGroupInfo.ban_expire_time === -1 ? true : false;
      that.im.groupManage.asyncGroupBannedList({ group_id: newSid }).then((res) => {
        if (Array.isArray(res) && res.length) {
          res.forEach((item) => {
            if (item.user_id === this.im.userManage.getUid()) {
              if (item.expired_time === -1) {
                that.hasBan = true;
                that.expired_time = -1;
              } else if (item.expired_time > Date.now()) {
                that.hasBan = true;
                that.expired_time = item.expired_time;
                that.startBanCheck();
              }
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
    */

    checkHideMemberName(user_id) {
      const isOwner = this.getGroupInfo.owner_id === user_id;
      const isAdmin = this.getAdminList.some((x) => x.user_id === user_id);
      if (this.isOwner || this.isAdmin || isOwner || isAdmin) {
        return false;
      }
      let hide = true;
      let hide_member_info = this.getGroupInfo.hide_member_info;
      let app_hide_member_info = false;
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
      if (this.checkHideMemberName(roster.user_id) && !roster.has_nick) {
        return this.calucateHideMemberName(roster);
      } else {
        return roster.display_name;
      }
    },

    autoResizeTextarea() {
      const textarea = this.$refs.inputTextRef;
      if (!textarea) return;
      textarea.style.height = '36px';
      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(Math.max(scrollHeight, 36), 150);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = scrollHeight > 150 ? 'auto' : 'hidden';
    }
    //methods finish
  }
};
</script>

<style scoped>
.mention_all_avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding-left: 0;
  background: #e8f1ff;
  color: #1862cc;
  font-weight: 600;
}

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
