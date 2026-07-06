<template>
  <div class="notice_panel">
    <div class="notice_panel_header">
      <div class="notice_panel_title">{{ title }}</div>
      <div class="notice_panel_subtitle">{{ subtitle }}</div>
    </div>
    <div class="notice_panel_list" v-if="notices.length">
      <div :key="itemKey ? itemKey(notice, index) : index" class="notice_card" v-for="(notice, index) in notices">
        <slot name="item" :notice="notice" :index="index"></slot>
      </div>
    </div>
    <div class="notice_panel_empty" v-else>{{ emptyText }}</div>
  </div>
</template>

<script>
export default {
  name: 'BaseNoticeList',
  props: {
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    emptyText: {
      type: String,
      default: ''
    },
    notices: {
      type: Array,
      default() {
        return [];
      }
    },
    itemKey: {
      type: Function,
      default: null
    }
  }
};
</script>

<style scoped></style>
