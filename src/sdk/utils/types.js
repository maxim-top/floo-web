/**
 * @module types
 */

/**
 * 好友信息
 * @typedef {object} RosterItem
 * @property {string} alias - 别名
 * @property {number} auth_mode - 验证方式, 0 - 无需验证，任何人可以加为好友, 1 - 需要同意方可加为好友, 2 - 需要回答问题正确方可加为好友, 3 - 拒绝所有加好友申请,int32
 * @property {string} auth_question - 验证问题
 * @property {string} avatar - 头像
 * @property {string} description - 描述信息
 * @property {string} ext - 扩展信息
 * @property {boolean} mute_notification - 是否接收消息提醒
 * @property {string} nick_name - 昵称或名称
 * @property {string} public_info - 公开信息，好友和陌生人可见
 * @property {number} relation - 关系: 0 - 好友，1 - 被删除，2 - 陌生人, int32
 * @property {number} user_id - 好友用户ID,int64
 * @property {string} username - 用户名
 */

/**
 * 用户设置信息
 * @typedef {object} UserSettings
 * @property {string} auth_answer - 验证问题答案
 * @property {number} auth_mode - 验证方式, 0 - 无需验证，任何人可以加为好友, 1 - 需要同意方可加为好友, 2 - 需要回答问题正确方可加为好友, 3 - 拒绝所有加好友申请,int32
 * @property {string} auth_question - 验证问题
 * @property {boolean} auto_download - 是否自动下载
 * @property {boolean} group_confirm - 邀请入群时是否需要用户确认: true - 需要用户同意才可加入， false - 自动同意邀请
 * @property {number} id - 用户ID, int64
 * @property {boolean} no_push - 是否关闭推送消息
 * @property {boolean} no_push_detail - 是否推送详情
 * @property {number} no_push_end_hour - 推送免打扰结束时间,int32
 * @property {number} no_push_start_hour - 推送免打扰开始时间,int32
 * @property {boolean} no_sounds - 收到消息时是否静音
 * @property {string} push_nick_name - 推送昵称
 * @property {string} push_token - 推送token
 * @property {number} silence_end_time - 推送不提醒结束时间,int32
 * @property {number} silence_start_time - 推送不提醒开始时间,int32
 * @property {number} user_id - 用户ID,int64
 * @property {boolean} vibratory - 收到消息时否振动
 */

/**
 * 用户信息
 * @typedef {object} UserProfile
 * @property {string} avatar - 头像 url
 * @property {string} description - 描述信息
 * @property {string} email - 邮箱
 * @property {string} mobile - 手机号码
 * @property {string} nick_name - 昵称
 * @property {string} private_info - 私有信息，仅自己可见
 * @property {string} public_info - 公开信息，好友和陌生人可见
 * @property {number} user_id - 用户ID,int64
 * @property {string} username - 用户名
 */

/**
 * 消息体
 * @typedef {object} Meta
 * @property {string} id 消息ID
 * @property {string} from 发送者
 * @property {string} to 接收者
 * @property {string} content 消息内容
 * @property {string} type 消息类型： text - 文本, image - 图片， audio - 语音, video - 视频，file - 文件, location - 位置， command - 命令, forward - 转发
 * @property {(string|object)} ext 扩展字段
 * @property {(string|object)} config SDK扩展字段
 * @property {(string|object)} attach 附件信息
 * @property {number} status 消息状态： 0 - 未读, 1 - 已投递, 2 - 已读
 * @property {string} timestamp 消息发送时间戳（毫秒）
 * @property {string} toType 接收者类型： roster - 好友， group - 群组
 */

/**
 * 加好友申请列表项
 * @typedef {object} RosterApplication
 * @property {number} expired_time - 过期时间,int64
 * @property {string} reason - 申请描述
 * @property {number} status - 状态： 0 - 等待确认， 1 - 接受， 2 - 拒绝。 int32
 * @property {number} user_id - 发起加好友申请的用户ID,int64
 */

/**
 * 群信息
 * @typedef {object} GroupInfoAndSettings
 * @property {number} apply_approval - 入群申请审批设置, 0:同意所有申请 1:需要管理员确认 2:拒绝所有申请
 * @property {string} avatar - 群头像
 * @property {number} ban_expire_time - 全员禁言过期时间（秒），禁言期间只允许管理员发消息， 为0或小于当前时间表示不禁言, -1表示永久禁言
 * @property {number} created_at - 创建时间
 * @property {string} description - 群描述
 * @property {string} ext - 群扩展信息
 * @property {number} group_id - 群id,int64
 * @property {boolean} history_visible - 新成员可见历史聊天记录设置
 * @property {boolean} member_invite - 群成员邀请设置: false - 不允许邀请, true - 允许邀请(默认)
 * @property {boolean} member_modify - 群成员修改群信息设置:  false - 群成员不能修改群信息(默认), true - 群成员可以修改群信息
 * @property {number} msg_mute_mode - 群消息屏蔽模式: 0 - 表示不屏蔽, 1 - 表示屏蔽本地消息通知, 2 - 表示屏蔽消息，不接收消息
 * @property {number} msg_push_mode - 群消息推送模式：0 - 接收所有推送，1 - 不接受推送，2 - 接收管理员和@消息推送， 3 - 只接收管理员消息推送， 4 - 只接收@消息推送
 * @property {string} name - 群名称
 * @property {number} owner_id - 群主id,int64
 * @property {boolean} read_ack - 群消息已读功能设置
 * @property {number} status - 群状态, 0：正常, 1：已解散
 * @property {number} type - 群类型: 1表示公开群，0表示私有群, 2表示聊天室
 * @property {number} updated_at - 更新时间,int64
 * @property {number} count - 群成员数
 * @property {number} capacity - 群容量
 */

/**
 * 群简要信息及用户设置
 * @typedef {object} BriefGroupInfoAndSettings
 * @property {number} apply_approval - 入群申请审批设置, 0:同意所有申请 1:需要管理员确认 2:拒绝所有申请
 * @property {string} avatar - 群头像
 * @property {number} capacity - 群容量
 * @property {number} count - 群成员数
 * @property {number} group_id - 群id,int64
 * @property {number} msg_mute_mode - 群消息屏蔽模式: 0 - 表示不屏蔽, 1 - 表示屏蔽本地消息通知, 2 - 表示屏蔽消息，不接收消息
 * @property {number} msg_push_mode - 群消息推送模式：0 - 接收所有推送，1 - 不接受推送，2 - 接收管理员和@消息推送， 3 - 只接收管理员消息推送， 4 - 只接收@消息推送
 * @property {string} name - 群名称
 * @property {number} owner - 群主id,int64
 * @property {number} status - 群状态, 0：正常, 1：已解散,int32
 * @property {number} type - 群类型: 1表示公开群，0表示私有群, 2表示聊天室。int32
 */

/**
 * 群成员格式
 * @typedef {object} GroupMember
 * @property {string} display_name - 成员群名片
 * @property {number} join_time - 成员入群时间,int64
 * @property {number} user_id - 用户id,int64
 * @property {string} avatar - 头像地址
 */

/**
 * 禁言成员
 * @typedef {object} GroupMemberBanned
 * @property {string} display_name - 成员群名片
 * @property {number} join_time - 成员入群时间,int64
 * @property {number} user_id - 用户id,int64
 * @property {string} avatar - 头像地址
 * @property {number} expired_time - 禁言过期时间
 */

/**
 * 群用户请求结果
 * @typedef {object} GroupUserRelationResponse
 * @property {string} reason - 原因
 * @property {string} result - 结果
 * @property {number} user_id - 用户ID，int64
 */

/**
 * 群公告内容
 * @typedef {object} GroupAnnouncement
 * @property {number} author - 公告发布者,int64
 * @property {string} content - 公告内容
 * @property {number} created_at - 公告发布时间,int64
 * @property {number} group_id - 群id,int64
 * @property {number} id - 公告id,int64
 * @property {string} title - 公告标题
 */

/**
 * 创建群
 * @typedef {object} GroupInfoRequest
 * @property {string} avatar - 群头像
 * @property {string} description - 群描述
 * @property {string} name - 群名称
 * @property {number} type - 群类型 1表示公开群，0表示私有群, 2表示聊天室,int32
 * @property {Array.<number>} user_list - 邀请入群的用户id列表
 */

/**
 * 禁言请求
 * @typedef {object} GroupBannedMemberRequest
 * @property {number} duration - 禁言时长，单位为分钟,int64
 * @property {number} group_id - 群id,int64
 * @property {Array.<number>} user_list - 用户id列表
 */

/**
 * 群组黑名单
 * @typedef {object} GroupBlockedListItem
 * @property {number} user_id - 用户id,int64
 * @property {number} group_id - 群id,int64
 * @property {string} create_at - 创建时间
 */

/**
 * 群组邀请信息
 * @typedef {object} GroupInvitation
 * @property {number} group_id - 群ID
 * @property {number} inviter_id - 邀请者ID
 * @property {number} invitee_id - 被邀请者ID
 * @property {string} reason - 原因
 * @property {number} status - 状态： 0 - 待处理，1 - 用户同意，2 - 用户拒绝
 * @property {number} expire_time - 过期时间
 * @property {string} create_at - 创建时间
 */

/**
 * 群申请信息
 * @typedef {object} GroupApplication
 * @property {number} group_id - 群ID
 * @property {number} applicant_id - 申请者ID
 * @property {string} reason - 原因
 * @property {number} expire_time - 过期时间
 * @property {number} status - 状态： 0 - 待处理，1 - 同意，2 - 拒绝
 */

/**
 * 群共享文件返回格式
 * @typedef {object} GroupSharedFile
 * @property {number} created_at - int64
 * @property {number} file_id - 共享文件id,int64
 * @property {number} group_id - 群id,int64
 * @property {string} name - 共享文件名称
 * @property {number} size - 共享文件大小,int64
 * @property {string} type - 共享文件类型
 * @property {number} updated_at - int64
 * @property {number} uploader - 共享文件上传者,int64
 * @property {string} url - 共享文件url
 */

/**
 * 删除群共享文件结果
 * @typedef {object} GroupSharedFileResponse
 * @property {number} file_id - 文件ID
 * @property {string} reason - 原因
 * @property {string} result - 结果
 */

/**
 * 全员禁言结果
 * @typedef {object} GroupBanAllResponse
 * @property {number} ban_expire_time - 全员禁言过期时间,int64
 */

/**
 * 文件上传信息
 * @typedef {object} FileUpload
 * @property {string} download_url - 下载地址
 * @property {object.<string,string>} oss_body_param - 额外参数
 * @property {string} upload_url - 上传地址
 */

/**
 * 文件上传结果
 * @typedef {object} FileUploadResult
 * @property {string} url - 下载地址
 */

/**
 * 文件上传进度回调
 *
 * @callback fileUploadProgress
 * @param {object} res - 进度
 * @param {number} res.loaded - 已下载字节数
 * @param {number} res.total - 总字节数
 */

/**
 * 会话信息
 * @typedef {object} ConversationItem
 * @property {number} id - 会话ID
 * @property {string} content - 消息内容
 * @property {string} timestamp - 消息发送时间戳（毫秒）
 * @property {string} type - 会话类型： roster - 单聊， group - 群聊
 */

/**
 * 用户信息
 * @typedef {object} UserProfile
 * @property {string} avatar - 头像 url
 * @property {string} description - 描述信息
 * @property {string} email - 邮箱
 * @property {string} mobile - 手机号码
 * @property {string} nick_name - 昵称
 * @property {string} private_info - 私有信息，仅自己可见
 * @property {string} public_info - 公开信息，好友和陌生人可见
 * @property {number} user_id - 用户ID,int64
 * @property {string} username - 用户名
 */

/**
 * 用户设置信息
 * @typedef {object} UserSettings
 * @property {string} auth_answer - 验证问题答案
 * @property {number} auth_mode - 验证方式, 0 - 无需验证，任何人可以加为好友, 1 - 需要同意方可加为好友, 2 - 需要回答问题正确方可加为好友, 3 - 拒绝所有加好友申请,int32
 * @property {string} auth_question - 验证问题
 * @property {boolean} auto_download - 是否自动下载
 * @property {boolean} group_confirm - 邀请入群时是否需要用户确认: true - 需要用户同意才可加入， false - 自动同意邀请
 * @property {number} id - 设置ID
 * @property {boolean} no_push - 是否关闭推送消息
 * @property {boolean} no_push_detail - 是否推送详情
 * @property {number} no_push_end_hour - 推送免打扰结束时间,int32
 * @property {number} no_push_start_hour - 推送免打扰开始时间,int32
 * @property {boolean} no_sounds - 收到消息时是否静音
 * @property {string} push_nick_name - 推送昵称
 * @property {string} push_token - 推送token
 * @property {number} silence_end_time - 推送不提醒结束时间,int32
 * @property {number} silence_start_time - 推送不提醒开始时间,int32
 * @property {number} user_id - 用户ID,int64
 * @property {boolean} vibratory - 收到消息时否振动
 */

/**
 * 监听事件名称
 * @typedef {string} Event
 */

/**
 * 监听事件回调
 * @callback EventCallback
 * @param {(event:flooNotice|event:flooError|event:loginFail|event:loginSuccess|event:onGroupListUpdate|event:onGroupMemberChanged|event:onGroupMessage|event:onInputStatusMessage|event:onMentionMessage|event:onMessageCanceled|event:onMessageDeleted|event:onMessageRecalled|event:onMessageStatusChanged|event:onReceiveHistoryMsg|event:onRosterInfoUpdate|event:onRosterListUpdate|event:onRosterMessage|event:onSendingMessageStatusChanged|event:onUnreadChange|event:recentlistUpdate|event:onGroupCreated|event:onGroupDestoryed|event:onGroupJoined|event:onGroupApplyAccepted|event:onGroupApplyDeclined|event:onGroupBaned|event:onGroupUnbaned)} res - 事件结果
 */

/**
 * Floo通知
 * @event flooNotice
 * @param {object} res 结果
 * @param {string} res.category 类别
 * @param {string} res.desc 描述
 * @example
 * {category: 'loginMessage',desc: 'socket connecting...'} // 开始建连接
 * {category: 'loginMessage',desc: 'socket connect success...'} // 连接成功
 * {category: 'loginMessage',desc: 'logining socket service...'} // 开始登录
 * {category: 'loginMessage',desc: 'login socket failure ......'} // 登录失败
 * {category: 'loginMessage',desc: 'login socket success.....'} // 登录成功
 * {category: 'loginMessage', desc: 'getting token...' } //获取token
 * {category: 'loginMessage',desc: 'token sucecc, getting roster lists..'} // 获取token成功，开始获取好友列表
 * {category: 'loginMessage',desc: 'get roster list failure:' + ex.message} // 获取好友列表失败
 * {category: 'action', desc: 'relogin' } // 需要自动登录
 * {category: 'action', desc: 'relogin_manually' }  // 需要手动登录
 * {category: 'conversation_deleted',desc: { id, source:'user_operation' }} // 会话被删除。ID：会话ID， source: 来源
 * {category: 'userNotice', desc:'PASSWORD_CHANGED'} // 用户密码改变
 * {category: 'userNotice', desc:'FROZEN'} // 用户账户被封禁
 * {category: 'userNotice', desc:'REMOVED'} // 用户被删除
 * {category: 'userNotice', desc:'KICK_BY_SAME_DEVICE'} // 当前设备被相同设备踢下线
 * {category: 'userNotice', desc:'KICKED_BY_OTHER_DEVICE'} // 当前设备被其它设备踢下线
 * {category: 'userNotice', desc:'INFO_UPDATED'} // 用户信息改变：profile或setting
 * {category: 'userNotice', desc:'DEVICE_LOGIN'} // 用户其它设备上线
 * {category: 'userNotice', desc:'DEVICE_LOGOUT'} // 用户其它设备下线
 * {category: 'userNotice', desc:'DEVICE_ADDED'} // 新设备通知
 * {category: 'userNotice', desc:'DEVICE_REMOVED'} // 设备被移除的通知
 * {category: 'userNotice', desc:'CLUSTER_CHANGED'} // 用户所在集群改变 需要重新登录
 */

/**
 * Floo错误
 * @event flooError
 * @param {object} res
 * @param {string} res.category 类别
 * @param {string} res.desc 描述
 * @example
 * {category: 'USER_BANNED', desc:'用户被禁言'}
 * {category: 'USER_FROZEN', desc:'用户被冻结，请联系App管理员。'}
 * {category: 'APP_FROZEN', desc:'APP 被冻结，请登陆蓝莺IM控制台查看详情。'}
 * {category: 'LICENSE', desc:'无效 LICENSE，请确认服务已按时付费。'}
 * {category: 'LICENSE', desc:'超出 LICENSE 用户数限制，请购买更高规格服务。'}
 * {category: 'DNS_FAILED', desc: dnsServer } // DNS错误: 无法访问
 */

/**
 * 登录失败
 * @event loginFail
 * @param {string} desc 失败原因
 */

/**
 * 登录成功
 * @event loginSuccess
 * @param {object} res 空对象
 */

/**
 * 群列表更新
 * @event onGroupListUpdate
 * @param {(module:types~Meta|undefined)} meta 通知消息内容
 */

/**
 * 群成员列表更新
 * @event onGroupMemberChanged
 * @param {number} groupId 群ID
 */

/**
 * 收到群消息
 * @event onGroupMessage
 * @param {module:types~Meta} meta 消息内容
 */

/**
 * 对方正在输入
 * @event onInputStatusMessage
 * @param {object} res
 * @param {string} res.ext 扩展字段
 * @param {string} res.from 发送者用户ID
 * @param {string} res.to 接收者用户ID
 */

/**
 * 收到群组@消息
 * @event onMentionMessage
 * @param {module:types~Meta} meta 消息内容
 */

/**
 * 消息被取消已读
 * @event onMessageCanceled
 * @param {object} res
 * @param {string} res.uid 会话ID
 * @param {string} res.mid 消息ID
 */

/**
 * 消息被删除
 * @event onMessageDeleted
 * @param {object} res
 * @param {string} res.uid 会话ID
 * @param {string} res.mid 消息ID
 */

/**
 * 消息被撤回
 * @event onMessageRecalled
 * @param {object} res
 * @param {string} res.uid 会话ID
 * @param {string} res.mid 消息ID
 *
 */

/**
 * 消息状态变更：撤回/删除/已读
 * @event onMessageStatusChanged
 * @param {object} res
 * @param {string} res.uid 会话ID
 * @param {string} res.mid 消息ID
 */

/**
 * 收到历史消息
 * @event onReceiveHistoryMsg
 * @param {object} res
 * @param {number} res.next 下次取历史消息的key
 */

/**
 * 好友信息变更
 * @event onRosterInfoUpdate
 * @param {object} res
 * @param {Array.<number>} res.rosterIds 好友的用户ID列表
 */

/**
 * 好友列表变更
 * @event onRosterListUpdate
 * @param {module:types~Meta} meta 好友通知的消息内容
 */

/**
 * 收到好友申请
 * @event onRosterApplied
 * @param {module:types~Meta} meta 好友申请的消息内容
 */

/**
 * 收到单聊消息
 * @event onRosterMessage
 * @param {module:types~Meta} meta 消息内容
 */

/**
 * 消息发送状态变更
 * @event onSendingMessageStatusChanged
 * @param {object} res
 * @param {number} res.status: 发送状态，取值为sending|failed|sent
 * @param {number} res.mid: 客户端生成的client_mid
 */

/**
 * 未读数改变
 * @event onUnreadChange
 * @param {number} cid 会话ID
 */

/**
 * 最近会话更新
 * @event recentlistUpdate
 */

/**
 * 群组创建通知
 * @event onGroupCreated
 * @param {module:types~Meta} meta 群通知的消息内容
 */

/**
 * 群组解散通知
 * @event onGroupDestoryed
 * @param {module:types~Meta} meta 群通知的消息内容
 */

/**
 * 成员入群通知
 * @event onGroupJoined
 * @param {module:types~Meta} meta 群通知的消息内容
 */

/**
 * 群申请被通过
 * @event onGroupApplyAccepted
 * @param {module:types~Meta} meta 群通知的消息内容
 */

/**
 * 群申请被拒绝
 * @event onGroupApplyDeclined
 * @param {module:types~Meta} meta 群通知的消息内容
 */

/**
 * 被群禁言
 * @event onGroupBaned
 * @param {module:types~Meta} meta 群通知的消息内容
 */
/**
 * 被群取消禁言
 * @event onGroupUnbaned
 * @param {module:types~Meta} meta 群通知的消息内容
 */
