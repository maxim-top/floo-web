let uploadTaskSequence = 0;

const removeTask = (tasks, taskId) => {
  const index = tasks.findIndex((item) => item.id === taskId);
  if (index >= 0) tasks.splice(index, 1);
};

export default {
  data() {
    return {
      uploadTasks: []
    };
  },
  methods: {
    startChatFileUpload(file, fileType, chatType, sid) {
      if (!file) return;

      const task = {
        id: ++uploadTaskSequence,
        file,
        fileType,
        chatType,
        sid,
        appId: this.im.userManage.getAppid(),
        uid: this.im.userManage.getUid(),
        name: file.name,
        progress: 0,
        status: 'uploading'
      };
      this.uploadTasks.push(task);
      this.runChatFileUpload(task);
    },

    runChatFileUpload(task) {
      task.progress = 0;
      task.status = 'uploading';

      this.im.sysManage
        .asyncFileUpload({
          file: task.file,
          fileType: task.fileType,
          to_id: task.sid,
          toType: 'chat',
          chatType: task.chatType,
          processCallback: (event) => {
            if (!event.total) return;
            task.progress = Math.min(99, Math.floor((100 * event.loaded) / event.total));
          }
        })
        .then((res) => {
          if (task.appId !== this.im.userManage.getAppid() || task.uid !== this.im.userManage.getUid()) {
            throw new Error('Upload account changed');
          }

          const attachment = {
            dName: res.name || task.file.name,
            fLen: typeof res.size === 'number' ? res.size : task.file.size,
            width: typeof res.width === 'number' ? res.width : 0,
            height: typeof res.height === 'number' ? res.height : 0,
            url: res.url
          };
          if (task.chatType === 'group') {
            this.im.sysManage.sendGroupMessage({
              type: task.fileType,
              gid: task.sid,
              content: '',
              attachment,
              priority: 0
            });
          } else {
            this.im.sysManage.sendRosterMessage({
              type: task.fileType,
              uid: task.sid,
              content: '',
              attachment
            });
          }

          task.progress = 100;
          task.status = 'completed';
          setTimeout(() => removeTask(this.uploadTasks, task.id), 800);
        })
        .catch((error) => {
          task.status = 'failed';
          task.error = error;
          if (!this._isDestroyed && `${task.sid}` === `${this.getSid}`) {
            const messageKey = error && error.code === 'IMAGE_CONVERSION_TOO_LARGE' ? 'fileUpload.imageTooLargeForBrowser' : 'fileUpload.failedNotice';
            const origin = messageKey === 'fileUpload.imageTooLargeForBrowser' ? '当前浏览器无法安全处理该图片，请更换浏览器或作为文件发送' : '文件上传失败，请重试';
            this.$message.error(this.$t(messageKey, { origin }));
          }
        });
    },

    retryChatFileUpload(task) {
      if (task.status === 'uploading') return;
      this.runChatFileUpload(task);
    },

    dismissChatFileUpload(task) {
      removeTask(this.uploadTasks, task.id);
    },

    visibleChatFileUploadTasks(sid, chatType) {
      return this.uploadTasks.filter((task) => `${task.sid}` === `${sid}` && task.chatType === chatType);
    }
  }
};
