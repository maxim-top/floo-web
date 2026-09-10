<template>
  <div>
    <div :class="{ header_more_item: true, 'is-disabled': disabled }" @click.stop="toggleOptions">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_item_icon">
        <path d="M7 10a5 5 0 0 1 10 0v4l2 2H5l2-2v-4"></path>
        <path d="M10 19h4"></path>
      </svg>
      <span class="header_more_item_label">{{ $t('conversationNotifications.title', { origin: '消息通知' }) }}</span>
      <svg :class="{ header_more_submenu_chevron: true, 'is-open': expanded }" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7l5 5-5 5"></path>
      </svg>
    </div>
    <div v-if="expanded" class="header_more_submenu">
      <div
        v-for="option in options"
        :key="option.value"
        :class="{ header_more_submenu_item: true, 'is-selected': value === option.value }"
        @click.stop="selectOption(option.value)"
      >
        <span>{{ option.label }}</span>
        <svg v-if="value === option.value" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4 4L19 7"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConversationNotificationMenu',
  props: {
    value: {
      type: Number,
      required: true
    },
    options: {
      type: Array,
      default: () => []
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      expanded: false
    };
  },
  methods: {
    toggleOptions() {
      if (this.disabled) return;
      this.expanded = !this.expanded;
    },
    selectOption(value) {
      if (this.disabled) return;
      this.expanded = false;
      this.$emit('change', value);
    }
  }
};
</script>
