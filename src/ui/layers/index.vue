<template>
  <div class="layer_frame">
    <Addfriend v-if="getShowing == 'addfriend'" />
    <ChangeAppID v-if="getShowing == 'changeappid'" />
    <CreateGroup v-if="getShowing == 'creategroup'" />
    <JoinGroup v-if="getShowing == 'joingroup'" />
    <GroupSetting v-if="getShowing == 'groupsetting'" />
    <Qrcode v-if="getShowing == 'qrlogin'" />
    <Qrcode v-if="getShowing == 'qrprofile'" />
    <Qrcode v-if="getShowing == 'qrgroup'" />
    <Qrcode v-if="getShowing == 'qrwxmp'" />
    <Searcher />
    <AddPop v-if="getShowing == 'addpop'" />
    <Image2 v-if="getShowing == 'image'" />
    <Video v-if="getShowing == 'video'" />
    <VideoCall v-if="getShowing == 'videocall'" />
    <Audiocall v-if="getShowing == 'audiocall'" />
    <CallInvite v-if="getShowing == 'callinvite'" />
    <LinkLogin v-if="getShowing == 'linklogin'" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

import AddPop from './addpop';
import ChangeAppID from './changeappid';
import CreateGroup from './creategroup';
import JoinGroup from './joingroup';
import Addfriend from './addfriend';
import GroupSetting from './groupsetting';
import Searcher from './search';
import Qrcode from './qrcode';
import Image2 from './image2';
import Video from './video';
import VideoCall from './videocall';
import Audiocall from './audiocall.vue';
import CallInvite from './callinvite.vue';
import LinkLogin from './linklogin.vue';

export default {
  name: 'contentIndex',
  mounted() {},
  components: {
    AddPop,
    Addfriend,
    ChangeAppID,
    CreateGroup,
    JoinGroup,
    GroupSetting,
    Searcher,
    Qrcode,
    Image2,
    Video,
    VideoCall,
    Audiocall,
    CallInvite,
    LinkLogin
  },
  computed: {
    ...mapGetters('layer', ['getShowing'])
  },
  methods: {}
};
</script>

<style scoped></style>
