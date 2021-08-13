/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.groupnotice || ($protobuf.roots.groupnotice = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
                GroupNotice: {
                  fields: {
                    type: {
                      type: 'Type',
                      id: 1
                    },
                    gid: {
                      type: 'XID',
                      id: 2
                    },
                    from: {
                      type: 'XID',
                      id: 3
                    },
                    to: {
                      rule: 'repeated',
                      type: 'XID',
                      id: 4
                    },
                    content: {
                      type: 'string',
                      id: 5
                    }
                  },
                  nested: {
                    Type: {
                      values: {
                        UNKNOWN: 0,
                        PRESENCE: 1,
                        ABSENCE: 2,
                        CREATED: 3,
                        DESTROYED: 4,
                        JOINED: 5,
                        LEAVED: 6,
                        APPLYED: 7,
                        APPLY_ACCEPTED: 8,
                        APPLY_DECLINED: 9,
                        INVITED: 10,
                        INVITE_ACCEPTED: 11,
                        INVITE_DECLINED: 12,
                        KICKED: 13,
                        BLOCKED: 14,
                        UNBLOCKED: 15,
                        OWNER_ASSIGNED: 16,
                        ADMIN_GRANTED: 17,
                        ADMIN_REVOKED: 18,
                        MUTED: 19,
                        UNMUTED: 20,
                        BANNED: 21,
                        UNBANNED: 22,
                        INFO_UPDATED: 23,
                        ANNOUNCEMENT_UPDATED: 24,
                        MESSAGE_SETTING: 25,
                        FILE_UPLOADED: 26,
                        FILE_DELETED: 27,
                        FILE_UPDATED: 28
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
