/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.rosternotice || ($protobuf.roots.rosternotice = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
                RosterNotice: {
                  fields: {
                    type: {
                      type: 'Type',
                      id: 1
                    },
                    from: {
                      type: 'XID',
                      id: 2
                    },
                    to: {
                      rule: 'repeated',
                      type: 'XID',
                      id: 3
                    },
                    content: {
                      type: 'string',
                      id: 4
                    },
                    roster_vsn: {
                      type: 'string',
                      id: 5
                    }
                  },
                  nested: {
                    Type: {
                      values: {
                        UNKNOWN: 0,
                        ADDED: 1,
                        REMOVED: 2,
                        ACCEPTED: 3,
                        DECLINED: 4,
                        APPLIED: 7,
                        BLOCKED: 5,
                        UNBLOCKED: 6,
                        INFO_UPDATED: 8,
                        MUTED: 9,
                        UNMUTED: 10
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
