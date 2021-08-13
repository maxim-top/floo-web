<template>
  <div class="contact">
    <ConContact v-if="showContact" />
    <ConConversation v-if="showConversation" />
  </div>
</template>

<script>
import ConContact from './conContact.vue';
import ConConversation from './conConversation.vue';

import { mapGetters } from 'vuex';

export default {
  name: 'HelloWorld',
  components: {
    ConContact,
    ConConversation
  },
  computed: {
    ...mapGetters('header', ['getHeaderStatus']),
    showContact() {
      return this.getHeaderStatus === 'contact';
    },
    showConversation() {
      return this.getHeaderStatus === 'conversation';
    }
  },
  methods: {}
};
</script>

<style scoped></style>
