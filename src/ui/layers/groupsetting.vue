<template>
  <div class="group_setting_layer">
    <div class="layer">
      <div class="layer_header">
        群设置
        <div @click="clickGroupsettingCloseHandler" class="closer"></div>
      </div>
      <div class="layer_content">
        <div class="group_setting_group">
          <p>
            <span class="sl">需要邀请才能入群</span>
            <span class="sr">
              <i :class="['r', groupInfo.member_invite ? 'switcher_on' : 'switcher_off']" @click="switchTouched(0)"></i>
            </span>
          </p>

          <p>
            <span class="sl">允许成员修改信息</span>
            <span class="sr">
              <i :class="['r', groupInfo.member_modify ? 'switcher_on' : 'switcher_off']" @click="switchTouched(1)"></i>
            </span>
          </p>

          <p>
            <span class="sl">开启群聊消息已读功能</span>
            <span class="sr">
              <i :class="['r', groupInfo.read_ack ? 'switcher_on' : 'switcher_off']" @click="switchTouched(2)"></i>
            </span>
          </p>

          <p>
            <span class="sl">允许成员查看历史消息</span>
            <span class="sr">
              <i :class="['r', groupInfo.history_visible ? 'switcher_on' : 'switcher_off']" @click="switchTouched(3)"></i>
            </span>
          </p>

          <p>
            <span class="sl">入群需要审批</span>
            <span class="sr">
              <i :class="['r', groupInfo.apply_approval ? 'switcher_on' : 'switcher_off']" @click="switchTouched(4)"></i>
            </span>
          </p>

          <p>
            <span class="sl">屏蔽此群消息</span>
            <span class="sr">
              <i :class="['r', groupInfo.msg_mute_mode ? 'switcher_on' : 'switcher_off']" @click="switchTouched(5)"></i>
            </span>
          </p>

          <p>
            <span class="sl">全员禁言</span>
            <span class="sr">
              <i :class="['r', isGroupBanAll() ? 'switcher_on' : 'switcher_off']" @click="switchTouched(6)"></i>
            </span>
          </p>

          <p>
            <span class="sl">隐藏群成员信息</span>
            <span class="sr">
              <i :class="['r', groupInfo.hide_member_info ? 'switcher_on' : 'switcher_off']" @click="switchTouched(7)"></i>
            </span>
          </p>
        </div>
        <div class="group_setting_group">
          <div class="category">
            <a @click="touchedListHeader(0)">成员</a>
            <a @click="touchedListHeader(1)">禁言</a>
            <a @click="touchedListHeader(2)">黑名单</a>
            <a @click="touchedListHeader(3)">公告</a>
            <a @click="touchedListHeader(4)">文件</a>
            <a @click="touchedListHeader(5)">添加成员</a>
          </div>
          <div class="setting_lists" v-if="listTab === 0">
            <p>请选择成员进行操作</p>
            <div :key="p.user_id" class="item" v-for="p in memberList">
              <span>
                {{ p.user_name }}
                {{ adminList.indexOf(p.user_id) >= 0 ? '(管理员)' : '' }}
              </span>
              <input :checked="selIdList.indexOf(p.user_id) >= 0" @click="touchMemberCheck(p.user_id)" type="checkbox" />
            </div>
            <p v-if="this.memberList.length"></p>
            <div class="category">
              <a @click="kickMember">踢出群</a>
              <a @click="addBlockList">拉黑</a>
              <a @click="removeAdminMember" v-if="userLevel === 3">删除管理</a>
              <a @click="addAdminMember" v-if="userLevel === 3">提升管理</a>
            </div>
          </div>
          <div class="setting_lists" v-if="listTab === 1">
            <p>请选择禁言的成员</p>
            <div :key="p.user_id" class="item" v-for="p in this.banList">
              <span v-if="p.duration" style="color: red">
                {{ p.user_name }}
                {{ adminList.indexOf(p.user_id) >= 0 ? '(管理员)' : '' }}
                <br />
                {{ p.duration }}
              </span>
              <span v-else>
                {{ p.user_name }}
                {{ adminList.indexOf(p.user_id) >= 0 ? '(管理员)' : '' }}
              </span>
              <input :checked="selIdList.indexOf(p.user_id) >= 0" @click="touchMemberCheck(p.user_id)" type="checkbox" />
            </div>
            <p v-if="this.banList.length"></p>
            <div class="category">
              <a @click="addMute">禁言</a>
              <a @click="removeMute">解除禁言</a>
              <input placeholder="输入分钟数" type="text" style="width: 120px; margin-left: 5px" v-model="banDuration" />
              分钟(-1永久)
            </div>
          </div>

          <div class="setting_lists" v-if="listTab === 2">
            <p>请选择要移除的用户</p>
            <div :key="p.user_id" class="item" v-for="p in this.blockList">
              <span>{{ p.user_name }}</span>
              <input :checked="selIdList.indexOf(p.user_id) >= 0" @click="touchMemberCheck(p.user_id)" type="checkbox" />
            </div>
            <p v-if="this.blockList.length"></p>
            <div class="category"><a @click="removeBlock">移除黑名单</a></div>
          </div>

          <div class="setting_lists" v-if="listTab === 3">
            <p>请添加或选择要删除的公告</p>
            <div class="category">
              <a @click="addPublic">添加</a>
              <input placeHolder="标题" type="text" style="width: 120px; margin-left: 5px" v-model="public_title" />
              <input placeHolder="内容" type="text" style="width: 140px; margin-left: 5px" v-model="public_content" />
            </div>
            <p v-if="this.publicList.length"></p>
            <div :key="p.id" class="item item_list" v-for="p in this.publicList">
              <el-tooltip placement="bottom-start" effect="light" :visible-arrow="false">
                <div slot="content">
                  <span>title:{{ p.title }}</span>
                  <br />
                  <span>content:{{ p.content }}</span>
                </div>
                <div>
                  <span>title:{{ p.title }}</span>
                  <br />
                  <span>content:{{ p.content }}</span>
                </div>
              </el-tooltip>
              <div class="category r">
                <a @click="removePublic(p.id)" class="r">删除</a>
              </div>
            </div>
          </div>

          <div class="setting_lists" v-if="listTab === 4">
            <p>请选择上传的文件</p>
            <div class="setting_lists_bars">
              <input ref="fileRef" style="margin-left: 10px; width: 280px; height: 28px; visibility: visible; position: static" type="file" />
              <div class="category"><a @click="uploadFile">上传</a></div>
            </div>
            <p></p>
            <div :key="d.file_id" class="item item_list" v-for="d in this.fileList">
              <span class="file_span">
                文件名:{{ d.name }}
                <br />
                大小:{{ d.size }}
              </span>
              <input :checked="selIdList.indexOf(d.file_id) >= 0" @click="touchMemberCheck(d.file_id)" type="checkbox" />
            </div>
            <div class="category">
              <a @click="downFile">批量下载</a>
              <a @click="removeFile">批量删除</a>
            </div>
          </div>

          <div class="setting_lists" v-if="listTab === 5">
            <p>请选择邀请的好友</p>
            <div :key="p.user_id" class="item" v-for="p in this.rosterList">
              <span>{{ p.user_name }}</span>
              <input :checked="selIdList.indexOf(p.user_id) >= 0" @click="touchMemberCheck(p.user_id)" type="checkbox" />
            </div>
            <p v-if="this.rosterList.length"></p>
            <div class="category"><a @click="inviteRoster">邀请好友</a></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import moment from 'moment';
import CryptoJS from 'crypto-js';

export default {
  name: 'contentIndex',
  data() {
    return {
      groupInfo: {},

      admins: [],
      members: [],

      selIdList: [],
      bans: [], //这个是禁言列表
      blocks: [], // 黑名单列表

      publicList: [], //公告列表
      banDuration: '',
      listTab: 0,

      public_title: '',
      public_content: '',

      fileList: [],
      rosters: []
    };
  },
  mounted() {
    this.requireInfo();
    this.requireAdmin();
    this.requireMember();
  },
  components: {},
  computed: {
    ...mapGetters('chat', ['getViewType']),
    ...mapGetters('content', ['getSid', 'getMemberList']),
    im() {
      return this.$store.state.im;
    },

    userLevel() {
      const cuid = this.im.userManage.getUid();
      if (this.groupInfo.owner_id === cuid) {
        return 3;
      } else if (this.adminList.indexOf(cuid) > -1) {
        return 2;
      }
      return 1;
    },

    adminList() {
      return [].concat(this.admins);
    },
    memberList() {
      const cuid = this.im.userManage.getUid();
      const allMaps = this.im.rosterManage.getAllRosterDetail() || {};
      let arr = this.members.filter((x) => (x.user_id || x) !== cuid);
      if (this.userLevel === 2) {
        arr = arr.filter((x) => this.adminList.indexOf(x.user_id) === -1);
      }
      let memberArray = [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].user_id) {
          if (this.getMemberList.findIndex((y) => y.user_id === arr[i].user_id) != -1) {
            memberArray.push(this.getMemberList[this.getMemberList.findIndex((y) => y.user_id === arr[i].user_id)]);
          } else {
            let mapUser = allMaps[arr[i].user_id] || {};
            mapUser.display_name = mapUser.nick_name || mapUser.username || arr[i].user_id;
            memberArray.push(mapUser);
          }
        }
      }
      let ret = [];
      memberArray.forEach((x) => {
        if (x && x.user_id) {
          const sxuid = x.user_id || x;
          const user_name = this.displayName(x);
          ret.push({
            user_id: sxuid,
            user_name
          });
        }
      });
      return [].concat(ret);
    },
    banList() {
      const allMaps = this.im.rosterManage.getAllRosterDetail() || {};
      let ret = [];
      this.memberList.forEach((x) => {
        const user_id = x.user_id || x;
        const mapUser = allMaps[user_id] || {};
        const user_name = x.user_name || mapUser.nick_name || mapUser.username || x.user_id;
        const durItem = this.bans.find((i) => i.user_id === x.user_id);
        let duration = '';
        if (durItem) {
          duration = durItem.expired_time === -1 ? ' 永久 ' : moment(durItem.expired_time).format('YYYY-MM-DD HH:mm:ss');
        }
        ret.push({
          user_name,
          user_id,
          duration
        });
      });
      return [].concat(ret);
    },
    blockList() {
      let ret = [];
      const allMaps = this.im.rosterManage.getAllRosterDetail() || {};
      this.blocks.forEach((x) => {
        const user_id = x.user_id || x;
        let mapUser = allMaps[user_id] || {};
        mapUser.display_name = mapUser.nick_name || mapUser.username || x;
        const user_name = this.displayRosterName(mapUser);
        ret.push({
          user_name,
          user_id
        });
      });
      return ret;
    },
    rosterList() {
      const uid = this.im.userManage.getUid();
      const allMaps = this.im.rosterManage.getAllRosterDetail() || {};
      let arr = this.rosters.filter((x) => x !== uid);
      arr = arr.filter((x) => this.memberList.findIndex((y) => (y.user_id || y) == x) === -1);
      let ret = [];
      arr.forEach((x) => {
        const user_id = x;
        let mapUser = allMaps[user_id] || {};
        mapUser.display_name = mapUser.nick_name || mapUser.username || x;
        const user_name = this.displayRosterName(mapUser);
        ret.push({
          user_id,
          user_name
        });
      });
      return ret;
    }
    //computed over...
  },
  methods: {
    touchedListHeader(idx) {
      this.listTab = idx;
    },

    switchTouched(d) {
      const index = d - 0;
      if (index === 0) {
        //成员邀请
        this.im.groupManage
          .asyncUpdateAllowMemberInvitation({
            group_id: this.getSid,
            value: !this.groupInfo.member_invite - 0
          })
          .then(() => {
            this.groupInfo.member_invite = !this.groupInfo.member_invite - 0;
          });
      }
      if (index === 1) {
        //修改信息
        this.im.groupManage
          .asyncUpdateAllowMemberModify({
            group_id: this.getSid,
            value: !this.groupInfo.member_modify - 0
          })
          .then(() => {
            this.groupInfo.member_modify = !this.groupInfo.member_modify - 0;
          });
      } //

      if (index === 2) {
        //开启已读
        this.im.groupManage
          .asyncUpdateEnableReadack({
            group_id: this.getSid,
            value: !this.groupInfo.read_ack - 0
          })
          .then(() => {
            this.groupInfo.read_ack = !this.groupInfo.read_ack - 0;
          });
      } //

      if (index === 3) {
        //可见历史
        this.im.groupManage
          .asyncUpdateHistoryVisible({
            group_id: this.getSid,
            value: !this.groupInfo.history_visible - 0
          })
          .then(() => {
            this.groupInfo.history_visible = !this.groupInfo.history_visible - 0;
          });
      } //
      if (index === 4) {
        //入群审批
        this.im.groupManage
          .asyncUpdateRequireadminapproval({
            group_id: this.getSid,
            apply_approval: this.groupInfo.apply_approval ? 0 : 1
          })
          .then(() => {
            this.groupInfo.apply_approval = !this.groupInfo.apply_approval - 0;
          });
      } //

      if (index === 5) {
        //屏蔽消息
        this.im.groupManage
          .asyncGroupMsgMutemode({
            group_id: this.getSid,
            msg_mute_mode: this.groupInfo.msg_mute_mode ? 0 : 2
          })
          .then(() => {
            this.groupInfo.msg_mute_mode = this.groupInfo.msg_mute_mode ? 0 : 2;
          });
      } //

      if (index === 6) {
        //全员禁言
        if (this.isGroupBanAll()) {
          this.im.groupManage
            .asyncUnBanAll({
              group_id: this.getSid
            })
            .then(() => {
              this.groupInfo.ban_expire_time = 0;
            });
        } else {
          this.im.groupManage
            .asyncBanAll({
              group_id: this.getSid,
              duration: -1
            })
            .then((res) => {
              this.groupInfo.ban_expire_time = res.ban_expire_time;
            });
        }
      } //

      if (index === 7) {
        // 群组是否对普通成员隐藏其它群成员详情
        this.im.groupManage
          .asyncHideMemberInfo({
            group_id: this.getSid,
            value: !this.groupInfo.hide_member_info - 0
          })
          .then(() => {
            this.groupInfo.hide_member_info = !this.groupInfo.hide_member_info - 0;
          });
      }
    },
    //////
    clickGroupsettingCloseHandler() {
      this.$store.dispatch('layer/actionSetShowing', '');
      this.$store.dispatch('layer/actionSetShowmask', false);
    },
    touchMemberCheck(uid) {
      const idx = this.selIdList.indexOf(uid);
      if (idx >= 0) {
        this.selIdList.splice(idx, 1);
      } else {
        this.selIdList.push(uid);
      }
    },
    /********************************** 成员管理 ***********************************
     */
    requireInfo() {
      this.im.groupManage.asyncGetInfo({ group_id: this.getSid }).then((res) => {
        this.groupInfo = res;
      });
    },

    requireAdmin() {
      this.im.groupManage.asyncGetAdminList({ group_id: this.getSid }).then((res) => {
        this.admins = (res || []).map((x) => x.user_id);
      });
    },

    requireMember() {
      this.$store.dispatch('content/actionUpdateMemberList');
      this.im.groupManage.asyncGetMemberList(this.getSid, true).then((res) => {
        this.members = res;
      });
    },

    removeAdminMember() {
      let user_list = this.selIdList;
      user_list = user_list.filter((id) => this.adminList.findIndex((s) => s === id) > -1);
      if (user_list.length < 1) {
        alert('您的选择里边没有管理员');
      } else {
        this.im.groupManage.asyncAdminRemove({ group_id: this.getSid, user_list }).then(() => {
          alert('已经删除管理员');
          this.im.groupManage.asyncGetAdminList({ group_id: this.getSid }).then((r) => {
            this.admins = (r || []).map((i) => i.user_id);
          });
          this.selIdList = [];
        });
      }
    },
    addAdminMember() {
      let user_list = this.selIdList;
      user_list = user_list.filter((id) => this.adminList.findIndex((s) => s === id) === -1);
      if (user_list.length < 1) {
        alert('您的选择里边没有非管理员');
      } else {
        this.im.groupManage
          .asyncAdminAdd({
            group_id: this.getSid,
            user_list
          })
          .then(() => {
            alert('已经添加管理员');
            this.admins = this.adminList.concat(user_list);
            this.requireMember();
            this.selIdList = [];
          });
      }
    },
    kickMember() {
      let user_list = this.selIdList;
      const group_id = this.getSid;
      if (!user_list.length) {
        alert('您没有选择群成员');
        return;
      }
      this.im.groupManage.asyncKick({ group_id, user_list }).then(() => {
        alert('已t人');
        this.selIdList = [];
        this.requireMember();
        this.im.groupManage.asyncGetMemberList(group_id, true).then((res) => {
          this.members = res;
        });
      });
    },
    addBlockList() {
      let user_list = this.selIdList;
      if (!user_list.length) {
        alert('请选择');
        return;
      }
      const group_id = this.getSid;
      this.im.groupManage.asyncGroupBlock({ group_id, user_list }).then(() => {
        alert('已加黑');
        this.selIdList = [];
        this.requireMember();
      });
    },
    /**** 禁言
     */
    addMute() {
      let user_list = this.selIdList;
      if (!user_list.length) {
        alert('请选择');
        return;
      }
      if (!this.banDuration.length) {
        alert('请输入禁言时间');
        return;
      }
      if (!/^-?\d+$/.test(this.banDuration)) {
        alert('请输入正确禁言时间');
        return;
      }

      const duration = this.banDuration - 0;
      const group_id = this.getSid;
      this.im.groupManage.asyncGroupBab({ group_id, duration, user_list }).then(() => {
        alert('禁言设置成功');
        this.requireBanList();
        this.selIdList = [];
      });
    },

    removeMute() {
      let user_list = this.selIdList;
      if (!user_list.length) {
        alert('请选择');
        return;
      }
      const group_id = this.getSid;

      this.im.groupManage.asyncGroupUnban({ group_id, user_list }).then(() => {
        alert('解除禁言成功');
        this.requireBanList();
        this.selIdList = [];
      });
    },
    requireBanList() {
      const group_id = this.getSid;
      this.im.groupManage.asyncGroupBannedList({ group_id }).then((res) => {
        this.bans = res;
      });
    },
    /******黑名单
     */
    requireBlockList() {
      const group_id = this.getSid;
      this.im.groupManage.asyncGroupBockedlist({ group_id }).then((res) => {
        this.blocks = res;
      });
    },
    removeBlock() {
      let user_list = this.selIdList;
      if (!user_list.length) {
        alert('请选择');
        return;
      }
      const group_id = this.getSid;
      this.im.groupManage.asyncGroupUnblock({ group_id, user_list }).then(() => {
        alert('解除黑名单成功');
        this.requireBlockList();
      });
    },
    /******   公告
     */
    requirePublicList() {
      const group_id = this.getSid;
      this.im.groupManage.asyncGetAnnouncementList({ group_id }).then((res = []) => {
        this.publicList = [].concat(res).reverse();
      });
    },
    addPublic() {
      const title = this.public_title;
      const content = this.public_content;
      if (!title || !content) {
        alert('请输入内容');
        return;
      }
      const group_id = this.getSid;
      this.im.groupManage.asyncAnnouncementEdit({ title, content, group_id }).then(() => {
        alert('公告添加成功');
        this.requirePublicList();
      });
    },
    removePublic(announcement_id) {
      const group_id = this.getSid;
      this.im.groupManage.asyncAnouncementDelete({ group_id, announcement_id }).then(() => {
        alert('群公告删除成功');
        this.requirePublicList();
      });
    },
    /********** files ....
     */
    requireFileList() {
      const group_id = this.getSid;
      this.im.groupManage.asyncGetFileList({ group_id }).then((res = []) => {
        this.fileList = [].concat(res);
      });
    },
    uploadFile() {
      const file = this.$refs.fileRef.files[0];
      if (!file) {
        alert('请先选择文件');
        return;
      }
      this.im.sysManage
        .asyncGetFileUploadChatFileUrl({
          file_type: 200,
          to_id: this.getSid,
          to_type: 2
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
            const name = file.name;
            const size = file.size; //Math.round(file.size / 1024) + 'KB';
            const type = file.type;
            const group_id = this.getSid;
            const url = res.download_url;
            this.im.groupManage
              .asyncFileUpload({ name, size, type, group_id, url })
              .then(() => {
                this.requireFileList();
                this.$refs.fileRef.value = null;
              })
              .catch(function (err) {
                alert('error:' + err.message);
              });
          });
        });
    },
    removeFile() {
      let file_list = this.selIdList;
      const group_id = this.getSid;
      if (file_list.length) {
        this.im.groupManage.asyncFileDelete({ file_list, group_id }).then(() => {
          this.requireFileList();
        });
      }
    },
    downFile() {
      let file_list = this.selIdList;
      this.fileList.forEach((item) => {
        if (file_list.includes(item.file_id)) {
          const url = item.url + '&access-token=' + this.im.userManage.getToken() + '&app_id=' + this.im.userManage.getAppid();
          window.open(url);
        }
      });
    },
    /********** add roster
     */
    requireRosterList() {
      this.im.rosterManage.asyncGetRosterIdList().then((res) => {
        this.rosters = res;
      });
    },

    inviteRoster() {
      let user_list = this.selIdList;
      const group_id = this.getSid;
      this.im.groupManage.asyncInvite({ group_id, user_list }).then(() => {
        alert('邀请成功');
        this.selIdList = [];
        this.requireMember();
      });
    },

    isGroupBanAll() {
      const banExpireTime = this.groupInfo.ban_expire_time;
      if (!banExpireTime) {
        return false;
      }
      return banExpireTime < 0 || new Date().getTime() < banExpireTime;
    },

    checkHideMemberInfo(user_id) {
      let hide = true;
      let hide_member_info = this.groupInfo.hide_member_info;
      let app_hide_member_info = false;
      let appConfig = this.im.sysManage.getAppConfig(this.im.userManage.getAppid());
      if (appConfig) {
        app_hide_member_info = appConfig.hide_member_info;
      }
      if (app_hide_member_info) {
        if (!hide_member_info) {
          hide = false;
        }
      } else {
        hide = false;
      }

      return hide;
    },

    calucateHideMemberName(roster) {
      let original = roster.display_name + roster.user_id;
      const md5hash = CryptoJS.MD5(original);
      let output = md5hash.toString(CryptoJS.enc.Base64);
      if (output.length > 12) {
        output = output.substring(0, 12);
      }
      return output;
    },

    displayName(roster) {
      if (this.checkHideMemberInfo(roster.user_id) && !roster.has_nick) {
        return this.calucateHideMemberName(roster);
      } else {
        return roster.display_name;
      }
    },

    displayRosterName(roster) {
      if (this.checkHideMemberInfo(roster.user_id)) {
        if (roster.nick_name) {
          return roster.nick_name;
        } else {
          return this.calucateHideMemberName(roster);
        }
      } else {
        return roster.display_name;
      }
    }

    //methods finish
  },

  watch: {
    listTab(a, b) {
      if (a !== b) {
        this.checkedIds = [];
        this.selIdList = [];
        if (a === 1 && this.bans.length < 1) this.requireBanList();
        if (a === 2 && this.blocks.length < 1) this.requireBlockList();
        if (a === 3 && this.publicList.length < 1) this.requirePublicList();
        if (a === 4 && this.fileList.length < 1) this.requireFileList();
        if (a === 5 && this.rosters.length < 1) this.requireRosterList();
      }
    }
  }
};
</script>

<style scoped></style>
