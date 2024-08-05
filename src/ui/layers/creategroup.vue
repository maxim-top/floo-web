<template>
  <div class="create_group_layer">
    <div class="layer">
      <div class="layer_header">
        创建群
        <input @change="fileChangeHandler" ref="fileRef" type="file" />
        <div @click="clickCreateGroupCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content">
        <!-- <img src="/image/roster.png" class="avatar" @click="avatarClickHandler" /> -->
        <p class="inputer">
          <span>群名称</span>
          <input placeHolder="群名称，必填" type="text" v-model="name" />
        </p>
        <p class="inputer">
          <span>群描述</span>
          <input placeHolder="群描述" type="text" v-model="description" />
        </p>
        <p class="inputer">
          <span>是否公开</span>
          <i :class="['ispublic', type == 1 ? 'switcher_on' : 'switcher_off']" @click="switchTouched" id="publicType"></i>
        </p>
        <div class="create_group_member_List">
          <div :key="roster.roster_id" v-for="roster in getRosterList">
            {{ roster.username }}
            <input :checked="selectedList.findIndex((x) => x === roster.user_id) >= 0" @click="checkChangeHandler(roster)" name="Fruit" type="checkbox" />
          </div>
        </div>
      </div>
      <div class="layer_footer">
        <span @click="createClickHandler" class="button-ok">创建</span>
        <span @click="clickCreateGroupCloseHandler" class="button-cancel">取消</span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  data() {
    return {
      avatar: '',
      description: '',
      name: '',
      type: 0,
      selectedList: [],
      roster_list: []
    };
  },
  name: 'contentIndex',
  mounted() {},
  components: {},
  computed: {
    ...mapGetters('contact', ['getRosterList']),
    token() {
      return this.$store.getters.im.userManage.getToken();
    }
  },
  methods: {
    avatarClickHandler() {
      // this.$refs.fileRef.click();
    },
    clickCreateGroupCloseHandler() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },

    fileChangeHandler(e) {
      // 此处暂时用不到，等用到了再修改 上传...
      const file = e.target.files[0];
      const token = this.$store.getters.im.userManage.getToken();
      this.$store.getters.im.sysManage
        .asyncGetGroupAvatarUploadUrl({
          group_id: this.getSid,
          'access-token': token
        })
        .then((res) => {
          let param = new FormData();
          param.append('OSSAccessKeyId', res.oss_body_param.OSSAccessKeyId);
          param.append('policy', res.oss_body_param.policy);
          param.append('signature', res.oss_body_param.signature);
          param.append('callback', res.oss_body_param.callback);
          param.append('key', res.oss_body_param.key);
          param.append('file', file);
          let config = {
            headers: { 'Content-Type': 'multipart/form-data' }
          };
          this.axios.post(res.upload_url, param, config).then(() => {
            this.$refs.fileRef.value = '';
            this.avatar = res.download_url;
          });
        })
        .catch(() => {
          this.$refs.fileRef.value = '';
        });
    },

    switchTouched() {
      this.type = this.type === 0 ? 1 : 0;
    },
    createClickHandler() {
      if (!this.name) {
        alert('请输入用户名');
        return;
      }
      this.$store.getters.im.groupManage
        .asyncCreate({
          name: this.name,
          type: this.type,
          avatar: this.avatar,
          description: this.description,
          user_list: this.selectedList
        })
        .then(() => {
          alert('群创建成功');
          this.clickCreateGroupCloseHandler();
        });
    },

    checkChangeHandler(roster) {
      const { user_id } = roster;
      let list = [].concat(this.selectedList);
      const index = list.findIndex((x) => x === user_id);
      if (index >= 0) {
        list.splice(index, 0);
      } else {
        list.push(user_id);
      }
      this.selectedList = list;
    }

    //finish
  }
};
</script>

<style scoped></style>
