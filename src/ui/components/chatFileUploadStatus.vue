<template>
  <div v-if="tasks.length" class="chat_file_upload_queue" aria-live="polite">
    <div v-for="task in tasks" :key="task.id" class="chat_file_upload_item" :class="`is-${task.status}`">
      <div class="chat_file_upload_info">
        <span class="chat_file_upload_name" :title="task.name">{{ task.name }}</span>
        <span class="chat_file_upload_status">{{ statusText(task) }}</span>
      </div>
      <div v-if="task.status === 'uploading'" class="chat_file_upload_progress">
        <span :style="{ width: `${task.progress}%` }"></span>
      </div>
      <div v-else-if="task.status === 'failed'" class="chat_file_upload_actions">
        <button type="button" @click="$emit('retry', task)">{{ $t('fileUpload.retry', { origin: '重试' }) }}</button>
        <button type="button" @click="$emit('dismiss', task)">{{ $t('fileUpload.dismiss', { origin: '关闭' }) }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatFileUploadStatus',
  props: {
    tasks: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    statusText(task) {
      if (task.status === 'failed') return this.$t('fileUpload.failed', { origin: '上传失败' });
      if (task.status === 'completed') return this.$t('fileUpload.sending', { origin: '正在发送' });
      return this.$t('fileUpload.uploading', { origin: '上传中 {progress}%', progress: task.progress });
    }
  }
};
</script>

<style scoped>
.chat_file_upload_queue {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(100%, var(--message-max-width, 760px));
  margin: 0 auto 8px;
}

.chat_file_upload_item {
  padding: 8px 12px;
  background: #f7f8fb;
  border: 1px solid rgba(124, 135, 142, 0.16);
  border-radius: 10px;
  color: var(--ly-text-main, #303133);
  font-size: 12px;
}

.chat_file_upload_info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.chat_file_upload_name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat_file_upload_status {
  flex: none;
  color: var(--ly-text-muted, #909399);
}

.chat_file_upload_progress {
  height: 3px;
  margin-top: 7px;
  overflow: hidden;
  background: rgba(124, 135, 142, 0.16);
  border-radius: 2px;
}

.chat_file_upload_progress span {
  display: block;
  height: 100%;
  background: var(--ly-primary, #3333cc);
  transition: width 0.15s ease;
}

.chat_file_upload_item.is-failed {
  border-color: rgba(245, 108, 108, 0.3);
}

.chat_file_upload_actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 6px;
}

.chat_file_upload_actions button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ly-primary, #3333cc);
  font: inherit;
  cursor: pointer;
}
</style>
