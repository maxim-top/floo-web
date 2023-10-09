/**
 Type                type                = 1;
 XID                 from                = 2;
 XID                 to                  = 3;
 string              content             = 4;
 ContentType         ctype               = 5;
 MessageOperation    operation           = 6;
 string              config              = 7;
 string              attachment          = 8;
 string              ext                 = 9;
 QoS                 qos                 = 10;
 string              sender_name         = 11;
 bool                is_system           = 12; // system message
 uint32              priority            = 13;
 Status              status              = 14;
 uint64              edit_timestamp      = 15;
 */
// import xid from './xid';
import { STATIC_MESSAGE_CONTENT_TYPE, STATIC_MESSAGE_OPTYPE, STATIC_MESSAGE_TYPE } from '../utils/static';

function message(params) {
  const {
    operation = {
      type: STATIC_MESSAGE_OPTYPE.UNKNOWN,
      mid: 0
    }
  } = params;
  params = Object.assign(
    {},
    {
      type: STATIC_MESSAGE_TYPE.NORMAL,
      ctype: STATIC_MESSAGE_CONTENT_TYPE.TEXT,
      content: '',
      operation
    },
    params
  );
  typeof params.type !== 'undefined' && (this.type = params.type);
  typeof params.from !== 'undefined' && (this.from = params.from);
  typeof params.to !== 'undefined' && (this.to = params.to);
  typeof params.content !== 'undefined' && (this.content = params.content);
  typeof params.ctype !== 'undefined' && (this.ctype = params.ctype);
  typeof params.operation !== 'undefined' && (this.operation = params.operation);
  typeof params.config !== 'undefined' && (this.config = params.config);
  typeof params.attachment !== 'undefined' && (this.attachment = params.attachment);
  typeof params.ext !== 'undefined' && (this.ext = params.ext);
  typeof params.qos !== 'undefined' && (this.qos = params.qos);
  typeof params.sender_name !== 'undefined' && (this.sender_name = params.sender_name);
  typeof params.is_system != 'undefined' && (this.is_system = params.is_system);
  typeof params.priority != 'undefined' && (this.priority = params.priority);
  typeof params.status != 'undefined' && (this.status = params.status);
  typeof params.edit_timestamp != 'undefined' && (this.edit_timestamp = params.edit_timestamp);
}

message.prototype = {
  setType: function (type) {
    this.type = type;
  },
  setFrom: function (from) {
    this.from = from;
  },
  setTo: function (to) {
    this.to = to;
  },
  setContent: function (content) {
    this.content = content;
  },
  setCtype: function (ctype) {
    this.ctype = ctype;
  },
  setOperation: function (operation) {
    this.operation = operation;
  },
  setConfig: function (config) {
    this.config = config;
  },
  setAttachment: function (attachment) {
    this.attachment = attachment;
  },
  setExt: function (ext) {
    this.ext = ext;
  },
  setQos: function (qos) {
    this.qos = qos;
  },
  setSendername: function (sender_name) {
    this.sender_name = sender_name;
  },
  setIssystem: function (is_system) {
    this.is_system = is_system;
  },
  setPriority: function (priority) {
    this.priority = priority;
  },
  setStatus: function (status) {
    this.status = status;
  },
  setEditTimestamp: function (edit_timestamp) {
    this.edit_timestamp = edit_timestamp;
  }
};

export default message;
