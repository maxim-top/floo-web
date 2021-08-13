/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.messagebody || ($protobuf.roots.messagebody = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
                MessageOperation: {
                  fields: {
                    type: {
                      type: 'OpType',
                      id: 1
                    },
                    mid: {
                      type: 'uint64',
                      id: 2
                    },
                    xid: {
                      type: 'XID',
                      id: 3
                    }
                  },
                  nested: {
                    OpType: {
                      values: {
                        UNKNOWN: 0,
                        READ_ACK: 1,
                        READ_ALL: 2,
                        READ_CANCEL: 3,
                        DELIVER_ACK: 4,
                        RECALL: 5,
                        DELETE: 6,
                        PLAY_ACK: 7
                      }
                    }
                  }
                },
                MessageBody: {
                  fields: {
                    type: {
                      type: 'Type',
                      id: 1
                    },
                    content: {
                      type: 'string',
                      id: 4
                    },
                    ctype: {
                      type: 'ContentType',
                      id: 5
                    },
                    operation: {
                      type: 'MessageOperation',
                      id: 6
                    },
                    config: {
                      type: 'string',
                      id: 7
                    },
                    attachment: {
                      type: 'string',
                      id: 8
                    },
                    ext: {
                      type: 'string',
                      id: 9
                    },
                    qos: {
                      type: 'QoS',
                      id: 10
                    },
                    sender_name: {
                      type: 'string',
                      id: 11
                    },
                    is_system: {
                      type: 'bool',
                      id: 12
                    },
                    priority: {
                      type: 'uint32',
                      id: 13
                    },
                    status: {
                      type: 'Status',
                      id: 14
                    }
                  },
                  nested: {
                    Type: {
                      values: {
                        NORMAL: 0,
                        OPER: 1,
                        CHAT: 2,
                        GROUPCHAT: 3
                      }
                    },
                    ContentType: {
                      values: {
                        TEXT: 0,
                        IMAGE: 1,
                        AUDIO: 2,
                        VIDEO: 3,
                        FILE: 4,
                        LOCATION: 5,
                        COMMAND: 6,
                        FORWARD: 7
                      }
                    },
                    QoS: {
                      values: {
                        AT_LEAST_ONCE: 0,
                        AT_MOST_ONCE: 1,
                        EXACTLY_ONCE: 2
                      }
                    },
                    Status: {
                      values: {
                        UNREAD: 0,
                        DELIVERED: 1,
                        READ: 2
                      }
                    }
                  }
                },
                XID: {
                  fields: {
                    uid: {
                      type: 'uint64',
                      id: 1
                    },
                    deviceSN: {
                      type: 'uint32',
                      id: 2
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return $root;
});
