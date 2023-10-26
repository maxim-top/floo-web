<template>
  <div>
    <!-- <div v-if="messageType===1"> -->
    <div class="timeline" v-if="timeMessage != ''">{{ timeMessage }}</div>
    <div :class="{ messageFrame: true, self: isSelf, roster: !isSelf }">
      <div class="rosterInfo">
        <img :src="userObj.avatar" />
      </div>
      <div class="support-contentFrame">
        <!--        <p class="username" v-if="!isSelf">{{ userObj.username }}</p>-->
        <div :class="{ user_content: true, self: isSelf, roster: !isSelf }">
          <div class="c_content" :style="{ 'padding-bottom': showMarkdown ? '0px' : '' }">
            <div v-if="message.type === 'text'">
              <div v-if="showMarkdown" v-html="showMarkdownContent" class="c_markdown" />
              <div v-else>
                {{ showContent }}
              </div>
              <div class="c_content_ext" v-if="showExt">ext: {{ message.ext }}</div>
            </div>
            <div v-if="message.type === 'image'">
              <img :src="attachImage" @click="touchImage" v-if="attachImage !== ''" />
            </div>
            <div @click="playAudio" class="audio_frame" v-if="message.type === 'audio'">
              <img class="audio" src="/image/audio.png" />
            </div>
            <div @click="playVideo" class="video_frame" v-if="message.type === 'video'">
              <img :src="videoImage" class="preview" />
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
          <div class="c_content_more" v-if="message.type === 'text'">
            <span class="c_ext_title" v-if="isMarkdown" @click="changeShowMarkdownFormat">{{ showMarkdownTitle }}</span>
            <span class="c_ext_title" v-if="message.ext" @click="changeShowExt">{{ showExtTitle }}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- </div> -->
    <!-- <div v-if="messageType===3">
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
  name: 'RosterChat',
  data() {
    return {
      system_roster: {
        name: '系统通知',
        avatar: '/image/setting.png'
      },
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

      showMarkdownContent: '',
      appendMarkdownContent: '',
      appendMarkdownTimer: null
    };
  },
  mounted() {
    const im = this.$store.getters.im;
    if (!im) return;

    im.on('onRosterMessageContentAppend', (message) => {
      this.messageContentAppend(message);
    });

    im.on('onRosterMessageReplace', (message) => {
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
      //do not read message sent by oneself
      const im = this.$store.getters.im;
      if (im) im.rosterManage.readRosterMessage(this.getSid, this.message.id);
    }
    let { type } = this.message;
    if (type === 'text') {
      this.calculateContent(this.message.content);
    }

    if (this.message.ext && this.message.ext.length && this.isAIStreamFinish(this.message.ext)) {
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

    isSelf() {
      const uid = this.im.userManage.getUid();
      const cid = numToString(this.message.from);
      return cid + '' === uid + '';
    },
    userObj() {
      const cuid = this.im.userManage.getUid();
      const umaps = this.im.rosterManage.getAllRosterDetail() || {};
      const fromUid = toNumber(this.message.from);
      const fromUserObj = umaps[fromUid] || {};
      let username = fromUserObj.alias || fromUserObj.nick_name || fromUserObj.username || fromUserObj.user_id;
      let avatar = this.im.sysManage.getImage({ avatar: fromUserObj.avatar });

      if (fromUid === cuid) {
        username = '我';
      } else if (0 == fromUid) {
        username = this.system_roster.name;
        avatar = this.system_roster.avatar;
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
      return this.getVideo();
    },

    attachFile() {
      return this.attachUrl;
    },

    videoImage() {
      const attachment = this.message.attach || '{}';
      const { url, tUrl } = attachment;
      if (tUrl && tUrl.length) {
        return this.getImage({ url: tUrl, thumbnail: true });
      } else if (url) {
        return this.getVideo(true);
      }
      return url;
    },

    attachLocation() {
      const attachObj = this.message.attach || {};
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
    },

    messageStatus() {
      const fromUid = toNumber(this.message.from);
      const toUid = toNumber(this.message.to);
      const uid = this.im.userManage.getUid();
      const cid = fromUid === uid ? toUid : fromUid;

      // status will be unread / delivered / read
      return this.im.sysManage.getMessageStatus(cid, this.message.id);
    }
  },

  methods: {
    notEmpty(str) {
      return !(!str || /^\s*$/.test(str));
    },

    getImage({ url = '', thumbnail = true }) {
      if (!url) {
        const attach = this.message.attach || {};
        url = attach.url;
      }
      return this.im.sysManage.getImage({ avatar: url, thumbnail });
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
      const url = this.attachAudio;
      if (!url) {
        alert('url为空，不能播放');
        return;
      }
      const au = document.querySelector('#audio_player');
      au.src = url;
      au.play();
    },

    getBlob(url) {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          }
        };

        xhr.send();
      });
    },

    downloadFile() {
      if (this.attachUrl) {
        //方法 1 可直接下载文件，如果你想重命名，可以使用方法2，但要注意在 Safari 浏览器里，有些扩展名可能因为安全原因被屏蔽
        //1. 直接下载
        window.open(this.attachUrl);

        // //2. 下载并重命名
        // this.getBlob(this.attachUrl).then(blob =>{
        //   var link = document.createElement("a");
        //   link.href = window.URL.createObjectURL(blob);;
        //   link.download = "Example.txt";
        //   link.click();
        // });
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
          } else {
            this.markContent = this.markContent.replaceAll('<pre><code', '<pre><code class="hljs"');
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

    isAIStreamFinish(extension) {
      let ext = JSONBigString.parse(extension);
      if (ext && ext.ai && ext.ai.stream && !ext.ai.finish) {
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
