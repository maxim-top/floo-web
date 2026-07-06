<template>
  <div class="contact-root" ref="imgContainer">
    <div class="contact-sticky-header">
      <div class="contact-search-shell">
        <svg class="contact-search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6"></circle>
          <path d="M20 20l-4.2-4.2"></path>
        </svg>
        <input :value="getSearchKeyword" @input="handleSearch" :placeholder="$t('搜索联系人')" type="text" />
      </div>
      <div class="contact-segments">
        <button @click="setActiveCategory('friends')" :class="{ 'is-active': activeCategory === 'friends' }" class="contact-segment" type="button">
          <span class="contact-segment__label">{{ $t('好友') }}</span>
          <span class="contact-segment__count">{{ filteredRosterList.length }}</span>
        </button>
        <button @click="setActiveCategory('groups')" :class="{ 'is-active': activeCategory === 'groups' }" class="contact-segment" type="button">
          <span class="contact-segment__label">{{ $t('群组') }}</span>
          <span class="contact-segment__count">{{ filteredGroupList.length }}</span>
        </button>
        <button @click="setActiveCategory('support')" :class="{ 'is-active': activeCategory === 'support' }" class="contact-segment" type="button">
          <span class="contact-segment__label">{{ $t('客服') }}</span>
          <span class="contact-segment__count">{{ filteredSupportList.length }}</span>
        </button>
      </div>
    </div>
    <transition name="contact-fade" mode="out-in">
      <div :key="activeCategory" class="contact-list-panel">
        <div v-if="activeCategory === 'friends'" class="roster">
          <EmptyState
            v-if="!friendQuickLinks.length && !filteredRosterList.length"
            variant="contact"
            :title="$t('找到你的联系人')"
            :description="$t('你的好友和群组会显示在这里。可以尝试搜索，或邀请用户建立联系。')"
            compact
          />
          <div v-else class="list">
            <div @click="openNoticeView(entry.type)" class="item contact-item contact-item--notice" v-bind:key="entry.key" v-for="entry in friendQuickLinks">
              <div class="contact-avatar-shell contact-avatar-shell--notice">
                <span class="contact-notice-icon" aria-hidden="true" v-html="entry.icon"></span>
              </div>
              <div class="contact-copy">
                <span class="name">{{ entry.title }}</span>
                <span class="subtitle">{{ entry.subtitle }}</span>
              </div>
            </div>
            <div @click="touchRoster(roster.user_id)" class="item contact-item contact-item--friend" v-bind:key="roster.user_id" v-for="roster in filteredRosterList">
              <div class="contact-avatar-shell">
                <img :src="roster.avatar" class="avatar" />
              </div>
              <div class="contact-copy">
                <span class="name">{{ roster.alias || roster.nick_name || roster.username || roster.user_id }}</span>
                <span class="subtitle">{{ roster.username || roster.user_id }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="activeCategory === 'groups'" class="group">
          <EmptyState
            v-if="!groupQuickLinks.length && !filteredGroupList.length"
            variant="contact"
            :title="$t('找到你的联系人')"
            :description="$t('你的好友和群组会显示在这里。可以尝试搜索，或邀请用户建立联系。')"
            compact
          />
          <div v-else class="list">
            <div @click="openNoticeView(entry.type)" class="item contact-item contact-item--notice" v-bind:key="entry.key" v-for="entry in groupQuickLinks">
              <div class="contact-avatar-shell contact-avatar-shell--notice">
                <span class="contact-notice-icon" aria-hidden="true" v-html="entry.icon"></span>
              </div>
              <div class="contact-copy">
                <span class="name">{{ entry.title }}</span>
                <span class="subtitle">{{ entry.subtitle }}</span>
              </div>
            </div>
            <div @click="touchGroup(group.group_id)" class="item contact-item contact-item--group" v-bind:key="group.group_id" v-for="group in filteredGroupList">
              <div class="contact-avatar-shell">
                <img :src="group.avatar" class="avatar" />
              </div>
              <div class="contact-copy">
                <span class="name">{{ group.name }}</span>
                <span class="subtitle">{{ formatGroupSubtitle(group) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="activeCategory === 'support'" class="supports">
          <EmptyState
            v-if="!filteredSupportList.length"
            variant="contact"
            :title="$t('客服已准备就绪')"
            :description="$t('当该应用提供客服联系人时，会在这里显示对应的联系人。')"
            compact
          />
          <div v-else class="list">
            <div @click="touchSupport(roster.user_id)" class="item contact-item contact-item--support" v-bind:key="roster.user_id" v-for="roster in filteredSupportList">
              <div class="contact-avatar-shell">
                <img :src="roster.avatar" class="avatar" />
              </div>
              <div class="contact-copy">
                <span class="name">{{ roster.nickname || roster.username || roster.user_id }}</span>
                <span class="subtitle">{{ formatSupportSubtitle(roster) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import EmptyState from '../../components/emptyState';

export default {
  components: {
    EmptyState
  },
  data() {
    return {
      activeCategory: 'support',
      staticList: []
    };
  },
  mounted() {
    this.$store.dispatch('contact/actionLazyGetRosterList');
    this.$store.dispatch('contact/actionLazyGetGroupList');
    this.asyncGetStatics();
    this.ensureActiveCategory();
    this.ensureActiveContact();
  },

  computed: {
    ...mapGetters('contact', ['getRosterList', 'getGroupList', 'getSearchKeyword', 'getSkipAutoSelectOnce']),
    ...mapGetters('content', ['getSid', 'getViewType']),
    ...mapGetters('header', ['getHeaderStatus']),
    filteredRosterList() {
      const keyword = (this.getSearchKeyword || '').trim().toLowerCase();
      if (!keyword) return this.getRosterList;
      return this.getRosterList.filter((roster) => {
        const text = `${roster.alias || ''} ${roster.nick_name || ''} ${roster.username || ''} ${roster.user_id || ''}`.toLowerCase();
        return text.indexOf(keyword) > -1;
      });
    },
    filteredGroupList() {
      const keyword = (this.getSearchKeyword || '').trim().toLowerCase();
      if (!keyword) return this.getGroupList;
      return this.getGroupList.filter((group) => {
        const text = `${group.name || ''} ${group.group_id || ''}`.toLowerCase();
        return text.indexOf(keyword) > -1;
      });
    },
    filteredSupportList() {
      const keyword = (this.getSearchKeyword || '').trim().toLowerCase();
      if (!keyword) return this.staticList;
      return this.staticList.filter((roster) => {
        const text = `${roster.nickname || ''} ${roster.username || ''} ${roster.user_id || ''}`.toLowerCase();
        return text.indexOf(keyword) > -1;
      });
    },
    friendQuickLinks() {
      const locale = this.$i18n.locale;
      const keyword = (this.getSearchKeyword || '').trim().toLowerCase();
      const entries = [
        {
          key: 'system-message',
          title: this.$t('系统消息'),
          subtitle: this.$t('查看系统通知与服务消息'),
          type: 'systemNotice',
          icon: '<svg viewBox="0 0 24 24"><path d="M5 6.5h14v8H8l-3 3v-11z"></path></svg>'
        },
        {
          key: 'friend-applications',
          title: this.$t('好友申请'),
          subtitle: this.$t('处理新的好友申请请求'),
          type: 'rosterNotice',
          icon: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>'
        }
      ];
      void locale;
      if (!keyword) return entries;
      return entries.filter((entry) => `${entry.title} ${entry.subtitle}`.toLowerCase().indexOf(keyword) > -1);
    },
    groupQuickLinks() {
      const locale = this.$i18n.locale;
      const keyword = (this.getSearchKeyword || '').trim().toLowerCase();
      const entries = [
        {
          key: 'group-invitations',
          title: this.$t('群邀请'),
          subtitle: this.$t('查看并处理收到的入群邀请'),
          type: 'groupInviteNotice',
          icon: '<svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path><circle cx="12" cy="12" r="9" opacity=".35"></circle></svg>'
        },
        {
          key: 'group-applications',
          title: this.$t('群申请'),
          subtitle: this.$t('审核成员加入群组的申请'),
          type: 'grpupApplyNotice',
          icon: '<svg viewBox="0 0 24 24"><path d="M12 5v8"></path><path d="M9 10l3 3 3-3"></path><rect x="5" y="4" width="14" height="16" rx="3" opacity=".35"></rect></svg>'
        }
      ];
      void locale;
      if (!keyword) return entries;
      return entries.filter((entry) => `${entry.title} ${entry.subtitle}`.toLowerCase().indexOf(keyword) > -1);
    },

    token() {
      return this.$store.getters.im.userManage.getToken();
    }
  },

  watch: {
    getRosterList() {
      this.ensureActiveCategory();
      this.ensureActiveContact();
    },
    getGroupList() {
      this.ensureActiveCategory();
      this.ensureActiveContact();
    },
    getSid(newSid) {
      if (newSid === undefined || newSid === null || newSid === '' || newSid === -1) {
        this.ensureActiveContact();
      }
    },
    getHeaderStatus() {
      if (this.getHeaderStatus !== 'contact' && this.getSkipAutoSelectOnce) {
        this.$store.dispatch('contact/actionSetSkipAutoSelectOnce', false);
      }
      this.ensureActiveContact();
    },
    getViewType() {
      this.ensureActiveContact();
    },
    staticList() {
      this.ensureActiveCategory();
      this.ensureActiveContact();
    },
    getSearchKeyword() {
      this.ensureActiveCategory();
    }
  },

  methods: {
    ensureActiveCategory() {
      this.$nextTick(() => {
        const options = [
          { key: 'support', list: this.filteredSupportList },
          { key: 'friends', list: this.filteredRosterList },
          { key: 'groups', list: this.filteredGroupList }
        ];

        const current = options.find((item) => item.key === this.activeCategory);
        if (current && current.list && current.list.length) {
          return;
        }

        const firstNonEmpty = options.find((item) => item.list && item.list.length);
        if (firstNonEmpty) {
          this.activeCategory = firstNonEmpty.key;
        }
      });
    },

    ensureActiveContact() {
      this.$nextTick(() => {
        if (window.innerWidth <= 768) return;
        if (this.getHeaderStatus !== 'contact') return;
        if (this.getSkipAutoSelectOnce) {
          return;
        }
        if (['rosterNotice', 'systemNotice', 'groupInviteNotice', 'grpupApplyNotice'].includes(this.getViewType)) {
          return;
        }
        if (['rosterinfo', 'groupinfo', 'rosterchat'].includes(this.getViewType) && this.getSid !== -1) {
          return;
        }

        const firstRoster = this.filteredRosterList && this.filteredRosterList[0];
        if (firstRoster) {
          this.touchRoster(firstRoster.user_id);
          return;
        }

        const firstGroup = this.filteredGroupList && this.filteredGroupList[0];
        if (firstGroup) {
          this.touchGroup(firstGroup.group_id);
        }
      });
    },
    touchRoster(user_id) {
      this.$store.dispatch('contact/actionSetSkipAutoSelectOnce', false);
      this.$store.dispatch('content/actionSetType', {
        sid: user_id,
        type: 'rosterinfo'
      });
    },
    touchGroup(group_id) {
      this.$store.dispatch('contact/actionSetSkipAutoSelectOnce', false);
      this.$store.dispatch('content/actionPreOpenGroup', {
        sid: group_id
      });
      this.$store.dispatch('content/actionSetType', {
        sid: group_id,
        type: 'groupinfo'
      });
    },
    touchSupport(user_id) {
      this.$store.dispatch('contact/actionSetSkipAutoSelectOnce', false);
      this.$store.dispatch('content/actionSetType', {
        sid: user_id,
        type: 'rosterinfo'
      });
    },
    openNoticeView(n) {
      this.$store.dispatch('content/actionSetType', {
        type: n
      });
    },
    setActiveCategory(category) {
      this.activeCategory = category;
    },
    handleSearch(e) {
      this.$store.dispatch('contact/actionSetSearchkeyword', e.target.value);
    },
    getApp() {
      return this.$parent.$parent.$parent;
    },
    asyncGetStatics: function () {
      const im = this.getApp().getIM();
      im.sysManage.asyncGetStaticContact().then((res) => {
        res = res.map((x) => {
          x.avatar = im.sysManage.getImage({
            avatar: x.avatar,
            sdefault: '/image/roster.png'
          });
          return x;
        });
        this.staticList = res;
      });
    },
    formatGroupSubtitle(group) {
      const count = group.member_count || group.memberCount || group.members_count || group.total_member_count;
      if (count || count === 0) {
        return this.$t('{count} 位成员', { count });
      }
      return group.group_id || '';
    },
    formatSupportSubtitle(roster) {
      const source = (roster && roster.source) || 'official';
      if (source === 'chatbot') {
        return this.$t('智能消息');
      }
      if (source === 'clawchat') {
        return this.$t('龙虾会话');
      }
      return this.$t('官方客服');
    }
    //finish
  }
};
</script>

<style scoped></style>
