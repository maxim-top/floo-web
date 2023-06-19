/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.usernotice || ($protobuf.roots.usernotice = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
                UserNotice: {
                  fields: {
                    type: {
                      type: 'Type',
                      id: 1
                    },
                    content: {
                      type: 'string',
                      id: 2
                    }
                  },
                  nested: {
                    Type: {
                      values: {
                        UNKNOWN: 0,
                        PASSWORD_CHANGED: 1,
                        FROZEN: 2,
                        REMOVED: 3,
                        KICK_BY_SAME_DEVICE: 4,
                        KICKED_BY_OTHER_DEVICE: 5,
                        INFO_UPDATED: 6,
                        DEVICE_LOGIN: 7,
                        DEVICE_LOGOUT: 8,
                        DEVICE_ADDED: 9,
                        DEVICE_REMOVED: 10,
                        CLUSTER_CHANGED: 11,
                        DNS_UPDATE: 12,
                        TRAFFIC_LIMIT_EXCEEDED: 13
                      }
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
