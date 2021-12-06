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
const unreadDelayTime = 50000;
let userStatus = 'normal'; // normal, kick , logout

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

// event handlers
bind('refresh_fireplace', (fp) => {
  config = Object.assign(
    {
      fireplace: fp
    },
    config
  );
});

bind('loginSuccess', () => {
  connectTimes = 0;
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
  // cleanup old connections
  if (socket) {
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
  });

  socket.on('frame', (bytes) => {
    onFrame(bytes);
  });

  socket.on('disconnect', (reason) => {
    log.log('=================  socket disconnected due to ', reason);
    fire('reconnect', { reason });
  });

  socket.on('error', (error) => {
    log.log('=================  socket error: ', error);
    fire('reconnect', { reason: 'SocketError' });
  });
  socket.on('reconnect_attempt', (attemptNum) => {
    log.log('=================  socket reconnect_attempt: ', attemptNum);
    socket.io.opts.transports = ['websocket'];
  });
};

const reconnectWithTimesCheck = () => {
  //check if we've tried too many times on one server
  if (connectTimes >= maxConnectTimes) {
    connectTimes = 0;
    fire('fireplaceError');
  } else {
    connectTimes++;
  }
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

const disConnect = () => {
  userStatus = 'logout';
  socket && socket.disconnect();
};

const floo_io = Object.assign(http, {
  connect,
  sendMessage,
  disConnect
});

export default floo_io;
