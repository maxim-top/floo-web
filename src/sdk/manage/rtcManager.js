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

var initParams = {};
var hangupTimeoputId = null;
var hangupTimeout = 1000 * 60;

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

/**
 * 发起端发起音视频呼叫
 * @static
 * @param {object} params 初始化参数
 * @param {string} params.server RTC服务器地址
 * @param {number} params.id 音视频用户id
 * @param {string} params.name 音视频用户名称
 * @param {number} params.receiver 音视频用户对方id
 * @param {boolean} params.caller 是否为呼叫发起者
 * @param {string} params.secret 创建的房间操作密码
 * @param {string} params.pin 创建的房间加入pin码
 * @param {boolean} params.hasVideo 是否存在视频流
 * @param {boolean} params.hasAudio 是否存在音频流
 * @param {number} params.width 视频流画面宽度
 * @param {number} params.height 视频流画面高度
 * @param {string} params.localVideo 本地video标签id
 * @param {string} params.remoteVideo 远程video标签id
 * @param {string} params.remoteAudio 远程audio标签id
 * @param {boolean} params.getThrough 音视频通话是否接通
 * @param {boolean} params.hangupCall 音视频通话是否挂断
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
                  },
                  error: errFunc
                });
              } else {
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
                if (initParams.caller) {
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
                  hangupTimeoputId = setTimeout(function () {
                    clearTimeout(hangupTimeoputId);
                    hangupTimeoputId = null;
                    initParams.hangupCall(true, true);
                  }, hangupTimeout);
                }
              } else {
                if (!initParams.getHangUpStatus()) {
                  initParams.hangupCall();
                }
              }
            },
            slowLink: function (uplink, lost, mid) {
              log.log('Janus reports problems ' + (uplink ? 'sending' : 'receiving') + ' packets on mid ' + mid + ' (' + lost + ' lost packets)');
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
                      if (!sources) sources = [];
                      sources.push(streams);
                    }
                    if (sources) subscribe(sources);
                  } else if (msg['leaving']) {
                    let leaving = msg['leaving'];
                    unSubscribe(leaving);
                  } else if (msg['unpublished']) {
                    let unpublished = msg['unpublished'];
                    if (unpublished === 'ok') {
                      publishHandler.hangup();
                      return;
                    }
                    unSubscribe(unpublished);
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
                  return;
                }
                let stream = new MediaStream([track]);
                localTracks[trackId] = stream;
                Janus.attachMediaStream(initParams.localVideo, stream);
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
  Janus.stopAllTracks(localTracks);
  Janus.stopAllTracks(remoteTracks);
  if (typeof window.stream === 'object') {
    window.stream.getTracks().forEach((track) => track.stop());
  }
  if (hangupTimeoputId != null) {
    clearTimeout(hangupTimeoputId);
    hangupTimeoputId = null;
  }
  localTracks = {};
  remoteTracks = {};
  myStream = {};
  feedStreams = {};
  subscriptions = {};
  janus.destroy();
  publishHandler = null;
  subscribeHandler = null;
  janus = null;
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
const joinRoom = (params) => {
  initRTCEngine(params);
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

  if (hangupTimeoputId != null) {
    clearTimeout(hangupTimeoputId);
    hangupTimeoputId = null;
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
          //
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
        initParams.getThrough();
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
        return;
      }
      let stream = new MediaStream([track]);
      remoteTracks[mid] = stream;
      if (track.kind === 'audio') {
        Janus.attachMediaStream(initParams.remoteAudio, stream);
      } else if (track.kind === 'video') {
        Janus.attachMediaStream(initParams.remoteVideo, stream);
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
  muteRemoteAudio,
  muteRemoteVideo,
  getJanusObject,
  getPublishHandler,
  getSubscribeHandler
};
