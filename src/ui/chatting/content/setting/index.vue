<template>
  <div class="user_setting">
    <div class="avatar">
      <img :src="avatar" @click="touchedAvatar" class="av" />
      <img @click="viewQrcode" class="qrcode" src="/image/qr.png" />
    </div>
    <input @change="fileChangeHandler" ref="fileRef" type="file" />
    <div class="line">
      <span class="ll">手机号码</span>
      <p class="lr" v-if="mobile" @click="dialog_change_bind_mobile = true">{{ mobile || '去绑定' }}</p>
      <p class="lr" v-else @click="dialog_user_bind_mobile = true">{{ mobile || '去绑定' }}</p>
      <!-- <input type="text" v-model="mobile" /><a @click="saveMobile">保存</a> -->
    </div>
    <div class="line">
      <span class="ll">昵称</span>
      <p @click="settingNick" class="lr">{{ nick_name || '点击设置' }}</p>
      <!-- <input type="text" v-model="nick_name" /><a @click="saveNick">保存</a> -->
    </div>
    <div class="line">
      <span class="ll">ID</span>
      <p class="lr">{{ user_id }}</p>
      <!-- <input type="text" v-model="nick_name" /><a @click="saveNick">保存</a> -->
    </div>
    <div class="line">
      <span class="ll">实名认证</span>
      <p class="lr" v-if="getUserVerification && getUserVerification.status == 1" @click="dialog_user_verification_finish = true">已认证</p>
      <p class="lr" v-else @click="gotoVerification">{{ '去认证' }}</p>
    </div>
    <div class="line">
      <span class="ll">切换账号</span>
      <p @click="swtichAccount" class="lr">{{ ' > ' }}</p>
    </div>
    <div class="line">
      <span class="ll">好友验证</span>
      <i :class="['r', auth_mode ? 'switcher_on' : 'switcher_off']" @click="rosterSwitchTouch" class="switcher"></i>
    </div>
    <div class="line">
      <span class="ll">群邀请验证</span>
      <i :class="['r', group_confirm ? 'switcher_on' : 'switcher_off']" @click="groupSwitchTouch" class="switcher"></i>
    </div>
    <div @click="logout" class="logout">退出</div>
    <el-dialog title="切换账号" :visible.sync="show_swtich_account" fullscreen :modal="false">
      <el-table :data="this.getApp().getLoginInfoList()" style="width: 100%" border fit highlight-current-row @current-change="handleCurrentChange" height="240" size="mini">
        <el-table-column label="账号列表">
          <template slot-scope="props">
            <el-form>
              <el-form-item class="account_form_item">
                <span class="account_name">{{ props.row.username + ' (AppID:' + props.row.app_id + ')' }}</span>
              </el-form-item>
              <el-form-item class="account_form_item">
                <span class="account_id">{{ props.row.user_id }}</span>
              </el-form-item>
            </el-form>
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelChangeAccount()">取消</el-button>
        <el-button type="primary" @click="changeAccount()">确定</el-button>
      </span>
    </el-dialog>
    <el-dialog title="实名认证" :visible.sync="dialog_user_verification_finish" fullscreen :modal="false">
      <p class="account_verification_note" v-if="getUserVerification && getUserVerification.status == 1">您已完成实名认证，手机号为：{{ getUserVerification.mobile }}</p>
      <el-button
        @click="
          dialog_user_verification_finish = false;
          dialog_user_verification = true;
        "
        class="verification_button"
        type="primary"
      >
        重新认证
      </el-button>
    </el-dialog>
    <el-dialog title="实名认证" :visible.sync="dialog_user_verification" fullscreen :modal="false">
      <p class="account_verification_note" v-if="getUserVerification && getUserVerification.status == 1">您已完成实名认证，手机号为：{{ getUserVerification.mobile }}</p>
      <p v-else class="account_verification_note">您还未完成实名认证，请尽快完成实名认证。</p>
      <el-form label-width="0px" class="user_verification_form">
        <el-form-item class="mt0 mb5" prop="mobile">
          <el-input class="w300 h30" placeholder="手机号" v-model="user_verification_model.mobile"></el-input>
        </el-form-item>
        <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
          <el-input class="image-captcha-input" placeholder="图片验证码" v-model="user_verification_model.image_captcha"></el-input>
          <img :src="codeImageSrc" @click="timerImage" class="image-captcha-image" v-if="codeImageSrc" />
        </el-form-item>
        <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
          <el-input class="mobile-captcha-input" placeholder="手机验证码" v-model="user_verification_model.code"></el-input>
          <div :disabled="checkCodeTime > 0" @click="sendSms" class="mobile-captcha-button">{{ checkText }}</div>
        </el-form-item>
      </el-form>

      <el-button @click="userVerificationByMobile" class="verification_button" type="primary">认证</el-button>
    </el-dialog>
    <el-dialog title="绑定手机号" :visible.sync="dialog_user_bind_mobile" fullscreen :modal="false">
      <el-form label-width="0px" class="user_verification_form">
        <el-form-item class="mt0 mb5" prop="mobile">
          <el-input class="w300 h30" placeholder="手机号" v-model="user_bind_mobile_model.mobile"></el-input>
        </el-form-item>
        <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
          <el-input class="image-captcha-input" placeholder="图片验证码" v-model="user_bind_mobile_model.image_captcha"></el-input>
          <img :src="codeImageSrcBindMobile" @click="timerImageBindMobile" class="image-captcha-image" v-if="codeImageSrcBindMobile" />
        </el-form-item>
        <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
          <el-input class="mobile-captcha-input" placeholder="手机验证码" v-model="user_bind_mobile_model.code"></el-input>
          <div :disabled="checkCodeTime > 0" @click="sendSmsMobileBind" class="mobile-captcha-button">{{ checkText }}</div>
        </el-form-item>
      </el-form>

      <el-button @click="userBindMobile" class="verification_button" type="primary">绑定</el-button>
    </el-dialog>
    <el-dialog :title="changeMobileBindTitle" :visible.sync="dialog_change_bind_mobile" fullscreen :modal="false">
      <div v-if="change_bind_mobile_model.method == 'mobile' && !change_bind_mobile_model.sign">
        <p>已绑定手机号验证身份</p>
        <el-form label-width="0px" class="user_verification_form">
          <el-form-item class="mt20 mb5" prop="mobile">
            <el-input disabled class="w300 h30" placeholder="手机号" v-model="change_bind_mobile_model.mobile"></el-input>
          </el-form-item>
          <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
            <el-input class="image-captcha-input" placeholder="图片验证码" v-model="change_bind_mobile_model.image_captcha"></el-input>
            <img :src="codeImageSrcChangeMobileBind" @click="timerImageChangeMobileBind" class="image-captcha-image" v-if="codeImageSrcChangeMobileBind" />
          </el-form-item>
          <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
            <el-input class="mobile-captcha-input" placeholder="手机验证码" v-model="change_bind_mobile_model.code"></el-input>
            <div :disabled="checkCodeTime > 0" @click="sendSmsChangeMobileBind" class="mobile-captcha-button">{{ checkText }}</div>
          </el-form-item>
        </el-form>
        <el-button :disabled="!change_bind_mobile_model.code" @click="changeMobileBindCheckCurrentMobile" class="line_button mt20" type="primary">继续</el-button>
      </div>
      <div v-else-if="change_bind_mobile_model.method == 'password' && !change_bind_mobile_model.sign">
        <p>登录密码验证身份</p>
        <el-input class="password_input" autocomplete="false" placeholder="输入登录密码" type="password" v-model="change_bind_mobile_model.password" />
        <el-button :disabled="!change_bind_mobile_model.password" @click="changeMobileBindCheckPassword" class="line_button mt20" type="primary">继续</el-button>
      </div>
      <div v-else-if="change_bind_mobile_model.sign">
        <p>请输入新的手机号</p>
        <el-form label-width="0px" class="user_verification_form">
          <el-form-item class="mt20 mb5" prop="mobile">
            <el-input class="w300 h30" placeholder="手机号" v-model="change_bind_mobile_model.mobile"></el-input>
          </el-form-item>
          <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
            <el-input class="image-captcha-input" placeholder="图片验证码" v-model="change_bind_mobile_model.image_captcha"></el-input>
            <img :src="codeImageSrcChangeMobileBind" @click="timerImageChangeMobileBind" class="image-captcha-image" v-if="codeImageSrcChangeMobileBind" />
          </el-form-item>
          <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
            <el-input class="mobile-captcha-input" placeholder="手机验证码" v-model="change_bind_mobile_model.code"></el-input>
            <div :disabled="checkCodeTime > 0" @click="sendSmsChangeMobileBind" class="mobile-captcha-button">{{ checkText }}</div>
          </el-form-item>
        </el-form>

        <el-button @click="changeBindMobile" class="verification_button" type="primary">绑定</el-button>
      </div>
      <div v-else>
        <p>您已绑定手机号 {{ mobile }}</p>
        <el-button @click="gotoChangeMobileBindByMobile" class="line_button" type="primary">通过手机验证码方式</el-button>
        <el-button @click="change_bind_mobile_model.method = 'password'" class="line_white_button">通过密码更换</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'rosterInfo',
  data() {
    return {
      avatar: '',
      mobile: '',
      nick_name: '',
      auth_mode: 0,
      group_confirm: false,
      show_swtich_account: false,
      switch_info: null,
      user_id: '',
      dialog_user_verification_finish: false,
      dialog_user_verification: false,
      user_verification_model: {},
      checkCodeTime: 0,
      checkCodeTimer: null,
      dialog_user_bind_mobile: false,
      user_bind_mobile_model: {},
      dialog_change_bind_mobile: false,
      change_bind_mobile_model: {
        method: 'none',
        sign: ''
      }
    };
  },
  mounted() {
    this.$store.dispatch('setting/actionGetProfile');
    this.$store.dispatch('setting/actionGetSettingInfo');
    this.$store.dispatch('setting/actionGetUserVerification');
  },
  components: {},
  computed: {
    ...mapGetters('setting', ['getSettingInfo', 'getProfileInfo', 'getUserVerification']),

    token() {
      return this.$store.getters.im.userManage.getToken();
    },
    codeImageSrc() {
      const image_id = this.user_verification_model.image_captcha_id;
      if (!image_id) return '';
      const app_id = this.$store.state.im.userManage.getAppid();
      const url = this.$store.state.im.sysManage.getServers(app_id).ratel + '/app/captcha/image';
      return url + '?image_id=' + image_id + '&app_id=' + app_id;
    },
    codeImageSrcBindMobile() {
      const image_id = this.user_bind_mobile_model.image_captcha_id;
      if (!image_id) return '';
      const app_id = this.$store.state.im.userManage.getAppid();
      const url = this.$store.state.im.sysManage.getServers(app_id).ratel + '/app/captcha/image';
      return url + '?image_id=' + image_id + '&app_id=' + app_id;
    },
    codeImageSrcChangeMobileBind() {
      const image_id = this.change_bind_mobile_model.image_captcha_id;
      if (!image_id) return '';
      const app_id = this.$store.state.im.userManage.getAppid();
      const url = this.$store.state.im.sysManage.getServers(app_id).ratel + '/app/captcha/image';
      return url + '?image_id=' + image_id + '&app_id=' + app_id;
    },
    checkText() {
      if (this.checkCodeTime > 0) {
        return `${this.checkCodeTime} 秒`;
      }
      return '获取验证码';
    },
    changeMobileBindTitle() {
      if (this.change_bind_mobile_model.sign) {
        return '绑定新手机号';
      } else if (this.change_bind_mobile_model.method == 'mobile') {
        return '验证手机号';
      } else if (this.change_bind_mobile_model.method == 'password') {
        return '验证密码';
      } else {
        return '更改绑定手机号';
      }
    }
  },
  methods: {
    touchedAvatar() {
      this.$refs.fileRef.click();
    },

    fileChangeHandler(e) {
      const file = e.target.files[0];
      console.log('Choose file: ', file);
      this.$store.getters.im.sysManage
        .asyncFileUpload({
          file,
          toType: 'rosterAvatar',
          processCallback: function (res) {
            console.log('fileChangeHandler rosterAvatar file upload percent :' + 100 * (res.loaded / res.total));
          }
        })
        .then((res) => {
          this.$refs.fileRef.value = '';
          this.updateAvatarUrl(res.url);
        })
        .catch(() => {
          this.$refs.fileRef.value = '';
        });
    },

    updateAvatarUrl(avatar) {
      this.$store.getters.im.userManage
        .asyncUpdateAvatar({
          avatar
        })
        .then(() => {
          this.$store.dispatch('setting/actionGetProfile');
          this.$store.dispatch('header/actionGetHeaderProfile');
          alert('更新头像完成');
        });
    },
    saveMobile() {
      const value = this.mobile || '';
      if (!value) return;
      this.$store.getters.im.userManage
        .asyncUpdateMobile({
          mobile: value
        })
        .then(() => {
          alert('修改成功');
        });
    },
    saveNick() {
      const value = this.nick_name || '';
      // if (!value) return;
      this.$store.getters.im.userManage
        .asyncUpdateNickName({
          nick_name: value
        })
        .then(() => {
          alert('修改成功');
        });
    },
    getApp() {
      return this.$parent.$parent.$parent;
    },
    swtichAccount() {
      this.show_swtich_account = true;
    },
    handleCurrentChange(info) {
      this.switch_info = info;
    },
    cancelChangeAccount() {
      this.show_swtich_account = false;
      this.switch_info = null;
    },
    changeAccount() {
      const loginInfo = this.getApp().getLoginInfo();
      if (this.switch_info && (this.switch_info.app_id !== loginInfo.app_id || this.switch_info.username !== loginInfo.username)) {
        this.getApp().switchLogin(this.switch_info);
      }
    },
    logout() {
      this.$confirm('是否退出全部Web页面登录', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        center: true
      })
        .then(() => {
          this.getApp().imLogout(false, true);
          this.$store.dispatch('login/actionChangeAppStatus', 'login');
          this.$store.dispatch('header/actionChangeHeaderUserProfile', {});
        })
        .catch(() => {
          this.getApp().imLogout(false, false);
          this.$store.dispatch('login/actionChangeAppStatus', 'login');
          this.$store.dispatch('header/actionChangeHeaderUserProfile', {});
        });
    },
    rosterSwitchTouch() {
      const auth_mode = this.auth_mode === 1 ? 0 : 1;
      const user_id = this.$store.state.im.userManage.getUid();
      this.$store.state.im.userManage.asyncUpdateSettings({ auth_mode, user_id }).then(() => {
        this.auth_mode = auth_mode;
      });
    },
    groupSwitchTouch() {
      const group_confirm = !this.group_confirm;
      const user_id = this.$store.state.im.userManage.getUid();
      this.$store.state.im.userManage.asyncUpdateSettings({ group_confirm, user_id }).then(() => {
        this.group_confirm = group_confirm;
      });
    },

    notEmpty(str) {
      return !(!str || /^\s*$/.test(str));
    },

    updateInfos() {
      this.avatar = this.$store.getters.im.sysManage.getImage({
        avatar: this.getProfileInfo.avatar
      });
      this.mobile = this.getProfileInfo.mobile;
      if (this.notEmpty(this.getProfileInfo.nick_name)) {
        this.nick_name = this.getProfileInfo.nick_name;
      }

      this.auth_mode = this.getSettingInfo.auth_mode || 0;
      this.group_confirm = this.getSettingInfo.group_confirm;
      this.user_id = this.getSettingInfo.user_id;
    },
    viewQrcode() {
      this.$store.dispatch('layer/actionSetShowmask', 'true');
      this.$store.dispatch('layer/actionSetShowing', 'qrprofile');
    },
    settingMobile() {
      this.$prompt('请输入手机号', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^((13[0-9])|(14[0-9])|(15[^4,\\D])|(166)|(17[0-9])|(18[0-9]))\\d{8}$/,
        inputErrorMessage: '手机号格式不正确'
      })
        .then(({ value }) => {
          if (!value) return;
          this.$store.getters.im.userManage.asyncUpdateMobile({ mobile: value }).then(() => {
            this.mobile = value;
            alert('修改成功');
          });
        })
        .catch(() => {});
    },
    settingNick() {
      const im = this.$store.getters.im;
      this.$prompt('请输入昵称', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(({ value }) => {
          if (!value) return;
          im.userManage.asyncUpdateNickName({ nick_name: value }).then(() => {
            this.nick_name = value;
            this.$store.dispatch('header/actionGetHeaderProfile');
            alert('修改成功');
          });
        })
        .catch(() => {});
    },
    calc_user_verification_model() {
      const ret = {};
      this.timerImage();
      this.user_verification_model = ret;
    },
    calc_user_bind_mobile_model() {
      const ret = {};
      this.timerImageBindMobile();
      this.user_bind_mobile_model = ret;
    },
    calc_change_bind_mobile_model() {
      const ret = {
        method: 'none',
        sign: ''
      };
      this.change_bind_mobile_model = ret;
    },
    getImageCode() {
      this.$store.state.im.userManage.asyncCaptchaImagePost().then((res) => {
        const obj = Object.assign({}, this.user_verification_model, { image_captcha_id: res });
        this.user_verification_model = obj;
      });
    },
    getImageCodeBindMobile() {
      this.$store.state.im.userManage.asyncCaptchaImagePost().then((res) => {
        const obj = Object.assign({}, this.user_bind_mobile_model, { image_captcha_id: res });
        this.user_bind_mobile_model = obj;
      });
    },
    getImageCodeChangeMobileBind() {
      this.$store.state.im.userManage.asyncCaptchaImagePost().then((res) => {
        const obj = Object.assign({}, this.change_bind_mobile_model, { image_captcha_id: res });
        this.change_bind_mobile_model = obj;
      });
    },
    timerImage() {
      this.imageTimer && clearInterval(this.imageTimer);
      this.getImageCode();
      this.imageTimer = setInterval(() => {
        this.getImageCode();
      }, 3 * 60 * 1000);
    },
    timerImageBindMobile() {
      this.imageTimerBindMobile && clearInterval(this.imageTimerBindMobile);
      this.getImageCodeBindMobile();
      this.imageTimerBindMobile = setInterval(() => {
        this.getImageCodeBindMobile();
      }, 3 * 60 * 1000);
    },
    timerImageChangeMobileBind() {
      this.imageTimerChangeMobileBind && clearInterval(this.imageTimerChangeMobileBind);
      this.getImageCodeChangeMobileBind();
      this.imageTimerChangeMobileBind = setInterval(() => {
        this.getImageCodeChangeMobileBind();
      }, 3 * 60 * 1000);
    },
    sendSms() {
      if (!this.user_verification_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.user_verification_model.image_captcha_id || !this.user_verification_model.image_captcha) {
        this.$message.error('请输入图片验证码');
        return;
      }

      this.$store.state.im.userManage
        .asyncCaptchaSms({
          captcha: this.user_verification_model.image_captcha,
          image_id: this.user_verification_model.image_captcha_id,
          mobile: this.user_verification_model.mobile
        })
        .then(() => {
          this.checkCodeTime = 60;
          this.checkCodeTimer = setInterval(() => {
            this.checkCodeTime -= 1;
            if (this.checkCodeTime == 0) {
              clearInterval(this.checkCodeTimer);
            }
          }, 1000);
        })
        .catch((ex) => {
          if (ex.code === 11014) {
            this.$message.error('图片验证码不正确');
          } else {
            this.$message.error('发送失败：' + ex.message);
          }
        });
    },
    sendSmsMobileBind() {
      if (!this.user_bind_mobile_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.user_bind_mobile_model.image_captcha_id || !this.user_bind_mobile_model.image_captcha) {
        this.$message.error('请输入图片验证码');
        return;
      }

      this.$store.state.im.userManage
        .asyncCaptchaSms({
          captcha: this.user_bind_mobile_model.image_captcha,
          image_id: this.user_bind_mobile_model.image_captcha_id,
          mobile: this.user_bind_mobile_model.mobile
        })
        .then(() => {
          this.checkCodeTime = 60;
          this.checkCodeTimer = setInterval(() => {
            this.checkCodeTime -= 1;
            if (this.checkCodeTime == 0) {
              clearInterval(this.checkCodeTimer);
            }
          }, 1000);
        })
        .catch((ex) => {
          if (ex.code === 11014) {
            this.$message.error('图片验证码不正确');
          } else {
            this.$message.error('发送失败：' + ex.message);
          }
        });
    },
    sendSmsChangeMobileBind() {
      if (!this.change_bind_mobile_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.change_bind_mobile_model.image_captcha_id || !this.change_bind_mobile_model.image_captcha) {
        this.$message.error('请输入图片验证码');
        return;
      }

      this.$store.state.im.userManage
        .asyncCaptchaSms({
          captcha: this.change_bind_mobile_model.image_captcha,
          image_id: this.change_bind_mobile_model.image_captcha_id,
          mobile: this.change_bind_mobile_model.mobile
        })
        .then(() => {
          this.checkCodeTime = 60;
          this.checkCodeTimer = setInterval(() => {
            this.checkCodeTime -= 1;
            if (this.checkCodeTime == 0) {
              clearInterval(this.checkCodeTimer);
            }
          }, 1000);
        })
        .catch((ex) => {
          if (ex.code === 11014) {
            this.$message.error('图片验证码不正确');
          } else {
            this.$message.error('发送失败：' + ex.message);
          }
        });
    },
    userVerificationByMobile() {
      if (!this.user_verification_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.user_verification_model.image_captcha_id || !this.user_verification_model.image_captcha) {
        this.$message.error('请输入图片验证码');
        return;
      }
      if (!this.user_verification_model.code) {
        this.$message.error('请输入手机验证码');
        return;
      }
      this.user_verification_model.code = this.user_verification_model.code.replace(/\s*/g, '');
      this.user_verification_model.mobile = this.user_verification_model.mobile.replace(/\s*/g, '');
      if (!this.user_verification_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.user_verification_model.code) {
        this.$message.error('请输入手机验证码');
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .userVerificationByMobile({
          captcha: this.user_verification_model.code,
          mobile: this.user_verification_model.mobile
        })
        .then(() => {
          this.dialog_user_verification = false;
          this.$store.dispatch('setting/actionGetUserVerification');
        })
        .catch((ex) => {
          if (ex.code == 10001) {
            this.$message.error('手机验证码不正确');
          } else if (ex.code == 11031) {
            this.$message.error('当前手机号认证用户达到上限，请使用其它手机号');
          } else if (ex.code == 10028) {
            this.$message.error('失败次数过多，请稍后重试。');
          } else {
            this.$message.error('认证失败：' + ex.message);
          }
        });
    },
    gotoVerification() {
      if (this.getUserVerification && this.getUserVerification.status == -1) {
        this.$message.error('当前服务器版本过旧，还不支持此功能，请升级服务器。');
      } else {
        this.dialog_user_verification = true;
      }
    },
    userBindMobile() {
      if (!this.user_bind_mobile_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.user_bind_mobile_model.image_captcha_id || !this.user_bind_mobile_model.image_captcha) {
        this.$message.error('请输入图片验证码');
        return;
      }
      if (!this.user_bind_mobile_model.code) {
        this.$message.error('请输入手机验证码');
        return;
      }
      this.user_bind_mobile_model.code = this.user_bind_mobile_model.code.replace(/\s*/g, '');
      this.user_bind_mobile_model.mobile = this.user_bind_mobile_model.mobile.replace(/\s*/g, '');
      if (!this.user_bind_mobile_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.user_bind_mobile_model.code) {
        this.$message.error('请输入手机验证码');
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .asyncUserMobileBind({
          captcha: this.user_bind_mobile_model.code,
          mobile: this.user_bind_mobile_model.mobile
        })
        .then(() => {
          this.dialog_user_bind_mobile = false;
          this.$store.dispatch('setting/actionGetProfile');
          this.$store.dispatch('setting/actionGetUserVerification');
        })
        .catch((ex) => {
          if (ex.code == 10001) {
            this.$message.error('手机验证码不正确');
          } else if (ex.code == 11012) {
            this.$message.error('当前手机号已经绑定过其它账号，请使用其它手机号');
          } else if (ex.code == 10028) {
            this.$message.error('失败次数过多，请稍后重试。');
          } else {
            this.$message.error('绑定失败：' + ex.message);
          }
        });
    },
    changeMobileBindCheckPassword() {
      if (!this.change_bind_mobile_model.password) {
        this.$message.error('请输入密码');
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .userChangeMobileCheckPassword({
          password: this.change_bind_mobile_model.password
        })
        .then((res) => {
          this.change_bind_mobile_model.sign = res.sign;
          this.timerImageChangeMobileBind();
        })
        .catch((ex) => {
          if (ex.code == 11001) {
            this.$message.error('密码不正确');
          } else {
            this.$message.error('密码验证失败：' + ex.message);
          }
        });
    },
    changeMobileBindCheckCurrentMobile() {
      if (!this.change_bind_mobile_model.code) {
        this.$message.error('请输入验证码');
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .userChangeMobileCheckMobile({
          captcha: this.change_bind_mobile_model.code,
          mobile: this.change_bind_mobile_model.mobile
        })
        .then((res) => {
          this.change_bind_mobile_model.mobile = '';
          this.change_bind_mobile_model.image_captcha = '';
          this.change_bind_mobile_model.code = '';
          this.change_bind_mobile_model.sign = res.sign;
          this.checkCodeTimer && clearInterval(this.checkCodeTimer);
          this.checkCodeTimer = null;
          this.checkCodeTime = 0;
          this.timerImageChangeMobileBind();
        })
        .catch((ex) => {
          if (ex.code == 11001) {
            this.$message.error('密码不正确');
          } else {
            this.$message.error('密码验证失败：' + ex.message);
          }
        });
    },
    changeBindMobile() {
      if (!this.change_bind_mobile_model.sign) {
        this.$message.error('绑定错误');
        return;
      }
      if (!this.change_bind_mobile_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.change_bind_mobile_model.image_captcha_id || !this.change_bind_mobile_model.image_captcha) {
        this.$message.error('请输入图片验证码');
        return;
      }
      if (!this.change_bind_mobile_model.code) {
        this.$message.error('请输入手机验证码');
        return;
      }
      this.change_bind_mobile_model.code = this.change_bind_mobile_model.code.replace(/\s*/g, '');
      this.change_bind_mobile_model.mobile = this.change_bind_mobile_model.mobile.replace(/\s*/g, '');
      if (!this.change_bind_mobile_model.mobile) {
        this.$message.error('请输入手机号');
        return;
      }
      if (!this.change_bind_mobile_model.code) {
        this.$message.error('请输入手机验证码');
        return;
      }
      const im = this.$store.state.im;
      im.userManage
        .userChangeMobile({
          captcha: this.change_bind_mobile_model.code,
          mobile: this.change_bind_mobile_model.mobile,
          sign: this.change_bind_mobile_model.sign
        })
        .then(() => {
          this.dialog_change_bind_mobile = false;
          this.$store.dispatch('setting/actionGetProfile');
          this.$store.dispatch('setting/actionGetUserVerification');
          this.$message.success('绑定成功');
        })
        .catch((ex) => {
          if (ex.code == 10001) {
            this.$message.error('手机验证码不正确');
          } else if (ex.code == 11012) {
            this.$message.error('当前手机号已经绑定过其它账号，请使用其它手机号');
          } else if (ex.code == 10028) {
            this.$message.error('失败次数过多，请稍后重试。');
          } else {
            this.$message.error('绑定失败：' + ex.message);
          }
        });
    },
    gotoChangeMobileBindByMobile() {
      this.timerImageChangeMobileBind();
      this.change_bind_mobile_model.mobile = this.mobile;
      this.change_bind_mobile_model.method = 'mobile';
    }
    //methods finish
  },

  watch: {
    getSettingInfo() {
      this.updateInfos();
    },
    getProfileInfo() {
      this.updateInfos();
    },
    dialog_user_verification(a, b) {
      a && this.calc_user_verification_model();
    },
    dialog_user_bind_mobile(a, b) {
      a && this.calc_user_bind_mobile_model();
    },
    dialog_change_bind_mobile(a, b) {
      a && this.calc_change_bind_mobile_model();
    }
  }
};
</script>

<style scoped>
.vm {
  vertical-align: middle;
}
.image-captcha-line {
  display: flex;
  align-items: center;
}
.image-captcha-input {
  width: 180px;
  height: 40px;
  margin-right: 10px;
  vertical-align: middle;
}
.image-captcha-image {
  width: 120px;
  height: 40px;
  cursor: pointer;
  vertical-align: middle;
}

.mobile-captcha-line {
  display: flex;
  align-items: center;
}

.mobile-captcha-input {
  width: 180px;
  height: 40px;
  margin-right: 10px;
  vertical-align: middle;
}

::v-deep .mobile-captcha-line .el-form-item__content {
  display: flex;
  align-items: center;
}

.mobile-captcha-button {
  width: 120px;
  height: 40px;
  vertical-align: middle;
  background: #47b6ff;
  line-height: 42px;
  text-align: center;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.verification_button {
  background: #47b6ff;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  margin-top: 10px;
  color: white;
  width: 100%;
}

.user_verification_form {
  margin-top: 40px;
}
.account_verification_note {
  margin-left: 10px;
}
.line_button {
  background: #47b6ff;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  margin-top: 10px;
  color: white;
  width: 100%;
}
.line_white_button {
  background: white;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  margin-top: 10px;
  color: #47b6ff;
  width: 100%;
  margin-left: 0px;
}

.password_input {
  height: 35px;
  width: 100%;
}

.mt20 {
  margin-top: 20px;
}
</style>
