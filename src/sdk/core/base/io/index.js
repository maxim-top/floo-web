import io from 'socket.io-client';
import * as http from './httpIo';
import log from '../../../utils/log';
import { infoStore } from '../../../utils/store';
import receiveMessage from '../messageReceiver';
import { formatJson } from '../../../utils/tools';
import { makeProvision, makeUnreadULTimer } from '../messageMaker';
import { bind, fire } from '../../../utils/cusEvent';
import { frameEncode, unpack } from '../../protocol/index';

let config = {}; // appid, baseUrl, autoLogin, fireplace
const maxConnectTimes = 5;
let connectTimes = 0;
let heartTimer = null;
let socketLoginTimer = null;
const unreadDelayTime = 50000;
let userStatus = 'normal'; // normal, kick , logout
const SOCKET_LOGIN_TIMEOUT = 15000;

const CONNECT_TIMEOUT_MIN = 10000;
const CONNECT_TIMEOUT_STEP = 20000;
const connectTimeout = () => {
  return CONNECT_TIMEOUT_MIN + connectTimes * CONNECT_TIMEOUT_STEP;
};

const CONNECT_DELAY_MAX = 10000;
const CONNECT_DELAY_MIN = 1000;
const connectDelayTime = () => {
  return Math.floor(Math.random() * (CONNECT_DELAY_MAX - CONNECT_DELAY_MIN)) + CONNECT_DELAY_MIN;
};

let socket = null; // for web

const startHeartbeat = () => {
  heartTimer && clearInterval(heartTimer);
  heartTimer = setInterval(() => {
    sendMessage(makeUnreadULTimer());
  }, unreadDelayTime);
};

const stopHeartbeat = () => {
  if (heartTimer) {
    clearInterval(heartTimer);
  }
  heartTimer = null;
};

const clearSocketLoginTimeout = () => {
  if (socketLoginTimer) {
    clearTimeout(socketLoginTimer);
  }
  socketLoginTimer = null;
};

const startSocketLoginTimeout = () => {
  clearSocketLoginTimeout();
  socketLoginTimer = setTimeout(() => {
    socketLoginTimer = null;
    if (userStatus === 'normal' && socket && socket.connected) {
      log.warn('Socket login timed out, reconnecting');
      socket.disconnect();
    }
  }, SOCKET_LOGIN_TIMEOUT);
};

// event handlers
bind('refresh_fireplace', (fp) => {
  if (!fp) {
    return;
  }
  const previousFireplace = config.fireplace;
  config = Object.assign({}, config, { fireplace: fp });
  if (socket && userStatus === 'normal' && previousFireplace && previousFireplace !== fp) {
    log.warn('Fireplace changed, reconnecting socket: ', previousFireplace, ' -> ', fp);
    socket_connect();
  }
});

bind('loginSuccess', () => {
  connectTimes = 0;
  clearSocketLoginTimeout();
  startHeartbeat();
});

bind('sendMessage', (message) => {
  sendMessage(message);
});

bind('userKicked', () => {
  userStatus = 'kick';
});

bind('reconnect', ({ reason }) => {
  log.warn('socket reconnect due to ', reason);
  if (userStatus === 'normal') {
    if (socket && socket.connected) {
      socket.disconnect();
      return;
    }
    reconnectWithTimesCheck();
  }
});

// funcions
const connect = function (c) {
  config = c;
  connectTimes = 0;
  userStatus = 'normal';
  socket_connect();
};

const socket_connect = () => {
  clearSocketLoginTimeout();
  // cleanup old connections
  if (socket) {
    stopHeartbeat();
    if (userStatus === 'normal') {
      fire('socketDisconnected', { reason: 'SocketReplaced' });
    }
    socket.destroy();
  }

  const { fireplace } = config;
  log.log('................................. will connect : ', fireplace);
  fire('flooNotice', {
    category: 'loginMessage',
    desc: 'socket connecting...'
  });

  socket = io(fireplace, {
    timeout: connectTimeout(),
    transports: ['websocket']
  });

  socket.on('connect', () => {
    log.log('=================  socket connected ');
    fire('flooNotice', {
      category: 'loginMessage',
      desc: 'socket connect success...'
    });

    startProvision();
    startSocketLoginTimeout();
  });

  socket.on('frame', (bytes) => {
    onFrame(bytes);
  });

  socket.on('disconnect', (reason) => {
    log.log('=================  socket disconnected due to ', reason);
    stopHeartbeat();
    clearSocketLoginTimeout();
    if (userStatus === 'normal') fire('socketDisconnected', { reason });
    fire('reconnect', { reason });
  });

  socket.on('error', (error) => {
    log.log('=================  socket error: ', error);
    fire('reconnect', { reason: 'SocketError' });
  });
  socket.on('connect_error', (error) => {
    log.log('=================  socket connect error: ', error);
    if (userStatus === 'normal') {
      recordConnectionFailure();
    }
  });
  socket.on('reconnect_attempt', (attemptNum) => {
    log.log('=================  socket reconnect_attempt: ', attemptNum);
    socket.io.opts.transports = ['websocket'];
  });
};

const recordConnectionFailure = () => {
  //check if we've tried too many times on one server
  if (connectTimes >= maxConnectTimes) {
    connectTimes = 0;
    fire('fireplaceError');
  } else {
    connectTimes++;
  }
};

const reconnectWithTimesCheck = () => {
  recordConnectionFailure();
  reconnect();
};

const reconnect = () => {
  const delay = connectDelayTime();
  log.error('================= socket will reconnect in ', delay, ' ms (', connectTimes, ')');
  setTimeout(() => {
    socket.connect();
  }, delay);
};

const startProvision = () => {
  log.log('=============== sending proversion ==========');
  fire('flooNotice', {
    category: 'loginMessage',
    desc: 'logining socket service...'
  });
  fire('sendMessage', makeProvision({ token: infoStore.getToken(), uid: infoStore.getUid() }));
};

const onFrame = (bytes) => {
  const msg = unpack(bytes);
  log.info('RECV :' + JSON.stringify(formatJson(msg)));
  receiveMessage(msg);
};

const sendMessage = (msg) => {
  log.info('SEND :' + JSON.stringify(formatJson(msg)));
  const bytes = frameEncode(msg);
  const buffArr = new ArrayBuffer(bytes.length);
  const buffView = new Uint8Array(buffArr);
  bytes.forEach((v, i) => {
    buffView[i] = v;
  });

  socket.emit('frame', buffArr);
};

const isConnected = () => !!(socket && socket.connected);

const disConnect = () => {
  userStatus = 'logout';
  stopHeartbeat();
  clearSocketLoginTimeout();
  socket && socket.disconnect();
};

const floo_io = Object.assign(http, {
  connect,
  sendMessage,
  isConnected,
  disConnect
});

export default floo_io;
