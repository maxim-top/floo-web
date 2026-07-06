<template>
  <div class="header">
    <div class="header_items">
      <button class="panel_back_button" type="button" @click="goBackToList" :aria-label="$t('返回会话列表')">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="panel_back_icon">
          <path d="M15 5l-7 7 7 7"></path>
        </svg>
      </button>
      <div class="chat_header_title_group" @click="touchUserNameHandler">
        <span class="name">{{ rosterName }}</span>
        <span class="chat_header_identity_badge chat_header_identity_badge--support" v-if="isSupportContact">
          <span class="chat_header_identity_badge_icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l6 2.5V11c0 4.2-2.7 8.1-6 10-3.3-1.9-6-5.8-6-10V5.5L12 3z"></path>
              <path d="M9.5 12.3l1.7 1.8 3.6-4"></path>
            </svg>
          </span>
          <span>{{ supportSourceLabel }}</span>
        </span>
      </div>
      <span class="typing" style="padding-left: 10px; color: #111; font-size: 12px" v-if="status">{{ $t('正在输入...') }}</span>
      <div class="header_actions">
        <button v-if="showSupportQuickNewSession" class="header_quick_action" type="button" @click.stop="createNewSessionHandler">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="header_quick_action_icon">
            <path d="M12 5v14"></path>
            <path d="M5 12h14"></path>
            <path d="M6 7h3"></path>
            <path d="M6 17h3"></path>
          </svg>
          <span class="header_quick_action_label">{{ $t('新会话') }}</span>
        </button>
        <div class="header_more" @click.stop="toggleMobileMenu">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_icon">
            <circle cx="6" cy="12" r="1.75"></circle>
            <circle cx="12" cy="12" r="1.75"></circle>
            <circle cx="18" cy="12" r="1.75"></circle>
          </svg>
          <div v-if="showMobileMenu" class="header_more_menu">
            <div class="header_more_item" v-if="showMenuNewSession" @click.stop="createNewSessionHandler">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_item_icon">
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
                <path d="M6 7h3"></path>
                <path d="M6 17h3"></path>
              </svg>
              <span>{{ $t('新会话') }}</span>
            </div>
            <div class="header_more_item" @click.stop="touchUserNameHandler">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="header_more_item_icon">
                <circle cx="12" cy="8" r="3"></circle>
                <path d="M6 19a6 6 0 0 1 12 0"></path>
              </svg>
              <span>{{ $t('查看资料') }}</span>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'RosterChat',
  data() {
    return {
      status: false,
      showMobileMenu: false,
      supportContacts: [],
      creatingNewSession: false,
      compactSupportActions: false
    };
  },
  mounted() {
    document.addEventListener('click', this.closeMobileMenu);
    window.addEventListener('resize', this.updateCompactSupportActions);
    window.addEventListener('orientationchange', this.updateCompactSupportActions);
    this.updateCompactSupportActions();
    this.refreshSupportContacts();
    this.$store.getters.im.on('onInputStatusMessage', (message) => {
      const { from, ext } = message;
      if (from == this.getSid) {
        let jext = {};
        try {
          jext = JSON.parse(ext);
        } catch (ex) {
          //
        }
        const { input_status } = jext;
        if (input_status == 'nothing') {
          this.status = false;
        } else {
          this.status = true;
        }
      }
    });
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeMobileMenu);
    window.removeEventListener('resize', this.updateCompactSupportActions);
    window.removeEventListener('orientationchange', this.updateCompactSupportActions);
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getRosterInfo', 'getSid']),
    ...mapGetters('forward', ['getShowMultiForwardStatus']),
    isSystemNotice() {
      return this.getSid === 0;
    },
    rosterName() {
      if (this.isSystemNotice) {
        return this.$t('系统通知');
      }
      let name = this.getRosterInfo.alias || this.getRosterInfo.nick_name || this.getRosterInfo.username;
      if (!name) {
        this.$store.dispatch('content/actionUpdateRoster');
      }
      return name;
    },
    isSupportContact() {
      if (this.isSystemNotice) {
        return false;
      }
      return !!this.currentSupportContact;
    },
    currentSupportContact() {
      return this.supportContacts.find((x) => `${x.user_id}` === `${this.getSid}`) || null;
    },
    supportSourceLabel() {
      const source = (this.currentSupportContact && this.currentSupportContact.source) || 'official';
      if (source === 'chatbot') {
        return this.$t('智能消息');
      }
      if (source === 'clawchat') {
        return this.$t('龙虾会话');
      }
      return this.$t('官方客服');
    },
    showSupportQuickNewSession() {
      return !this.isSystemNotice && this.isSupportContact && !this.compactSupportActions;
    },
    showMenuNewSession() {
      return !this.isSystemNotice && (!this.isSupportContact || this.compactSupportActions);
    },
    currentUserId() {
      return this.$store.getters.im.userManage.getUid();
    }
  },
  methods: {
    updateCompactSupportActions() {
      if (typeof window === 'undefined' || !window.matchMedia) {
        this.compactSupportActions = false;
        return;
      }
      this.compactSupportActions = window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;
    },
    refreshSupportContacts() {
      const im = this.$store.getters.im;
      im.sysManage
        .asyncGetStaticContact()
        .then((res) => {
          this.supportContacts = res || [];
        })
        .catch(() => {
          this.supportContacts = [];
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
      if (this.isSystemNotice) {
        this.closeMobileMenu();
        return;
      }
      this.$store.dispatch('content/actionSetType', {
        sid: this.getSid,
        type: 'rosterinfo'
      });
      this.closeMobileMenu();
    },
    formatTimestampPart(value) {
      return `${value}`.padStart(2, '0');
    },
    buildDefaultSessionName() {
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${this.formatTimestampPart(now.getMonth() + 1)}-${this.formatTimestampPart(now.getDate())} ${this.formatTimestampPart(
        now.getHours()
      )}:${this.formatTimestampPart(now.getMinutes())}:${this.formatTimestampPart(now.getSeconds())}`;
      return this.$t('与{name}的新会话 {timestamp}', { name: this.rosterName || this.getSid, timestamp });
    },
    buildNewSessionMetadata() {
      return {
        new_session_metadata: {
          scene: 'roster_chat',
          peer_user_id: Number(this.getSid),
          created_by_user_id: Number(this.currentUserId),
          created_at: Date.now(),
          name_source: 'user_confirmed',
          peer_name_snapshot: this.rosterName || `${this.getSid}`
        }
      };
    },
    openNewGroupConversation(groupId) {
      this.$store
        .dispatch('content/actionEnsureConversationEntry', {
          sid: groupId,
          type: 'group'
        })
        .finally(() => {
          this.$store.dispatch('content/actionPreOpenGroup', {
            sid: groupId
          });
          this.$store.dispatch('contact/actionSetSkipConversationAutoSelectOnce', true);
          this.$store.dispatch('contact/actionGetConversationList');
          this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
          this.$store.dispatch('content/actionSetType', {
            sid: groupId,
            type: 'groupchat'
          });
        });
    },
    createNewSessionHandler() {
      if (this.isSystemNotice || this.creatingNewSession) {
        this.closeMobileMenu();
        return;
      }
      this.closeMobileMenu();
      const name = this.buildDefaultSessionName();
      this.creatingNewSession = true;
      return this.$store.getters.im.groupManage
        .asyncCreate({
          name,
          type: 3,
          user_list: [this.getSid]
        })
        .then((groupInfo) => {
          const groupId = groupInfo && groupInfo.group_id;
          if (!groupId) {
            throw new Error('missing group_id');
          }
          return this.$store.getters.im.groupManage
            .asyncUpdateExt({
              group_id: groupId,
              value: JSON.stringify(this.buildNewSessionMetadata())
            })
            .then(() => {
              this.openNewGroupConversation(groupId);
            })
            .catch((error) => {
              this.openNewGroupConversation(groupId);
              this.$message.error(this.$t('新会话已创建，但会话元数据写入失败'));
              return Promise.reject({
                ...error,
                metadataWriteFailed: true
              });
            });
        })
        .catch((error) => {
          if (error && error.metadataWriteFailed) {
            return;
          }
          if (!(error instanceof Error && error.message === 'missing group_id')) {
            if (error && error.url && error.code) {
              this.$message.error(this.$t('新会话创建失败'));
            }
          } else {
            this.$message.error(this.$t('新会话创建失败'));
          }
        })
        .finally(() => {
          this.creatingNewSession = false;
        });
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
  },
  watch: {
    getSid(a, b) {
      if (a !== b) {
        this.status = false;
      }
    }
  }
};
</script>

<style scoped></style>
