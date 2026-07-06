<template>
  <div class="forward-selection-bar" v-if="getShowMultiForwardStatus">
    <button class="forward-selection-bar__cancel" type="button" @click="cancelSelection">{{ $t('common.cancel', { origin: '取消' }) }}</button>
    <button class="forward-selection-bar__submit" type="button" :disabled="selectedCount === 0" @click="openRouting">{{ $t('转发') }} ({{ selectedCount }})</button>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'ForwardSelectionBar',
  computed: {
    ...mapGetters('forward', ['getShowMultiForwardStatus', 'getMultiForwardMessages']),
    selectedCount() {
      return this.getMultiForwardMessages.length;
    }
  },
  methods: {
    cancelSelection() {
      this.$store.dispatch('forward/actionCancelForward');
    },
    openRouting() {
      if (!this.selectedCount) return;
      this.$store.dispatch('forward/actionOpenForwardRouting');
    }
  }
};
</script>

<style scoped></style>
