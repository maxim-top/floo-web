<template>
  <div class="chat-index">
    <Header />
    <Contact />
    <Content />
  </div>
</template>

<script>
import Header from './header';
import Contact from './contact';
import Content from './content';

// import { mapActions, mapState, mapGetters } from "vuex";

export default {
  name: 'HelloWorld',
  components: {
    Header,
    Contact,
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
  },
  computed: {},
  methods: {
    // clickA() {
    //   // this.$store.dispatch("test/invokePushItems", "hello");
    // }
    // ...mapActions("login", ["alertName"])
  }
};
</script>

<style scoped></style>
