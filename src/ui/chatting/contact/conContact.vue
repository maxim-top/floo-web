<template>
  <div class="contact-root" ref="imgContainer">
    <div class="roster">
      <div @click="rosterTitleClick" class="header">好友 ({{ getRosterList.length }})</div>
      <div class="list" v-show="rosterShow">
        <div @click="touchRoster(roster.user_id)" class="item" v-bind:key="roster.user_id" v-for="roster in getRosterList">
          <img :src="roster.avatar" class="avatar" />
          <span class="name">{{ roster.nick_name || roster.username || roster.user_id }}</span>
        </div>
      </div>
    </div>
    <div class="group">
      <div @click="groupTitleClick" class="header">群组 ({{ getGroupList.length }})</div>
      <div class="list" v-show="groupShow">
        <div @click="touchGroup(group.group_id)" class="item" v-bind:key="group.group_id" v-for="group in getGroupList">
          <img :src="group.avatar" class="avatar" />
          <span class="name">{{ group.name }}</span>
        </div>
      </div>
    </div>
    <div v-if="showsupports" class="supports">
      <div @click="supportTitleClick" class="header">客服 ({{ staticList.length }})</div>
      <div class="list" v-show="supportShow">
        <div @click="touchSupport(roster.user_id)" class="item" v-bind:key="roster.user_id" v-for="roster in staticList">
          <img :src="roster.avatar" class="avatar" />
          <span class="name">{{ roster.nickname || roster.username || roster.user_id }}</span>
        </div>
      </div>
    </div>
    <div class="notice">
      <div @click="noticeTitleClick" class="header">系统消息</div>
      <div class="list" v-show="noticeShow">
        <div @click="noticeClick('rosterNotice')" class="item">
          <span class="name">好友申请</span>
        </div>
        <div @click="noticeClick('groupInviteNotice')" class="item">
          <span class="name">群邀请</span>
        </div>
        <div @click="noticeClick('grpupApplyNotice')" class="item">
          <span class="name">群申请</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  data() {
    return {
      groupShow: true,
      rosterShow: true,
      noticeShow: false,
      supportShow: true,
      showsupports: false,
      staticList: []
    };
  },
  mounted() {
    this.$store.dispatch('contact/actionLazyGetRosterList');
    this.$store.dispatch('contact/actionLazyGetGroupList');
    this.showsupports = this.getApp().retrieveAppId() == 'welovemaxim';
    if (this.showsupports) {
      this.asyncGetStatics();
    }
  },

  computed: {
    ...mapGetters('contact', ['getRosterList', 'getGroupList']),

    token() {
      return this.$store.getters.im.userManage.getToken();
    }
  },

  methods: {
    touchRoster(user_id) {
      this.$store.dispatch('content/actionSetType', {
        sid: user_id,
        type: 'rosterinfo'
      });
    },
    touchGroup(group_id) {
      this.$store.dispatch('content/actionPreOpenGroup', {
        sid: group_id
      });
      this.$store.dispatch('content/actionSetType', {
        sid: group_id,
        type: 'groupinfo'
      });
    },
    touchSupport(user_id) {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'conversation');
      this.$store.dispatch('content/actionSetType', {
        sid: user_id,
        type: 'rosterchat'
      });
    },
    noticeClick(n) {
      this.$store.dispatch('content/actionSetType', {
        type: n
      });
    },
    rosterTitleClick() {
      this.rosterShow = !this.rosterShow;
    },
    groupTitleClick() {
      this.groupShow = !this.groupShow;
    },
    supportTitleClick() {
      this.supportShow = !this.supportShow;
    },
    noticeTitleClick() {
      this.noticeShow = !this.noticeShow;
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
            sdefault: '/static/pages/image/r.png'
          });
          return x;
        });
        this.staticList = res;
      });
    }
    //finish
  }
};
</script>

<style scoped></style>
