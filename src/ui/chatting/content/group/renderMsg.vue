<template>
  <div>
    <!-- <div v-if="messageType===1"> -->
    <div class="timeline" v-if="timeMessage != ''">{{ timeMessage }}</div>
    <div v-if="isSystemReminderMessage" class="messageFrame messageFrame--system">
      <div :class="['system-reminder-banner', `system-reminder-banner--${systemReminderTone}`]">
        <div class="system-reminder__content">{{ showContent }}</div>
      </div>
    </div>
    <div v-else :class="{ messageFrame: true, self: isSelf, roster: !isSelf }">
      <div class="multiSelect" v-if="showMultiForward">
        <input :checked="isMultiSelected" @change.stop="toggleMultiForwardSelection" type="checkbox" />
      </div>
      <div :class="{ multiForwardRoster: !isSelf && showMultiForward, 'message-inner-group': true }">
        <div class="rosterInfo">
          <img :src="userObj.avatar" />
        </div>
        <div
          :class="{ contentFrame: true, 'message-content-wrapper': true, 'contentFrame--multi-forward': showMultiForward }"
          :style="showMultiForward ? null : { 'min-width': hasCode ? 'max(66.6%, 202px)' : 'max(66.6%, 252px)' }"
        >
          <p class="username" v-if="!isSelf">{{ userObj.username }}</p>
          <div :class="{ user_content: true, self: isSelf, roster: !isSelf }">
            <div
              :class="{
                c_content: true,
                'message-bubble-self': isSelf,
                'message-bubble-other': !isSelf
              }"
              :style="{ 'padding-bottom': showMarkdown ? '0px' : '' }"
            >
              <div class="send_failed" v-if="isSelf && isSendFailed" @click="showSendFailedReason">!</div>
              <div v-if="message.type === 'text'">
                <div v-if="showMarkdown" v-html="showMarkdownContent" class="c_markdown" />
                <div v-else>{{ showContent }}</div>
                <div class="c_content_ext" v-if="showExt">ext: {{ message.ext }}</div>
              </div>
              <div v-if="message.type === 'rtc'" class="rtc_message">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="rtc_message_icon">
                  <path d="M7 6h6a2 2 0 0 1 2 2v2.5l3.5-2a1 1 0 0 1 1.5.87v5.26a1 1 0 0 1-1.5.87L15 13.5V16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
                </svg>
                <span>{{ message.content }}</span>
              </div>
              <div v-if="message.type === 'image'">
                <img class="c_image" :src="attachImage" @click="touchImage" v-if="attachImage !== ''" />
              </div>
              <div @click="playAudio" class="audio_frame" v-if="message.type === 'audio'">
                <img class="audio" src="/image/audio.png" />
              </div>
              <div @click="playVideo" class="video_frame" v-if="message.type === 'video'">
                <img :src="videoImage" class="preview c_image" />
                <img class="play" src="/image/play.png" />
              </div>
              <div class="loc_frame" v-if="message.type === 'file'">
                <img class="loc" src="/image/file2.png" />
                <span @click="downloadFile" class="loc_txt">{{ attachName }}</span>
              </div>
              <div @click="openLocation" class="loc_frame" v-if="message.type === 'location'">
                <img class="loc" src="/image/loc.png" />
                <span class="loc_txt">{{ attachLocation.addr }}</span>
              </div>
            </div>
          </div>
          <div :class="{ c_content_more: true, 'message-action-footer': true, 'is-menu-open': showActionMenu }" v-if="!showMultiForward">
            <button class="message-footer-action" type="button" v-if="message.type === 'text' && isMarkdown" @click="changeShowMarkdownFormat">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="message-footer-action__icon">
                <path d="M4 7h8"></path>
                <path d="M4 12h6"></path>
                <path d="M4 17h8"></path>
                <path d="M14 7l5 10"></path>
                <path d="M19 7l-5 10"></path>
              </svg>
              <span>{{ showMarkdownTitle.trim() }}</span>
            </button>
            <button class="message-footer-action" type="button" v-if="message.type === 'text' && message.ext" @click="changeShowExt">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="message-footer-action__icon">
                <circle cx="12" cy="12" r="8"></circle>
                <path d="M12 10v5"></path>
                <path d="M12 7.5h.01"></path>
              </svg>
              <span>{{ showExtTitle.trim() }}</span>
            </button>
            <div :class="{ 'action-icon-wrapper': true, self: isSelf, roster: !isSelf, 'message-footer-controls': true }">
              <button class="h_image message-footer-action message-footer-action--menu" tabindex="0" type="button" @click.stop="toggleActionMenu">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="more_icon">
                  <circle cx="6" cy="12" r="1.75"></circle>
                  <circle cx="12" cy="12" r="1.75"></circle>
                  <circle cx="18" cy="12" r="1.75"></circle>
                </svg>
                <span class="message-footer-action__label">{{ $t('更多') }}</span>
              </button>
              <div :class="{ messageExt: true, 'message-menu': true, 'message-menu-self': isSelf, 'message-menu-other': !isSelf, 'is-visible': showActionMenu }" @click.stop>
                <div @click="handleDeleteMessage" class="delete item">{{ $t('删除') }}</div>
                <div @click="handleRecallMessage" class="recall item" v-if="isSelf || isAdmin || isOwner">{{ $t('撤回') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- </div>
    <div v-if="messageType===3">
      renderRosterNotice
    </div>
    <div v-if="messageType===4">
      renderUserNotice
    </div> -->
  </div>
</template>

<script>
// import Chat from "./chat.vue";
// import Inputer from "./inputer.vue";
import { numToString, toNumber } from '../../../third/tools';
import { mapGetters } from 'vuex';
import CryptoJS from 'crypto-js';
import { Marked } from '../../../third/marked.min.js';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';
import formatMessageTime from '../../../utils/timeFormat';

export default {
  name: 'GroupChat',
  data() {
    return {
      showExt: false,
      showExtTitle: '',
      showMarkdownTitle: '',
      isMarkdown: false,
      showMarkdown: false,
      marked: null,
      markdownRendererHasHighlight: false,
      addHlgs: false,
      hasCode: false,
      content: '',
      markContent: '',

      showContent: '',
      stableContent: '',
      appendContent: '',
      appendTimer: null,
      lastSliceStreamTime: 0,
      showActionMenu: false,

      showMarkdownContent: '',
      showTotalContent: '',
      stableMarkdownContent: '',
      showAppendContent: '',
      appendMarkdownTimer: null
    };
  },
  mounted() {
    this.showExtTitle = this.$t('显示扩展');
    this.showMarkdownTitle = this.$t('显示原文');
    const im = this.$store.getters.im;
    if (!im) return;

    let { timestamp } = this.message;
    timestamp = toNumber(timestamp);
    const savedMessageTime = this.getMessageTime;
    const last = (savedMessageTime.length && savedMessageTime[savedMessageTime.length - 1]) || 0;
    if (timestamp - last > 5 * 60 * 1000) {
      this.$store.dispatch('content/actionUpdateMessageTime', timestamp);
    }

    // Message displayed as read
    const fromUid = toNumber(this.message.from);
    const uid = this.$store.getters.im.userManage.getUid();
    if (fromUid !== uid && !this.getAutoReadSuppressed) {
      const im = this.$store.getters.im;
      if (im) im.groupManage.readGroupMessage(this.getSid, this.message.id);
    }

    let { type } = this.message;
    if (type === 'text') {
      this.calculateContent(this.message.content);
    }

    if (this.shouldReplayInitialAIStream()) {
      if (this.showMarkdown) {
        this.calculateMarkdownAppend(this.message.content, this.message.ext);
      }
      this.appendContent = this.content;
      this.calculateAppend(this.content, this.message.ext);
    } else {
      this.showMarkdownContent = this.markContent;
      this.showContent = this.message.content;
    }

    window.addEventListener('copy', function (event) {
      if (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') == -1) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const div = document.createElement('div');
        div.appendChild(range.cloneContents());
        const text = div.innerHTML.replace('<br>', /\n/g).replace(/<[^>]*>/g, '');
        event.clipboardData.setData('text/html', text);
        event.clipboardData.setData('text/plain', text);
        event.preventDefault();
      }
    });
  },
  components: {
    // Chat,
    // Inputer
  },
  props: ['message'],
  computed: {
    ...mapGetters('content', ['getSid', 'getMessageTime', 'getMemberList', 'getGroupInfo', 'getAdminList', 'getAutoReadSuppressed']),
    ...mapGetters('forward', ['getShowMultiForwardStatus', 'getMultiForwardMessages', 'getMessageForwardMaxMessageNum']),
    ...mapGetters('header', ['getUserProfile']),
    showMultiForward() {
      return this.getShowMultiForwardStatus;
    },
    isMultiSelected() {
      return this.getMultiForwardMessages.some((message) => {
        return message.id === this.message.id;
      });
    },
    timeMessage() {
      let { timestamp } = this.message;
      timestamp = toNumber(timestamp);
      if (this.getMessageTime.indexOf(timestamp) >= 0) {
        return formatMessageTime(timestamp);
      }
      return '';
    },
    im() {
      return this.$store.state.im;
    },
    token() {
      return this.im.userManage.getToken();
    },
    messageType() {
      return this.message.ns;
    },

    contentType() {
      return this.message.ctype || 0;
    },

    isSelf() {
      const uid = this.im.userManage.getUid();
      const cid = numToString(this.message.from);
      return cid + '' === uid + '';
    },
    isAdmin() {
      const uid = this.im.userManage.getUid();
      return this.getAdminList.filter((x) => x.user_id === uid).length > 0;
    },
    isOwner() {
      const uid = this.im.userManage.getUid();
      return this.getGroupInfo.owner_id === uid;
    },
    userObj() {
      const cuid = this.im.userManage.getUid();
      const umaps = this.im.rosterManage.getAllRosterDetail();
      const fromUid = toNumber(this.message.from);
      const fromUserObj = umaps[fromUid] || {};
      let username = '';
      let has_nick = false;
      for (let i = 0; i < this.getMemberList.length; i++) {
        if (this.getMemberList[i].user_id === fromUid) {
          username = this.getMemberList[i].display_name;
          has_nick = this.getMemberList[i].has_nick;
          break;
        }
      }
      let avatar = this.im.sysManage.getImage({ avatar: fromUserObj.avatar });
      if (fromUid === cuid) {
        username = this.$t('我');
        avatar = this.im.sysManage.getImage({ avatar: this.getUserProfile.avatar });
      } else if (this.checkHideMemberInfo(fromUid) && !has_nick) {
        let original = username + fromUid;
        const md5hash = CryptoJS.MD5(original);
        let output = md5hash.toString(CryptoJS.enc.Base64);
        if (output.length > 12) {
          output = output.substring(0, 12);
        }
        username = output;
      }
      return { username, avatar };
    },

    attachUrl() {
      const attach = this.message.attach || {};
      const { url = '' } = attach;

      return this.im.sysManage.getChatFile({ url });
    },

    attachImage() {
      return this.getImage({});
    },

    attachAudio() {
      const attach = this.message.attach || {};
      return this.im.sysManage.getAudio({ url: attach.url });
    },

    attachVideo() {
      return this.getVideo(false);
    },

    attachFile() {
      return this.attachUrl;
    },

    videoImage() {
      const attachment = this.message.attach || '{}';
      const { url, tUrl } = attachment;
      if (tUrl && tUrl.length) {
        return this.getImage({ url: tUrl });
      } else if (url) {
        return this.getVideo(true);
      }
      return url;
    },

    attachLocation() {
      const attachObj = this.message.attach || '{}';
      let loc = {};
      if (attachObj.lat) {
        loc.addr = attachObj.addr;
        // attachObj.lat = 39.9087;
        // attachObj.lon = 116.3975;
        //"lat":39.90374,"lon":116.397827,"addr":"天安门广场
        //title必须跟坐标对应，否则不出东西。。
        //url = 'http://map.baidu.com/?latlng=' + attachObj.lat + ',' + attachObj.lon + '&title=' + attachObj.addr + '&content=' + attachObj.addr + '&autoOpen=true';
        loc.url = 'http://map.baidu.com/?latlng=' + attachObj.lat + ',' + attachObj.lon;
      }
      return loc;
    },
    attachName() {
      const attachment = this.message.attach || '{}';
      let attachObj = {};
      try {
        attachObj = JSON.parse(attachment);
      } catch (ex) {
        //
      }
      if (attachObj.dName) {
        return attachObj.dName;
      }
      return this.$t('文件附件');
    },

    isSendFailed() {
      return !!this.message.sendFailed;
    },
    sendFailedReason() {
      if (!this.isSendFailed) {
        return '';
      }
      const reason = this.message.sendFailedReason;
      if (reason) {
        return reason;
      }
      if (typeof this.message.sendFailedCode !== 'undefined') {
        return this.$t('发送失败，错误码：{code}', { code: this.message.sendFailedCode });
      }
      return this.$t('发送失败');
    },
    parsedMessageConfig() {
      const { config } = this.message;
      if (!config) return {};
      if (typeof config === 'string') {
        try {
          return JSON.parse(config);
        } catch (ex) {
          return {};
        }
      }
      return typeof config === 'object' ? config : {};
    },
    parsedMessageExt() {
      const { ext } = this.message;
      if (!ext || typeof ext !== 'string') {
        return {};
      }
      try {
        return JSON.parse(ext);
      } catch (ex) {
        return {};
      }
    },
    isSystemReminderMessage() {
      if (this.message.type !== 'text') {
        return false;
      }
      const value = this.message.is_system;
      return value === true || value === 'true' || value === 1 || value === '1';
    },
    systemReminderStyle() {
      const style = this.parsedMessageExt.style;
      return typeof style === 'string' ? style.trim().toLowerCase() : '';
    },
    systemReminderTone() {
      const style = this.systemReminderStyle;
      if (['emergency', 'urgent', 'critical', 'error'].includes(style)) {
        return 'critical';
      }
      if (['warning', 'warnning'].includes(style)) {
        return 'warning';
      }
      if (style === 'notice') {
        return 'notice';
      }
      if (['debug', 'verbose'].includes(style)) {
        return 'debug';
      }
      return 'info';
    }
  },

  watch: {
    '$localeState.locale'() {
      this.showExtTitle = this.showExt ? this.$t('隐藏扩展') : this.$t('扩展信息');
      this.showMarkdownTitle = this.showMarkdown ? this.$t('解析格式') : this.$t('显示原文');
    },
    getShowMultiForwardStatus(val) {
      if (val) {
        this.closeActionMenu();
      }
    },
    getUserProfile() {
      this.userObj;
    }
  },

  methods: {
    isSameMessageUpdate(message) {
      return !!(message && this.message && `${message.id}` === `${this.message.id}`);
    },

    normalizeTextContent(content) {
      return typeof content === 'string' ? content.trim() : content;
    },

    getImage({ url = '', type = 'roster', thumbnail = true }) {
      if (!url) {
        const attach = this.message.attach || {};
        url = attach.url;
      }
      return this.im.sysManage.getImage({ avatar: url, type, thumbnail });
    },

    touchImage() {
      const image = this.getImage({ thumbnail: false });
      if (image) {
        this.openImage(image);
      } else {
        alert(this.$t('附件错误..'));
      }
    },
    playAudio() {
      let url = this.attachAudio;

      if (!url) {
        alert(this.$t('url为空，不能播放'));
        return;
      }
      const au = document.querySelector('#audio_player');
      au.src = url;
      au.play();
    },
    downloadFile() {
      if (this.attachUrl) {
        window.open(this.attachUrl);
      } else {
        alert(this.$t('附件错误..'));
      }
    },
    openLocation() {
      this.attachLocation.url && window.open(this.attachLocation.url);
    },
    //
    deleteMessage() {
      const idStr = numToString(this.message.id).toString();
      this.im.groupManage.deleteMessage(this.getSid, idStr);
    },
    handleDeleteMessage() {
      this.deleteMessage();
      this.closeActionMenu();
    },
    forwardMessage() {
      this.$store.dispatch('forward/actionRecordForwardMessage', this.message);
    },
    recallMessage() {
      const idStr = numToString(this.message.id).toString();
      this.im.groupManage.recallMessage(this.getSid, idStr);
    },
    handleRecallMessage() {
      this.recallMessage();
      this.closeActionMenu();
    },
    unreadMessage() {
      const idStr = numToString(this.message.id).toString();
      this.im.rosterManage.unreadMessage(this.getSid, idStr);
    },
    toggleActionMenu() {
      this.showActionMenu = !this.showActionMenu;
    },
    closeActionMenu() {
      this.showActionMenu = false;
    },

    getVideo(cover = false) {
      let url = this.attachUrl;
      if (cover) {
        url += '&imgage_type=3';
      }
      return url;
    },

    openImage(url) {
      this.$store.dispatch('layer/actionSetShowing', 'image');
      this.$store.dispatch('layer/actionSetShowmask', true);
      this.$store.dispatch('layer/actionSetImageUrl', url);
    },

    playVideo() {
      let attachUrl = this.attachUrl;
      this.$store.dispatch('layer/actionSetShowing', 'video');
      this.$store.dispatch('layer/actionSetShowmask', true);
      this.$store.dispatch('layer/actionSetVideoUrl', attachUrl);
    },

    /* eslint-disable no-useless-escape */
    isMarkdownFormat(str) {
      const regex = /^\s*(\#+|\*|\-|\d+\.)\s+.+|\!\[.*\]\(.*\)|\`{3}[\w\W]*?\`{3}/gm;
      if (!regex.test(str)) {
        const hasTitle = /^\s*\#+\s+.+$/gm.test(str);
        const hasLink = /\[.*\]\(.*\)/gm.test(str);
        const hasItalic = /(\*|_).*?(\*|_)/gm.test(str);
        const hasImage = /\!\[.*\]\(.*\)/gm.test(str);
        const hasbold = /(\*\*|__)(.*?)(\*\*|__)/gm.test(str);
        const hasStrikethrough = /~~.*?~~/gm.test(str);
        const hasBlockquote = /^\s*>+.*/gm.test(str);
        const hasInlineCodeBlock = /`.*?`/gm.test(str);
        const hasPartingLine = /^(\*\*\*|---|___)$/gm.test(str);
        const hasUnorderedList = /^(\s*[-+*]\s+.+\n?)+/gm.test(str);
        const hasOrderedList = /^(\s*\d+\.\s+.+\n?)+/gm.test(str);
        return (
          hasLink || hasTitle || hasItalic || hasImage || hasbold || hasStrikethrough || hasBlockquote || hasInlineCodeBlock || hasPartingLine || hasUnorderedList || hasOrderedList
        );
      } else {
        return true;
      }
    },

    hasCodeBlock(str) {
      return /`.*?`/gm.test(str);
    },

    changeShowMarkdownFormat() {
      this.showMarkdown = !this.showMarkdown;
      if (this.showMarkdown) {
        this.showMarkdownTitle = this.$t('显示原文');
      } else {
        this.showMarkdownTitle = this.$t('解析格式');
      }
    },

    changeShowExt() {
      this.showExt = !this.showExt;
      if (this.showExt) {
        this.showExtTitle = this.$t('隐藏扩展');
      } else {
        this.showExtTitle = this.$t('扩展信息');
      }
    },

    parseMarkdownContent(content) {
      let newContent = this.marked.parse(content);
      if (this.addHlgs) {
        newContent = newContent.replaceAll('<code', '<code class="hljs"');
      } else {
        newContent = newContent.replaceAll('<pre><code', '<pre><code class="hljs"');
      }
      return newContent;
    },

    createMarkdownRenderer(enableHighlight) {
      this.addHlgs = false;
      if (enableHighlight) {
        let that = this;
        this.marked = new Marked(
          markedHighlight({
            langPrefix: 'hljs language-',
            highlight(code, lang) {
              let language = hljs.getLanguage(lang) ? lang : 'plaintext';
              if (language === 'plaintext') {
                that.addHlgs = true;
                return hljs.highlightAuto(code).value;
              }
              return hljs.highlight(code, { language }).value;
            }
          })
        );
      } else {
        this.marked = new Marked();
      }
      this.markdownRendererHasHighlight = enableHighlight;
    },

    ensureMarkdownRenderer(content, extension) {
      const needsHighlight = this.hasCodeBlock(content) || this.isAIStream(extension);
      if (!this.marked) {
        this.createMarkdownRenderer(needsHighlight);
        return;
      }
      if (needsHighlight && !this.markdownRendererHasHighlight) {
        this.createMarkdownRenderer(true);
      }
    },

    calculateContent(content, extension = this.message.ext) {
      content = this.normalizeTextContent(content);
      this.isMarkdown = this.isMarkdownFormat(content);
      if (this.isMarkdown) {
        this.hasCode = this.hasCodeBlock(content);
        this.ensureMarkdownRenderer(content, extension);
        this.markContent = this.parseMarkdownContent(content);
        this.showAppendContent = content;
        this.showMarkdown = true;
      } else {
        this.showMarkdown = false;
      }
      this.content = content;
    },

    stripTypingCursor(content) {
      if (typeof content !== 'string') {
        return '';
      }
      return content.endsWith('｜') ? content.slice(0, content.length - 1) : content;
    },

    extendPendingPlainStream(content) {
      if (!this.appendTimer) {
        return false;
      }
      const pendingTarget = `${this.stripTypingCursor(this.showContent)}${this.appendContent}`;
      if (!content.startsWith(pendingTarget)) {
        return false;
      }
      this.appendContent += content.slice(pendingTarget.length);
      return true;
    },

    extendPendingMarkdownStream(content) {
      if (!this.appendMarkdownTimer) {
        return false;
      }
      const pendingTarget = `${this.showTotalContent}${this.showAppendContent}`;
      if (!content.startsWith(pendingTarget)) {
        return false;
      }
      this.showAppendContent += content.slice(pendingTarget.length);
      return true;
    },

    getPlainStreamBase() {
      const visibleContent = this.stripTypingCursor(this.showContent);
      return visibleContent.length > this.stableContent.length ? visibleContent : this.stableContent;
    },

    getMarkdownStreamBase() {
      return this.showTotalContent.length > this.stableMarkdownContent.length ? this.showTotalContent : this.stableMarkdownContent;
    },

    commitRenderedContent(content, markdownContent = content) {
      this.stableContent = content;
      this.showContent = content;
      if (this.isMarkdown) {
        this.stableMarkdownContent = markdownContent;
        this.showTotalContent = markdownContent;
        this.showMarkdownContent = this.markContent;
      } else {
        this.stableMarkdownContent = '';
        this.showTotalContent = '';
      }
    },

    parseStreamExtension(extension) {
      if (extension && typeof extension === 'object') {
        return extension;
      }
      try {
        return JSON.parse(extension);
      } catch (ex) {
        return {};
      }
    },

    resolveStreamStepCount(remaining, extension, preferFast = false) {
      const ext = this.parseStreamExtension(extension);
      const ai = ext.ai || {};
      const openclaw = ext.openclaw || {};
      const period = 40;
      const configuredInterval = Number(ai.stream_interval);
      const baseDuration = configuredInterval > 0 ? configuredInterval * 1000 : 3000;
      let targetDuration = baseDuration;

      if (preferFast || ai.finish) {
        targetDuration = Math.min(900, Math.max(600, Math.round(baseDuration * 0.25)));
      } else if (openclaw.role && openclaw.role !== 'assistant') {
        targetDuration = Math.max(1800, Math.round(baseDuration * 0.7));
      }

      const frameCount = Math.max(1, Math.ceil(targetDuration / period));
      return Math.max(1, Math.min(96, Math.ceil(remaining / frameCount)));
    },

    isAIStream(extension) {
      try {
        let ext = JSON.parse(extension);
        if (ext && ext.ai && ext.ai.stream) {
          return true;
        } else {
          return false;
        }
      } catch (ex) {
        return false;
      }
    },

    isAIStreamFinish(extension) {
      try {
        let ext = JSON.parse(extension);
        if (ext && ext.ai && ext.ai.stream && !ext.ai.finish) {
          return true;
        } else {
          return false;
        }
      } catch (ex) {
        return false;
      }
    },

    shouldReplayInitialAIStream() {
      return !!(!this.message.isHistory && !this.message.skipStreamReplayOnMount && this.message.ext && this.message.ext.length && this.isAIStreamFinish(this.message.ext));
    },

    calculateAppend(content, extension) {
      const ext = this.parseStreamExtension(extension);
      if (ext && ext.ai && ext.ai.stream) {
        this.appendTimer && clearInterval(this.appendTimer);
        let period = 40;
        let that = this;
        this.appendTimer = setInterval(() => {
          if (that.appendContent.length <= 0) {
            clearInterval(that.appendTimer);
            that.appendTimer = null;
            that.stableContent = that.content;
            that.showContent = that.content;
            that.ensureStreamingMessageVisible();
          } else {
            const count = that.resolveStreamStepCount(that.appendContent.length, ext);
            if (that.showContent.length && that.showContent.charAt(that.showContent.length - 1) === '｜') {
              that.showContent = that.showContent.slice(0, that.showContent.length - 1);
            }
            that.showContent += that.appendContent.slice(0, count) + '｜';
            that.appendContent = that.appendContent.slice(count);
            that.ensureStreamingMessageVisible();
          }
        }, period);
      } else {
        this.showContent = content;
      }
    },

    calculateMarkdownAppend(content, extension) {
      const ext = this.parseStreamExtension(extension);
      if (ext && ext.ai && ext.ai.stream) {
        this.appendMarkdownTimer && clearInterval(this.appendMarkdownTimer);
        let period = 40;
        let that = this;
        this.appendMarkdownTimer = setInterval(() => {
          if (that.showAppendContent.length <= 0) {
            clearInterval(that.appendMarkdownTimer);
            that.appendMarkdownTimer = null;
            that.stableMarkdownContent = that.showTotalContent;
            that.showMarkdownContent = that.parseMarkdownContent(that.showTotalContent + '｜');
            that.ensureStreamingMessageVisible();
          } else {
            const count = that.resolveStreamStepCount(that.showAppendContent.length, ext);
            that.showTotalContent += that.showAppendContent.slice(0, count);
            that.showAppendContent = that.showAppendContent.slice(count);
            that.showMarkdownContent = that.parseMarkdownContent(that.showTotalContent);
            that.ensureStreamingMessageVisible();
          }
        }, period);
      } else {
        this.showMarkdownContent = this.markContent;
      }
    },

    findMessageScrollContainer() {
      let node = this.$el;
      while (node) {
        if (node.classList && node.classList.contains('list')) {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    },

    ensureStreamingMessageVisible() {
      this.$nextTick(() => {
        const container = this.findMessageScrollContainer();
        const messageEl = this.$el;
        if (!container || !messageEl) return;
        const containerRect = container.getBoundingClientRect();
        const messageRect = messageEl.getBoundingClientRect();
        const overflowBottom = messageRect.bottom - containerRect.bottom;
        const nearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) <= 96;
        if (overflowBottom > 0) {
          container.scrollTop += overflowBottom + 24;
        } else if (nearBottom) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },

    messageContentAppend(message) {
      if (!this.isSameMessageUpdate(message)) {
        return;
      }
      let oldFlag = this.isMarkdown;
      const plainBase = this.getPlainStreamBase();
      const markdownBase = this.getMarkdownStreamBase();
      this.calculateContent(message.content, message.ext);
      if (false == oldFlag && true == this.isMarkdown) {
        this.showTotalContent = plainBase;
        this.stableMarkdownContent = plainBase;
        this.showMarkdownContent = this.parseMarkdownContent(plainBase);
      }
      if (message.ext && message.ext.length && this.isAIStream(message.ext)) {
        if (this.isMarkdown) {
          const nextMarkdownBase = oldFlag && this.isMarkdown ? markdownBase : plainBase;
          if (!(oldFlag && this.extendPendingMarkdownStream(this.content))) {
            this.showTotalContent = nextMarkdownBase;
            this.showAppendContent = this.content.slice(nextMarkdownBase.length);
            this.calculateMarkdownAppend(this.content, message.ext);
          }
        }
        if (!this.extendPendingPlainStream(this.content)) {
          this.showContent = plainBase;
          this.appendContent = this.content.slice(plainBase.length);
          this.calculateAppend(this.content, message.ext);
        }
      } else {
        this.commitRenderedContent(this.content);
      }
    },

    messageReplace(message) {
      if (!this.isSameMessageUpdate(message)) {
        return;
      }
      this.calculateContent(message.content, message.ext);
      clearInterval(this.appendMarkdownTimer);
      this.appendMarkdownTimer = null;
      clearInterval(this.appendTimer);
      this.appendTimer = null;
      this.commitRenderedContent(this.content);
    },

    checkHideMemberInfo() {
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

    toggleMultiForwardSelection(e) {
      const checked = e && e.target ? e.target.checked : !this.isMultiSelected;
      if (checked && !this.isMultiSelected && this.getMultiForwardMessages.length >= this.getMessageForwardMaxMessageNum) {
        e.target.checked = false;
        this.$message({
          message: this.$t('单个会话转发消息数量超过限制'),
          type: 'warning',
          duration: 2500
        });
        return;
      }

      if ((checked && !this.isMultiSelected) || (!checked && this.isMultiSelected)) {
        this.$store.dispatch('forward/actionMultiForwardMessageSelect', this.message);
      }
    },

    showSendFailedReason() {
      this.$message.error(this.sendFailedReason);
    }
  }
};
</script>

<style scoped>
.send_failed {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f56c6c;
  color: #ffffff;
  font-size: 10px;
  line-height: 14px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  user-select: none;
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
}

.messageFrame--system {
  display: flex;
  justify-content: center;
  margin: 8px 0 12px;
}

.system-reminder-banner {
  display: inline-block;
  max-width: min(100%, 460px);
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  box-shadow: none;
  box-sizing: border-box;
  text-align: center;
}

.system-reminder {
  display: flex;
  flex-direction: column;
  gap: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.system-reminder__content {
  font-size: 13px;
  line-height: 1.45;
}

.system-reminder-banner--critical {
  background: rgba(214, 74, 74, 0.12);
  color: #9f3a3a;
}

.system-reminder-banner--warning {
  background: rgba(237, 201, 72, 0.18);
  color: #8a6a00;
}

.system-reminder-banner--notice {
  background: rgba(124, 135, 142, 0.14);
  color: #66737d;
}

.system-reminder-banner--info {
  background: rgba(124, 135, 142, 0.14);
  color: #66737d;
}

.system-reminder-banner--debug {
  background: rgba(124, 135, 142, 0.1);
  color: #7b8790;
}
</style>
