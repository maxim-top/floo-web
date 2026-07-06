<template>
  <div :style="popupStyle" class="header_add_layer" @mouseenter="clearCloseTimer" @mouseleave="mouseLeave">
    <button class="header_add_item" type="button" @click="clickAddFriend">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="header_add_icon">
        <path d="M12 5v14M5 12h14"></path>
      </svg>
      <span>{{ $t('添加好友') }}</span>
    </button>
    <button class="header_add_item" type="button" @click="clickCreateGroup">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="header_add_icon">
        <path d="M8 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"></path>
        <path d="M16 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
        <path d="M4.5 18a4 4 0 0 1 7 0"></path>
        <path d="M13 18a3.5 3.5 0 0 1 6 0"></path>
      </svg>
      <span>{{ $t('新建群组') }}</span>
    </button>
    <button class="header_add_item" type="button" @click="clickJoinGroup">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="header_add_icon">
        <path d="M12 5v14"></path>
        <path d="M5 12h14"></path>
        <circle cx="12" cy="12" r="9"></circle>
      </svg>
      <span>{{ $t('加入群组') }}</span>
    </button>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

const clearGlobalAddpopCloseTimer = () => {
  if (typeof window === 'undefined') return;
  if (window.__lyAddpopCloseTimer) {
    clearTimeout(window.__lyAddpopCloseTimer);
    window.__lyAddpopCloseTimer = null;
  }
};

export default {
  name: 'contentIndex',
  data() {
    return {
      popupStyle: {}
    };
  },
  mounted() {
    this.updatePosition();
    window.addEventListener('resize', this.updatePosition);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
    this.clearCloseTimer();
  },
  components: {},
  computed: {
    ...mapGetters('layer', ['showing', 'showmask'])
  },
  methods: {
    updatePosition() {
      this.$nextTick(() => {
        const trigger = document.querySelector('.app-topbar.header .mobile_nav_button--add, .app-topbar.header .addBtn');
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        this.popupStyle = {
          top: rect.bottom + 8 + 'px',
          left: Math.max(12, rect.right - 168) + 'px'
        };
      });
    },
    clickAddFriend() {
      this.$store.dispatch('layer/actionSetShowing', 'addfriend');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },
    clickCreateGroup() {
      this.$store.dispatch('layer/actionSetShowing', 'creategroup');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },
    clickJoinGroup() {
      this.$store.dispatch('layer/actionSetShowing', 'joingroup');
      this.$store.dispatch('layer/actionSetShowmask', 'true');
    },

    clearCloseTimer() {
      clearGlobalAddpopCloseTimer();
    },

    scheduleClose() {
      this.clearCloseTimer();
      if (typeof window === 'undefined') return;
      window.__lyAddpopCloseTimer = setTimeout(() => {
        this.mouseLeave();
      }, 120);
    },

    mouseLeave() {
      this.clearCloseTimer();
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    }
  }
};
</script>

<style scoped></style>
