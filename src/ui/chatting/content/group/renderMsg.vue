<template>
  <div>
    <!-- <div v-if="messageType===1"> -->
    <div class="timeline" v-if="timeMessage != ''">{{ timeMessage }}</div>
    <div :class="{ messageFrame: true, self: isSelf, roster: !isSelf }">
      <div class="rosterInfo">
        <img :src="userObj.avatar" />
      </div>
      <div class="contentFrame">
        <p class="username" v-if="!isSelf">{{ userObj.username }}</p>
        <div :class="{ user_content: true, self: isSelf, roster: !isSelf }">
          <div class="c_content_more">
            <div class="c_content_text_more" v-if="message.type === 'text'">
              <span class="c_ext_title" v-if="isMarkdown" @click="changeShowMarkdownFormat">{{ showMarkdownTitle }}</span>
              <span class="c_ext_title" v-if="message.ext" @click="changeShowExt">{{ showExtTitle }}</span>
            </div>
            <el-popover :placement="isSelf ? 'left' : 'right'" trigger="hover" width="70">
              <div class="messageExt">
                <div @click="deleteMessage" class="delete item">删除</div>
                <div @click="forwardMessage" v-if="message.type !== 'rtc'" class="recall item">转发</div>
                <div @click="recallMessage" class="recall item" v-if="isSelf || isAdmin || isOwner">撤回</div>
              </div>
              <div class="h_image" slot="reference">
                <img src="/image/more.png" />
              </div>
            </el-popover>
          </div>
          <div class="c_content" :style="{ 'padding-bottom': showMarkdown ? '0px' : '' }">
            <div v-if="message.type === 'text'">
              <div v-if="showMarkdown" v-html="showMarkdownContent" class="c_markdown" />
              <div v-else>
                {{ showContent }}
              </div>
              <div class="c_content_ext" v-if="showExt">ext: {{ message.ext }}</div>
            </div>
            <div v-if="message.type === 'rtc'">
              {{ message.content }}
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
import moment from 'moment';
import { numToString, toNumber } from '../../../third/tools';
import { mapGetters } from 'vuex';
import CryptoJS from 'crypto-js';
import { Marked } from '../../../third/marked.min.js';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';

export default {
  name: 'GroupChat',
  data() {
    return {
      showExt: false,
      showExtTitle: ' 显示扩展 ',
      showMarkdownTitle: ' 显示原文 ',
      isMarkdown: false,
      showMarkdown: false,
      marked: null,
      addHlgs: false,
      content: '',
      markContent: '',

      showContent: '',
      appendContent: '',
      appendTimer: null,
      lastSliceStreamTime: 0,

      showMarkdownContent: '',
      showTotalContent: '',
      showAppendContent: '',
      appendMarkdownTimer: null
    };
  },
  mounted() {
    const im = this.$store.getters.im;
    if (!im) return;

    im.on('onGroupMessageContentAppend', (message) => {
      this.messageContentAppend(message);
    });

    im.on('onGroupMessageReplace', (message) => {
      this.messageReplace(message);
    });

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
    if (fromUid !== uid) {
      const im = this.$store.getters.im;
      if (im) im.groupManage.readGroupMessage(this.getSid, this.message.id);
    }

    let { type } = this.message;
    if (type === 'text') {
      this.calculateContent(this.message.content);
    }

    if (!this.message.isHistory && this.message.ext && this.message.ext.length && this.isAIStreamFinish(this.message.ext)) {
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
    ...mapGetters('content', ['getSid', 'getMessageTime', 'getMemberList', 'getGroupInfo', 'getAdminList']),
    ...mapGetters('header', ['getUserProfile']),
    timeMessage() {
      let { timestamp } = this.message;
      timestamp = toNumber(timestamp);
      if (this.getMessageTime.indexOf(timestamp) >= 0) {
        return moment(timestamp).calendar('', {
          sameDay: 'HH:mm',
          lastDay: 'HH:mm',
          sameElse: 'YYYY-MM-DD HH:mm'
        });
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
      for (let i = 0; i < this.getMemberList.length; i++) {
        if (this.getMemberList[i].user_id === fromUid) {
          username = this.getMemberList[i].display_name;
          break;
        }
      }
      let avatar = this.im.sysManage.getImage({ avatar: fromUserObj.avatar });
      if (fromUid === cuid) {
        username = '我';
        avatar = this.im.sysManage.getImage({ avatar: this.getUserProfile.avatar });
      } else if (this.checkHideMemberInfo(fromUid)) {
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
      return '文件附件';
    }
  },

  watch: {
    getUserProfile() {
      this.userObj;
    }
  },

  methods: {
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
        alert('附件错误..');
      }
    },
    playAudio() {
      let url = this.attachAudio;

      if (!url) {
        alert('url为空，不能播放');
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
        alert('附件错误..');
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
    forwardMessage() {
      this.$store.dispatch('forward/actionRecordForwardMessage', this.message);
    },
    recallMessage() {
      const idStr = numToString(this.message.id).toString();
      this.im.groupManage.recallMessage(this.getSid, idStr);
    },
    unreadMessage() {
      const idStr = numToString(this.message.id).toString();
      this.im.rosterManage.unreadMessage(this.getSid, idStr);
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
        this.showMarkdownTitle = ' 显示原文 ';
      } else {
        this.showMarkdownTitle = ' 解析格式 ';
      }
    },

    changeShowExt() {
      this.showExt = !this.showExt;
      if (this.showExt) {
        this.showExtTitle = ' 隐藏扩展 ';
      } else {
        this.showExtTitle = ' 扩展信息 ';
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

    calculateContent(content) {
      this.isMarkdown = this.isMarkdownFormat(content);
      if (this.isMarkdown) {
        if (this.marked) {
          // already generate markded object. do nothing.
          this.markContent = this.parseMarkdownContent(content);
        } else {
          let hasCode = this.hasCodeBlock(content);
          if (hasCode) {
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
          this.markContent = this.parseMarkdownContent(content);
          this.showAppendContent = content;
          this.showMarkdown = true;
        }
      } else {
        this.showMarkdown = false;
      }
      this.content = content;
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

    calculateAppend(content, extension) {
      let ext = {};
      try {
        ext = JSON.parse(extension);
      } catch (ex) {
        //
      }
      if (ext && ext.ai && ext.ai.stream && ext.ai.stream_interval) {
        this.appendTimer && clearInterval(this.appendTimer);
        //每40毫秒是一个显示周期，每次展示count指定个数的字符。
        let count = 1;
        let period = 40;
        let duration = this.showAppendContent.length * period;
        if (duration > 20000) {
          count = Math.ceil(duration / 20000);
        }
        let that = this;
        this.appendTimer = setInterval(() => {
          if (that.appendContent.length <= 0) {
            clearInterval(that.appendTimer);
            that.appendTimer = null;
            that.showContent = content;
          } else {
            if (that.showContent.length && that.showContent.charAt(that.showContent.length - 1) === '｜') {
              that.showContent = that.showContent.slice(0, that.showContent.length - 1);
            }
            that.showContent += that.appendContent.slice(0, count) + '｜';
            that.appendContent = that.appendContent.slice(count);
          }
        }, period);
      } else {
        this.showContent = content;
      }
    },

    calculateMarkdownAppend(content, extension) {
      let ext = {};
      try {
        ext = JSON.parse(extension);
      } catch (ex) {
        //
      }
      if (ext && ext.ai && ext.ai.stream && ext.ai.stream_interval) {
        this.appendMarkdownTimer && clearInterval(this.appendMarkdownTimer);
        //每40毫秒是一个显示周期，每次展示count指定个数的字符。
        let count = 1;
        let period = 40;
        let duration = this.showAppendContent.length * period;
        if (duration > 20000) {
          count = Math.ceil(duration / 20000);
        }
        let that = this;
        this.appendMarkdownTimer = setInterval(() => {
          if (that.showAppendContent.length <= 0) {
            clearInterval(that.appendMarkdownTimer);
            that.appendMarkdownTimer = null;
            that.showMarkdownContent = that.parseMarkdownContent(that.showTotalContent);
          } else {
            that.showTotalContent += that.showAppendContent.slice(0, count);
            that.showAppendContent = that.showAppendContent.slice(count);
            that.showMarkdownContent = that.parseMarkdownContent(that.showTotalContent + '｜');
          }
        }, period);
      } else {
        this.showMarkdownContent = this.markContent;
      }
    },

    messageContentAppend(message) {
      let oldFlag = this.isMarkdown;
      this.calculateContent(message.content);
      if (false == oldFlag && true == this.isMarkdown) {
        this.showTotalContent = this.showContent;
        this.showMarkdownContent = this.parseMarkdownContent(this.showContent);
      }
      if (message.ext && message.ext.length && this.isAIStream(message.ext)) {
        if (this.isMarkdown) {
          this.showAppendContent = message.content.slice(this.showTotalContent.length);
          this.calculateMarkdownAppend(message.content, message.ext);
        }
        this.appendContent = message.content.slice(this.showContent.length);
        this.calculateAppend(message.content, message.ext);
      } else {
        if (this.isMarkdown) {
          this.showMarkdownContent = this.markContent;
        }
        this.showContent = this.content;
      }
    },

    messageReplace(message) {
      this.calculateContent(message.content);
      if (this.isMarkdown) {
        clearInterval(this.appendMarkdownTimer);
        this.appendMarkdownTimer = null;
        setTimeout(() => {
          this.showMarkdownContent = this.markContent;
        }, 200);
      }
      clearInterval(this.appendTimer);
      this.appendTimer = null;
      setTimeout(() => {
        this.showContent = this.content;
      }, 200);
    },

    checkHideMemberInfo() {
      let hide = true;
      let hide_member_info = this.getGroupInfo.hide_member_info;
      let app_hide_member_info = false;
      let appConfig = this.im.sysManage.getAppConfig(this.im.userManage.getAppid());
      if (appConfig) {
        app_hide_member_info = appConfig.hide_member_info;
      }
      const uid = this.$store.getters.im.userManage.getUid();
      if (app_hide_member_info) {
        if (this.isOwner || this.isAdmin || !hide_member_info) {
          hide = false;
        }
      } else {
        hide = false;
      }
      return hide;
    }
  }
};
</script>
