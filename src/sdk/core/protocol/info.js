/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.info || ($protobuf.roots.info = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
                Info: {
                  fields: {
                    sdk_vsn: {
                      type: 'string',
                      id: 1
                    },
                    network: {
                      type: 'Network',
                      id: 2
                    },
                    content: {
                      type: 'string',
                      id: 3
                    }
                  },
                  nested: {
                    Network: {
                      values: {
                        WIRE: 0,
                        WIFI: 1,
                        NET_2G: 2,
                        NET_3G: 3,
                        NET_4G: 4,
                        NET_5G: 5,
                        UNKNOWN: 6
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
