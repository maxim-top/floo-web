/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.xsync || ($protobuf.roots.xsync = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
                Frame: {
                  fields: {
                    vsn: {
                      type: 'VSN',
                      id: 1
                    },
                    compress_method: {
                      type: 'CompressMethod',
                      id: 2
                    },
                    command: {
                      type: 'Command',
                      id: 3
                    },
                    payload: {
                      type: 'bytes',
                      id: 4
                    },
                    encrypt_method: {
                      type: 'EncryptMethod',
                      id: 5
                    },
                    encrypt_key: {
                      type: 'bytes',
                      id: 6
                    },
                    check_sum: {
                      type: 'uint32',
                      id: 7
                    },
                    tag: {
                      type: 'string',
                      id: 8
                    }
                  },
                  nested: {
                    VSN: {
                      values: {
                        XSYNC_V1: 0,
                        XSYNC_V2: 1
                      }
                    },
                    Command: {
                      values: {
                        UNREAD: 0,
                        SYNC: 1,
                        NOTICE: 2,
                        PROVISION: 3
                      }
                    },
                    CompressMethod: {
                      values: {
                        NONE: 0,
                        ZLIB: 1
                      }
                    },
                    EncryptMethod: {
                      values: {
                        ENCRYPT_NONE: 0,
                        AES_CBC_128: 1,
                        AES_CBC_256: 2,
                        CUSTOM: 3
                      }
                    }
                  }
                },
                Status: {
                  fields: {
                    code: {
                      type: 'ErrorCode',
                      id: 1
                    },
                    reason: {
                      type: 'string',
                      id: 2
                    }
                  },
                  nested: {
                    ErrorCode: {
                      values: {
                        UNKNOWN: 0,
                        OK: 1,
                        FAIL: 2,
                        UNKNOWN_COMMAND: 3,
                        PB_PARSER_ERROR: 4,
                        DECRYPT_FAILURE: 5,
                        PUBLIC_KEY_CHANGED: 6,
                        INVALID_TOKEN: 7,
                        INVALID_PARAMETER: 8,
                        UNAUTHORIZED: 9,
                        USER_FROZEN: 10,
                        USER_BANNED: 11,
                        WORD_CENSORED: 12,
                        TOO_MANY_DEVICES: 13,
                        ENCRYPT_METHOD_UNSUPPORTED: 14,
                        DEVICE_GUID_CONFLICT: 15,
                        CHECK_SUM_FAILURE: 16,
                        INVALID_LICENSE: 17,
                        LICENSE_LIMIT: 18,
                        APP_FROZEN: 19
                      }
                    }
                  }
                },
                ConversationUnread: {
                  fields: {
                    xid: {
                      type: 'XID',
                      id: 1
                    },
                    n: {
                      type: 'uint32',
                      id: 2
                    },
                    type: {
                      type: 'ConvType',
                      id: 3
                    }
                  },
                  nested: {
                    ConvType: {
                      values: {
                        UNKNOWN: 0,
                        CHAT: 1,
                        GROUPCHAT: 2
                      }
                    }
                  }
                },
                UnreadUL: {
                  fields: {}
                },
                UnreadDL: {
                  fields: {
                    status: {
                      type: 'Status',
                      id: 1
                    },
                    unread: {
                      rule: 'repeated',
                      type: 'ConversationUnread',
                      id: 2
                    }
                  }
                },
                SyncUL: {
                  fields: {
                    xid: {
                      type: 'XID',
                      id: 1
                    },
                    key: {
                      type: 'uint64',
                      id: 2
                    },
                    meta: {
                      type: 'Meta',
                      id: 3
                    },
                    is_full_sync: {
                      type: 'bool',
                      id: 4
                    },
                    full_sync_num: {
                      type: 'sint32',
                      id: 5
                    }
                  }
                },
                SyncDL: {
                  fields: {
                    status: {
                      type: 'Status',
                      id: 1
                    },
                    metas: {
                      rule: 'repeated',
                      type: 'Meta',
                      id: 2
                    },
                    next_key: {
                      type: 'uint64',
                      id: 3
                    },
                    xid: {
                      type: 'XID',
                      id: 4
                    },
                    client_mid: {
                      type: 'uint64',
                      id: 5
                    },
                    server_mid: {
                      type: 'uint64',
                      id: 6
                    },
                    server_time: {
                      type: 'uint64',
                      id: 7
                    },
                    is_full_sync: {
                      type: 'bool',
                      id: 8
                    },
                    prev_mid: {
                      type: 'uint64',
                      id: 9
                    },
                    is_eager_sync: {
                      type: 'bool',
                      id: 10
                    }
                  }
                },
                Notice: {
                  fields: {
                    xid: {
                      type: 'XID',
                      id: 1
                    }
                  }
                },
                Provision: {
                  fields: {
                    status: {
                      type: 'Status',
                      id: 1
                    },
                    xid: {
                      type: 'XID',
                      id: 2
                    },
                    password: {
                      type: 'string',
                      id: 5
                    },
                    token: {
                      type: 'string',
                      id: 6
                    },
                    os_type: {
                      type: 'OsType',
                      id: 7
                    },
                    sdk_vsn: {
                      type: 'string',
                      id: 8
                    },
                    is_manual_login: {
                      type: 'bool',
                      id: 9
                    },
                    device_guid: {
                      type: 'string',
                      id: 10
                    },
                    device_notifier: {
                      type: 'string',
                      id: 11
                    },
                    device_token: {
                      type: 'string',
                      id: 12
                    },
                    device_info: {
                      type: 'string',
                      id: 13
                    },
                    last_login_time: {
                      type: 'uint64',
                      id: 14
                    }
                  },
                  nested: {
                    OsType: {
                      values: {
                        UNKNOWN: 0,
                        IOS: 1,
                        ANDR: 2,
                        WIN: 3,
                        OSX: 4,
                        LINUX: 5,
                        WEB: 6
                      }
                    }
                  }
                },
                Meta: {
                  fields: {
                    id: {
                      type: 'uint64',
                      id: 1
                    },
                    from: {
                      type: 'XID',
                      id: 2
                    },
                    to: {
                      type: 'XID',
                      id: 3
                    },
                    timestamp: {
                      type: 'uint64',
                      id: 4
                    },
                    ns: {
                      type: 'NameSpace',
                      id: 5
                    },
                    payload: {
                      type: 'bytes',
                      id: 6
                    }
                  },
                  nested: {
                    NameSpace: {
                      values: {
                        UNKNOWN: 0,
                        MESSAGE: 1,
                        GROUP_NOTICE: 2,
                        ROSTER_NOTICE: 3,
                        USER_NOTICE: 4,
                        INFO: 5,
                        CONVERSATION: 6,
                        PUSH: 7
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
