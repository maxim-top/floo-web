<template>
  <div class="chat-index support-content-chat-index">
    <Header />
    <Content />
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
      document.getElementById('app').style = 'width:100%; height:100%;min-width:100px;min-height:200px;margin-left:0px;background-color: transparent;';
      document.body.style = 'background-color: transparent; margin:0px !important;';
      if (this.checkMobile()) {
        document.getElementById('app').style.borderRadius = '0px';
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
