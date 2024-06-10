import { makeRtcSignal } from '../base/messageMaker';
import io from '../base/io/index';
import { bind } from '../../utils/cusEvent';
var JSONBigString = require('json-bigint');

let that = null;

const socketCls = function (server, protocol) {
  this.readyState = 0;
  this.events = new Map();
  this.server = server;
  this.protocol = protocol;
  this.addEventListener('error', this.error);
  this.addEventListener('open', this.open);
  this.addEventListener('send', this.send);
  this.addEventListener('message', this.message);
  this.addEventListener('close', this.close);
  that = this;
};

socketCls.prototype.error = function () {
  this.close();
};

socketCls.prototype.open = function () {
  this.readyState = 1;
};

socketCls.prototype.send = function (data) {
  if (this.readyState === 1) {
    if (data.session_id) {
      data.session_id = '###' + data.session_id + '###';
    }
    if (data.handle_id) {
      data.handle_id = '###' + data.handle_id + '###';
    }
    if (data.body && data.body.room) {
      data.body.room = '###' + data.body.room + '###';
    }
    if (data.body && data.body.streams) {
      for (let stream in data.body.streams) {
        if (stream && stream.feed) {
          stream.feed = '###' + stream.feed + '###';
        }
      }
    }

    let content = JSON.stringify(data);
    let repExp1 = /"###/g;
    let repExp2 = /###"/g;
    content = content.replace(repExp1, '');
    content = content.replace(repExp2, '');

    let server = this.server;
    let msg = makeRtcSignal({ content, media_server: server });
    let meta = msg.payload.meta;
    io.sendMessage(msg);
    const { id } = meta;
    return id;
  }
};

bind('socketClsOnSignal', (content) => {
  let sContent = null;
  if (that.readyState === 1) {
    try {
      sContent = JSONBigString.parse(content);
    } catch (ex) {
      //
    }
    if (sContent) {
      that.emit('message', sContent);
    }
  }
});

socketCls.prototype.message = function () {};

socketCls.prototype.close = function () {
  this.readyState = 0;
};

const wrapCallback = (fn, once = false) => ({ callback: fn, once });
socketCls.prototype.addEventListener = function (type, func, once = false) {
  const handler = this.events.get(type);
  if (!handler) {
    this.events.set(type, wrapCallback(func, once));
  } else if (handler && typeof handler.callback === 'function') {
    this.events.set(type, [handler, wrapCallback(func, once)]);
  } else {
    handler.push(wrapCallback(func, once));
  }
};

socketCls.prototype.removeEventListener = function (type, listener) {
  const handler = this.events.get(type);
  if (!handler) return;
  if (!Array.isArray(this.events)) {
    if (handler.callback === listener.callback) this.events.delete(type);
    else return;
  }
  for (let i = 0; i < handler.length; i++) {
    const item = handler[i];
    if (item.callback === listener.callback) {
      handler.splice(i, 1);
      i--;
      if (handler.length == 1) {
        this.events.set(type, handler[0]);
      }
    }
  }
};

socketCls.prototype.once = function (type, listener) {
  this.addEventListener(type, listener);
};

socketCls.prototype.emit = function (type, ...args) {
  const handler = this.events.get(type);
  if (!handler) return;
  if (Array.isArray(handler)) {
    handler.forEach((item) => {
      item.callback.apply(this, args);
      if (item.once) {
        this.removeEventListener(type, item);
      }
    });
  } else {
    handler.callback.apply(this, args);
    if (handler.once) {
      this.events.delete(type);
    }
  }
  return true;
};

socketCls.prototype.removeAllEventListener = function (type) {
  const handler = this.events.get(type);
  if (!handler) return;
  this.events.delete(type);
};

export default socketCls;
