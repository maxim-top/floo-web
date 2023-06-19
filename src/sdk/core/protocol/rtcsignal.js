/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.rtcsignal || ($protobuf.roots.rtcsignal = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
                RtcSignal: {
                  fields: {
                    type: {
                      type: 'Type',
                      id: 1
                    },
                    content: {
                      type: 'string',
                      id: 2
                    },
                    media_server: {
                      type: 'string',
                      id: 3
                    }
                  },
                  nested: {
                    Type: {
                      values: {
                        UNKNOWN: 0,
                        VIDEO_ROOM: 1
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
