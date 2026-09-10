import Janus from '../core/rtc/janus';
import socketCls from '../core/rtc/socketCls';
import log from '../utils/log';
import { messageStore } from '../utils/store';
import io from '../core/base/io/index';
import { makeRosterRTCMessage } from '../core/base/messageMaker';
var JSONBigString = require('json-bigint');

var opaqueId = 'videoroomtest-' + Janus.randomString(12);
var janus = null;
var publishHandler = null;
var subscribeHandler = null;

var myid = null;
var mypvtid = null;
var myStream = {};

var creatingSubscription = false;
var subscriptions = {};
var feedStreams = {};

var localTracks = {};
var remoteTracks = {};
var remoteStreamState = {};

var initParams = {};
var callTimeoutId = null;
var callTimeout = 1000 * 60;

var pickupTimeoutId = null;
var pickupTimeout = 1000 * 60;

var localWebrtcState = false;
var remoteWebrtcState = false;
var REMOTE_VIDEO_SETTLE_MS = 400;

/**
 * 音视频管理
 * @module rtcManage
 */

const errFunc = (error) => {
  log.log('create room failure with reason: ' + error);
  if (initParams && initParams.hangupCall) {
    initParams.hangupCall(false);
  }
  if (publishHandler) {
    publishHandler.hangup();
  }
  if (janus) {
    janus.destroy();
    janus = null;
  }
  return;
};

const sendCallMessage = () => {
  sendRTCMessage({
    uid: initParams.receiver,
    content: '',
    config: JSONBigString.stringify({
      action: 'call',
      ios: { mutable_content: true },
      type: initParams.hasVideo ? 1 : 0,
      roomId: initParams.roomId,
      initiator: initParams.id,
      callId: initParams.callId,
      roomType: 0,
      pin: initParams.pin,
      pushMessageLocKey: 'call_in'
    }),
    ext: JSON.stringify({
      rtc: 'call'
    })
  });
  callTimeoutId = setTimeout(function () {
    clearTimeout(callTimeoutId);
    callTimeoutId = null;
    initParams.hangupCall(true, true);
  }, callTimeout);
};

const sendPickUpMessage = () => {
  sendRTCMessage({
    uid: initParams.receiver,
    content: '',
    config: JSON.stringify({
      action: 'pickup',
      callId: initParams.callId
    })
  });
  pickupTimeoutId = setTimeout(function () {
    clearTimeout(pickupTimeoutId);
    pickupTimeoutId = null;
    initParams.hangupCall(true, true);
  }, pickupTimeout);
};

const checkPeerDrop = () => {
  setTimeout(() => {
    if (getInCallStatus()) {
      initParams.hangupCall(true, false, true);
    }
  }, 5000);
};

const notifyRemoteVideoState = (mid, active, cameraClosed = null) => {
  if (!initParams.updateTrackState) {
    return;
  }
  initParams.updateTrackState({
    type: 'video',
    isLocal: false,
    active: active,
    cameraClosed: cameraClosed,
    mid: mid
  });
};

const clearRemoteVideoSettleTimer = (state) => {
  if (state && state.settleTimer) {
    clearTimeout(state.settleTimer);
    state.settleTimer = null;
  }
};

const updateRemoteStreamState = (mid, updater) => {
  const currentState = remoteStreamState[mid] || {};
  const nextState = updater(currentState) || currentState;
  remoteStreamState[mid] = nextState;
  return nextState;
};

const bumpRemoteTrackEpoch = (mid) => {
  const nextState = updateRemoteStreamState(mid, (currentState) => ({
    ...currentState,
    trackEpoch: (currentState.trackEpoch || 0) + 1
  }));
  return nextState.trackEpoch;
};

const getCurrentRemoteTrack = (mid) => {
  const stream = remoteTracks[mid];
  if (!stream) {
    return null;
  }
  if (stream.getVideoTracks) {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      return videoTrack;
    }
  }
  if (stream.getAudioTracks) {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      return audioTrack;
    }
  }
  return null;
};

const isCurrentRemoteTrack = (mid, track, trackEpoch = null) => {
  if (!track) {
    return false;
  }
  const state = remoteStreamState[mid] || {};
  if (trackEpoch != null && state.trackEpoch !== trackEpoch) {
    return false;
  }
  return getCurrentRemoteTrack(mid) === track;
};

const emitRemoteVideoState = (mid, active, cameraClosed) => {
  const state = remoteStreamState[mid] || {};
  if (state.lastNotifiedActive === active && state.lastNotifiedCameraClosed === cameraClosed) {
    return;
  }
  state.lastNotifiedActive = active;
  state.lastNotifiedCameraClosed = cameraClosed;
  notifyRemoteVideoState(mid, active, cameraClosed);
};

const scheduleRemoteVideoSettle = (mid) => {
  const state = remoteStreamState[mid];
  if (!state) {
    return;
  }
  clearRemoteVideoSettleTimer(state);
  state.settleTimer = setTimeout(() => {
    const currentState = remoteStreamState[mid];
    if (!currentState) {
      return;
    }
    currentState.settleTimer = null;
    reconcileRemoteVideoState(mid, 'settle');
  }, REMOTE_VIDEO_SETTLE_MS);
};

const reconcileRemoteVideoState = (mid, reason = '') => {
  const state = remoteStreamState[mid];
  if (!state) {
    return;
  }
  const currentTrack = getCurrentRemoteTrack(mid);
  const trackPresent = !!currentTrack;
  const trackActive = !!(currentTrack && !currentTrack.muted && currentTrack.readyState !== 'ended');
  const now = Date.now();
  state.trackPresent = trackPresent;
  state.trackActive = trackActive;
  if (trackPresent) {
    state.lastTrackId = currentTrack.id;
  }
  const cameraClosed = state.publisherActive === false;
  const shouldShowVideo = !cameraClosed && trackActive;

  if (shouldShowVideo) {
    clearRemoteVideoSettleTimer(state);
    emitRemoteVideoState(mid, true, false);
    if (remoteTracks[mid] && initParams.attachStream && state.attachedTrackId !== state.lastTrackId) {
      state.attachedTrackId = state.lastTrackId;
      initParams.attachStream(remoteTracks[mid], 'video', false);
    }
    return;
  }

  const trackAge = now - (state.trackUpdatedAt || 0);
  const publisherAge = now - (state.publisherUpdatedAt || 0);
  const recentlyChanged = trackAge < REMOTE_VIDEO_SETTLE_MS || publisherAge < REMOTE_VIDEO_SETTLE_MS;
  const hasVisibleTransition = state.lastNotifiedActive || state.lastNotifiedCameraClosed !== cameraClosed;
  if (recentlyChanged && hasVisibleTransition) {
    log.log('remote video wait settle, mid: ' + mid + ' reason: ' + reason + ' cameraClosed: ' + cameraClosed + ' trackActive: ' + trackActive);
    scheduleRemoteVideoSettle(mid);
    return;
  }

  clearRemoteVideoSettleTimer(state);
  state.attachedTrackId = null;
  emitRemoteVideoState(mid, false, cameraClosed);
};

const syncRemotePublisherStreams = (streams) => {
  if (!Array.isArray(streams)) {
    return;
  }
  const now = Date.now();
  streams.forEach((stream) => {
    if (!stream || stream.type !== 'video' || !stream.mid) {
      return;
    }
    updateRemoteStreamState(stream.mid, (currentState) => ({
      ...currentState,
      publisherActive: !stream.disabled,
      publisherUpdatedAt: now
    }));
    reconcileRemoteVideoState(stream.mid, 'publisher-stream');
  });
};

const bindRemoteVideoTrackState = (track, mid, trackEpoch) => {
  if (!track || track.kind !== 'video' || !track.addEventListener) {
    return;
  }
  if (track.__lanyingRemoteStateBound) {
    track.__lanyingRemoteTrackEpoch = trackEpoch;
    return;
  }
  track.__lanyingRemoteStateBound = true;
  track.__lanyingRemoteTrackEpoch = trackEpoch;
  track.addEventListener('mute', () => {
    if (!isCurrentRemoteTrack(mid, track, track.__lanyingRemoteTrackEpoch)) {
      log.log('ignore stale remote video mute event, mid: ' + mid + ' track: ' + track.id);
      return;
    }
    updateRemoteStreamState(mid, (currentState) => ({
      ...currentState,
      trackPresent: true,
      trackActive: false,
      trackUpdatedAt: Date.now(),
      lastTrackId: track.id
    }));
    reconcileRemoteVideoState(mid, 'track-mute');
  });
  track.addEventListener('ended', () => {
    if (!isCurrentRemoteTrack(mid, track, track.__lanyingRemoteTrackEpoch)) {
      log.log('ignore stale remote video ended event, mid: ' + mid + ' track: ' + track.id);
      return;
    }
    updateRemoteStreamState(mid, (currentState) => ({
      ...currentState,
      trackPresent: false,
      trackActive: false,
      trackUpdatedAt: Date.now(),
      lastTrackId: track.id
    }));
    reconcileRemoteVideoState(mid, 'track-ended');
  });
  track.addEventListener('unmute', () => {
    if (!isCurrentRemoteTrack(mid, track, track.__lanyingRemoteTrackEpoch)) {
      log.log('ignore stale remote video unmute event, mid: ' + mid + ' track: ' + track.id);
      return;
    }
    updateRemoteStreamState(mid, (currentState) => ({
      ...currentState,
      trackPresent: true,
      trackActive: true,
      trackUpdatedAt: Date.now(),
      lastTrackId: track.id
    }));
    reconcileRemoteVideoState(mid, 'track-unmute');
  });
};

const stopHandleLocalStream = (handle) => {
  if (!handle || !handle.webrtcStuff || !handle.webrtcStuff.myStream) {
    return;
  }
  Janus.stopAllTracks(handle.webrtcStuff.myStream);
  handle.webrtcStuff.myStream = null;
};

const stopAllLocalMedia = () => {
  stopHandleLocalStream(publishHandler);
  stopHandleLocalStream(subscribeHandler);
  Janus.stopAllTracks(localTracks);
};

/**
 * 发起端发起音视频呼叫
 * @static
 * @param {object} params 初始化参数
 * @param {string} params.server RTC服务器地址
 * @param {number} params.id 音视频用户id
 * @param {boolean} params.caller 是否为呼叫发起者
 * @param {number} params.receiver 音视频用户对方id
 * @param {string} params.pin 房间加入pin码（caller为true时发起者需要创建新的pin码）
 * @param {boolean} params.hasVideo 是否存在视频流
 * @param {boolean} params.hasAudio 是否存在音频流
 * @param {function} params.attachStream 音视频通话信息流处理函数
 * @param {function} params.getThrough 音视频通话是否接通
 * @param {function} params.hangupCall 音视频通话是否挂断
 * @param {function} params.getHangUpStatus 获取挂断状态函数
 * 以下是caller为 true 的必须参数（被呼叫者必须参数）
 * @param {number} params.roomId 被呼叫者邀请加入的 room id
 * 以下是caller为 true 的必须参数（呼叫者必须参数）
 * @param {string} params.secret 创建的房间操作密码
 * @param {string} params.callId 创建音视频呼叫时音视频 callid
 * 以下时视频会话必须的参数（视频宽度和高度设置函数）
 * @param {number} params.width 视频流画面宽度
 * @param {number} params.height 视频流画面高度
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="initRTCEngine" %}{% endlanying_code_snippet %}
 */
const initRTCEngine = (params) => {
  initParams = params;
  log.log(params);

  Janus.init({
    debug: 'all',
    dependencies: Janus.useDefaultDependencies({ WebSocket: socketCls }),
    callback: function () {
      if (!Janus.isWebrtcSupported()) {
        log.log('Janus Webrtc not support!');
        return;
      }
      janus = new Janus({
        server: initParams.server,
        success: function () {
          janus.attach({
            plugin: 'janus.plugin.videoroom',
            opaqueId: opaqueId,
            success: function (pluginHandle) {
              publishHandler = pluginHandle;
              if (initParams.caller) {
                let createRoom = {
                  request: 'create',
                  permanent: false,
                  description: 'videoroom_' + initParams.id + '_' + initParams.receiver,
                  secret: initParams.secret,
                  pin: initParams.pin
                };
                publishHandler.send({
                  message: createRoom,
                  success: (data) => {
                    initParams.roomId = data.room;
                    sendCallMessage();
                  },
                  error: errFunc
                });
              } else {
                sendPickUpMessage();
                joinRoom();
              }
            },
            error: errFunc,
            iceState: function (state) {
              log.log('ICE state changed to ' + state);
            },
            mediaState: function (medium, on, mid) {
              log.log('Janus ' + (on ? 'started' : 'stopped') + ' receiving our ' + medium + ' (mid=' + mid + ')');
            },
            webrtcState: function (on) {
              log.log('Janus says our WebRTC PeerConnection is ' + (on ? 'up' : 'down') + ' now');
              if (on) {
                localWebrtcState = true;
                if (localWebrtcState && remoteWebrtcState) {
                  initParams.getThrough();
                }
              } else {
                if (!initParams.getHangUpStatus()) {
                  initParams.hangupCall();
                }
              }
            },
            slowLink: function (uplink, lost, mid) {
              log.log('Janus reports problems ' + (uplink ? 'sending' : 'receiving') + ' packets on mid ' + mid + ' (' + lost + ' lost packets)');
              if (initParams.onSlowLink) {
                initParams.onSlowLink({ uplink, lost, mid });
              }
            },
            onmessage: function (msg, jsep) {
              let event = msg['videoroom'];
              if (event != undefined && event != null) {
                if (event === 'joined') {
                  myid = msg['id'];
                  mypvtid = msg['private_id'];
                  if (msg['publishers']) {
                    publish(null, initParams.hasVideo, initParams.hasAudio, initParams.width, initParams.height);
                    let list = msg['publishers'];
                    let sources = null;
                    for (let f in list) {
                      if (list[f]['dummy']) continue;
                      let id = list[f]['id'];
                      let display = list[f]['display'];
                      let streams = list[f]['streams'];
                      for (let i in streams) {
                        let stream = streams[i];
                        stream['id'] = id;
                        stream['display'] = display;
                      }
                      feedStreams[id] = {
                        id: id,
                        display: display,
                        streams: streams
                      };
                      syncRemotePublisherStreams(streams);
                      if (!sources) sources = [];
                      sources.push(streams);
                    }
                    if (sources) subscribe(sources);
                  } else {
                    if (!initParams.caller) {
                      // callee join in time. caller should already in room. if not. caller has left room. need quit.
                      if (!initParams.getHangUpStatus()) {
                        initParams.hangupCall();
                      }
                    }
                  }
                } else if (event === 'event') {
                  if (msg['streams']) {
                    let streams = msg['streams'];
                    for (let i in streams) {
                      let stream = streams[i];
                      stream['id'] = myid;
                      stream['display'] = 'lanyingIM-' + myid;
                    }
                    myStream[myid] = {
                      id: myid,
                      display: 'lanyingIM-' + myid,
                      streams: streams
                    };
                  } else if (msg['publishers']) {
                    let list = msg['publishers'];
                    let sources = null;
                    for (let f in list) {
                      if (list[f]['dummy']) continue;
                      let id = list[f]['id'];
                      let display = list[f]['display'];
                      let streams = list[f]['streams'];
                      for (let i in streams) {
                        let stream = streams[i];
                        stream['id'] = id;
                        stream['display'] = display;
                      }
                      feedStreams[id] = {
                        id: id,
                        display: display,
                        streams: streams
                      };
                      syncRemotePublisherStreams(streams);
                      if (!sources) sources = [];
                      sources.push(streams);
                    }
                    if (sources) subscribe(sources);
                  } else if (msg['leaving']) {
                    let leaving = msg['leaving'];
                    unSubscribe(leaving);
                    checkPeerDrop();
                  } else if (msg['unpublished']) {
                    let unpublished = msg['unpublished'];
                    if (unpublished === 'ok') {
                      publishHandler.hangup();
                      return;
                    }
                    unSubscribe(unpublished);
                    checkPeerDrop();
                  } else if (msg['error']) {
                    log.log('error : ' + msg['error']);
                  }
                } else if (event === 'destroyed') {
                  //window.location.reload();
                }
              }
              if (jsep) {
                if (publishHandler) {
                  publishHandler.handleRemoteJsep({ jsep: jsep });
                }
              }
            },
            onlocaltrack: function (track, on) {
              if (track.kind === 'video') {
                let trackId = track.id.replace(/[{}]/g, '');
                if (!on) {
                  // Track removed, get rid of the stream and the rendering
                  let stream = localTracks[trackId];
                  if (stream) {
                    try {
                      let tracks = stream.getTracks();
                      for (let i in tracks) {
                        let mst = tracks[i];
                        if (mst) mst.stop();
                      }
                    } catch (e) {
                      log.log('error : ' + e);
                    }
                  }
                  delete localTracks[trackId];
                  if (initParams.updateTrackState) {
                    initParams.updateTrackState({ type: 'video', isLocal: true, active: false });
                  }
                  return;
                }
                let stream = new MediaStream([track]);
                localTracks[trackId] = stream;
                if (initParams.updateTrackState) {
                  initParams.updateTrackState({ type: 'video', isLocal: true, active: true });
                }
                if (stream) {
                  initParams.attachStream(stream, 'video', true);
                }
              }
            },
            onremotetrack: function (track, mid, on) {
              log.log('Janus onremotetrack ' + track + ' mid ' + mid + 'on' + on);
            },
            oncleanup: function () {
              delete myStream[myid];
              localTracks = {};
            }
          });
        },
        error: function (error) {
          log.log('janus init error : ' + error);
        },
        destroyed: function () {}
      });
    }
  });
};

/**
 * 销毁操作（在关闭音视频界面时使用）
 * @static
 * @param {null}
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="destroy" %}{% endlanying_code_snippet %}
 */
const destroy = () => {
  stopAllLocalMedia();
  Janus.stopAllTracks(remoteTracks);
  if (typeof window.stream === 'object') {
    window.stream.getTracks().forEach((track) => track.stop());
  }
  if (callTimeoutId != null) {
    clearTimeout(callTimeoutId);
    callTimeoutId = null;
  }
  if (pickupTimeoutId != null) {
    clearTimeout(pickupTimeoutId);
    pickupTimeoutId = null;
  }
  Object.keys(remoteStreamState).forEach((mid) => {
    clearRemoteVideoSettleTimer(remoteStreamState[mid]);
  });

  localTracks = {};
  remoteTracks = {};
  remoteStreamState = {};
  myStream = {};
  feedStreams = {};
  subscriptions = {};
  localWebrtcState = false;
  remoteWebrtcState = false;
  publishHandler = null;
  subscribeHandler = null;
  if (janus) {
    janus.destroy();
    janus = null;
  }
};

/**
 * 发送音视频消息
 * @static
 * @param {object} msg 消息体
 * @param {string} msg.uid 接收者ID
 * @param {string} msg.content 消息内容
 * @param {(string|object)} msg.config 扩展字段
 * @returns {number} 客户端生成的消息ID
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="sendRTCMessage" %}{% endlanying_code_snippet %}
 */
const sendRTCMessage = (msg) => {
  const msgFrm = makeRosterRTCMessage(msg);
  const meta = msgFrm.payload.meta;
  messageStore.saveSendingRosterMessage(meta);
  io.sendMessage(msgFrm);
  const { id } = meta;
  return id;
};

/**
 * 加入房间操作
 * @static
 * @param {object} params 初始化参数
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="joinRoom" %}{% endlanying_code_snippet %}
 */
const joinRoom = () => {
  if (publishHandler) {
    let join = {
      request: 'join',
      room: initParams.roomId,
      ptype: 'publisher',
      pin: initParams.pin
    };
    publishHandler.send({
      message: join,
      success: () => {},
      error: errFunc
    });
  }
};

/**
 * 离开加入房间操作
 * @static
 * @param {null}
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="leaveRoom" %}{% endlanying_code_snippet %}
 */
const leaveRoom = () => {
  if (publishHandler) {
    let leave = { request: 'leave' };
    publishHandler.send({ message: leave });
    log.log('leaveRoom message has send.');
  }
};

/**
 * 发布本地流操作
 * @static
 * @param {enum} type 禁止标记
 * @param {boolean} hasVideo 是否发布视频
 * @param {boolean} hasAudio 是否发布音频
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="publish" %}{% endlanying_code_snippet %}
 */
const publish = (type, hasVideo, hasAudio, width, height) => {
  log.log('publish now not support type : ' + type);
  let tracks = [];
  if (hasAudio) {
    tracks.push({ type: 'audio', capture: true, recv: false });
  }
  if (hasVideo) {
    if (width <= 0) width = 360;
    if (height <= 0) height = 640;
    tracks.push({ type: 'video', capture: { width, height }, recv: false });
  }
  if (publishHandler) {
    publishHandler.createOffer({
      tracks: tracks,
      success: function (jsep) {
        let publish = { request: 'configure', audio: hasAudio, video: hasVideo, width: width, height: height };
        publishHandler.send({ message: publish, jsep: jsep });
      },
      error: function (error) {
        log.log('publish error : ' + error);
      }
    });
  }
};

/**
 * 取消发布流操作
 * @static
 * @param {null}
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="publish" %}{% endlanying_code_snippet %}
 */
const unPublish = () => {
  if (publishHandler) {
    let unpublish = { request: 'unpublish' };
    publishHandler.send({ message: unpublish });
    log.log('unPublish message has send.');
  }
};

/**
 * 订阅流信息操作
 * @static
 * @param {Array} sources
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="subscribe" %}{% endlanying_code_snippet %}
 */
const subscribe = (sources) => {
  if (creatingSubscription) {
    setTimeout(function () {
      subscribe(sources);
    }, 500);
    return;
  }

  if (callTimeoutId != null) {
    clearTimeout(callTimeoutId);
    callTimeoutId = null;
  }
  if (pickupTimeoutId != null) {
    clearTimeout(pickupTimeoutId);
    pickupTimeoutId = null;
  }

  if (subscribeHandler) {
    let subscription = [];
    for (let s in sources) {
      let streams = sources[s];
      for (let i in streams) {
        let stream = streams[i];
        if (stream.type === 'video' && Janus.webRTCAdapter.browserDetails.browser === 'safari' && (stream.codec === 'vp9' || (stream.codec === 'vp8' && !Janus.safariVp8))) {
          continue;
        }
        if (stream.disabled) {
          continue;
        }
        if (subscriptions[stream.id] && subscriptions[stream.id][stream.mid]) {
          continue;
        }
        subscription.push({
          feed: stream.id, // This is mandatory
          mid: stream.mid // This is optional (all streams, if missing)
        });
        if (!subscriptions[stream.id]) subscriptions[stream.id] = {};
        subscriptions[stream.id][stream.mid] = true;
      }
    }
    if (subscription.length === 0) {
      return;
    }
    subscribeHandler.send({
      message: {
        request: 'subscribe',
        streams: subscription
      }
    });
    return;
  }

  creatingSubscription = true;
  janus.attach({
    plugin: 'janus.plugin.videoroom',
    opaqueId: opaqueId,
    success: function (pluginHandle) {
      subscribeHandler = pluginHandle;
      let subscription = [];
      for (let s in sources) {
        let streams = sources[s];
        for (let i in streams) {
          let stream = streams[i];
          if (stream.type === 'video' && Janus.webRTCAdapter.browserDetails.browser === 'safari' && (stream.codec === 'vp9' || (stream.codec === 'vp8' && !Janus.safariVp8))) {
            continue;
          }
          if (stream.disabled) {
            continue;
          }
          if (subscriptions[stream.id] && subscriptions[stream.id][stream.mid]) {
            continue;
          }
          subscription.push({
            feed: stream.id, // This is mandatory
            mid: stream.mid // This is optional (all streams, if missing)
          });
          if (!subscriptions[stream.id]) subscriptions[stream.id] = {};
          subscriptions[stream.id][stream.mid] = true;
        }
      }
      let subscribe = {
        request: 'join',
        room: initParams.roomId,
        ptype: 'subscriber',
        streams: subscription,
        private_id: mypvtid,
        pin: initParams.pin
      };
      subscribeHandler.send({ message: subscribe });
    },
    error: function (error) {
      log.log('janus.attach error : ' + error);
    },
    onmessage: function (msg, jsep) {
      let event = msg['videoroom'];
      if (msg['error']) {
        log.log('janus.attach onmessage error : ' + msg['error']);
      } else if (event) {
        if (event === 'attached') {
          creatingSubscription = false;
          log.log('Successfully attached to feed in room ' + msg['room']);
        } else if (event === 'event') {
          if (msg['streams']) {
            syncRemotePublisherStreams(msg['streams']);
          }
        } else {
          //
        }
      }
      if (jsep) {
        if (subscribeHandler) {
          subscribeHandler.createAnswer({
            jsep: jsep,
            tracks: [{ type: 'data' }],
            success: function (jsep) {
              let body = { request: 'start', room: initParams.roomId };
              subscribeHandler.send({ message: body, jsep: jsep });
            },
            error: function (error) {
              log.log('janus.attach onmessage createAnswer error : ' + error);
            }
          });
        }
      }
    },
    webrtcState: function (on) {
      log.log('Janus says our WebRTC PeerConnection is ' + (on ? 'up' : 'down') + ' now');
      if (on) {
        remoteWebrtcState = true;
        if (localWebrtcState && remoteWebrtcState) {
          initParams.getThrough();
        }
      } else {
        if (!initParams.getHangUpStatus()) {
          initParams.hangupCall();
        }
      }
    },
    onlocaltrack: function (track, on) {
      log.log('janus.attach onlocaltrack track : ' + track + ' on : ' + on);
    },
    onremotetrack: function (track, mid, on) {
      log.log('janus.attach onremotetrack track : ' + track + ' mid : ' + mid + ' on : ' + on);
      if (!on) {
        const trackEpoch = (remoteStreamState[mid] || {}).trackEpoch || 0;
        if (!isCurrentRemoteTrack(mid, track, trackEpoch)) {
          log.log('ignore stale remote track removal, mid: ' + mid + ' track: ' + track.id);
          return;
        }
        bumpRemoteTrackEpoch(mid);
        // Track removed, get rid of the stream and the rendering
        let stream = remoteTracks[mid];
        if (stream) {
          try {
            let tracks = stream.getTracks();
            for (let i in tracks) {
              let mst = tracks[i];
              if (mst) mst.stop();
            }
          } catch (e) {
            log.log('error : ' + e);
          }
        }
        delete remoteTracks[mid];
        if (track.kind === 'video') {
          updateRemoteStreamState(mid, (currentState) => ({
            ...currentState,
            trackPresent: false,
            trackActive: false,
            trackUpdatedAt: Date.now(),
            lastTrackId: track.id
          }));
          reconcileRemoteVideoState(mid, 'track-removed');
        }
        return;
      }
      const nextTrackEpoch = bumpRemoteTrackEpoch(mid);
      let previousTrack = getCurrentRemoteTrack(mid);
      let previousStream = previousTrack && previousTrack !== track ? remoteTracks[mid] : null;
      let stream = new MediaStream([track]);
      remoteTracks[mid] = stream;
      if (stream) {
        if (track.kind === 'audio') {
          initParams.attachStream(stream, 'audio', false);
        } else if (track.kind === 'video') {
          bindRemoteVideoTrackState(track, mid, nextTrackEpoch);
          updateRemoteStreamState(mid, (currentState) => ({
            ...currentState,
            publisherActive: typeof currentState.publisherActive === 'boolean' ? currentState.publisherActive : true,
            trackPresent: true,
            trackActive: !(track.muted || track.readyState === 'ended'),
            trackUpdatedAt: Date.now(),
            lastTrackId: track.id
          }));
          reconcileRemoteVideoState(mid, 'track-added');
        }
      }
      if (previousStream) {
        try {
          Janus.stopAllTracks(previousStream);
        } catch (e) {
          log.log('stop previous remote track error : ' + e);
        }
      }
    },
    oncleanup: function () {}
  });
};

/**
 * 取消订阅流操作
 * @static
 * @param {number} id 取消订阅的流id
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="unSubscribe" %}{% endlanying_code_snippet %}
 */
const unSubscribe = (id) => {
  let feed = feedStreams[id];
  if (!feed) return;
  if (Array.isArray(feed.streams)) {
    feed.streams.forEach((stream) => {
      if (!stream || !stream.mid) {
        return;
      }
      const state = remoteStreamState[stream.mid];
      clearRemoteVideoSettleTimer(state);
      delete remoteStreamState[stream.mid];
    });
  }
  delete feedStreams[id];
  let unsubscribe = {
    request: 'unsubscribe',
    streams: [{ feed: id }]
  };
  if (subscribeHandler != null) subscribeHandler.send({ message: unsubscribe });
  delete subscriptions[id];
};

/**
 * 禁止本地发布音频流操作
 * @static
 * @param {boolean} mute 禁止标记
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="muteLocalAudio" %}{% endlanying_code_snippet %}
 */
const muteLocalAudio = (mute) => {
  if (publishHandler) {
    let muted = publishHandler.isAudioMuted();
    log.log('muteLocalAudio local audio status : ' + muted);
    if (mute != muted) {
      if (mute) {
        publishHandler.muteAudio();
      } else {
        publishHandler.unmuteAudio();
      }
    }
    log.log('muteLocalAudio local audio status : ' + mute);
  }
};

/**
 * 禁止本地发布视频流操作
 * @static
 * @param {boolean} mute 禁止标记
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="muteLocalVideo" %}{% endlanying_code_snippet %}
 */
const muteLocalVideo = (mute) => {
  if (publishHandler) {
    let muted = publishHandler.isVideoMuted();
    log.log('muteLocalVideo local video status : ' + muted);
    if (mute != muted) {
      if (mute) {
        publishHandler.muteVideo();
      } else {
        publishHandler.unmuteVideo();
      }
    }
    log.log('muteLocalVideo local video status : ' + mute);
  }
};

const getPublisherVideoMid = () => {
  if (!publishHandler || !publishHandler.webrtcStuff || !publishHandler.webrtcStuff.pc || !publishHandler.webrtcStuff.pc.getTransceivers) {
    return null;
  }
  const transceiver = publishHandler.webrtcStuff.pc.getTransceivers().find((transceiver) => {
    if (!transceiver || !transceiver.sender) {
      return false;
    }
    const senderTrack = transceiver.sender && transceiver.sender.track;
    const receiverTrack = transceiver.receiver && transceiver.receiver.track;
    return (senderTrack && senderTrack.kind === 'video') || (receiverTrack && receiverTrack.kind === 'video');
  });
  return transceiver ? transceiver.mid : null;
};

const renegotiateLocalVideoTrack = (enabled, audioEnabled, width, height, onFallback) => {
  if (!publishHandler || !publishHandler.createOffer) {
    if (onFallback) onFallback();
    return false;
  }
  const publisherVideoMid = getPublisherVideoMid();
  const videoTrackAction = enabled
    ? {
        type: 'video',
        capture: { width, height },
        recv: false,
        ...(publisherVideoMid ? { mid: publisherVideoMid, replace: true } : { add: true })
      }
    : {
        type: 'video',
        remove: true,
        recv: false,
        ...(publisherVideoMid ? { mid: publisherVideoMid } : {})
      };
  publishHandler.createOffer({
    tracks: [videoTrackAction],
    success: function (jsep) {
      publishHandler.send({
        message: {
          request: 'configure',
          audio: audioEnabled,
          video: enabled,
          width: width,
          height: height
        },
        jsep: jsep
      });
      log.log('renegotiateLocalVideoTrack success, enabled: ' + enabled + ' width: ' + width + ' height: ' + height);
    },
    error: function (error) {
      log.log('renegotiateLocalVideoTrack error : ' + error);
      if (onFallback) onFallback();
    }
  });
  return true;
};

const setLocalVideoEnabled = (enabled, width, height) => {
  if (typeof width === 'number' && width > 0) {
    initParams.width = width;
  }
  if (typeof height === 'number' && height > 0) {
    initParams.height = height;
  }
  if (!publishHandler) {
    return false;
  }
  initParams.hasVideo = enabled;
  let audioEnabled = initParams.hasAudio;
  if (audioEnabled && publishHandler.isAudioMuted) {
    audioEnabled = !publishHandler.isAudioMuted();
  }
  if (!enabled) {
    renegotiateLocalVideoTrack(false, audioEnabled, initParams.width, initParams.height, () => {
      publish(null, false, audioEnabled, initParams.width, initParams.height);
    });
    return true;
  }
  muteLocalVideo(false);
  renegotiateLocalVideoTrack(true, audioEnabled, initParams.width, initParams.height, () => {
    publish(null, true, audioEnabled, initParams.width, initParams.height);
  });
  return true;
};

/**
 * 禁止远程订阅音频流操作
 * @static
 * @param {object} stream 订阅流对象
 * @param {boolean} mute 禁止标记
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="muteRemoteAudio" %}{% endlanying_code_snippet %}
 */
const muteRemoteAudio = (stream, mute) => {
  let mid = 0;
  if (stream) mid = stream.mid;
  if (subscribeHandler != null) {
    let muted = subscribeHandler.isAudioMuted(mid);
    log.log('muteRemoteAudio remote audio status : ' + muted);
    if (mute != muted) {
      if (mute) {
        subscribeHandler.muteAudio(mid);
      } else {
        subscribeHandler.unmuteAudio(mid);
      }
    }
    log.log('muteRemoteAudio remote audio status : ' + mute);
  }
};

/**
 * 禁止远程订阅视频流操作
 * @static
 * @param {object} stream 订阅流对象
 * @param {boolean} mute 禁止标记
 * @return {null}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="muteRemoteVideo" %}{% endlanying_code_snippet %}
 */
const muteRemoteVideo = (stream, mute) => {
  let mid = 0;
  if (stream) mid = stream.mid;
  let muted = subscribeHandler.isVideoMuted(mid);
  if (subscribeHandler != null) {
    log.log('muteRemoteVideo remote video status : ' + muted);
    if (mute != muted) {
      if (mute) {
        subscribeHandler.muteVideo(mid);
      } else {
        subscribeHandler.unmuteVideo(mid);
      }
    }
    log.log('muteRemoteVideo remote video status : ' + mute);
  }
};

const updateVideoProfile = (width, height) => {
  if (typeof width === 'number' && width > 0) {
    initParams.width = width;
  }
  if (typeof height === 'number' && height > 0) {
    initParams.height = height;
  }
  if (!publishHandler) {
    return false;
  }
  let videoEnabled = initParams.hasVideo;
  let audioEnabled = initParams.hasAudio;
  if (publishHandler.isVideoMuted) {
    videoEnabled = !publishHandler.isVideoMuted();
  }
  if (publishHandler.isAudioMuted) {
    audioEnabled = !publishHandler.isAudioMuted();
  }
  if (!videoEnabled) {
    return true;
  }
  renegotiateLocalVideoTrack(true, audioEnabled, initParams.width, initParams.height, () => {
    publish(null, videoEnabled, audioEnabled, initParams.width, initParams.height);
  });
  return true;
};

/**
 * 获取Janus对象句柄
 * @static
 * @param {null}
 * @return {object}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="getJanusObject" %}{% endlanying_code_snippet %}
 */
const getJanusObject = () => {
  return janus;
};

/**
 * 获取发布操作对象句柄
 * @static
 * @param {null}
 * @return {object}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="getPublishHandler" %}{% endlanying_code_snippet %}
 */
const getPublishHandler = () => {
  return publishHandler;
};

/**
 * 获取订阅操作对象句柄
 * @static
 * @param {null}
 * @return {object}
 * @example
 * {% lanying_code_snippet repo="lanying-im-web",class="rtcManage",function="getSubscribeHandler" %}{% endlanying_code_snippet %}
 */
const getSubscribeHandler = () => {
  return subscribeHandler;
};

const getInCallStatus = () => {
  return messageStore.getInCallStatus();
};

export default {
  initRTCEngine,
  destroy,
  sendRTCMessage,
  joinRoom,
  leaveRoom,
  publish,
  unPublish,
  subscribe,
  unSubscribe,
  muteLocalAudio,
  muteLocalVideo,
  setLocalVideoEnabled,
  updateVideoProfile,
  muteRemoteAudio,
  muteRemoteVideo,
  getJanusObject,
  getPublishHandler,
  getSubscribeHandler,
  getInCallStatus
};
