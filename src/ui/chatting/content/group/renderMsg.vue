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
          <div class="c_content" v-html="message.mentionStr" v-if="message.mentionStr"></div>
          <div class="c_markdown_title" v-if="message.type === 'text' && isMarkdown && !message.mentionStr">
            <span @click="changeShowFormat">&ensp;{{ showTitle }}&ensp;</span>
          </div>
          <div class="c_content" v-if="!message.mentionStr">
            <div v-if="message.type === 'text'">
              <div v-if="showMarkdown" v-html="showMarkdownContent" class="c_markdown" />
              <div v-else>
                {{ showContent }}
              </div>
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

            <el-popover :placement="isSelf ? 'left' : 'right'" trigger="hover" width="70">
              <div class="messageExt">
                <div @click="deleteMessage" class="delete item" v-if="!message.h">删除</div>
                <div @click="forwardMessage" class="recall item">转发</div>
                <div @click="recallMessage" class="recall item" v-if="isSelf && !message.h">撤回</div>
              </div>
              <div class="h_image" slot="reference">
                <img src="/image/more.png" />
              </div>
            </el-popover>
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
import { Marked } from '../../../third/marked.min.js';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';
var JSONBigString = require('json-bigint');

export default {
  name: 'GroupChat',
  data() {
    return {
      showTitle: '显示原文',

      isMarkdown: false,
      showMarkdown: false,
      marked: null,
      addHlgs: false,
      content: '',
      markContent: '',

      showContent: '',
      appendContent: '',
      appendTimer: null,

      showMarkdownContent: '',
      appendMarkdownContent: '',
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

    if (this.message.ext && this.message.ext.length && this.isAIStream(this.message.ext)) {
      if (this.showMarkdown) {
        this.appendMarkdownContent = this.markContent;
        this.calculateMarkdownAppend(this.markContent, this.message.ext, true);
      }
      this.appendContent = this.content;
      this.calculateAppend(this.content, this.message.ext, true);
    } else {
      this.showMarkdownContent = this.markContent;
      this.showContent = this.message.content;
    }
  },
  components: {
    // Chat,
    // Inputer
  },
  props: ['message'],
  computed: {
    ...mapGetters('content', ['getSid', 'getMessageTime']),
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
    userObj() {
      const cuid = this.im.userManage.getUid();
      const umaps = this.im.rosterManage.getAllRosterDetail();
      const fromUid = toNumber(this.message.from);
      const fromUserObj = umaps[fromUid] || {};
      let username = fromUserObj.username || '';

      let avatar = this.getImage({ url: fromUserObj.avatar, type: 'group' });
      if (fromUid === cuid) {
        username = '我';
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
        attachObj = JSONBigString.parse(attachment);
      } catch (ex) {
        //
      }
      if (attachObj.dName) {
        return attachObj.dName;
      }
      return '文件附件';
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
      this.im.rosterManage.deleteMessage(this.getSid, idStr);
    },
    forwardMessage() {
      this.$store.dispatch('forward/actionRecordForwardMessage', this.message);
    },
    recallMessage() {
      const idStr = numToString(this.message.id).toString();
      this.im.rosterManage.recallMessage(this.getSid, idStr);
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

    changeShowFormat() {
      this.showMarkdown = !this.showMarkdown;
      if (this.showMarkdown) {
        this.showTitle = '显示原文';
      } else {
        this.showTitle = '解析格式';
      }
    },

    calculateContent(content) {
      this.isMarkdown = this.isMarkdownFormat(content);
      if (this.isMarkdown) {
        if (this.marked) {
          // already generate markded object. do nothing.
          let newContent = this.marked.parse(content);
          if (this.addHlgs) {
            newContent = newContent.replaceAll('<code', '<code class="hljs"');
          }
          this.appendMarkdownContent = newContent.slice(this.markContent.length);
          this.markContent = newContent;
        } else {
          let hasCode = this.hasCodeBlock(content);
          if (hasCode) {
            this.marked = new Marked(
              markedHighlight({
                langPrefix: 'hljs language-',
                highlight(code, lang) {
                  let language = hljs.getLanguage(lang) ? lang : 'plaintext';
                  if (language === 'plaintext') {
                    this.addHlgs = true;
                    return hljs.highlightAuto(code).value;
                  }
                  return hljs.highlight(code, { language }).value;
                }
              })
            );
          } else {
            this.marked = new Marked();
          }
          this.markContent = this.marked.parse(content);
          if (this.addHlgs) {
            this.markContent = this.markContent.replaceAll('<code', '<code class="hljs"');
          }
          this.showMarkdown = true;
        }
      }
      this.content = content;
    },

    isAIStream(extension) {
      let ext = JSONBigString.parse(extension);
      if (ext && ext.ai && ext.ai.stream) {
        return true;
      } else {
        return false;
      }
    },

    calculateAppend(content, extension, showAll = false) {
      let ext = JSONBigString.parse(extension);
      if (ext && ext.ai && ext.ai.stream && ext.ai.stream_interval) {
        this.appendTimer && clearInterval(this.appendTimer);
        //每一次计时周期增加两个字符展示。
        let period = (ext.ai.stream_interval * 1000) / (this.appendContent.length / 2);
        this.appendTimer = setInterval(() => {
          if (this.appendContent.length <= 0) {
            clearInterval(this.appendTimer);
            this.appendTimer = null;
            this.showContent = content;
            if (showAll) {
              this.showMarkdownContent = this.markContent;
            }
          } else {
            this.showContent += this.appendContent.slice(0, 2);
            this.appendContent = this.appendContent.slice(2);
          }
        }, period);
      } else {
        this.showContent = content;
      }
    },

    calculateMarkdownAppend(markContent, extension, showAll = false) {
      let ext = JSONBigString.parse(extension);
      if (ext && ext.ai && ext.ai.stream && ext.ai.stream_interval) {
        this.appendMarkdownTimer && clearInterval(this.appendMarkdownTimer);
        //每一次计时周期增加两个字符展示。
        let period = (ext.ai.stream_interval * 1000) / (this.appendMarkdownContent.length / 2);
        this.appendMarkdownTimer = setInterval(() => {
          if (this.appendMarkdownContent.length <= 0) {
            clearInterval(this.appendMarkdownTimer);
            this.appendMarkdownTimer = null;
            this.showMarkdownContent = markContent;
            if (showAll) {
              this.showContent = this.content;
            }
          } else {
            this.showMarkdownContent += this.appendMarkdownContent.slice(0, 2);
            this.appendMarkdownContent = this.appendMarkdownContent.slice(2);
          }
        }, period);
      } else {
        this.showMarkdownContent = markContent;
      }
    },

    messageContentAppend(message) {
      this.calculateContent(message.content);
      if (message.ext && message.ext.length && this.isAIStream(message.ext)) {
        if (this.isMarkdown) {
          this.calculateMarkdownAppend(this.markContent, message.ext);
        }
        this.appendContent += message.appendedContent;
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
      if (message.ext && message.ext.length && this.isAIStream(message.ext)) {
        if (this.isMarkdown) {
          this.calculateMarkdownAppend(this.markContent, message.ext, true);
        }
        this.appendContent = message.content.slice(this.showContent.length);
        this.calculateAppend(message.content, message.ext, true);
      } else {
        if (this.isMarkdown) {
          this.showMarkdownContent = this.markContent;
        }
        this.showContent = this.content;
      }
    }
  }
};
</script>
