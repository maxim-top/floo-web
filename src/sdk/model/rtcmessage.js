/*
  Type   type           = 1;
  string content        = 2;
  string media_server   = 3;
**/
import { STATIC_RTC_SIGNAL_TYPE } from '../utils/static';

function rtcmessage(params) {
  params = Object.assign(
    {},
    {
      type: STATIC_RTC_SIGNAL_TYPE.VIDEO_ROOM,
      content: ''
    },
    params
  );
  typeof params.type !== 'undefined' && (this.type = params.type);
  typeof params.content !== 'undefined' && (this.content = params.content);
  typeof params.media_server !== 'undefined' && (this.contmedia_serverent = params.media_server);
}

rtcmessage.prototype = {
  setType: function (type) {
    this.type = type;
  },
  setContent: function (content) {
    this.content = content;
  },
  setMediaServer: function (media_server) {
    this.media_server = media_server;
  }
};

export default rtcmessage;
