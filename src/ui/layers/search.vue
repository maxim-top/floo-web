<template>
  <div :style="popupStyle" @mouseleave="mouseLeave" class="search_result_layer" v-if="getSearchKeyword !== ''">
    <template v-if="hasResults">
      <div class="header">{{ $t('搜索用户结果') }}</div>
      <div class="list">
        <div :key="r.id" @click="rosterClick(r.id)" class="item" v-for="r in rarr">
          <img :src="r.avatar" class="avatar" />
          <div class="name" v-html="r.name"></div>
          <div class="last_msg" v-html="r.content"></div>
        </div>
      </div>
      <div class="header">{{ $t('搜索群结果') }}</div>
      <div class="list">
        <div :key="r.id" @click="groupClick(r.id)" class="item" v-for="r in garr">
          <img :src="r.avatar" class="avatar" />
          <div class="name" v-html="r.name"></div>
          <div class="last_msg" v-html="r.content"></div>
        </div>
      </div>
    </template>
    <EmptyState v-else variant="search" :title="$t('未找到匹配结果')" :description="$t('没有找到相关搜索结果，请检查输入内容，或尝试其他关键词。')" compact />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import EmptyState from '../components/emptyState';

export default {
  name: 'rosterInfo',
  components: {
    EmptyState
  },
  data() {
    return {
      garr: [],
      rarr: [],
      popupStyle: {}
    };
  },
  mounted() {
    this.makeSearch();
    this.updatePosition();
    window.addEventListener('resize', this.updatePosition);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
  },
  computed: {
    ...mapGetters('contact', ['getSearchKeyword']),
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    im() {
      return this.$store.getters.im;
    },
    hasResults() {
      return this.rarr.length > 0 || this.garr.length > 0;
    }
  },
  methods: {
    makeSearch() {
      if (this.getSearchKeyword) {
        this.updatePosition();
        const kw = this.getSearchKeyword;
        const ret = this.im.sysManage.makeSearch(kw);
        let { groupArr = [], rosterArr = [] } = ret;
        groupArr = groupArr.map((g) => {
          let { group_id, name, content = '' } = g;
          content = content.replace(kw, '<i class="red">' + kw + '</i>');
          name = name.replace(kw, '<i class="red">' + kw + '</i>');

          let avatar = g.avatar;
          avatar = this.im.sysManage.getImage({
            avatar,
            type: 'group'
          });
          const id = group_id - 0;
          return {
            id,
            name,
            content,
            avatar
          };
        });
        this.garr = [].concat(groupArr);

        rosterArr = rosterArr.map((r) => {
          let { user_id, username, avatar, content = '' } = r;
          avatar = this.im.sysManage.getImage({
            avatar,
            type: 'group'
          });
          const id = user_id - 0;
          content = content.replace(kw, '<i class="red">' + kw + '</i>');
          username = username.replace(kw, '<i class="red">' + kw + '</i>');
          return {
            id,
            name: username,
            content,
            avatar
          };
        });
        this.rarr = [].concat(rosterArr);
      }
    },
    rosterClick(rid) {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('contact/actionSetSearchkeyword', '');
      this.$store.dispatch('content/actionSetType', {
        sid: rid,
        type: 'rosterchat'
      });
    },
    groupClick(gid) {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('contact/actionSetSearchkeyword', '');
      this.$store.dispatch('content/actionSetType', {
        sid: gid,
        type: 'groupchat'
      });
    },
    mouseLeave() {
      this.$store.dispatch('contact/actionSetSearchkeyword', '');
    },
    updatePosition() {
      this.$nextTick(() => {
        const searchArea = document.querySelector('.app-topbar.header .searchArea');
        if (!searchArea) return;
        const rect = searchArea.getBoundingClientRect();
        this.popupStyle = {
          top: rect.bottom + 8 + 'px',
          left: rect.left + 'px',
          width: rect.width + 'px'
        };
      });
    }
  },
  watch: {
    getSearchKeyword(a, b) {
      if (a !== b) {
        this.makeSearch();
      }
    }
  }
};
</script>

<style scoped></style>
