<template>
  <div class="user_setting settings_panel settings_panel--modern">
    <div class="settings_panel_hero">
      <div class="avatar">
        <img :src="avatar" @click="touchedAvatar" class="av" />
        <img @click="viewQrcode" class="qrcode" src="/image/qr.png" />
      </div>
      <div class="settings_panel_name">{{ nick_name || $t('未设置昵称') }}</div>
      <div class="settings_panel_subtext">{{ mobile || user_id }}</div>
    </div>
    <input @change="fileChangeHandler" ref="fileRef" type="file" />
    <div class="settings_panel_body">
      <div class="settings_group">
        <div class="settings_group_title">{{ $t('账户信息') }}</div>
        <div class="line line--interactive" @click="mobile ? (dialog_change_bind_mobile = true) : (dialog_user_bind_mobile = true)">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M7 4h10v16H7z"></path>
              <path d="M11 17h2"></path>
            </svg>
            <span>{{ $t('手机号码') }}</span>
          </span>
          <p class="lr">
            <span>{{ mobile || $t('去绑定') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_chevron"><path d="M9 6l6 6-6 6"></path></svg>
          </p>
        </div>
        <div class="line line--interactive" @click="settingNick">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path>
              <path d="M5 20a7 7 0 0 1 14 0"></path>
            </svg>
            <span>{{ $t('昵称') }}</span>
          </span>
          <p class="lr">
            <span>{{ nick_name || $t('点击设置') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_chevron"><path d="M9 6l6 6-6 6"></path></svg>
          </p>
        </div>
        <div class="line">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
            <span>ID</span>
          </span>
          <p class="lr">
            <span>{{ user_id }}</span>
          </p>
        </div>
      </div>
      <div class="settings_group">
        <div class="settings_group_title">{{ $t('安全与认证') }}</div>
        <div class="line line--interactive" @click="getUserVerification && getUserVerification.status == 1 ? (dialog_user_verification_finish = true) : gotoVerification()">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M12 3l7 3v5c0 4.5-2.7 7.9-7 10-4.3-2.1-7-5.5-7-10V6l7-3z"></path>
            </svg>
            <span>{{ $t('实名认证') }}</span>
          </span>
          <p class="lr">
            <span>{{ getUserVerification && getUserVerification.status == 1 ? $t('已认证') : $t('去认证') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_chevron"><path d="M9 6l6 6-6 6"></path></svg>
          </p>
        </div>
        <div class="line line--interactive" @click="swtichAccount">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M7 7h10"></path>
              <path d="M7 12h10"></path>
              <path d="M7 17h6"></path>
            </svg>
            <span>{{ $t('切换账号') }}</span>
          </span>
          <p class="lr">
            <span>{{ $t('查看') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_chevron"><path d="M9 6l6 6-6 6"></path></svg>
          </p>
        </div>
      </div>
      <div class="settings_group">
        <div class="settings_group_title">{{ $t('通用设置') }}</div>
        <div class="line">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M4.5 18l3.2-12 3.2 12"></path>
              <path d="M5.8 13h3.8"></path>
              <path d="M13 7h7"></path>
              <path d="M16.5 7v3"></path>
              <path d="M14.2 11.5c.9 2.7 2.4 4.9 4.8 6.5"></path>
              <path d="M18.8 11.5c-.7 2.1-2.1 4.3-4.8 6.5"></path>
            </svg>
            <span>{{ $t('common.language') }}</span>
          </span>
          <label class="settings_language_select_wrap">
            <select :value="$localeState.locale" class="settings_language_select" @change="applyLocaleChange($event.target.value)">
              <option :key="option.value" :value="option.value" v-for="option in languageOptions">
                {{ option.label }}
              </option>
            </select>
            <span class="settings_language_caret" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5"></path>
              </svg>
            </span>
          </label>
        </div>
      </div>
      <div class="settings_group">
        <div class="settings_group_title">{{ $t('隐私与通知') }}</div>
        <div class="line">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M12 3l7 3v5c0 4.5-2.7 7.9-7 10-4.3-2.1-7-5.5-7-10V6l7-3z"></path>
            </svg>
            <span>{{ $t('好友验证') }}</span>
          </span>
          <label class="settings_toggle">
            <input :checked="auth_mode === 1" type="checkbox" @change="rosterSwitchTouch" />
            <span class="settings_toggle_track"></span>
          </label>
        </div>
        <div class="line">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M6 7h12"></path>
              <path d="M4 12h16"></path>
              <path d="M7 17h10"></path>
            </svg>
            <span>{{ $t('群邀请验证') }}</span>
          </span>
          <label class="settings_toggle">
            <input :checked="group_confirm" type="checkbox" @change="groupSwitchTouch" />
            <span class="settings_toggle_track"></span>
          </label>
        </div>
      </div>
      <div class="settings_group">
        <div class="settings_group_title">{{ $t('应用信息') }}</div>
        <div class="line line--interactive" @click="gotoAboutPage">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 10v6"></path>
              <path d="M12 7h.01"></path>
            </svg>
            <span>{{ $t('关于') }}</span>
          </span>
          <p class="lr">
            <span>{{ $t('查看') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_chevron"><path d="M9 6l6 6-6 6"></path></svg>
          </p>
        </div>
        <div class="line line--interactive" @click="gotoAboutPage">
          <span class="ll">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_item_icon">
              <path d="M12 3l7 3v5c0 4.5-2.7 7.9-7 10-4.3-2.1-7-5.5-7-10V6l7-3z"></path>
              <path d="M9.5 12.5l1.8 1.8 3.7-4"></path>
            </svg>
            <span>{{ $t('认证信息') }}</span>
          </span>
          <p class="lr">
            <span>{{ trustBadgeText }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="settings_chevron"><path d="M9 6l6 6-6 6"></path></svg>
          </p>
        </div>
      </div>
    </div>
    <button @click="logout" class="logout settings_logout" type="button">{{ $t('退出') }}</button>
    <el-dialog :title="$t('切换账号')" :visible.sync="show_swtich_account" :modal="false">
      <el-table :data="this.getApp().getLoginInfoList()" style="width: 100%" border fit highlight-current-row @current-change="handleCurrentChange" height="240" size="mini">
        <el-table-column :label="$t('账号列表')">
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
        <el-button @click="cancelChangeAccount()">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="changeAccount()">{{ $t('common.confirm') }}</el-button>
      </span>
    </el-dialog>
    <el-dialog :title="$t('实名认证')" :visible.sync="dialog_user_verification_finish" :modal="false">
      <p class="account_verification_note" v-if="getUserVerification && getUserVerification.status == 1">
        {{ $t('您已完成实名认证，手机号为：') }}{{ getUserVerification.mobile }}
      </p>
      <el-button
        @click="
          dialog_user_verification_finish = false;
          dialog_user_verification = true;
        "
        class="verification_button"
        type="primary"
      >
        {{ $t('重新认证') }}
      </el-button>
    </el-dialog>
    <el-dialog :title="$t('实名认证')" :visible.sync="dialog_user_verification" :modal="false">
      <p class="account_verification_note" v-if="getUserVerification && getUserVerification.status == 1">
        {{ $t('您已完成实名认证，手机号为：') }}{{ getUserVerification.mobile }}
      </p>
      <p v-else class="account_verification_note">{{ $t('您还未完成实名认证，请尽快完成实名认证。') }}</p>
      <el-form label-width="0px" class="user_verification_form">
        <el-form-item class="mt0 mb5" prop="mobile">
          <el-input class="w300 h30" :placeholder="$t('手机号')" v-model="user_verification_model.mobile"></el-input>
        </el-form-item>
        <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
          <el-input class="image-captcha-input" :placeholder="$t('图片验证码')" v-model="user_verification_model.image_captcha"></el-input>
          <img :src="codeImageSrc" @click="timerImage" class="image-captcha-image" v-if="codeImageSrc" />
        </el-form-item>
        <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
          <el-input class="mobile-captcha-input" :placeholder="$t('手机验证码')" v-model="user_verification_model.code"></el-input>
          <div :disabled="checkCodeTime > 0" @click="sendSms" class="mobile-captcha-button">{{ checkText }}</div>
        </el-form-item>
      </el-form>

      <el-button @click="userVerificationByMobile" class="verification_button" type="primary">{{ $t('实名认证') }}</el-button>
    </el-dialog>
    <el-dialog :title="$t('绑定手机号')" :visible.sync="dialog_user_bind_mobile" :modal="false">
      <el-form label-width="0px" class="user_verification_form">
        <el-form-item class="mt0 mb5" prop="mobile">
          <el-input class="w300 h30" :placeholder="$t('手机号')" v-model="user_bind_mobile_model.mobile"></el-input>
        </el-form-item>
        <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
          <el-input class="image-captcha-input" :placeholder="$t('图片验证码')" v-model="user_bind_mobile_model.image_captcha"></el-input>
          <img :src="codeImageSrcBindMobile" @click="timerImageBindMobile" class="image-captcha-image" v-if="codeImageSrcBindMobile" />
        </el-form-item>
        <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
          <el-input class="mobile-captcha-input" :placeholder="$t('手机验证码')" v-model="user_bind_mobile_model.code"></el-input>
          <div :disabled="checkCodeTime > 0" @click="sendSmsMobileBind" class="mobile-captcha-button">{{ checkText }}</div>
        </el-form-item>
      </el-form>

      <el-button @click="userBindMobile" class="verification_button" type="primary">{{ $t('绑定') }}</el-button>
    </el-dialog>
    <el-dialog :title="changeMobileBindTitle" :visible.sync="dialog_change_bind_mobile" :modal="false">
      <div v-if="change_bind_mobile_model.method == 'mobile' && !change_bind_mobile_model.sign">
        <p>{{ $t('已绑定手机号验证身份') }}</p>
        <el-form label-width="0px" class="user_verification_form">
          <el-form-item class="mt20 mb5" prop="mobile">
            <el-input disabled class="w300 h30" :placeholder="$t('手机号')" v-model="change_bind_mobile_model.mobile"></el-input>
          </el-form-item>
          <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
            <el-input class="image-captcha-input" :placeholder="$t('图片验证码')" v-model="change_bind_mobile_model.image_captcha"></el-input>
            <img :src="codeImageSrcChangeMobileBind" @click="timerImageChangeMobileBind" class="image-captcha-image" v-if="codeImageSrcChangeMobileBind" />
          </el-form-item>
          <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
            <el-input class="mobile-captcha-input" :placeholder="$t('手机验证码')" v-model="change_bind_mobile_model.code"></el-input>
            <div :disabled="checkCodeTime > 0" @click="sendSmsChangeMobileBind" class="mobile-captcha-button">{{ checkText }}</div>
          </el-form-item>
        </el-form>
        <el-button :disabled="!change_bind_mobile_model.code" @click="changeMobileBindCheckCurrentMobile" class="line_button mt20" type="primary">{{ $t('继续') }}</el-button>
      </div>
      <div v-else-if="change_bind_mobile_model.method == 'password' && !change_bind_mobile_model.sign">
        <p>{{ $t('登录密码验证身份') }}</p>
        <el-input class="password_input" autocomplete="false" :placeholder="$t('输入登录密码')" type="password" v-model="change_bind_mobile_model.password" />
        <el-button :disabled="!change_bind_mobile_model.password" @click="changeMobileBindCheckPassword" class="line_button mt20" type="primary">{{ $t('继续') }}</el-button>
      </div>
      <div v-else-if="change_bind_mobile_model.sign">
        <p>{{ $t('请输入新的手机号') }}</p>
        <el-form label-width="0px" class="user_verification_form">
          <el-form-item class="mt20 mb5" prop="mobile">
            <el-input class="w300 h30" :placeholder="$t('手机号')" v-model="change_bind_mobile_model.mobile"></el-input>
          </el-form-item>
          <el-form-item class="mt0 mb5 image-captcha-line" prop="image_captcha">
            <el-input class="image-captcha-input" :placeholder="$t('图片验证码')" v-model="change_bind_mobile_model.image_captcha"></el-input>
            <img :src="codeImageSrcChangeMobileBind" @click="timerImageChangeMobileBind" class="image-captcha-image" v-if="codeImageSrcChangeMobileBind" />
          </el-form-item>
          <el-form-item class="mt0 mb5 mobile-captcha-line" prop="code">
            <el-input class="mobile-captcha-input" :placeholder="$t('手机验证码')" v-model="change_bind_mobile_model.code"></el-input>
            <div :disabled="checkCodeTime > 0" @click="sendSmsChangeMobileBind" class="mobile-captcha-button">{{ checkText }}</div>
          </el-form-item>
        </el-form>

        <el-button @click="changeBindMobile" class="verification_button" type="primary">{{ $t('绑定') }}</el-button>
      </div>
      <div v-else>
        <p>{{ $t('您已绑定手机号') }} {{ mobile }}</p>
        <el-button @click="gotoChangeMobileBindByMobile" class="line_button" type="primary">{{ $t('通过手机验证码方式') }}</el-button>
        <el-button @click="change_bind_mobile_model.method = 'password'" class="line_white_button">{{ $t('通过密码更换') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { getLocale, LANGUAGE_OPTIONS } from '../../../../i18n';

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
    trustBadgeText() {
      const im = this.$store.getters.im;
      if (!im) return this.$t('认证信息');
      const appid = im.userManage.getAppid();
      const accountVerification = im.sysManage.getAccountVerification(appid);
      if (!accountVerification) return this.$t('认证信息');

      let prefix = '';
      if (!accountVerification.type || accountVerification.type !== 'enterprise') {
        prefix = `${this.$translateText('个人开发者：').replace(/：$/, '')} `;
      } else if (accountVerification.status === 'unverified' && !accountVerification.name) {
        prefix = `${this.$translateText('公司')} `;
      }

      const statusPrefixMap = {
        verified: this.$t('已认证：'),
        expired: this.$t('认证失败：'),
        unverified: this.$t('未认证开发者：')
      };

      return prefix + (statusPrefixMap[accountVerification.status] || '') + (accountVerification.name || this.$t('认证信息'));
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
        return this.$t('common.seconds', { count: this.checkCodeTime });
      }
      return this.$t('获取验证码');
    },
    changeMobileBindTitle() {
      if (this.change_bind_mobile_model.sign) {
        return this.$t('绑定新手机号');
      } else if (this.change_bind_mobile_model.method == 'mobile') {
        return this.$t('验证手机号');
      } else if (this.change_bind_mobile_model.method == 'password') {
        return this.$t('验证密码');
      } else {
        return this.$t('更改绑定手机号');
      }
    },
    currentLanguageLabel() {
      const matched = LANGUAGE_OPTIONS.find((option) => option.value === this.$localeState.locale);
      return matched ? matched.label : this.$localeState.locale;
    },
    languageOptions() {
      return LANGUAGE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label
      }));
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
          alert(this.$t('更新头像完成'));
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
          alert(this.$t('修改成功'));
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
          alert(this.$t('修改成功'));
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
      this.$confirm(this.$t('确认退出当前账号登录吗？'), this.$t('退出登录'), {
        confirmButtonText: this.$t('common.confirm'),
        cancelButtonText: this.$t('common.cancel'),
        center: true
      })
        .then(() => {
          this.getApp().imLogout(false, true);
          this.$store.dispatch('login/actionChangeAppStatus', 'login');
          this.$store.dispatch('header/actionChangeHeaderUserProfile', {});
        })
        .catch(() => {});
    },
    gotoAboutPage() {
      this.$store.dispatch('header/actionChangeHeaderStatus', 'about_us');
      this.$store.dispatch('content/actionSetType', { type: 'verification' });
    },
    applyLocaleChange(locale) {
      if (!locale || locale === this.$localeState.locale) {
        return;
      }
      this.$setLocale(locale);
      this.$message.success(this.$t('common.languageChanged'));
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
      this.$prompt(this.$t('请输入手机号'), this.$t('提示'), {
        confirmButtonText: this.$t('common.confirm'),
        cancelButtonText: this.$t('common.cancel'),
        customClass: 'settings-message-box',
        inputPattern: /^((13[0-9])|(14[0-9])|(15[^4,\\D])|(166)|(17[0-9])|(18[0-9]))\\d{8}$/,
        inputErrorMessage: this.$t('手机号格式不正确')
      })
        .then(({ value }) => {
          if (!value) return;
          this.$store.getters.im.userManage.asyncUpdateMobile({ mobile: value }).then(() => {
            this.mobile = value;
            alert(this.$t('修改成功'));
          });
        })
        .catch(() => {});
    },
    settingNick() {
      const im = this.$store.getters.im;
      this.$prompt(this.$t('请输入昵称'), this.$t('提示'), {
        confirmButtonText: this.$t('common.confirm'),
        cancelButtonText: this.$t('common.cancel'),
        customClass: 'settings-message-box'
      })
        .then(({ value }) => {
          if (!value) return;
          im.userManage.asyncUpdateNickName({ nick_name: value }).then(() => {
            this.nick_name = value;
            this.$store.dispatch('header/actionGetHeaderProfile');
            alert(this.$t('修改成功'));
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
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.user_verification_model.image_captcha_id || !this.user_verification_model.image_captcha) {
        this.$message.error(this.$t('请输入图片验证码'));
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
            this.$message.error(this.$t('图片验证码不正确'));
          } else {
            this.$message.error(this.$t('error.sendFailedWithReason', { message: ex.message }));
          }
        });
    },
    sendSmsMobileBind() {
      if (!this.user_bind_mobile_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.user_bind_mobile_model.image_captcha_id || !this.user_bind_mobile_model.image_captcha) {
        this.$message.error(this.$t('请输入图片验证码'));
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
            this.$message.error(this.$t('图片验证码不正确'));
          } else {
            this.$message.error(this.$t('error.sendFailedWithReason', { message: ex.message }));
          }
        });
    },
    sendSmsChangeMobileBind() {
      if (!this.change_bind_mobile_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.change_bind_mobile_model.image_captcha_id || !this.change_bind_mobile_model.image_captcha) {
        this.$message.error(this.$t('请输入图片验证码'));
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
            this.$message.error(this.$t('图片验证码不正确'));
          } else {
            this.$message.error(this.$t('error.sendFailedWithReason', { message: ex.message }));
          }
        });
    },
    userVerificationByMobile() {
      if (!this.user_verification_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.user_verification_model.image_captcha_id || !this.user_verification_model.image_captcha) {
        this.$message.error(this.$t('请输入图片验证码'));
        return;
      }
      if (!this.user_verification_model.code) {
        this.$message.error(this.$t('请输入手机验证码'));
        return;
      }
      this.user_verification_model.code = this.user_verification_model.code.replace(/\s*/g, '');
      this.user_verification_model.mobile = this.user_verification_model.mobile.replace(/\s*/g, '');
      if (!this.user_verification_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.user_verification_model.code) {
        this.$message.error(this.$t('请输入手机验证码'));
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
            this.$message.error(this.$t('手机验证码不正确'));
          } else if (ex.code == 11031) {
            this.$message.error(this.$t('当前手机号认证用户达到上限，请使用其它手机号'));
          } else if (ex.code == 10028) {
            this.$message.error(this.$t('失败次数过多，请稍后重试。'));
          } else {
            this.$message.error(this.$t('error.authFailedWithReason', { message: ex.message }));
          }
        });
    },
    gotoVerification() {
      if (this.getUserVerification && this.getUserVerification.status == -1) {
        this.$message.error(this.$t('当前服务器版本过旧，还不支持此功能，请升级服务器。'));
      } else {
        this.dialog_user_verification = true;
      }
    },
    userBindMobile() {
      if (!this.user_bind_mobile_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.user_bind_mobile_model.image_captcha_id || !this.user_bind_mobile_model.image_captcha) {
        this.$message.error(this.$t('请输入图片验证码'));
        return;
      }
      if (!this.user_bind_mobile_model.code) {
        this.$message.error(this.$t('请输入手机验证码'));
        return;
      }
      this.user_bind_mobile_model.code = this.user_bind_mobile_model.code.replace(/\s*/g, '');
      this.user_bind_mobile_model.mobile = this.user_bind_mobile_model.mobile.replace(/\s*/g, '');
      if (!this.user_bind_mobile_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.user_bind_mobile_model.code) {
        this.$message.error(this.$t('请输入手机验证码'));
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
            this.$message.error(this.$t('手机验证码不正确'));
          } else if (ex.code == 11012) {
            this.$message.error(this.$t('当前手机号已经绑定过其它账号，请使用其它手机号'));
          } else if (ex.code == 10028) {
            this.$message.error(this.$t('失败次数过多，请稍后重试。'));
          } else {
            this.$message.error(this.$t('error.bindFailedWithReason', { message: ex.message }));
          }
        });
    },
    changeMobileBindCheckPassword() {
      if (!this.change_bind_mobile_model.password) {
        this.$message.error(this.$t('请输入密码'));
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
            this.$message.error(this.$t('密码不正确'));
          } else {
            this.$message.error(this.$t('error.verifyPasswordFailedWithReason', { message: ex.message }));
          }
        });
    },
    changeMobileBindCheckCurrentMobile() {
      if (!this.change_bind_mobile_model.code) {
        this.$message.error(this.$t('请输入验证码'));
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
            this.$message.error(this.$t('密码不正确'));
          } else {
            this.$message.error(this.$t('error.verifyPasswordFailedWithReason', { message: ex.message }));
          }
        });
    },
    changeBindMobile() {
      if (!this.change_bind_mobile_model.sign) {
        this.$message.error(this.$t('绑定错误'));
        return;
      }
      if (!this.change_bind_mobile_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.change_bind_mobile_model.image_captcha_id || !this.change_bind_mobile_model.image_captcha) {
        this.$message.error(this.$t('请输入图片验证码'));
        return;
      }
      if (!this.change_bind_mobile_model.code) {
        this.$message.error(this.$t('请输入手机验证码'));
        return;
      }
      this.change_bind_mobile_model.code = this.change_bind_mobile_model.code.replace(/\s*/g, '');
      this.change_bind_mobile_model.mobile = this.change_bind_mobile_model.mobile.replace(/\s*/g, '');
      if (!this.change_bind_mobile_model.mobile) {
        this.$message.error(this.$t('请输入手机号'));
        return;
      }
      if (!this.change_bind_mobile_model.code) {
        this.$message.error(this.$t('请输入手机验证码'));
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
          this.$message.success(this.$t('绑定成功'));
        })
        .catch((ex) => {
          if (ex.code == 10001) {
            this.$message.error(this.$t('手机验证码不正确'));
          } else if (ex.code == 11012) {
            this.$message.error(this.$t('当前手机号已经绑定过其它账号，请使用其它手机号'));
          } else if (ex.code == 10028) {
            this.$message.error(this.$t('失败次数过多，请稍后重试。'));
          } else {
            this.$message.error(this.$t('error.bindFailedWithReason', { message: ex.message }));
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
.settings_language_select_wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 150px;
}

.settings_language_select {
  min-width: 132px;
  max-width: 150px;
  padding: 7px 26px 7px 10px;
  border: 1px solid rgba(98, 116, 156, 0.16);
  border-radius: 10px;
  background: #f7f9fc;
  color: #22324b;
  font-size: 13px;
  font-weight: 600;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  outline: none;
  cursor: pointer;
}

.settings_language_caret {
  position: absolute;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8190a3;
  pointer-events: none;
}

.settings_language_caret svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
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
