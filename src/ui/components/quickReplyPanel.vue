<template>
  <div v-show="visible" :class="['quick-reply-panel', { 'is-mobile': isMobile, 'is-compact': isCompactViewport }]">
    <div class="quick-reply-panel__backdrop" @click="handleClose"></div>
    <div class="quick-reply-panel__dialog">
      <div class="quick-reply-panel__header">
        <div class="quick-reply-panel__header-main">
          <div class="quick-reply-panel__title">{{ $t('quickReply.title', { origin: '快捷回复' }) }}</div>
          <div class="quick-reply-panel__subtitle">{{ $t('quickReply.subtitle', { origin: '点击回复内容可快速写入输入框' }) }}</div>
        </div>
        <div class="quick-reply-panel__header-actions">
          <button class="quick-reply-panel__header-link" type="button" @click="handleHeaderCommand('create-group')">
            {{ $t('quickReply.createGroup', { origin: '新增分组' }) }}
          </button>
          <button class="quick-reply-panel__header-link" type="button" @click="handleHeaderCommand('create-reply')">
            {{ $t('quickReply.createReply', { origin: '新增回复' }) }}
          </button>
          <div class="quick-reply-panel__menu-wrap">
            <button class="quick-reply-panel__more" type="button" aria-label="more actions" @click.stop="toggleHeaderMenu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div v-if="showHeaderMenu" class="quick-reply-panel__menu" @click.stop>
              <button class="quick-reply-panel__menu-item" type="button" @click="handleHeaderCommand('import')">{{ $t('quickReply.importCsv', { origin: '导入 CSV' }) }}</button>
              <button class="quick-reply-panel__menu-item" type="button" @click="handleHeaderCommand('export')">{{ $t('quickReply.exportCsv', { origin: '导出 CSV' }) }}</button>
            </div>
          </div>
          <button class="quick-reply-panel__close" type="button" @click="handleClose">×</button>
        </div>
      </div>

      <div v-if="loading" class="quick-reply-panel__loading">{{ $t('quickReply.loading', { origin: '加载中...' }) }}</div>

      <div v-else class="quick-reply-panel__body">
        <div class="quick-reply-panel__groups">
          <div v-if="!groups.length" class="quick-reply-panel__empty quick-reply-panel__empty--groups">
            {{ $t('quickReply.noGroups', { origin: '还没有分组' }) }}
          </div>
          <div v-else :class="['quick-reply-panel__group-list', { 'is-mobile': isMobile }]">
            <div
              v-for="group in groups"
              :key="group.name"
              :class="['quick-reply-panel__group', { 'is-active': group.name === selectedGroupName, 'has-open-menu': isItemMenuOpen('group', group.name) }]"
              @click="selectGroup(group.name)"
            >
              <div class="quick-reply-panel__group-main">
                <div class="quick-reply-panel__group-info">
                  <span class="quick-reply-panel__group-name" :title="group.name">{{ group.name }}</span>
                  <span class="quick-reply-panel__group-subtitle">{{ $t('quickReply.replyCountShort', { count: group.items.length, origin: `${group.items.length}` }) }}</span>
                </div>
                <div class="quick-reply-panel__group-menu-wrap">
                  <button class="quick-reply-panel__item-more is-always-visible" type="button" @click.stop="toggleItemMenu('group', group.name, $event)">
                    <span></span>
                    <span></span>
                    <span></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="quick-reply-panel__replies">
          <div v-if="!selectedGroup" class="quick-reply-panel__empty">
            {{ $t('quickReply.createGroupFirst', { origin: '请先新建一个分组' }) }}
          </div>
          <div v-else-if="!selectedGroup.items.length" class="quick-reply-panel__empty">
            {{ $t('quickReply.noRepliesInGroup', { origin: '当前分组还没有快捷回复' }) }}
          </div>
          <div v-else class="quick-reply-panel__reply-list">
            <div
              v-for="item in selectedGroup.items"
              :key="item.id || `${selectedGroup.name}-${item.text}`"
              :class="['quick-reply-panel__reply-card', { 'has-open-menu': isItemMenuOpen('reply', item.id || `${selectedGroup.name}-${item.text}`) }]"
            >
              <div class="quick-reply-panel__item-menu-wrap is-reply">
                <button class="quick-reply-panel__item-more" type="button" @click.stop="toggleItemMenu('reply', item.id || `${selectedGroup.name}-${item.text}`, $event)">
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              </div>
              <button class="quick-reply-panel__reply-content" type="button" @click="selectReply(item)">
                {{ item.text }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="activeMenuTarget && activeItemMenuStyle"
      ref="floatingItemMenu"
      class="quick-reply-panel__item-menu quick-reply-panel__item-menu--floating"
      :style="activeItemMenuStyle"
      @click.stop
    >
      <button class="quick-reply-panel__menu-item" type="button" @click="handleActiveItemMenuEdit">{{ $t('quickReply.editAction', { origin: '编辑' }) }}</button>
      <button class="quick-reply-panel__menu-item is-danger" type="button" @click="handleActiveItemMenuDelete">{{ $t('quickReply.deleteAction', { origin: '删除' }) }}</button>
    </div>
    <input ref="csvInput" accept=".csv,text/csv" class="quick-reply-panel__csv-input" type="file" @change="handleCsvImport" />

    <el-dialog
      :append-to-body="true"
      :close-on-click-modal="false"
      :visible.sync="replyDialogVisible"
      :title="editingReply ? $t('quickReply.editReplyTitle', { origin: '编辑快捷回复' }) : $t('quickReply.newReplyTitle', { origin: '新增快捷回复' })"
      custom-class="quick-reply-editor-dialog"
      :width="replyDialogWidth"
      :top="replyDialogTop"
      @closed="resetReplyDialog"
    >
      <div class="quick-reply-editor">
        <div class="quick-reply-editor__field">
          <div class="quick-reply-editor__label">{{ $t('quickReply.groupLabel', { origin: '分组' }) }}</div>
          <div class="quick-reply-editor__select-wrap">
            <select v-model="replyForm.group" class="quick-reply-editor__select">
              <option v-for="group in groups" :key="group.name" :value="group.name">
                {{ group.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="quick-reply-editor__field">
          <div class="quick-reply-editor__label">{{ $t('quickReply.contentLabel', { origin: '内容' }) }}</div>
          <el-input
            v-model="replyForm.text"
            type="textarea"
            :rows="7"
            :maxlength="32000"
            resize="none"
            :placeholder="$t('quickReply.contentPlaceholder', { origin: '填写点击后写入输入框的内容' })"
          />
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="replyDialogVisible = false">{{ $t('common.cancel', { origin: '取消' }) }}</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReply">{{ $t('common.save', { origin: '保存' }) }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
const QUICK_REPLY_GROUP_STORAGE_PREFIX = 'floo_quick_reply_empty_groups';
const QUICK_REPLY_CSV_FILENAME = 'quick_reply.csv';

const escapeCsvField = (value) => {
  const text = `${value || ''}`;
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildCsvFromGroups = (groups = []) => {
  const lines = ['group,content'];
  groups.forEach((group) => {
    (group.items || []).forEach((item) => {
      lines.push(`${escapeCsvField(group.name)},${escapeCsvField(item.text)}`);
    });
  });
  return `${lines.join('\n')}\n`;
};

const parseCsvRecords = (csv) => {
  const records = [];
  let fields = [];
  let field = '';
  let inQuotes = false;
  let fieldStarted = false;

  const pushRecord = () => {
    fields.push(field);
    if (fields.some((item) => `${item || ''}`.length > 0)) {
      records.push(fields.slice());
    }
    fields = [];
    field = '';
    fieldStarted = false;
  };

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
      fieldStarted = false;
    } else if (char === '\n' || char === '\r') {
      pushRecord();
      if (char === '\r' && i + 1 < csv.length && csv[i + 1] === '\n') {
        i += 1;
      }
    } else {
      field += char;
      fieldStarted = true;
    }
  }

  if (field.length > 0 || fields.length > 0 || fieldStarted) {
    pushRecord();
  }

  return records;
};

const parseQuickReplyCsv = (csv) => {
  const records = parseCsvRecords(`${csv || ''}`);
  if (records.length < 2) {
    const error = new Error('quick reply csv invalid');
    error.code = 'quick_reply_csv_invalid';
    throw error;
  }

  const groupMap = new Map();
  const orderedGroups = [];
  for (let index = 1; index < records.length; index += 1) {
    const fields = records[index];
    if (!fields || fields.length < 2) {
      continue;
    }
    const groupName = `${fields[0] || ''}`.trim();
    const text = `${fields[1] || ''}`;
    if (!groupName || !text) {
      continue;
    }
    if (!groupMap.has(groupName)) {
      const group = {
        name: groupName,
        items: []
      };
      groupMap.set(groupName, group);
      orderedGroups.push(group);
    }
    groupMap.get(groupName).items.push({
      text,
      group: groupName
    });
  }
  return orderedGroups;
};

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result || '');
    };
    reader.onerror = () => {
      const error = new Error('quick reply file read failed');
      error.code = 'quick_reply_file_read_failed';
      reject(error);
    };
    reader.readAsText(file, 'utf-8');
  });
};

export default {
  name: 'QuickReplyPanel',
  props: {
    im: {
      type: [Object, Function],
      required: true
    },
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      submitting: false,
      isMobile: false,
      viewportWidth: 0,
      viewportHeight: 0,
      showHeaderMenu: false,
      activeItemMenu: null,
      activeItemMenuStyle: null,
      selectedGroupName: '',
      replyDialogVisible: false,
      editingReply: null,
      replyForm: {
        group: '',
        text: ''
      },
      remoteItems: [],
      localEmptyGroups: []
    };
  },
  computed: {
    imClient() {
      return this.im || null;
    },
    groups() {
      const groupMap = new Map();
      const orderedNames = [];

      this.remoteItems.forEach((item) => {
        const groupName = `${item.group || ''}`.trim();
        if (!groupName) {
          return;
        }
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, {
            name: groupName,
            items: []
          });
          orderedNames.push(groupName);
        }
        groupMap.get(groupName).items.push(item);
      });

      this.localEmptyGroups.forEach((groupName) => {
        if (!groupName || groupMap.has(groupName)) {
          return;
        }
        groupMap.set(groupName, {
          name: groupName,
          items: []
        });
        orderedNames.push(groupName);
      });

      return orderedNames.map((name) => groupMap.get(name));
    },
    selectedGroup() {
      return this.groups.find((group) => group.name === this.selectedGroupName) || null;
    },
    isCompactViewport() {
      return !this.isMobile && (this.viewportWidth <= 980 || this.viewportHeight <= 760);
    },
    replyDialogWidth() {
      if (this.isMobile) {
        return 'calc(100vw - 24px)';
      }
      if (this.isCompactViewport) {
        return 'min(520px, calc(100vw - 40px))';
      }
      return '520px';
    },
    replyDialogTop() {
      return '0';
    },
    activeMenuTarget() {
      if (!this.activeItemMenu) {
        return null;
      }
      const { type, key } = this.activeItemMenu;
      if (type === 'group') {
        return this.groups.find((group) => group.name === key) || null;
      }
      if (!this.selectedGroup) {
        return null;
      }
      return this.selectedGroup.items.find((item) => (item.id || `${this.selectedGroup.name}-${item.text}`) === key) || null;
    }
  },
  watch: {
    visible(value) {
      if (value) {
        this.updateViewportMode();
        this.loadData();
        document.body.classList.add('quick-reply-panel-open');
        return;
      }
      this.clearActiveItemMenu();
      document.body.classList.remove('quick-reply-panel-open');
    },
    groups(groups) {
      if (!groups.length) {
        this.selectedGroupName = '';
        return;
      }
      if (!groups.some((group) => group.name === this.selectedGroupName)) {
        this.selectedGroupName = groups[0].name;
      }
    }
  },
  mounted() {
    this.updateViewportMode();
    window.addEventListener('resize', this.updateViewportMode);
    if (this.$el && this.$el.parentNode !== document.body) {
      document.body.appendChild(this.$el);
    }
    if (this.visible) {
      document.body.classList.add('quick-reply-panel-open');
    }
    document.addEventListener('click', this.handleDocumentClick);
  },
  beforeDestroy() {
    document.body.classList.remove('quick-reply-panel-open');
    window.removeEventListener('resize', this.updateViewportMode);
    document.removeEventListener('click', this.handleDocumentClick);
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  },
  methods: {
    updateViewportMode() {
      if (typeof window === 'undefined') {
        this.isMobile = false;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        return;
      }
      this.viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      this.viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      this.isMobile = this.viewportWidth <= 768;
      if (this.activeItemMenu) {
        this.clearActiveItemMenu();
      }
    },
    getStorageKey() {
      const imClient = this.imClient || {};
      const appId = (imClient.userManage && imClient.userManage.getAppid && imClient.userManage.getAppid()) || '';
      const uid = (imClient.userManage && imClient.userManage.getUid && imClient.userManage.getUid()) || '';
      return `${QUICK_REPLY_GROUP_STORAGE_PREFIX}:${appId}:${uid}`;
    },
    loadLocalEmptyGroups() {
      try {
        const raw = window.localStorage.getItem(this.getStorageKey());
        const groups = JSON.parse(raw || '[]');
        this.localEmptyGroups = Array.isArray(groups) ? groups.filter((item) => typeof item === 'string' && item.trim()) : [];
      } catch (ex) {
        this.localEmptyGroups = [];
      }
    },
    saveLocalEmptyGroups() {
      window.localStorage.setItem(this.getStorageKey(), JSON.stringify(this.localEmptyGroups));
    },
    addLocalEmptyGroup(groupName) {
      if (!groupName || this.localEmptyGroups.includes(groupName)) {
        return;
      }
      this.localEmptyGroups = this.localEmptyGroups.concat(groupName);
      this.saveLocalEmptyGroups();
    },
    removeLocalEmptyGroup(groupName) {
      if (!groupName) {
        return;
      }
      this.localEmptyGroups = this.localEmptyGroups.filter((item) => item !== groupName);
      this.saveLocalEmptyGroups();
    },
    renameLocalEmptyGroup(oldName, newName) {
      this.localEmptyGroups = this.localEmptyGroups.map((item) => (item === oldName ? newName : item));
      this.localEmptyGroups = this.localEmptyGroups.filter((item, index, array) => array.indexOf(item) === index);
      this.saveLocalEmptyGroups();
    },
    clearCsvInput() {
      if (this.$refs.csvInput) {
        this.$refs.csvInput.value = '';
      }
    },
    resolveErrorMessage(err, fallbackKey) {
      if (err && err.code === 'quick_reply_csv_invalid') {
        return this.$t('quickReply.csvInvalid', { origin: '快捷回复CSV格式错误' });
      }
      if (err && err.code === 'quick_reply_file_read_failed') {
        return this.$t('quickReply.fileReadFailed', { origin: '快捷回复文件读取失败' });
      }
      return (err && err.message) || this.$t(fallbackKey);
    },
    handleDocumentClick() {
      this.showHeaderMenu = false;
      this.clearActiveItemMenu();
    },
    toggleHeaderMenu() {
      this.showHeaderMenu = !this.showHeaderMenu;
      if (this.showHeaderMenu) {
        this.activeItemMenu = null;
      }
    },
    clearActiveItemMenu() {
      this.activeItemMenu = null;
      this.activeItemMenuStyle = null;
    },
    toggleItemMenu(type, key, event) {
      const sameMenu = this.activeItemMenu && this.activeItemMenu.type === type && this.activeItemMenu.key === key;
      if (sameMenu) {
        this.clearActiveItemMenu();
        return;
      }
      this.activeItemMenu = { type, key };
      this.showHeaderMenu = false;
      this.$nextTick(() => {
        this.updateFloatingMenuPosition(event && event.currentTarget);
      });
    },
    isItemMenuOpen(type, key) {
      return !!this.activeItemMenu && this.activeItemMenu.type === type && this.activeItemMenu.key === key;
    },
    updateFloatingMenuPosition(trigger) {
      if (!trigger || !this.activeItemMenu) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const menu = this.$refs.floatingItemMenu;
      const menuWidth = (menu && menu.offsetWidth) || 96;
      const menuHeight = (menu && menu.offsetHeight) || 88;
      let left = rect.right - menuWidth;
      let top = rect.bottom + 6;
      const edgeGap = 12;

      if (left + menuWidth > viewportWidth - edgeGap) {
        left = viewportWidth - menuWidth - edgeGap;
      }
      if (left < edgeGap) {
        left = edgeGap;
      }
      if (top + menuHeight > viewportHeight - edgeGap) {
        top = rect.top - menuHeight - 6;
      }
      if (top < edgeGap) {
        top = edgeGap;
      }

      this.activeItemMenuStyle = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`
      };
    },
    handleActiveItemMenuEdit() {
      const target = this.activeMenuTarget;
      const type = this.activeItemMenu && this.activeItemMenu.type;
      this.clearActiveItemMenu();
      if (!target) {
        return;
      }
      if (type === 'group') {
        this.openGroupPrompt(target);
        return;
      }
      this.openReplyDialog(target);
    },
    handleActiveItemMenuDelete() {
      const target = this.activeMenuTarget;
      const type = this.activeItemMenu && this.activeItemMenu.type;
      this.clearActiveItemMenu();
      if (!target) {
        return;
      }
      if (type === 'group') {
        this.deleteGroup(target);
        return;
      }
      this.deleteReply(target);
    },
    handleHeaderCommand(command) {
      this.showHeaderMenu = false;
      if (command === 'create-group') {
        this.openGroupPrompt();
        return;
      }
      if (command === 'create-reply') {
        this.openReplyDialog();
        return;
      }
      if (command === 'import') {
        this.triggerImport();
        return;
      }
      if (command === 'export') {
        this.exportCsv();
      }
    },
    handleClose() {
      this.showHeaderMenu = false;
      this.clearActiveItemMenu();
      this.$emit('close');
    },
    async loadData() {
      if (!this.imClient || !this.imClient.sysManage) {
        this.loading = false;
        return;
      }
      this.loading = true;
      this.loadLocalEmptyGroups();
      try {
        const list = await this.imClient.sysManage.asyncGetQuickReplyList(true);
        this.remoteItems = Array.isArray(list) ? list : [];
      } catch (err) {
        this.remoteItems = [];
        this.$message.error(this.resolveErrorMessage(err, 'quickReply.loadFailed'));
      } finally {
        this.loading = false;
      }
    },
    selectGroup(groupName) {
      this.clearActiveItemMenu();
      this.selectedGroupName = groupName;
    },
    selectReply(item) {
      this.clearActiveItemMenu();
      this.$emit('select', item.text || '');
      this.handleClose();
    },
    triggerImport() {
      if (this.$refs.csvInput) {
        this.$refs.csvInput.click();
      }
    },
    exportCsv() {
      const csv = buildCsvFromGroups(this.groups);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = QUICK_REPLY_CSV_FILENAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    },
    async handleCsvImport(event) {
      const file = event && event.target && event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      try {
        await this.$confirm(
          this.$t('quickReply.importOverwriteConfirm', { origin: '导入会覆盖现有快捷回复，是否继续？' }),
          this.$t('quickReply.importCsv', { origin: '导入 CSV' }),
          {
            confirmButtonText: this.$t('quickReply.continueImport', { origin: '继续导入' }),
            cancelButtonText: this.$t('common.cancel', { origin: '取消' }),
            type: 'warning'
          }
        );
      } catch (err) {
        this.clearCsvInput();
        return;
      }

      this.submitting = true;
      try {
        const csv = await readFileAsText(file);
        const importedGroups = parseQuickReplyCsv(csv);
        await this.replaceRemoteStore(importedGroups);
        this.selectedGroupName = importedGroups[0] ? importedGroups[0].name : '';
        this.$message.success(this.$t('quickReply.importSuccess', { origin: '导入成功' }));
      } catch (err) {
        this.$message.error(this.resolveErrorMessage(err, 'quickReply.importFailed'));
      } finally {
        this.submitting = false;
        this.clearCsvInput();
      }
    },
    async replaceRemoteStore(importedGroups) {
      const remoteItems = this.remoteItems.slice();
      if (remoteItems.length) {
        await Promise.all(remoteItems.map((item) => this.imClient.sysManage.asyncDeleteQuickReply(item.id)));
      }

      const createTasks = [];
      importedGroups.forEach((group) => {
        (group.items || []).forEach((item) => {
          createTasks.push(this.imClient.sysManage.asyncCreateQuickReply({ group: group.name, text: item.text }));
        });
      });
      if (createTasks.length) {
        await Promise.all(createTasks);
      }
      this.localEmptyGroups = [];
      this.saveLocalEmptyGroups();
      await this.loadData();
    },
    async openGroupPrompt(group = null) {
      const title = group ? this.$t('quickReply.editGroupTitle', { origin: '编辑分组' }) : this.$t('quickReply.newGroupTitle', { origin: '新增分组' });
      const inputValue = group ? group.name : '';
      try {
        const { value } = await this.$prompt(this.$t('quickReply.groupNamePrompt', { origin: '请输入分组名称' }), title, {
          confirmButtonText: this.$t('common.save', { origin: '保存' }),
          cancelButtonText: this.$t('common.cancel', { origin: '取消' }),
          inputValue,
          inputValidator: (input) => {
            const nextValue = `${input || ''}`.trim();
            if (!nextValue) {
              return this.$t('quickReply.groupNameRequired', { origin: '分组名称不能为空' });
            }
            if (nextValue.length > 64) {
              return this.$t('quickReply.groupNameTooLong', { origin: '分组名称不能超过64个字符' });
            }
            const duplicated = this.groups.find((item) => item.name === nextValue);
            if (duplicated && (!group || duplicated.name !== group.name)) {
              return this.$t('quickReply.groupNameExists', { origin: '分组名称已存在' });
            }
            return true;
          }
        });
        const groupName = `${value || ''}`.trim();
        if (!group) {
          this.addLocalEmptyGroup(groupName);
          this.selectedGroupName = groupName;
          return;
        }
        await this.renameGroup(group, groupName);
      } catch (err) {
        if (err === 'cancel') {
          return;
        }
      }
    },
    async renameGroup(group, nextName) {
      if (!group.items.length) {
        this.renameLocalEmptyGroup(group.name, nextName);
        this.selectedGroupName = nextName;
        return;
      }

      this.submitting = true;
      try {
        await Promise.all(group.items.map((item) => this.imClient.sysManage.asyncUpdateQuickReply(item.id, { group: nextName, text: item.text })));
        this.removeLocalEmptyGroup(group.name);
        this.selectedGroupName = nextName;
        await this.loadData();
        this.$message.success(this.$t('quickReply.groupUpdated', { origin: '分组已更新' }));
      } catch (err) {
        this.$message.error(this.resolveErrorMessage(err, 'quickReply.groupUpdateFailed'));
      } finally {
        this.submitting = false;
      }
    },
    async deleteGroup(group) {
      try {
        await this.$confirm(this.$t('quickReply.deleteGroupConfirm', { origin: '确定删除这个分组吗？' }), this.$t('quickReply.deleteGroupTitle', { origin: '删除分组' }), {
          confirmButtonText: this.$t('quickReply.deleteAction', { origin: '删除' }),
          cancelButtonText: this.$t('common.cancel', { origin: '取消' }),
          type: 'warning'
        });
      } catch (err) {
        return;
      }

      if (!group.items.length) {
        this.removeLocalEmptyGroup(group.name);
        if (this.selectedGroupName === group.name) {
          this.selectedGroupName = '';
        }
        return;
      }

      this.submitting = true;
      try {
        await Promise.all(group.items.map((item) => this.imClient.sysManage.asyncDeleteQuickReply(item.id)));
        this.removeLocalEmptyGroup(group.name);
        if (this.selectedGroupName === group.name) {
          this.selectedGroupName = '';
        }
        await this.loadData();
        this.$message.success(this.$t('quickReply.groupDeleted', { origin: '分组已删除' }));
      } catch (err) {
        this.$message.error(this.resolveErrorMessage(err, 'quickReply.groupDeleteFailed'));
      } finally {
        this.submitting = false;
      }
    },
    openReplyDialog(item = null) {
      this.clearActiveItemMenu();
      if (!this.groups.length) {
        this.$message.warning(this.$t('quickReply.createGroupFirst', { origin: '请先新建一个分组' }));
        return;
      }
      this.editingReply = item;
      this.replyForm = {
        group: item ? item.group : this.selectedGroupName || this.groups[0].name,
        text: item ? item.text : ''
      };
      this.replyDialogVisible = true;
    },
    resetReplyDialog() {
      this.editingReply = null;
      this.replyForm = {
        group: this.selectedGroupName || '',
        text: ''
      };
      this.submitting = false;
    },
    async submitReply() {
      const group = `${this.replyForm.group || ''}`.trim();
      const text = `${this.replyForm.text || ''}`.trim();
      if (!group) {
        this.$message.warning(this.$t('quickReply.selectGroup', { origin: '请选择分组' }));
        return;
      }
      if (!text) {
        this.$message.warning(this.$t('quickReply.replyRequired', { origin: '快捷回复内容不能为空' }));
        return;
      }

      this.submitting = true;
      try {
        if (this.editingReply) {
          await this.imClient.sysManage.asyncUpdateQuickReply(this.editingReply.id, { group, text });
        } else {
          await this.imClient.sysManage.asyncCreateQuickReply({ group, text });
        }
        this.removeLocalEmptyGroup(group);
        this.selectedGroupName = group;
        this.replyDialogVisible = false;
        await this.loadData();
        this.$message.success(this.$t('quickReply.saveSuccess', { origin: '保存成功' }));
      } catch (err) {
        this.$message.error(this.resolveErrorMessage(err, 'quickReply.saveFailed'));
      } finally {
        this.submitting = false;
      }
    },
    async deleteReply(item) {
      try {
        await this.$confirm(this.$t('quickReply.deleteReplyConfirm', { origin: '确定删除这条快捷回复吗？' }), this.$t('quickReply.deleteReplyTitle', { origin: '删除快捷回复' }), {
          confirmButtonText: this.$t('quickReply.deleteAction', { origin: '删除' }),
          cancelButtonText: this.$t('common.cancel', { origin: '取消' }),
          type: 'warning'
        });
      } catch (err) {
        return;
      }

      this.submitting = true;
      try {
        const currentGroupName = item.group;
        const currentGroup = this.groups.find((group) => group.name === currentGroupName);
        await this.imClient.sysManage.asyncDeleteQuickReply(item.id);
        if (currentGroup && currentGroup.items.length === 1) {
          this.addLocalEmptyGroup(currentGroupName);
        }
        await this.loadData();
        this.selectedGroupName = currentGroupName;
        this.$message.success(this.$t('quickReply.deleteSuccess', { origin: '删除成功' }));
      } catch (err) {
        this.$message.error(this.resolveErrorMessage(err, 'quickReply.deleteFailed'));
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style scoped>
:global(body.quick-reply-panel-open) {
  overflow: hidden;
}

.quick-reply-panel {
  position: fixed;
  inset: 0;
  z-index: 1990;
}

.quick-reply-panel__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(15, 23, 42, 0.34);
}

.quick-reply-panel__dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(880px, calc(100vw - 48px));
  height: min(820px, calc(100vh - 64px));
  height: min(820px, calc(100dvh - 64px));
  transform: translate(-50%, -50%);
  background: linear-gradient(180deg, #fdfefe 0%, #f8fbff 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 22px;
  box-shadow: 0 32px 90px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
}

.quick-reply-panel.is-compact .quick-reply-panel__dialog {
  width: min(760px, calc(100vw - 48px));
  height: min(700px, calc(100vh - 72px));
  height: min(700px, calc(100dvh - 72px));
  border-radius: 18px;
}

.quick-reply-panel__header {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 250, 252, 0.88) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.75);
  backdrop-filter: blur(12px);
}

.quick-reply-panel__header-actions {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.quick-reply-panel__header-main {
  min-width: 0;
}

.quick-reply-panel__menu-wrap {
  position: relative;
  z-index: 6;
}

.quick-reply-panel__more {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.quick-reply-panel__more span {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #4b5563;
  display: block;
}

.quick-reply-panel__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 144px;
  padding: 6px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
  border: 1px solid rgba(226, 232, 240, 0.92);
  z-index: 20;
}

.quick-reply-panel__menu-item {
  width: 100%;
  border: 0;
  border-radius: 10px;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  color: #1f2937;
  font-size: 13px;
  cursor: pointer;
}

.quick-reply-panel__menu-item:hover {
  background: #f3f6fb;
}

.quick-reply-panel__menu-item.is-danger {
  color: #dc2626;
}

.quick-reply-panel__menu-divider {
  height: 1px;
  margin: 6px 4px;
  background: #e8eef5;
}

.quick-reply-panel__title {
  font-size: 22px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.quick-reply-panel__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.quick-reply-panel__header-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #d7e4f8;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #3b5b8a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.quick-reply-panel__header-link:hover {
  color: #1d4ed8;
  border-color: #bfd7fb;
  background: #ffffff;
  transform: translateY(-1px);
}

.quick-reply-panel__close {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: #4b5563;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.quick-reply-panel__more:hover,
.quick-reply-panel__close:hover {
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(191, 219, 254, 0.95);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.quick-reply-panel__loading,
.quick-reply-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: #6b7280;
  font-size: 14px;
}

.quick-reply-panel__body {
  flex: 1;
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(220px, 25%) minmax(0, 1fr);
  min-height: 0;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(248, 250, 252, 0) 160px), #fbfdff;
}

.quick-reply-panel__groups,
.quick-reply-panel__replies {
  min-width: 0;
  overflow: auto;
}

.quick-reply-panel__groups {
  position: relative;
  z-index: 1;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-right: 1px solid #e8eef5;
  padding: 12px 8px;
}

.quick-reply-panel__replies {
  position: relative;
  z-index: 1;
  padding: 14px 16px 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.98) 100%);
}

.quick-reply-panel__action,
.quick-reply-panel__mini-action {
  border: 0;
  cursor: pointer;
}

.quick-reply-panel__group {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  padding: 10px 11px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.quick-reply-panel__group.has-open-menu,
.quick-reply-panel__reply-card.has-open-menu {
  z-index: 6;
}

.quick-reply-panel__item-menu-wrap {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 4;
}

.quick-reply-panel__group-menu-wrap {
  position: relative;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.quick-reply-panel__item-menu-wrap.is-reply {
  top: 9px;
  right: 10px;
}

.quick-reply-panel__item-more {
  position: relative;
  z-index: 1;
  min-width: 18px;
  height: 18px;
  padding: 0 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 0;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  opacity: 1;
  pointer-events: auto;
  box-shadow: none;
  transition: color 0.2s ease, transform 0.2s ease;
}

.quick-reply-panel__item-more.is-always-visible {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}

.quick-reply-panel__group .quick-reply-panel__item-more {
  color: #64748b;
}

.quick-reply-panel__reply-card .quick-reply-panel__item-more {
  color: #64748b;
}

.quick-reply-panel__group .quick-reply-panel__item-more span {
  background: currentColor;
}

.quick-reply-panel__item-more span {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  display: block;
}

.quick-reply-panel__group:hover .quick-reply-panel__item-more,
.quick-reply-panel__reply-card:hover .quick-reply-panel__item-more,
.quick-reply-panel__item-menu-wrap:focus-within .quick-reply-panel__item-more,
.quick-reply-panel__group-menu-wrap:focus-within .quick-reply-panel__item-more,
.quick-reply-panel__item-more:focus {
  color: #0f172a;
  transform: translateY(-1px);
}

.quick-reply-panel__item-menu {
  position: absolute;
  z-index: 30;
  width: max-content;
  min-width: 0;
  max-width: min(220px, calc(100vw - 32px));
  padding: 6px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e8eef5;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.16);
}

.quick-reply-panel__item-menu .quick-reply-panel__menu-item {
  white-space: nowrap;
  padding: 8px 10px;
}

.quick-reply-panel__item-menu--floating {
  position: fixed;
  z-index: 2035;
}

.quick-reply-panel__group + .quick-reply-panel__group {
  margin-top: 4px;
}

.quick-reply-panel__group:hover {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(226, 232, 240, 0.85);
}

.quick-reply-panel__group.is-active {
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
  border-color: #d8e7ff;
}

.quick-reply-panel__group-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.quick-reply-panel__group-info {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-reply-panel__group-name {
  display: block;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #162033;
  line-height: 1.3;
}

.quick-reply-panel__group-subtitle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  min-height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #e8eef6;
  color: #708198;
  font-size: 10px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}

.quick-reply-panel__group.is-active .quick-reply-panel__group-subtitle {
  background: #e7f0ff;
  color: #3b6fb6;
}

.quick-reply-panel__mini-action {
  padding: 0;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
}

.quick-reply-panel__mini-action.is-danger {
  color: #dc2626;
}

.quick-reply-panel__reply-list {
  display: grid;
  gap: 10px;
}

.quick-reply-panel__reply-card {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 58px;
  box-sizing: border-box;
  border: 1px solid #e7edf5;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  padding: 12px 46px 12px 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.quick-reply-panel__reply-card:hover {
  border-color: #d5e2f2;
  background: #fff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
}

.quick-reply-panel__reply-content {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0 18px 0 0;
  text-align: left;
  cursor: pointer;
  white-space: normal;
  line-height: 1.45;
  color: #111827;
  font-size: 13px;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
}

.quick-reply-editor__field + .quick-reply-editor__field {
  margin-top: 16px;
}

.quick-reply-editor__label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.quick-reply-editor__select-wrap {
  position: relative;
}

.quick-reply-editor__select-wrap::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 14px;
  width: 8px;
  height: 8px;
  border-right: 1.5px solid #6b7280;
  border-bottom: 1.5px solid #6b7280;
  transform: translateY(-70%) rotate(45deg);
  pointer-events: none;
}

.quick-reply-editor__select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  font-size: 14px;
  outline: none;
  appearance: none;
}

.quick-reply-editor__select:focus {
  border-color: #409eff;
}

.quick-reply-panel__csv-input {
  display: none;
}

:global(.quick-reply-editor-dialog) {
  width: min(520px, calc(100vw - 24px)) !important;
  max-width: calc(100vw - 32px) !important;
  margin: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 24px !important;
}

:global(.quick-reply-editor-dialog .el-dialog__body) {
  max-height: min(calc(100vh - 160px), 560px);
  max-height: min(calc(100dvh - 160px), 560px);
  overflow: auto;
}

:global(body.quick-reply-panel-open .el-dialog__wrapper) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  box-sizing: border-box;
}

:global(body.quick-reply-panel-open .el-message-box) {
  width: min(420px, calc(100vw - 24px)) !important;
  max-width: calc(100vw - 24px) !important;
}

:global(body.quick-reply-panel-open .el-message-box__wrapper) {
  padding: 12px !important;
}

.quick-reply-panel.is-mobile .quick-reply-panel__dialog {
  inset: 0;
  width: 100vw;
  height: min(100dvh, 100vh);
  max-width: none;
  max-height: none;
  transform: none;
  border-radius: 0;
}

.quick-reply-panel.is-mobile .quick-reply-panel__header {
  align-items: center;
  padding: 16px 14px 12px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__header-actions {
  margin-left: auto;
  gap: 8px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__header-link {
  font-size: 12px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__title {
  font-size: 18px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__subtitle {
  font-size: 12px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__body {
  display: grid;
  grid-template-columns: clamp(132px, 31vw, 176px) minmax(0, 1fr);
  min-height: 0;
}

.quick-reply-panel.is-mobile .quick-reply-panel__groups {
  padding: 10px 7px;
  border-right: 1px solid #eef2f7;
  border-bottom: 0;
  overflow: auto;
}

.quick-reply-panel.is-mobile .quick-reply-panel__group-list {
  display: block;
}

.quick-reply-panel.is-mobile .quick-reply-panel__group {
  padding: 9px 9px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__item-more {
  opacity: 1;
}

.quick-reply-panel.is-mobile .quick-reply-panel__group-name {
  font-size: 13px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__replies {
  min-height: 0;
  padding: 10px 9px 16px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__reply-list {
  gap: 10px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__reply-card {
  min-height: 52px;
  border-radius: 12px;
  padding: 10px 40px 10px 10px;
}

.quick-reply-panel.is-mobile .quick-reply-panel__reply-content {
  font-size: 12px;
  line-height: 1.45;
  -webkit-line-clamp: 4;
}

.quick-reply-panel.is-mobile .quick-reply-panel__empty,
.quick-reply-panel.is-mobile .quick-reply-panel__loading {
  min-height: 120px;
  padding: 16px;
  text-align: center;
}

@media (max-width: 768px) {
  :global(body.quick-reply-panel-open .el-dialog__wrapper) {
    align-items: flex-start;
    padding: 24px 12px;
  }

  :global(.quick-reply-editor-dialog) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
  }

  :global(.quick-reply-editor-dialog .el-dialog__body) {
    max-height: calc(100vh - 190px);
    max-height: calc(100dvh - 190px);
  }

  :global(body.quick-reply-panel-open .el-message-box) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px) !important;
  }

  .quick-reply-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .quick-reply-panel__header-actions {
    width: auto;
    margin-left: auto;
    flex-wrap: nowrap;
    justify-content: flex-end;
  }

  .quick-reply-panel__close,
  .quick-reply-panel__more {
    width: 34px;
    height: 34px;
  }

  .quick-reply-panel__mini-action {
    font-size: 11px;
  }
}
</style>
