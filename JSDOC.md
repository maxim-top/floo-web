# 蓝莺IM SDK：floo-web API 介绍

## 选型先读

蓝莺IM 前端 Web SDK 共有三个版本，请按需选择：

1.  [Web 版](https://github.com/maxim-top/lanying-im-web)，主要供 PC 桌面浏览器使用，适合各种传统前端应用；
2.  [Uni-app 版](https://github.com/maxim-top/lanying-im-uniapp)，基于 DCloud.io 的 uni-app 框架开发，供 H5 和各种小程序（微信/支付宝/百度/头条/QQ/钉钉/淘宝），也可发布到 iOS、Android、快应用等平台；
3.  [微信小程序版](https://github.com/maxim-top/lanying-im-miniprogram)，符合微信小程序标准的原生版本，功能跟 uni-app 版完全一致；

以下文档以 Web 版为例，所有版本基本一致。与此同时，DemoApp 源码均已开放，建议直接参考开发。

## 前期准备

下载对应 SDK 文件，桌面 Web 版地址为：[floo-2.0.0.js](https://package.lanyingim.com/floo-2.0.0.js)，并在代码中引用。

## 初始化

首先设置 AppID

```
    const config = {
      // dnsServer: "https://dns.lanyingim.com/v2/app_dns",
      appid: "YOUR_APP_ID",
      ws: false,
      autoLogin: true
      };
```

然后创建 im 对象，供全局调用。

当前支持两种方式：

1.  Script 方式，你可以直接 import 后，使用 window.flooIM()

```
    import "floo-2.0.0.js";

    const im = new window.flooIM(config);
```

这种方式主要为支持浏览器中使用 script 标签引用，但会存在初始化并发问题，所以要用 try-catch-retry，请参见[lanying-im-web 源码](https://github.com/maxim-top/lanying-im-web/blob/master/src/ui/index.vue#L85)。

2.  module 方式，import flooim 后，使用 flooim()

```
    import flooim from 'floo-2.0.0';

    const im = flooim(config);
```

## base 基础部分

登录

```
        im.login({
          mobile:String, #与name 2选1
          name:String,
          password:String,
        })
```

监听  
具体事件列表见本文档的"事件通知"部分

```
        im.on('events', (ret) => {
          //do something with ret
        })
        // or
        im.on({
          eventName: (ret) => {
            //do something with ret
          },
          ...
        })

```

取消监听

```
        im.off('events', (ret) => {
          //do something with ret
        })
        // or
        im.off({
          eventName: (ret) => {
            //do something with ret
          },
        ...
        })

```

二维码登录

```
      im.qrlogin({
        password,
        user_id
      });

```

token 登录

```
        im.tokenLogin(user_id, token)

```

## userManager

用户注册

```
        userManage.asyncRegister({
          username,
          password
        }).then(() => {
          //
        });

```

获取登录用户的 token

```
        const token =  im.userManage.getToken();

```

获取登录用户的 uid

```
        const cuid = im.userManage.getUid();

```

获取 appid

```
        const appid = im.userManage.getAppid();

```

获取最近回话列表

```
        const list = im.userManage.getConversationList();

```

发送验证码

```
        im.userManage
        .asyncUserSendSms({
          mobile,
        })
        .then(() => {
          //
        });

```

发送验证码（通过图片验证码）

```
        im.userManage
        .asyncCaptchaSms({
          captcha,
          image_id,
          mobile,
        })
        .then(() => {
          //
        });

```

检查用户名是否可用

```
        im.userManage.asyncUserNameCheck(username).then(() => {
          //
        });

```

绑定手机号-使用签名绑定

```
        im.userManage.asyncUserMobileBindSign({
            mobile,
            sign,
          }).then(() => {
            //
          });

```

手机号验证码登录

```
        im.userManage.asyncUserMobileLogin({
          captcha,
          mobile
        })
        .then(res => {
          //
        });

```

更新手机号

```
        im.userManage
        .asyncUpdateMobile({ mobile })
        .then(() => {
          //
        });

```

更新头像

```
        im.userManage
        .asyncUpdateAvatar({
          avatar
        })
        .then(() => {
          //
        });

```

更新昵称

```
        im.userManage.asyncUpdateNickName({ nick_name }).then(() => {
          //
        });

```

获取用户 profile

```
        im.userManage.asyncGetProfile(true).then(res => {
          //
        })

```

更新用户 profile

```
        im.userManage.asyncUpdateProfile({
          username,
          avatar
        }).then(res => {
          //
        })

```

获取用户设置信息

```
        im.userManage.asyncGetSettings().then(res => {
          //
        })

```

修改用户设置

```
        im.userManage
        .asyncUpdateSettings({
          "auth_answer": "string",
          "auth_mode": 0,
          "auth_question": "string",
          "auto_download": true,
          "group_confirm": true,
          "id": 0,
          "no_push": true,
          "no_push_detail": true,
          "no_push_end_hour": 0,
          "no_push_start_hour": 0,
          "no_sounds": true,
          "push_nick_name": "string",
          "user_id",
          "vibratory": true
        }).then(() => {
          //
        });

```

## rosterManager

获取好友 id 列表

```
        im.rosterManage.asyncGetRosterIdList().then(res => {
          //
        });

```

获取好友信息

```
        im.rosterManage.asyncGetRosterInfo(state.sid).then(res => {
          //
        })

```

根据 id 列表获取用户详细信息

```
        im.rosterManage.asnycGetRosterListDetailByIds(rosterIdList).then(res => {
          //
        });

```

根据 id 获取聊天信息

```
        const rosterMessages = im.rosterManage.getRosterMessageByRid(uid);

```

读取消息

```
        im.rosterManage.readRosterMessage(uid);

```

删除好友

```
        im.rosterManage
        .asyncDeleteRoster({ user_id})
        .then(() => {
          alert("好友已删除");
        });

```

获取缓存的所有新用户

```
        const userMaps = im.rosterManage.getAllRosterDetail();

```

撤回消息，只能撤回 5 分钟内的

```
        im.rosterManage.recallMessage(user_id, message_id);

```

删除消息

```
        im.rosterManage.deleteMessage(user_id, message_id);

```

获取用户的未读数

```
        const unreadCount = im.rosterManage.getUnreadCount(user_id) :

```

设置消息成未读

```
        im.rosterManage.unreadMessage(user_id, message_id);

```

获取好友信息

```
        const roserInfo = im.rosterManage.getRosterInfo(user_id);

```

获取好友申请列表

```
        im.rosterManage
        .asyncGetApplyList({ cursor: "" })
        .then((res = []) => {
          //
        });

```

获取黑名单

```
        im.rosterManage
        .asyncGetBlockedlist()
        .then((res = []) => {
          //
        });

```

加入黑名单

```
        im.rosterManage
        .asyncBlockeAdd(user_id)
        .then((res = []) => {
          //
        });

```

移除黑名单

```
        im.rosterManage
        .asyncBlockeRemove(user_id)
        .then((res = []) => {
          //
        });

```

请求加为好友

```
        im.rosterManage
        .asyncApply({ user_id, alias })
        .then((res = []) => {
          //
        });

```

通过好友申请

```
        im.rosterManage
        .asyncAccept({ user_id })
        .then((res = []) => {
          //
        });

```

拒绝好友申请

```
        im.rosterManage
        .asyncDecline({ user_id })
        .then((res = []) => {
          //
        });

```

按名称搜索用户

```
        im.rosterManage
        .asyncSearchRosterByName({ username })
        .then((res = []) => {
          //
        });

```

按 ID 搜索用户

```
        im.rosterManage
        .asyncSearchRosterById({ user_id })
        .then((res = []) => {
          //
        });

```

## groupManager

获取群信息

```
        im.groupManage.asyncGetGroupInfo(group_id, fromServer).then(res => {
          //
        })

```

获取加入的群组

```
        im.groupManage.asyncGetJoinedGroups().then(res => {
          //
        });

```

打开群组

```
        // 此方法会准备群组聊天界面的一些必备信息。
        im.groupManage.openGroup(group_id);

```

获取缓存的所有群组详情

```
        const allGroupMap = im.groupManage.getAllGroupDetail();

```

获取群组成员（异步）

```
        im.groupManage.asyncGetGroupMembers(group_id, fromServer).then(res => {
          //
        });

```

获取群组成员（同步）

```
        const members = im.groupManage.getGroupMembers(group_id);

```

按 id 获取群组详情

```
        im.groupManage.asyncGetGroupListDetail(groupIds).then(res => {
          //
        });

```

获取群消息

```
        const groupMessages = rootState.im.groupManage.getGruopMessage(group_id);

```

将群消息设置已读

```
        im.groupManage.readGroupMessage(group_id)

```

撤回消息

```
        im.groupManage.recallMessage(group_id, message_id)

```

获取群未读消息数

```
        const unreadCount = im.groupManage.getUnreadCount(group_id);

```

获取群管理员列表

```
        im.groupManage.asyncGetAdminList({ group_id }).then(res => {
          //
        })

```

群添加管理员

```
        im.groupManage.asyncAdminAdd({
          group_id,
          user_list
        })
        .then(() => {
          //
        });

```

移除管理员

```
        im.groupManage.asyncAdminRemove({ group_id, user_list }).then(() => {
          //
        });

```

获取群公告详情

```
        im.groupManage.asyncGetAnouncementById( {announcement_id, group_id} ).then(res => {
          //
        });

```

删除群公告

```
        im.groupManage
        .asyncAnouncementDelete({ group_id, announcement_id })
        .then(() => {
          //
        });

```

添加群公告

```
        im.groupManage.asyncAnnouncementEdit({ title, content, group_id })
        .then(() => {
          //
        });

```

群公告列表

```
        im.groupManage.asyncGetAnnouncementList({ group_id }).then((res = []) => {
          //
        });

```

创建群组

```
        im.groupManage.asyncCreate({
          name,
          type,
          avatar,
          description,
          user_list,
        })
        .then(() => {
          //
        });

```

解散群组

```
        im.groupManage.asyncDestroy({ group_id })
        .then(() => {
          alert("您已解散了此群。。");
        });

```

获取群组详情

```
        im.groupManage.asyncGetInfo({ group_id }).then(res => {
          //
        });

```

更新群头像

```
        im.groupManage.asyncUpdateAvatar({
          group_id,
          value,
        })
        .then(() => {
          alert("更新头像完成");
        });

```

更新群描述

```
        im.groupManage.asyncUpdateDescription({
          group_id,
          value
        })
        .then(() => {
          //
        });

```

更新群名称

```
        im.groupManage.asyncUpdateName({
          group_id,
          value
        })
        .then(() => {
          //
        });

```

获取群成员

```
        im.groupManage.asyncGetMemberList(group_id, fromServer).then(res => {
          //
        });

```

设置群消息免打扰情况

```
        im.groupManage.asyncGroupMsgMutemode({
          group_id,
          msg_mute_mode
        })
        .then(() => {
          this.groupInfo.msg_mute_mode = this.groupInfo.msg_mute_mode ? 0 : 2;
        });

```

获取群黑名单

```
        im.groupManage.asyncGroupBannedList({ group_id }).then(res => {
          //
        });

```

禁言群成员

```
        im.groupManage.asyncGroupBab({ group_id, duration, user_list }).then(() => {
          //
        });

```

解除成员

```
        im.groupManage.asyncGroupUnban({ group_id, user_list }).then(() => {
          //
        });

```

设置群成员是否可以邀请

```
        im.groupManage.asyncUpdateAllowMemberInvitation({
          group_id,
          value
        })
        .then(() => {
          //
        });

```

设置群成员是否可以修改群信息

```
        im.groupManage.asyncUpdateAllowMemberModify({
          group_id,
          value
        })
        .then(() => {
          //
        });

```

设置群是否开启已读模式

```
        im.groupManage.asyncUpdateEnableReadack({
          group_id,
          value
        })
        .then(() => {
          //
        });

```

设置群历史是否可见

```
        im.groupManage.asyncUpdateHistoryVisible({
          group_id,
          value
        })
        .then(() => {
          //
        });

```

设置入群是否需要申请

```
        im.groupManage.asyncUpdateRequireadminapproval({
          group_id,
          apply_approval
        })
        .then(() => {
          //
        });

```

更换群主

```
        im.groupManage.asyncOwnerTransfer({
          group_id,
          new_owner
        })
        .then(() => {
          //
        });

```

申请加入群

```
        im.groupManage.asyncApply({ group_id, reason })
        .then(() => {
          //
        });

```

同意/拒绝申请用户加入群

```
        im.groupManage.asyncApplyHandle({
          approval: true/false,
          user_id,
          group_id
        }).then(() => {
          //
        });

```

获取群黑名单

```
        im.groupManage.asyncGroupBockedlist({ group_id }).then(res => {
          //
        });

```

将成员加入黑名单

```
        im.groupManage.asyncGroupBlock({ group_id, user_list }).then(() => {
          //
        });

```

解除黑名单

```
        im.groupManage.asyncGroupUnblock({ group_id, user_list })
        .then(() => {
          //
        });

```

踢出群组

```
        im.groupManage.asyncKick({ group_id, user_list }).then(() => {
          //
        });

```

获取群邀请列表

```
        this.im.groupManage.asyncGetInvitationList().then(res => {
          //
        });

```

邀请成员加入群

```
        im.groupManage.asyncInvite({ group_id, user_list }).then(() => {
          /
        });

```

同意/拒绝群邀请

```
        im.groupManage.asyncInviteHandle({
          approval: true,
          user_id,
          group_id
        }).then(() => {
          //
        });

```

退出群

```
        im.groupManage.asyncLeave({ group_id })
        .then(() => {
          //
        });

```

修改群名片

```
        im.groupManage.asyncUpdateDisplayName({
          group_id,
          value
        })
        .then(() => {
          //
        });

```

获取群申请列表

```
        im.groupManage.asncGetApplicationList({ group_list }).then(rs => {
          //
        });

```

获取群文件

```
        im.groupManage.asyncGetFileList({ group_id }).then((res = []) => {
          //
        });

```

删除群文件

```
        im.groupManage.asyncFileDelete({ file_list, group_id }).then(() => {
          //
        });

```

## sysManager

发送好友消息

```
        im.sysManage.sendRosterMessage({
          type,
          uid,
          content,
          attachment
        });

```

发送群消息

```
        im.sysManage.sendGroupMessage({
          type,
          gid,
          content,
          attachment
        });

```

群发送@消息

```
        im.sysManage.sendMentionMessage({
          gid,
          txt,
          mentionAll,
          mentionList,
          mentionedMessage,
          pushMessage,
          senderNickname
        });

```

发送输入状态消息

```
        im.sysManage.sendInputStatusMessage(roster_id, "nothing"/"typing");

```

转发消息

```
        im.sysManage.forwardMessage({
          uid,
          gid, //2选1
          mid,
        });

```

请求历史消息

```
        im.sysManage.requireHistoryMessage(roster_id/group_id, mid, amount);
        // mid：消息ID， 从哪条消息往前取历史，0表示最新一条消息。 amount：最多取多少条消息。

```

获取所有消息未读状态

```
        const allAcks = im.sysManage.getAllMessageStatus() || {};

```

获取群文件上传 url

```
        im.sysManage.asyncGetGroupAvatarUploadUrl({
          group_id,
          "access-token"
        })
        .then(res => {
          //
        });

```

获取聊天文件上传地址

```
        im.sysManage.asyncGetFileUploadChatFileUrl({
          file_type,
          to_id,
          to_type
        })
        .then(res => {
          //
        });

```

上传文件

```
        im.sysManage.asyncFileUpload({
          file,
          fileType,
          to_id,
          toType: "chat",
          chatType: "roster"
        })
        .then(res => {
          //
        })

```

拼装图片路径

```
        const image = im.sysManage.getImage({ avatar, type='roster', thumbnail=true });

```

## 事件通知

1.  Floo 通知

```
事件名称：flooNotice
事件内容：({category, desc})
{category: 'loginMessage',desc: 'socket connecting...'} // 开始建连接
{category: 'loginMessage',desc: 'socket connect success...'} // 连接成功
{category: 'loginMessage',desc: 'logining socket service...'} // 开始登录
{category: 'loginMessage',desc: 'login socket failure ......'} // 登录失败
{category: 'loginMessage',desc: 'login socket success.....'} // 登录成功
{category: 'loginMessage', desc: 'getting token...' } //获取token
{category: 'loginMessage',desc: 'token sucecc, getting roster lists..'} // 获取token成功，开始获取好友列表
{category: 'loginMessage',desc: 'get roster list failure:' + ex.message} // 获取好友列表失败
{category: 'action', desc: 'relogin' } // 需要自动登录
{category: 'action', desc: 'relogin_manually' }  // 需要手动登录
{category: 'conversation_deleted',desc: { id, source:'user_operation' }} // 会话被删除。ID：会话ID， source: 来源
{category: 'userNotice', desc:'PASSWORD_CHANGED'} // 用户密码改变
{category: 'userNotice', desc:'FROZEN'} // 用户账户被封禁
{category: 'userNotice', desc:'REMOVED'} // 用户被删除
{category: 'userNotice', desc:'KICK_BY_SAME_DEVICE'} // 当前设备被相同设备踢下线
{category: 'userNotice', desc:'KICKED_BY_OTHER_DEVICE'} // 当前设备被其它设备踢下线
{category: 'userNotice', desc:'INFO_UPDATED'} // 用户信息改变：profile或setting
{category: 'userNotice', desc:'DEVICE_LOGIN'} // 用户其它设备上线
{category: 'userNotice', desc:'DEVICE_LOGOUT'} // 用户其它设备下线
{category: 'userNotice', desc:'DEVICE_ADDED'} // 新设备通知
{category: 'userNotice', desc:'DEVICE_REMOVED'} // 设备被移除的通知
{category: 'userNotice', desc:'CLUSTER_CHANGED'} // 用户所在集群改变 需要重新登录
```

2. Floo 错误

```
事件名称：flooError
事件内容：({category, desc})
{category: 'USER_BANNED', desc:'用户被禁言'}
{category: 'USER_FROZEN', desc:'用户被冻结，请联系App管理员。'}
{category: 'APP_FROZEN', desc:'APP 被冻结，请登陆蓝莺IM控制台查看详情。'}
{category: 'LICENSE', desc:'无效 LICENSE，请确认服务已按时付费。'}
{category: 'LICENSE', desc:'超出 LICENSE 用户数限制，请购买更高规格服务。'}
{category: 'DNS_FAILED', desc: dnsServer } // DNS错误: 无法访问
```

3. 登录失败

```
事件名称: loginFail
事件内容：(desc) 失败原因的描述
```

4. 登录成功

```
事件名称：loginSuccess
事件内容：({})
```

5. 群列表更新

```
事件名称：onGroupListUpdate
事件内容：()
```

6. 群成员列表更新

```
事件名称：onGroupMemberChanged
事件内容: (groupId) 群ID
```

7. 收到群消息

```
事件名称: onGroupMessage
事件内容: (meta) 消息的内容
```

8. 对方正在输入

```
事件名称: onInputStatusMessage
事件内容: ({ext,from,to})  ext:扩展字段 from: 发送者用户ID to: 接收者用户ID
```

9. 收到群组@消息

```
事件名称: onMentionMessage
事件内容: (meta) 消息的内容
```

10. 消息被取消已读

```
事件名称: onMessageCanceled
事件内容: ({uid,mid})  uid: 会话ID， mid: 消息ID
```

11. 消息被删除

```
事件名称: onMessageDeleted
事件内容: ({uid,mid})  uid: 会话ID， mid: 消息ID
```

12. 消息被撤回

```
事件名称: onMessageRecalled
事件内容: ({uid,mid})  uid: 会话ID， mid: 消息ID
```

13. 消息状态变更：撤回/删除/已读

```
事件名称: onMessageStatusChanged
事件内容: ({uid,mid})  uid: 会话ID， mid: 消息ID
```

14. 收到历史消息

```
事件名称: onReceiveHistoryMsg
事件内容: ({next})  next: 下次取历史消息的key
```

15. 好友信息变更

```
事件名称: onRosterInfoUpdate
事件内容: (rosterIds)  rosterIds: 好友的用户ID列表
```

16. 好友列表变更

```
事件名称: onRosterListUpdate
事件内容: (meta) 好友通知的消息内容
```

17. 收到单聊消息

```
事件名称: onRosterMessage
事件内容: (meta) 好友通知的消息内容
```

18. 消息发送状态变更

```
事件名称: onSendingMessageStatusChanged
事件内容: ({status,mid})  status: 发送状态，取值为sending|failed|sent， mid: 客户端生成的client_mid
```

19. 未读数改变

```
事件名称: onUnreadChange
事件内容: (cid)  会话ID
```

20. 最近会话更新

```
事件名称: recentlistUpdate
事件内容: ()
```

21. 群组创建通知

```
事件名称: onGroupCreated
事件内容: (meta) 群通知的消息内容
```

22. 群组解散通知

```
事件名称: onGroupDestoryed
事件内容: (meta) 群通知的消息内容
```

23. 成员入群通知

```
事件名称: onGroupJoined
事件内容: (meta) 群通知的消息内容
```

24. 群申请被通过

```
事件名称: onGroupApplyAccepted
事件内容: (meta) 群通知的消息内容
```

25. 群申请被拒绝

```
事件名称: onGroupApplyDeclined
事件内容: (meta) 群通知的消息内容
```

26. 被群禁言

```
事件名称: onGroupBaned
事件内容: (meta) 群通知的消息内容
```

27. 被群取消禁言

```
事件名称: onGroupUnbaned
事件内容: (meta) 群通知的消息内容
```
