<template>
  <div :class="{ user_setting: true, profile_panel: true, contact_profile_panel: true, 'profile-container': true, 'profile_panel--full': useDesktopFullLayout }">
    <div class="profile_panel_card">
      <div class="profile_panel_hero">
        <div class="avatar">
          <img :src="userInfo.avatar" class="av" />
        </div>
        <div class="profile_panel_name" v-if="!isDeletedUser">{{ profileTitle }}</div>
        <div class="profile_panel_identity_badge profile_panel_identity_badge--warning" v-if="isDeletedUser">
          <span class="profile_panel_identity_badge_icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 7.5v5"></path>
              <circle cx="12" cy="16.5" r="1"></circle>
            </svg>
          </span>
          <span>{{ deletedUserStatusText }}</span>
        </div>
        <div class="profile_panel_identity_badge profile_panel_identity_badge--support" v-if="isSupportContact">
          <span class="profile_panel_identity_badge_icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l6 2.5V11c0 4.2-2.7 8.1-6 10-3.3-1.9-6-5.8-6-10V5.5L12 3z"></path>
              <path d="M9.5 12.3l1.7 1.8 3.6-4"></path>
            </svg>
          </span>
          <span>{{ supportSourceLabel }}</span>
        </div>
      </div>
      <div class="profile_panel_actions">
        <button v-if="!isDeletedUser" class="profile_action profile_action--primary" type="button" @click="chatClickHandler">
          <span class="profile_action_icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 6.5h14v8H8l-3 3v-11z"></path>
            </svg>
          </span>
          <span class="profile_action_label">{{ $t('消息') }}</span>
        </button>
        <button
          v-if="isDeletedUser ? isFriend : true"
          :class="['profile_action', isFriend ? 'profile_action--danger' : 'profile_action--accent']"
          type="button"
          @click="isFriend ? chatRemoveHandler() : addFriendHandler()"
        >
          <span class="profile_action_icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path v-if="isFriend" d="M6 12h12"></path>
              <path v-else d="M12 5v14M5 12h14"></path>
            </svg>
          </span>
          <span class="profile_action_label">{{ isFriend ? $t('删除') : $t('添加') }}</span>
        </button>
        <button v-if="!isDeletedUser" class="profile_action profile_action--neutral" type="button" @click="setAlias">
          <span class="profile_action_icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 17.5V20h2.5L18 8.5 15.5 6 4 17.5z"></path>
            </svg>
          </span>
          <span class="profile_action_label">{{ $t('备注') }}</span>
        </button>
      </div>
      <div class="profile_panel_section">
        <div class="line">
          <span class="ll">{{ $t('用户ID') }}</span>
          <p class="lr">{{ userInfo.user_id }}</p>
        </div>
        <div class="line">
          <span class="ll">{{ $t('用户名') }}</span>
          <p class="lr">{{ rosterName || '-' }}</p>
        </div>
        <div class="line">
          <span class="ll">{{ $t('昵称') }}</span>
          <p class="lr">{{ nickName || '-' }}</p>
        </div>
        <div v-if="!isDeletedUser" class="line line--interactive" @click="setAlias">
          <span class="ll">{{ $t('备注') }}</span>
          <p class="lr">{{ aliasName || $t('点击设置') }}</p>
        </div>
        <div v-else class="line">
          <span class="ll">{{ $t('备注') }}</span>
          <p class="lr">{{ aliasName || '-' }}</p>
        </div>
      </div>
      <div class="profile_panel_footer_actions">
        <button @click="chatClickHandler" class="logout logout-secondary" type="button" v-if="!isDeletedUser && isFriend">{{ $t('开始聊天') }}</button>
        <button @click="addFriendHandler" class="logout" type="button" v-else-if="!isDeletedUser">{{ $t('添加好友') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

const USER_NOT_EXIST_ERROR_CODE = 10000;
const DELETED_ROSTER_ERROR_CODE = 10021;

export default {
  name: 'rosterInfo',
  data() {
    return {
      userInfo: {},
      isDesktop: false,
      supportContacts: []
    };
  },
  mounted() {
    this.updateDesktopMode();
    window.addEventListener('resize', this.updateDesktopMode);
    this.refreshUserInfo(this.getSid);
    this.refreshSupportContacts();

    this.$store.getters.im.on('onRosterInfoUpdate', (ids) => {
      if (Array.isArray(ids) && ids.includes(this.getSid)) {
        this.refreshUserInfo(this.getSid);
      }
    });
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateDesktopMode);
  },
  watch: {
    getSid(newSid) {
      this.refreshUserInfo(newSid);
    }
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getSid']),
    ...mapGetters('header', ['getHeaderStatus']),
    ...mapGetters('contact', ['getRosterList']),
    aliasName() {
      return this.userInfo.alias;
    },
    rosterName() {
      return this.userInfo.username;
    },
    nickName() {
      return this.userInfo.nick_name;
    },
    isDeletedUser() {
      return !!this.userInfo.is_deleted;
    },
    deletedUserStatusText() {
      return this.userInfo.deleted_status_text || this.$t('用户已注销');
    },
    profileTitle() {
      return this.aliasName || this.nickName || this.rosterName || this.userInfo.user_id || '';
    },
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    useDesktopFullLayout() {
      return this.getHeaderStatus === 'contact' || this.isDesktop;
    },
    isFriend() {
      const index = this.getRosterList.findIndex((x) => x.user_id === this.getSid);
      return index >= 0;
    },
    isSupportContact() {
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
    }
  },
  methods: {
    updateDesktopMode() {
      this.isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;
    },
    buildDeletedUserInfo(userId, err = {}) {
      const cachedInfo = this.$store.getters.im.rosterManage.getRosterInfo(userId) || {};
      const deletedStatusText = err.code === USER_NOT_EXIST_ERROR_CODE ? this.$t('用户不存在') : this.$t('用户已注销');
      return Object.assign({}, cachedInfo, {
        user_id: userId,
        is_deleted: true,
        deleted_status_text: deletedStatusText,
        avatar: this.$store.getters.im.sysManage.getImage({
          avatar: cachedInfo.avatar,
          type: 'roster'
        })
      });
    },
    refreshUserInfo(newSid) {
      this.$store.getters.im.rosterManage
        .asyncSearchRosterById({ user_id: newSid })
        .then((res) => {
          res.avatar = this.$store.getters.im.sysManage.getImage({
            avatar: res.avatar,
            type: 'roster'
          });
          this.userInfo = res;
        })
        .catch((err) => {
          if (err && [USER_NOT_EXIST_ERROR_CODE, DELETED_ROSTER_ERROR_CODE].includes(err.code)) {
            this.userInfo = this.buildDeletedUserInfo(newSid, err);
            return;
          }
          console.error('Failed to load roster info:', err);
        });
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
    chatRemoveHandler() {
      const expectedName = this.isDeletedUser ? `${this.userInfo.user_id || this.getSid || ''}` : this.rosterName || `${this.userInfo.user_id || ''}`;
      const confirmLabel = this.isDeletedUser ? this.$t('用户ID') : this.$t('用户名');
      this.$prompt(this.$t('请输入{label} {value} 以确认删除好友', { label: confirmLabel, value: expectedName }), this.$t('删除好友'), {
        confirmButtonText: this.$t('删除'),
        cancelButtonText: this.$t('common.cancel', { origin: '取消' }),
        inputPlaceholder: expectedName,
        inputValidator: (value) => {
          if ((value || '').trim() !== expectedName) {
            return this.$t('输入的{label}不匹配', { label: confirmLabel });
          }
          return true;
        }
      })
        .then(() => {
          this.$store.getters.im.rosterManage.asyncDeleteRoster({ user_id: this.getSid }).then(() => {
            const also_delete_other_devices = true;
            this.$store.getters.im.sysManage.deleteConversation(this.getSid, also_delete_other_devices);
            this.$store.dispatch('contact/actionGetConversationList');
            this.$store.dispatch('content/actionSetType', {
              sid: undefined,
              type: ''
            });
            this.$message.success(this.$t('好友已删除'));
          });
        })
        .catch(() => {});
    },
    addFriendHandler() {
      if (this.isDeletedUser) return;
      const { user_id } = this.userInfo;
      const alias = '';
      this.$store.getters.im.rosterManage.asyncApply({ user_id, alias }).then(() => {
        alert(this.$t('请求已发送成功!'));
      });
    },

    chatClickHandler() {
      if (this.isDeletedUser) return;
      this.$store
        .dispatch('content/actionEnsureConversationEntry', {
          sid: this.getSid,
          type: 'roster'
        })
        .finally(() => {
          this.$store.dispatch('contact/actionSetSkipConversationAutoSelectOnce', true);
          this.$store.dispatch('contact/actionGetConversationList');
          this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
          this.$store.dispatch('content/actionSetType', {
            sid: this.getSid,
            type: 'rosterchat'
          });
        });
    },

    setAlias() {
      if (this.isDeletedUser) return;
      const im = this.$store.getters.im;
      this.$prompt(this.$t('请输入备注名称'), this.$t('提示'), {
        confirmButtonText: this.$t('common.confirm', { origin: '确定' }),
        cancelButtonText: this.$t('common.cancel', { origin: '取消' })
      })
        .then(({ value }) => {
          if (!value) {
            value = '';
          }
          im.rosterManage.asyncUpdateRosterAlias({ user_id: this.userInfo.user_id, alias: value }).then(() => {
            this.refreshUserInfo(this.getSid);
            this.$message.success(this.$t('修改成功'));
          });
        })
        .catch(() => {});
    }
  }
};
</script>

<style scoped></style>
