<template>
  <div class="user_setting profile_panel group_profile_panel profile-container support_profile_panel">
    <div class="profile_panel_header">
      <span class="profile_panel_header_spacer" aria-hidden="true"></span>
      <div class="profile_panel_header_title">{{ $t('群资料') }}</div>
      <span class="profile_panel_header_spacer" aria-hidden="true"></span>
    </div>
    <div class="profile_panel_card">
      <div class="profile_panel_hero">
        <input @change="fileChangeHandler" ref="fileRef" type="file" />
        <div class="avatar">
          <img :src="groupInfo.avatar" @click="touchedAvatar" class="av" />
          <img @click="viewQrcode" class="qrcode" src="/image/qr.png" v-if="groupInfo.member_invite" />
        </div>
        <div class="profile_panel_name">{{ groupInfo.name }}</div>
        <div class="profile_panel_subtext">{{ groupSubtext }}</div>
      </div>

      <div class="profile_panel_actions">
        <button class="profile_action" type="button" @click="chatClickHandler">
          <span class="profile_action_icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 6.5h14v8H8l-3 3v-11z"></path>
            </svg>
          </span>
          <span class="profile_action_label">{{ $t('消息') }}</span>
        </button>
        <button class="profile_action" type="button" @click="viewQrcode" v-if="groupInfo.member_invite">
          <span class="profile_action_icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2h4zM14 18h2v2h-2z"></path>
            </svg>
          </span>
          <span class="profile_action_label">{{ $t('二维码') }}</span>
        </button>
        <button class="profile_action" type="button" @click="nameModifyHandler">
          <span class="profile_action_icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 17.5V20h2.5L18 8.5 15.5 6 4 17.5z"></path>
            </svg>
          </span>
          <span class="profile_action_label">{{ $t('编辑') }}</span>
        </button>
      </div>

      <div class="profile_panel_section">
        <div class="line line--interactive" @click="nameModifyHandler">
          <span class="ll">{{ $t('群名称') }}</span>
          <p class="lr">{{ groupInfo.name }}</p>
        </div>

        <div class="line">
          <span class="ll">{{ $t('群ID') }}</span>
          <p class="lr">{{ getSid }}</p>
        </div>

        <div class="line line--interactive" @click="descriptionModifyHanderl">
          <span class="ll">{{ $t('群描述') }}</span>
          <p class="lr">{{ groupInfo.description || '-' }}</p>
        </div>

        <div class="line line--interactive" @click="cardModifyHandler">
          <span class="ll">{{ $t('群名片') }}</span>
          <p class="lr">{{ cardName || '-' }}</p>
        </div>
      </div>

      <div class="profile_panel_footer_actions">
        <button @click="destroyClickHandler" class="logout" type="button">
          {{ dismissMessage }}
        </button>
        <button @click="chatClickHandler" class="logout logout-secondary" type="button">{{ $t('开始聊天') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { withDisplayGroupAvatar } from '../../../utils/groupAvatar';

export default {
  name: 'groupInfo',
  data() {
    return {
      groupInfo: {},
      cardName: '',
      pendingGroupInfoSid: null
    };
  },
  mounted() {
    this.refreshGroupInfo(this.getSid);

    this.$store.getters.im.on('onGroupListUpdate', () => {
      this.$store.dispatch('contact/actionSyncGroupList');
    });

    this.$store.getters.im.on('onGroupMemberChanged', (group_id) => {
      if (`${group_id}` === `${this.getSid}`) {
        this.refreshGroupMembers(group_id);
      }
    });
  },
  watch: {
    getSid(newSid) {
      this.refreshGroupInfo(newSid);
    }
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getGroupInfo', 'getSid', 'getAdminList', 'getMemberList']),

    token() {
      return this.$store.getters.im.userManage.getToken();
    },

    group_id() {
      return this.getGroupInfo.group_id;
    },

    owner_id() {
      return this.getGroupInfo.owner_id;
    },
    isAdmin() {
      const uid = this.$store.getters.im.userManage.getUid();
      return this.getAdminList.filter((x) => x.user_id === uid).length > 0 || this.getGroupInfo.member_modify;
    },
    isOwner() {
      const uid = this.$store.getters.im.userManage.getUid();
      return this.getGroupInfo.owner_id === uid;
    },
    dismissMessage() {
      return this.isOwner ? this.$t('解散') : this.$t('group.quit', { origin: '退出' });
    },
    groupSubtext() {
      return this.$t('{count} 位成员', { count: this.getMemberList.length || 0 });
    }
  },
  methods: {
    syncGroupAvatarToLists(groupId) {
      if (typeof groupId === 'undefined' || groupId === null || groupId === '') {
        return;
      }
      this.$store.dispatch('contact/actionRefreshGroupAvatar', groupId);
    },
    refreshGroupAvatarDisplay(groupId) {
      if (typeof groupId === 'undefined' || groupId === null || groupId === '' || `${groupId}` !== `${this.getSid}`) {
        return;
      }
      const groupMap = this.$store.getters.im.groupManage.getAllGroupDetail() || {};
      const latestGroup = groupMap[groupId] || groupMap[`${groupId}`] || {};
      const displayGroup = withDisplayGroupAvatar(this.$store.getters.im, latestGroup, {
        onUpdate: ({ group_id, avatar } = {}) => {
          if (`${group_id}` === `${this.getSid}`) {
            this.applyGeneratedAvatar(group_id, avatar);
          }
        }
      });
      const displayAvatar = this.$store.getters.im.sysManage.getImage({
        avatar: displayGroup.avatar,
        type: 'group'
      });
      this.groupInfo = Object.assign({}, this.groupInfo, latestGroup, {
        avatar: displayAvatar
      });
      this.syncGroupAvatarToLists(groupId);
    },
    applyGeneratedAvatar(groupId, avatar) {
      if (`${groupId}` !== `${this.getSid}`) {
        return;
      }
      const displayAvatar = this.$store.getters.im.sysManage.getImage({
        avatar,
        type: 'group'
      });
      this.groupInfo = Object.assign({}, this.groupInfo, {
        avatar: displayAvatar
      });
      this.syncGroupAvatarToLists(groupId);
    },
    refreshGroupMembers(groupId) {
      if (typeof groupId === 'undefined' || groupId === null || groupId === '' || `${groupId}` !== `${this.getSid}`) {
        return;
      }
      this.$store.dispatch('content/actionUpdateMemberList');
      this.refreshGroupAvatarDisplay(groupId);
    },
    refreshGroupInfo(newSid) {
      if (typeof newSid === 'undefined' || newSid === null || newSid === '' || Number(newSid) < 0) {
        this.groupInfo = {};
        this.cardName = '';
        this.pendingGroupInfoSid = null;
        return;
      }
      const targetSid = `${newSid}`;
      this.pendingGroupInfoSid = targetSid;
      const memberListPromise = this.$store.dispatch('content/actionFetchMemberList', newSid).catch(() => []);
      this.$store.dispatch('content/actionGetGroupAdminList', { sid: newSid });
      this.$store.getters.im.groupManage
        .asyncGetInfo({ group_id: newSid })
        .then((res) => {
          return memberListPromise.then((members) => ({
            members,
            res
          }));
        })
        .then(({ members, res }) => {
          if (this.pendingGroupInfoSid !== targetSid || `${this.getSid}` !== targetSid) {
            return;
          }
          res = withDisplayGroupAvatar(this.$store.getters.im, res, {
            onUpdate: ({ group_id, avatar } = {}) => {
              if (`${group_id}` === `${this.getSid}`) {
                this.applyGeneratedAvatar(group_id, avatar);
              }
            }
          });
          res.avatar = this.$store.getters.im.sysManage.getImage({
            avatar: res.avatar,
            type: 'group'
          });
          this.groupInfo = res;
          this.syncGroupAvatarToLists(targetSid);
          const uid = this.$store.getters.im.userManage.getUid();
          const memberList = Array.isArray(members) && members.length ? members : this.getMemberList;
          const user = memberList.find((x) => x.user_id === uid);
          this.cardName = (user && (user.display_name || user.name)) || '';
          if (!this.cardName) {
            this.$store.getters.im.groupManage
              .asyncGetMemberDisplayName({
                group_id: newSid,
                user_list: [uid]
              })
              .then((res) => {
                if (this.pendingGroupInfoSid !== targetSid || `${this.getSid}` !== targetSid) {
                  return;
                }
                if (!res || !res.length) {
                  return;
                }
                res.forEach((item) => {
                  this.cardName = item.display_name;
                });
              });
          }
        })
        .catch((ex) => {
          this.serr(ex);
        });
    },

    chatClickHandler() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('content/actionSetType', {
        sid: this.getSid,
        type: 'groupchat'
      });
    },
    touchedAvatar() {
      if (this.isAdmin || this.isOwner) {
        this.$refs.fileRef.click();
      }
    },

    fileChangeHandler(e) {
      const file = e.target.files[0];

      this.$store.getters.im.sysManage
        .asyncFileUpload({
          file,
          toType: 'groupAvatar',
          group_id: this.getSid,
          processCallback: function (res) {
            console.log('fileChangeHandler groupAvatar file upload percent :' + 100 * (res.loaded / res.total));
          }
        })
        .then((res) => {
          this.$refs.fileRef.value = '';
          this.updateAvatarUrl(res.url);
        })
        .catch(() => {
          this.$refs.fileRef.value = '';
        });
    },

    updateAvatarUrl(url) {
      this.$store.getters.im.groupManage
        .asyncUpdateAvatar({
          group_id: this.getSid,
          value: url
        })
        .then(() => {
          return this.$store.dispatch('content/actionUpdateGroup', { force: true });
        })
        .then((groupInfo = {}) => {
          const displayAvatar = this.$store.getters.im.sysManage.getImage({
            avatar: groupInfo.avatar,
            type: 'group'
          });
          this.groupInfo = Object.assign({}, this.groupInfo, groupInfo, {
            avatar: displayAvatar
          });
          this.syncGroupAvatarToLists(this.getSid);
          this.$store.dispatch('contact/actionSyncGroupList');
          this.$store.dispatch('contact/actionGetConversationList');
          alert(this.$t('更新头像完成'));
        });
    },

    destroyClickHandler() {
      const title = this.isOwner ? this.$t('解散群组') : this.$t('group.quitTitle', { origin: '退出群组' });
      const message = this.isOwner ? this.$t('确认解散当前群组吗？此操作不可撤销。') : this.$t('group.quitConfirm', { origin: '确认退出当前群组吗？' });
      this.$confirm(message, title, {
        confirmButtonText: this.isOwner ? this.$t('解散') : this.$t('group.quit', { origin: '退出' }),
        cancelButtonText: this.$t('common.cancel', { origin: '取消' }),
        type: 'warning'
      })
        .then(() => {
          if (this.isOwner) {
            this.$store.getters.im.groupManage.asyncDestroy({ group_id: this.getSid }).then(() => {
              this.$message.success(this.$t('群组已解散'));
            });
          } else {
            this.$store.getters.im.groupManage.asyncLeave({ group_id: this.getSid }).then(() => {
              this.$message.success(this.$t('group.quitSuccess', { origin: '您已退出群组' }));
            });
          }

          const also_delete_other_devices = true;
          this.$store.getters.im.sysManage.deleteConversation(this.getSid, also_delete_other_devices);
        })
        .catch(() => {});
    },
    viewQrcode() {
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('layer/actionSetShowing', 'qrgroup');
    },
    nameModifyHandler() {
      if (!this.isAdmin && !this.isOwner && !this.getGroupInfo.member_modify) {
        return;
      }
      this.$prompt(this.$t('请输入群名称'), this.$t('提示'), {
        confirmButtonText: this.$t('common.confirm', { origin: '确定' }),
        cancelButtonText: this.$t('common.cancel', { origin: '取消' })
      })
        .then(({ value }) => {
          if (!value) return;
          this.$store.getters.im.groupManage
            .asyncUpdateName({
              group_id: this.getSid,
              value
            })
            .then(() => {
              this.name = value;
              alert(this.$t('修改成功'));
            });
        })
        .catch(() => {});
    },
    descriptionModifyHanderl() {
      if (!this.isAdmin && !this.isOwner && !this.getGroupInfo.member_modify) {
        return;
      }
      this.$prompt(this.$t('请输入群描述'), this.$t('提示'), {
        confirmButtonText: this.$t('common.confirm', { origin: '确定' }),
        cancelButtonText: this.$t('common.cancel', { origin: '取消' })
      })
        .then(({ value }) => {
          if (!value) return;
          this.$store.getters.im.groupManage
            .asyncUpdateDescription({
              group_id: this.getSid,
              value
            })
            .then(() => {
              this.description = value;
              alert(this.$t('修改成功'));
            });
        })
        .catch(() => {});
    },
    cardModifyHandler() {
      this.$prompt(this.$t('请输入群名片'), this.$t('提示'), {
        confirmButtonText: this.$t('common.confirm', { origin: '确定' }),
        cancelButtonText: this.$t('common.cancel', { origin: '取消' })
      })
        .then(({ value }) => {
          if (!value) return;
          this.$store.getters.im.groupManage
            .asyncUpdateDisplayName({
              group_id: this.getSid,
              value
            })
            .then(() => {
              this.$store.dispatch('content/actionUpdateMemberList');
              this.cardName = value;
              alert(this.$t('修改成功'));
            });
        })
        .catch(() => {});
    }
    //methods finish
  }
};
</script>

<style scoped>
.mt15 {
  margin-top: 15px !important;
}
</style>
