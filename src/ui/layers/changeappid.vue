<template>
  <div class="change_appid_layer">
    <div class="layer">
      <div class="layer_header">
        <span class="hint">{{ $t('请输入新的 AppID') }}</span>
        <button @click="close" class="closer" type="button" :aria-label="$t('关闭')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10"></path>
            <path d="M17 7L7 17"></path>
          </svg>
        </button>
      </div>
      <div class="layer_content">
        <div :class="{ iptFrame: true, 'appid-picker': true, 'appid-picker--open': showHistoryMenu }">
          <input @focus="showHistoryMenu = false" autocomplete="off" :placeholder="$t('AppID')" type="text" v-model="appID" />
          <button v-if="appID" @click="clearAppID" class="appid-picker-clear" type="button" :aria-label="$t('清空当前 AppID')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8l8 8"></path>
              <path d="M16 8l-8 8"></path>
            </svg>
          </button>
          <button :disabled="!appIDHistory.length" @click="toggleHistoryMenu" class="appid-picker-toggle" type="button" :aria-label="$t('显示历史 AppID')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 10l5 5 5-5"></path>
            </svg>
          </button>
          <div class="appid-history-menu" v-if="showHistoryMenu && appIDHistory.length">
            <button :key="historyAppID" @click="selectHistoryAppID(historyAppID)" class="appid-history-item" type="button" v-for="historyAppID in appIDHistory">
              {{ historyAppID }}
            </button>
          </div>
        </div>
      </div>
      <div class="layer_footer">
        <button @click="close" class="button-cancel" type="button">{{ $t('common.cancel', { origin: '取消' }) }}</button>
        <button @click="changeAppID" class="button-ok" type="button">{{ $t('common.confirm', { origin: '确定' }) }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'changeappid',
  data() {
    return {
      appID: '',
      appIDHistory: [],
      showHistoryMenu: false
    };
  },
  mounted() {
    this.loadAppIdHistory();
  },
  computed: {
    ...mapGetters('layer', ['getShowing', 'getShowmask', 'getAppID'])
  },
  watch: {
    getAppID: {
      handler(presentAppID) {
        this.appID = presentAppID;
        this.loadAppIdHistory();
        this.showHistoryMenu = false;
      },
      immediate: true
    }
  },
  methods: {
    loadAppIdHistory() {
      const savedHistory = window.localStorage.getItem('lanying_im_appid_history') || '';
      if (!savedHistory) {
        this.appIDHistory = [];
        return;
      }
      try {
        const parsedHistory = JSON.parse(savedHistory);
        this.appIDHistory = Array.isArray(parsedHistory) ? parsedHistory.filter((item) => `${item || ''}`.trim()) : [];
      } catch (ex) {
        console.error('Can not parse appid history: ', savedHistory);
        this.appIDHistory = [];
      }
    },
    toggleHistoryMenu() {
      if (!this.appIDHistory.length) {
        return;
      }
      this.showHistoryMenu = !this.showHistoryMenu;
    },
    selectHistoryAppID(appID) {
      this.appID = appID;
      this.showHistoryMenu = false;
    },
    clearAppID() {
      this.appID = '';
      this.showHistoryMenu = false;
    },
    changeAppID() {
      console.log('changeAppID to', this.appID);
      this.appID = this.appID.replace(/\s*/g, '');
      if (!this.appID) {
        return;
      }
      this.showHistoryMenu = false;
      this.$store.dispatch('actionChangeAppID', this.appID);
      // this.$emit("appid-changed", this.appID);
      this.close();
    },
    close() {
      this.showHistoryMenu = false;
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    }
  }
};
</script>

<style scoped>
.change_appid_layer .layer {
  overflow: visible;
}

.appid-picker {
  position: relative;
}

.appid-picker input {
  padding-right: 88px;
}

.appid-picker-clear {
  position: absolute;
  top: 50%;
  right: 42px;
  width: 34px;
  height: 34px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #b1b8c6;
  transform: translateY(-50%);
  cursor: pointer;
}

.appid-picker-clear svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.appid-picker-clear:hover {
  color: #6b7280;
}

.appid-picker-toggle {
  position: absolute;
  top: 50%;
  right: 6px;
  width: 34px;
  height: 34px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #8e95a3;
  transform: translateY(-50%);
  cursor: pointer;
}

.appid-picker-toggle:disabled {
  cursor: default;
  opacity: 0.45;
}

.appid-picker-toggle svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.appid-picker--open .appid-picker-toggle svg {
  transform: rotate(180deg);
}

.appid-history-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(27, 31, 35, 0.08);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  z-index: 20;
}

.appid-history-item {
  width: 100%;
  border: 0;
  padding: 10px 12px;
  background: transparent;
  text-align: left;
  color: #1f2937;
  cursor: pointer;
}

.appid-history-item:hover {
  background: #f4f7fb;
}
</style>
