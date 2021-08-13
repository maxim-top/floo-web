/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
(function (global, factory) {
  /* global define, require, module */

  /* AMD */ if (typeof define === 'function' && define.amd) define(['protobufjs/light'], factory);
  /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports) module.exports = factory(require('protobufjs/light'));
})(this, function ($protobuf) {
  'use strict';

  const $root = ($protobuf.roots.xid || ($protobuf.roots.xid = new $protobuf.Root())).addJSON({
    im: {
      nested: {
        floo: {
          nested: {
            protobuf: {
              nested: {
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
