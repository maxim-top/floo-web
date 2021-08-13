<template>
  <div @mouseleave="mouseLeave" class="search_result_layer" v-if="getSearchKeyword !== ''">
    <div class="header">搜索用户结果</div>
    <div class="list">
      <div :key="r.id" @click="rosterClick(r.id)" class="item" v-for="r in rarr">
        <img :src="r.avatar" class="avatar" />
        <div class="name" v-html="r.name"></div>
        <div class="last_msg" v-html="r.content"></div>
      </div>
    </div>
    <div class="header">搜索群结果</div>
    <div class="list">
      <div :key="r.id" @click="groupClick(r.id)" class="item" v-for="r in garr">
        <img :src="r.avatar" class="avatar" />
        <div class="name" v-html="r.name"></div>
        <div class="last_msg" v-html="r.content"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'rosterInfo',
  data() {
    return {
      garr: [],
      rarr: []
    };
  },
  mounted() {
    this.makeSearch();
  },
  components: {},
  computed: {
    ...mapGetters('contact', ['getSearchKeyword']),
    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    im() {
      return this.$store.getters.im;
    }
  },
  methods: {
    makeSearch() {
      if (this.getSearchKeyword) {
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
