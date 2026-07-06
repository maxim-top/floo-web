<template>
  <div class="forward-routing-layer" v-if="getShowForwardList">
    <div class="forward-routing-layer__backdrop" @click="handleClose"></div>
    <div class="forward-routing-layer__dialog forward-target-panel forwardMemberList">
      <div class="forward-target-panel__header">
        <button class="forward-target-panel__close" type="button" @click="handleClose">{{ isMultiForward ? $t('返回') : $t('common.cancel', { origin: '取消' }) }}</button>
        <div class="forward-target-panel__titlewrap">
          <div class="forward-target-panel__title">{{ $t('转发到...') }}</div>
          <div class="forward-target-panel__subtitle">
            {{ isSending ? sendingText : summaryText }}
          </div>
        </div>
      </div>

      <div class="forward-target-panel__search">
        <input v-model.trim="keyword" type="text" :placeholder="$t('搜索最近会话、好友或群组')" />
      </div>

      <div class="forward-target-panel__nav">
        <button :class="{ 'forward-target-panel__navitem': true, 'is-active': activeSection === 'all' }" type="button" @click="activeSection = 'all'">{{ $t('全部') }}</button>
        <button :class="{ 'forward-target-panel__navitem': true, 'is-active': activeSection === 'recent' }" type="button" @click="activeSection = 'recent'">
          {{ $t('最近') }}
        </button>
        <button :class="{ 'forward-target-panel__navitem': true, 'is-active': activeSection === 'roster' }" type="button" @click="activeSection = 'roster'">
          {{ $t('好友') }}
        </button>
        <button :class="{ 'forward-target-panel__navitem': true, 'is-active': activeSection === 'group' }" type="button" @click="activeSection = 'group'">{{ $t('群组') }}</button>
      </div>

      <div class="forward-target-panel__list">
        <div class="forward-target-panel__empty" v-if="!visibleRecentTargets.length && !visibleRosterTargets.length && !visibleGroupTargets.length">
          {{ $t('没有可用的转发对象') }}
        </div>

        <div class="forward-target-panel__section" v-if="visibleRecentTargets.length">
          <div class="sep">
            <span class="name">{{ $t('最近会话') }}</span>
            <label class="forward-target-panel__section-toggle">
              <input ref="recentSectionToggle" type="checkbox" :checked="areAllTargetsSelected(recentTargets)" @change.stop="toggleSectionSelection('recent', $event)" />
            </label>
          </div>
          <div :key="`recent-${target.key}`" class="forwardItem forward-target-item" v-for="target in visibleRecentTargets" @click="toggleTarget(target)">
            <img :src="target.avatar" class="avatar" />
            <div class="forward-target-item__copy">
              <span class="name">{{ target.name }}</span>
              <span class="subtitle">{{ target.meta }}</span>
            </div>
            <div class="forward-target-item__sent" v-if="isSent(target.key)">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="forward-target-item__sent-icon">
                <path d="M6.5 12.5l3 3 8-8"></path>
              </svg>
              <span>{{ $t('已发送') }}</span>
            </div>
            <input v-else :checked="isSelected(target.key)" @click.stop @change="toggleTarget(target, $event)" type="checkbox" />
          </div>
        </div>

        <div class="forward-target-panel__section" v-if="visibleRosterTargets.length">
          <div class="sep">
            <span class="name">{{ $t('好友') }}</span>
            <label class="forward-target-panel__section-toggle">
              <input ref="rosterSectionToggle" type="checkbox" :checked="areAllTargetsSelected(rosterTargets)" @change.stop="toggleSectionSelection('roster', $event)" />
            </label>
          </div>
          <div :key="`roster-${target.key}`" class="forwardItem forward-target-item" v-for="target in visibleRosterTargets" @click="toggleTarget(target)">
            <img :src="target.avatar" class="avatar" />
            <div class="forward-target-item__copy">
              <span class="name">{{ target.name }}</span>
              <span class="subtitle">{{ target.meta }}</span>
            </div>
            <div class="forward-target-item__sent" v-if="isSent(target.key)">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="forward-target-item__sent-icon">
                <path d="M6.5 12.5l3 3 8-8"></path>
              </svg>
              <span>{{ $t('已发送') }}</span>
            </div>
            <input v-else :checked="isSelected(target.key)" @click.stop @change="toggleTarget(target, $event)" type="checkbox" />
          </div>
        </div>

        <div class="forward-target-panel__section" v-if="visibleGroupTargets.length">
          <div class="sep">
            <span class="name">{{ $t('群组') }}</span>
            <label class="forward-target-panel__section-toggle">
              <input ref="groupSectionToggle" type="checkbox" :checked="areAllTargetsSelected(groupTargets)" @change.stop="toggleSectionSelection('group', $event)" />
            </label>
          </div>
          <div :key="`group-${target.key}`" class="forwardItem forward-target-item" v-for="target in visibleGroupTargets" @click="toggleTarget(target)">
            <img :src="target.avatar" class="avatar" />
            <div class="forward-target-item__copy">
              <span class="name">{{ target.name }}</span>
              <span class="subtitle">{{ target.meta }}</span>
            </div>
            <div class="forward-target-item__sent" v-if="isSent(target.key)">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="forward-target-item__sent-icon">
                <path d="M6.5 12.5l3 3 8-8"></path>
              </svg>
              <span>{{ $t('已发送') }}</span>
            </div>
            <input v-else :checked="isSelected(target.key)" @click.stop @change="toggleTarget(target, $event)" type="checkbox" />
          </div>
        </div>
      </div>

      <div class="forward-target-panel__actions">
        <button class="forward-target-panel__cancel" type="button" @click="handleClose">{{ $t('common.cancel', { origin: '取消' }) }}</button>
        <button class="forward-target-panel__confirm" type="button" :disabled="!selectedTargets.length || isSending" @click="submitTargets">
          {{ $t('转发') }} ({{ selectedTargets.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'ForwardTargetPanel',
  data() {
    return {
      keyword: '',
      isSending: false,
      selectedTargets: [],
      activeSection: 'all',
      sentTargetStatus: {}
    };
  },
  mounted() {
    this.$store.dispatch('forward/actionGetForwardList');
  },
  computed: {
    ...mapGetters('forward', ['getRosterList', 'getGroupList', 'getShowForwardList', 'getMultiForwardMessages', 'getForwardMessage', 'getMessageForwardMaxUserNum']),
    ...mapGetters('contact', ['getConversationList']),
    isMultiForward() {
      return this.getMultiForwardMessages.length > 0;
    },
    summaryText() {
      const sentCount = this.sentTargetCount;
      if (this.isMultiForward) {
        if (sentCount) {
          return this.$t('已选择{messageCount}条消息，已发送{sentCount}个接收方，当前选中{selectedCount}/{maxCount}个', {
            messageCount: this.getMultiForwardMessages.length,
            sentCount,
            selectedCount: this.selectedTargets.length,
            maxCount: this.getMessageForwardMaxUserNum
          });
        }
        return this.$t('已选择{messageCount}条消息，当前选中{selectedCount}/{maxCount}个接收方', {
          messageCount: this.getMultiForwardMessages.length,
          selectedCount: this.selectedTargets.length,
          maxCount: this.getMessageForwardMaxUserNum
        });
      }
      if (this.getForwardMessage) {
        if (sentCount) {
          return this.$t('已发送{sentCount}个接收方，当前选中{selectedCount}/{maxCount}个', {
            sentCount,
            selectedCount: this.selectedTargets.length,
            maxCount: this.getMessageForwardMaxUserNum
          });
        }
        return this.$t('已选择{selectedCount}/{maxCount}个接收方', {
          selectedCount: this.selectedTargets.length,
          maxCount: this.getMessageForwardMaxUserNum
        });
      }
      return this.$t('选择接收方');
    },
    sendingText() {
      return this.isMultiForward ? this.$t('正在批量转发...') : this.$t('正在转发...');
    },
    visibleRecentTargets() {
      if (!['all', 'recent'].includes(this.activeSection)) return [];
      return this.filterTargets(this.recentTargets);
    },
    visibleRosterTargets() {
      if (!['all', 'roster'].includes(this.activeSection)) return [];
      return this.filterTargets(this.rosterTargets);
    },
    visibleGroupTargets() {
      if (!['all', 'group'].includes(this.activeSection)) return [];
      return this.filterTargets(this.groupTargets);
    },
    recentTargets() {
      const seen = new Set();
      return (this.getConversationList || [])
        .filter((item) => item && item.sid !== 0)
        .map((item) => {
          const isGroup = item.type === 'group';
          const type = isGroup ? 'group' : 'roster';
          const key = `${type}:${item.sid}`;
          if (seen.has(key)) return null;
          seen.add(key);
          return {
            key,
            id: item.sid,
            type,
            name: item.name,
            avatar: item.avatar,
            meta: isGroup ? this.$t('群会话') : this.$t('最近联系')
          };
        })
        .filter(Boolean);
    },
    rosterTargets() {
      return (this.getRosterList || []).map((item) => {
        return {
          key: `roster:${item.id}`,
          id: item.id,
          type: 'roster',
          name: item.name,
          avatar: item.avatar,
          meta: item.id
        };
      });
    },
    groupTargets() {
      return (this.getGroupList || []).map((item) => {
        return {
          key: `group:${item.id}`,
          id: item.id,
          type: 'group',
          name: item.name,
          avatar: item.avatar,
          meta: item.id
        };
      });
    },
    allTargets() {
      const targetMap = {};
      this.recentTargets.concat(this.rosterTargets, this.groupTargets).forEach((item) => {
        if (!item || !item.key || targetMap[item.key]) return;
        targetMap[item.key] = item;
      });
      return Object.keys(targetMap).map((key) => targetMap[key]);
    },
    sentTargetCount() {
      return Object.keys(this.sentTargetStatus).filter((key) => this.sentTargetStatus[key] === 'sent').length;
    }
  },
  methods: {
    filterTargets(list = []) {
      const query = (this.keyword || '').toLowerCase();
      if (!query) return list;
      return list.filter((item) => `${item.name || ''} ${item.meta || ''} ${item.id || ''}`.toLowerCase().indexOf(query) > -1);
    },
    getSectionTargets(section) {
      if (section === 'recent') return this.recentTargets;
      if (section === 'roster') return this.rosterTargets;
      if (section === 'group') return this.groupTargets;
      return [];
    },
    getSelectableTargets(targets = []) {
      return targets.filter((item) => !this.isSent(item.key));
    },
    isSelected(key) {
      return this.selectedTargets.some((item) => item.key === key);
    },
    isSent(key) {
      return this.sentTargetStatus[key] === 'sent';
    },
    areAllTargetsSelected(targets = []) {
      const selectableTargets = this.getSelectableTargets(targets);
      return !!selectableTargets.length && selectableTargets.every((item) => this.isSelected(item.key));
    },
    toggleTarget(target, event) {
      if (!target || this.isSending) return;
      if (this.isSent(target.key)) {
        if (event && event.target) {
          event.target.checked = false;
        }
        return;
      }
      const index = this.selectedTargets.findIndex((item) => item.key === target.key);
      if (index >= 0) {
        const next = this.selectedTargets.slice();
        next.splice(index, 1);
        this.selectedTargets = next;
        return;
      }
      if (this.selectedTargets.length >= this.getMessageForwardMaxUserNum) {
        if (event && event.target) {
          event.target.checked = false;
        }
        this.$message.warning(this.$t('本次最多选择{count}个接收方', { count: this.getMessageForwardMaxUserNum }));
        return;
      }
      this.selectedTargets = this.selectedTargets.concat(target);
    },
    toggleSectionSelection(section, event) {
      if (this.isSending) return;
      const targets = this.getSelectableTargets(this.getSectionTargets(section));
      if (!targets.length) return;
      const checked = event && event.target ? event.target.checked : !this.areAllTargetsSelected(targets);

      if (!checked) {
        const sectionTargetKeys = new Set(targets.map((item) => item.key));
        this.selectedTargets = this.selectedTargets.filter((item) => !sectionTargetKeys.has(item.key));
        return;
      }

      const selectedKeySet = new Set(this.selectedTargets.map((item) => item.key));
      const unselectedTargets = targets.filter((item) => !selectedKeySet.has(item.key));
      const remainingCount = this.getMessageForwardMaxUserNum - this.selectedTargets.length;

      if (remainingCount <= 0) {
        this.$message.warning(this.$t('本次最多选择{count}个接收方', { count: this.getMessageForwardMaxUserNum }));
        return;
      }

      const nextTargets = unselectedTargets.slice(0, remainingCount);
      this.selectedTargets = this.selectedTargets.concat(nextTargets);

      if (nextTargets.length < unselectedTargets.length) {
        this.$message.warning(this.$t('本次最多选择{count}个接收方，已为你选择可添加的对象', { count: this.getMessageForwardMaxUserNum }));
      }
    },
    resetPanelState() {
      this.keyword = '';
      this.isSending = false;
      this.selectedTargets = [];
      this.activeSection = 'all';
      this.sentTargetStatus = {};
      this.resetSectionToggleState();
    },
    resetSectionToggleState() {
      this.$nextTick(() => {
        ['recentSectionToggle', 'rosterSectionToggle', 'groupSectionToggle'].forEach((refName) => {
          const input = this.$refs[refName];
          if (input) {
            input.checked = false;
          }
        });
      });
    },
    handleClose() {
      this.resetPanelState();
      if (this.isMultiForward) {
        this.$store.dispatch('forward/actionBackToMessageSelection');
        return;
      }
      this.$store.dispatch('forward/actionCancelForward');
    },
    async submitTargets() {
      if (!this.selectedTargets.length || this.isSending) return;
      if (this.isMultiForward && !this.getMultiForwardMessages.length) {
        this.$message.error(this.$t('请选择要转发的消息'));
        return;
      }
      if (!this.isMultiForward && !this.getForwardMessage) {
        this.$message.error(this.$t('没有可转发的消息'));
        return;
      }

      const targetsToSend = this.selectedTargets.filter((target) => !this.isSent(target.key));
      if (!targetsToSend.length) {
        this.$message.warning(this.$t('当前选择的接收方已发送完成'));
        this.selectedTargets = [];
        return;
      }

      this.isSending = true;
      for (const target of targetsToSend) {
        await this.$store.dispatch('forward/actionSelectForwardTarget', {
          type: target.type,
          id: target.id
        });
        this.$set(this.sentTargetStatus, target.key, 'sent');
      }
      this.isSending = false;
      this.selectedTargets = [];
      this.resetSectionToggleState();
      const remainingCount = this.allTargets.length - this.sentTargetCount;
      if (remainingCount > 0) {
        this.$message.success(this.$t('本次转发完成，已发送{count}个接收方，可继续选择下一批', { count: this.sentTargetCount }));
      } else {
        this.$message.success(this.$t('全部接收方已发送完成，可手动关闭转发面板'));
      }
    }
  }
};
</script>

<style scoped></style>
