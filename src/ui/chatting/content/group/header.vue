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
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'GroupChat',
  data() {
    return {
      showMobileMenu: false
    };
  },
  mounted() {
    document.addEventListener('click', this.closeMobileMenu);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeMobileMenu);
  },
  components: {},
  computed: {
    ...mapGetters('content', ['getGroupInfo', 'getSid']),
    ...mapGetters('forward', ['getShowMultiForwardStatus']),
    groupName() {
      let name = this.getGroupInfo.name;
      if (!name) {
        this.$store.dispatch('content/actionUpdateGroup');
      }
      return name;
    }
  },
  methods: {
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
