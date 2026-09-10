<template>
  <div class="header">
    <div class="header_items">
      <button class="panel_back_button" type="button" @click="goBackToList" :aria-label="$t('返回会话列表')">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="panel_back_icon">
          <path d="M15 5l-7 7 7 7"></path>
        </svg>
      </button>
      <span class="name" @click="touchUserNameHandler">{{ groupName }}</span>
      <span class="typing" style="padding-left: 20px; color: #ddd"></span>
      <div class="header_more" @click.stop="toggleMobileMenu">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_icon">
          <circle cx="6" cy="12" r="1.75"></circle>
          <circle cx="12" cy="12" r="1.75"></circle>
          <circle cx="18" cy="12" r="1.75"></circle>
        </svg>
        <div v-if="showMobileMenu" class="header_more_menu">
          <div class="header_more_item" @click.stop="openGroupInfo">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_item_icon">
              <circle cx="12" cy="8" r="3"></circle>
              <path d="M6 19a6 6 0 0 1 12 0"></path>
            </svg>
            <span>{{ $t('群资料') }}</span>
          </div>
          <div class="header_more_item" @click.stop="toggleMembers">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_item_icon">
              <path d="M4 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4"></path>
              <circle cx="9" cy="8" r="2.5"></circle>
              <circle cx="15" cy="9" r="2"></circle>
            </svg>
            <span>{{ $t('群成员') }}</span>
          </div>
          <div class="header_more_item" @click.stop="multiMessagesForward()">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_item_icon">
              <path d="M4 7h10"></path>
              <path d="M4 12h10"></path>
              <path d="M4 17h10"></path>
              <path d="M16 8l4 4-4 4"></path>
            </svg>
            <span>{{ $t('批量转发') }}</span>
          </div>
          <div class="header_more_item" @click.stop="deleteConversation(getSid)">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_item_icon">
              <path d="M5 7h14"></path>
              <path d="M9 7V5h6v2"></path>
              <path d="M8 7l1 12h6l1-12"></path>
            </svg>
            <span>{{ $t('删除会话') }}</span>
          </div>
          <ConversationNotificationMenu
            :value="groupNotificationMode"
            :options="notificationModeOptions"
            :disabled="notificationModeUpdating || !groupNotificationModeReady"
            @change="updateGroupNotificationMode"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import ConversationNotificationMenu from '../components/conversationNotificationMenu.vue';

export default {
  name: 'GroupChat',
  data() {
    return {
      showMobileMenu: false,
      notificationModeUpdating: false
    };
  },
  mounted() {
    document.addEventListener('click', this.closeMobileMenu);
    this.$store.getters.im.on('onGroupListUpdate', this.handleGroupListUpdate);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeMobileMenu);
    const im = this.$store.getters.im;
    if (im) {
      im.off('onGroupListUpdate', this.handleGroupListUpdate);
    }
  },
  components: {
    ConversationNotificationMenu
  },
  computed: {
    ...mapGetters('content', ['getGroupInfo', 'getSid']),
    ...mapGetters('forward', ['getShowMultiForwardStatus']),
    groupName() {
      let name = this.getGroupInfo.name;
      if (!name) {
        this.$store.dispatch('content/actionUpdateGroup');
      }
      return name;
    },
    groupNotificationModeReady() {
      return !!this.getGroupInfo.group_id && `${this.getGroupInfo.group_id}` === `${this.getSid}`;
    },
    groupNotificationMode() {
      const mode = Number(this.getGroupInfo.msg_mute_mode || 0);
      return [0, 1, 2].includes(mode) ? mode : 0;
    },
    notificationModeOptions() {
      return [
        {
          value: 0,
          label: this.$t('conversationNotifications.modeAll', { origin: '接收并提醒消息' })
        },
        {
          value: 1,
          label: this.$t('conversationNotifications.modeSilent', { origin: '接收但不提醒消息' })
        },
        {
          value: 2,
          label: this.$t('conversationNotifications.modeNone', { origin: '不接收任何消息' })
        }
      ];
    }
  },
  methods: {
    handleGroupListUpdate() {
      const groupId = this.getSid;
      this.$store.dispatch('content/actionUpdateGroup', { sid: groupId, force: false }).catch(() => {});
    },
    updateGroupNotificationMode(value) {
      if (this.notificationModeUpdating || !this.groupNotificationModeReady) {
        return;
      }
      const mode = Number(value);
      if (![0, 1, 2].includes(mode)) {
        return;
      }
      if (mode === this.groupNotificationMode) {
        this.closeMobileMenu();
        return;
      }
      const groupId = this.getSid;
      const previousInfo = this.getGroupInfo;
      this.notificationModeUpdating = true;
      this.$store.commit('content/setGroupInfoBySid', {
        sid: groupId,
        value: Object.assign({}, previousInfo, { msg_mute_mode: mode })
      });
      this.closeMobileMenu();
      this.$store.getters.im.groupManage
        .asyncGroupMsgMutemode({
          group_id: groupId,
          msg_mute_mode: mode
        })
        .then((updated) => {
          if (updated === false) {
            return Promise.reject(new Error('Group notification setting was not updated'));
          }
          this.$message.success(this.$t('conversationNotifications.updateSuccess', { origin: '通知设置已更新' }));
          return this.$store
            .dispatch('content/actionUpdateGroup', { sid: groupId, force: true })
            .catch((err) => {
              console.error('Failed to refresh group notification setting:', err);
            })
            .finally(() => {
              this.$store.dispatch('contact/actionSyncGroupList');
              this.$store.dispatch('contact/actionGetConversationList');
            });
        })
        .catch((err) => {
          console.error('Failed to update group notification setting:', err);
          this.$store.commit('content/setGroupInfoBySid', {
            sid: groupId,
            value: previousInfo
          });
          this.$message.error(this.$t('conversationNotifications.updateFailed', { origin: '通知设置更新失败' }));
        })
        .finally(() => {
          this.notificationModeUpdating = false;
        });
    },
    goBackToList() {
      this.$store.dispatch('contact/actionSetSkipConversationAutoSelectOnce', true);
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('content/actionSetType', {
        sid: undefined
      });
      this.closeMobileMenu();
    },
    touchUserNameHandler() {
      this.$store.dispatch('content/actionSetType', {
        sid: this.getSid,
        type: 'groupinfo'
      });
    },
    openGroupInfo() {
      this.touchUserNameHandler();
      this.closeMobileMenu();
    },
    toggleMembers() {
      this.$emit('toggle-members');
      this.closeMobileMenu();
    },

    deleteConversation(id) {
      this.$confirm(this.$t('确认删除当前会话吗？'), this.$t('删除会话'), {
        confirmButtonText: this.$t('删除'),
        cancelButtonText: this.$t('common.cancel', { origin: '取消' }),
        type: 'warning'
      })
        .then(() => {
          const also_delete_other_devices = true;
          this.$store.getters.im.sysManage.deleteConversation(id, also_delete_other_devices);
          this.$message.success(this.$t('会话删除成功'));

          this.$store.dispatch('contact/actionGetConversationList');
          this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
          this.$store.dispatch('content/actionSetType', {
            sid: undefined
          });
          this.closeMobileMenu();
        })
        .catch(() => {});
    },

    multiMessagesForward() {
      if (this.getShowMultiForwardStatus) {
        this.$store.dispatch('forward/actionCancelForward');
      } else {
        this.$store.dispatch('forward/actionBeginMultiForwardSelection');
      }
      this.closeMobileMenu();
    },
    toggleMobileMenu() {
      this.showMobileMenu = !this.showMobileMenu;
    },
    closeMobileMenu() {
      this.showMobileMenu = false;
    }

    //finish
  }
};
</script>

<style scoped></style>
