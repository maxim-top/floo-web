<template>
  <div class="chat-index support-content-chat-index support-shell">
    <Header class="app-topbar" />
    <div class="support-body">
      <div class="support-main">
        <Content />
      </div>
    </div>
  </div>
</template>
<script>
import Header from './header';
import Content from './content';

export default {
  name: 'HelloWorld',
  components: {
    Header,
    Content
  },
  mounted() {
    this.$store.getters.im.on('onRosterListUpdate', () => {
      this.$store.dispatch('contact/actionClearRosterList');
      this.$store.dispatch('contact/actionLazyGetRosterList');
    });

    this.$store.getters.im.on('onGroupListUpdate', () => {
      this.$store.dispatch('contact/actionClearGroupList');
      this.$store.dispatch('contact/actionLazyGetGroupList');
    });

    this.$store.getters.im.on('recentlistUpdate', () => {
      this.$store.dispatch('contact/actionGetConversationList');
    });

    this.$store.getters.im.on('onUnreadChange', () => {
      this.$store.dispatch('contact/actionGetConversationList');
    });

    this.$store.getters.im.on('onRosterInfoUpdate', () => {
      this.$store.dispatch('contact/actionGetConversationList');
    });
    this.initCss();

    this.$store.dispatch('content/actionUpdateRoster');

    this.getApp().maybeLaunchWXMP();
  },
  computed: {},
  methods: {
    initCss() {
      const app = document.getElementById('app');
      const html = document.documentElement;
      const body = document.body;
      const uiRoot = document.querySelector('.ui-index');
      const shellStyle =
        'width:100%;height:100%;min-width:100px;min-height:200px;margin:0;background-color:transparent;position:fixed;left:0;top:0;right:0;bottom:0;transform:none;';

      html && (html.style.cssText = 'background-color: transparent;');
      app && (app.style.cssText = shellStyle);
      uiRoot && (uiRoot.style.cssText = 'width:100%;height:100%;margin:0;background-color:transparent;overflow:hidden;');
      body && (body.style.cssText = 'background-color: transparent; margin:0px !important;');
      if (this.checkMobile()) {
        app && (app.style.borderRadius = '0px');
      }
    },

    checkMobile() {
      let u = navigator.userAgent;
      let isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1;
      let isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
      if (isAndroid || isIOS || (document.body.clientHeight > document.body.clientWidth && document.body.clientWidth < 500)) {
        return true;
      } else {
        return false;
      }
    },

    getApp() {
      return this.$parent;
    }
    // clickA() {
    //   // this.$store.dispatch("test/invokePushItems", "hello");
    // }
    // ...mapActions("login", ["alertName"])
  }
};
</script>
