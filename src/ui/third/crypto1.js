/* eslint-disable */

/*!
 * Crypto-JS v1.1.0
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2009, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */
(function () {
  var base64map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  // Global Crypto object
  window.Crypto = {};

  // Crypto utilities
  var util = (Crypto.util = {
    // Bit-wise rotate left
    rotl: function (n, b) {
      return (n << b) | (n >>> (32 - b));
    },

    // Bit-wise rotate right
    rotr: function (n, b) {
      return (n << (32 - b)) | (n >>> b);
    },

    // Swap big-endian to little-endian and vice versa
    endian: function (n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return (util.rotl(n, 8) & 0x00ff00ff) | (util.rotl(n, 24) & 0xff00ff00);
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++) n[i] = util.endian(n[i]);
      return n;
    },

    // Generate an array of any length of random bytes
    randomBytes: function (n) {
      for (var bytes = []; n > 0; n--) bytes.push(Math.floor(Math.random() * 256));
      return bytes;
    },

    // Convert a string to a byte array
    stringToBytes: function (str) {
      var bytes = [];
      for (var i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function (bytes) {
      var str = [];
      for (var i = 0; i < bytes.length; i++) str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    },

    // Convert a string to big-endian 32-bit words
    stringToWords: function (str) {
      var words = [];
      for (var c = 0, b = 0; c < str.length; c++, b += 8) words[b >>> 5] |= str.charCodeAt(c) << (24 - (b % 32));
      return words;
    },

    // Convert a byte array to big-endian 32-bits words
    bytesToWords: function (bytes) {
      var words = [];
      for (var i = 0, b = 0; i < bytes.length; i++, b += 8) words[b >>> 5] |= bytes[i] << (24 - (b % 32));
      return words;
    },

    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function (words) {
      var bytes = [];
      for (var b = 0; b < words.length * 32; b += 8) bytes.push((words[b >>> 5] >>> (24 - (b % 32))) & 0xff);
      return bytes;
    },

    // Convert a byte array to a hex string
    bytesToHex: function (bytes) {
      var hex = [];
      for (var i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xf).toString(16));
      }
      return hex.join('');
    },

    // Convert a hex string to a byte array
    hexToBytes: function (hex) {
      var bytes = [];
      for (var c = 0; c < hex.length; c += 2) bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    },

    // Convert a byte array to a base-64 string
    bytesToBase64: function (bytes) {
      // Use browser-native function if it exists
      if (typeof btoa == 'function') return btoa(util.bytesToString(bytes));

      var base64 = [],
        overflow;

      for (var i = 0; i < bytes.length; i++) {
        switch (i % 3) {
          case 0:
            base64.push(base64map.charAt(bytes[i] >>> 2));
            overflow = (bytes[i] & 0x3) << 4;
            break;
          case 1:
            base64.push(base64map.charAt(overflow | (bytes[i] >>> 4)));
            overflow = (bytes[i] & 0xf) << 2;
            break;
          case 2:
            base64.push(base64map.charAt(overflow | (bytes[i] >>> 6)));
            base64.push(base64map.charAt(bytes[i] & 0x3f));
            overflow = -1;
        }
      }

      // Encode overflow bits, if there are any
      if (overflow != undefined && overflow != -1) base64.push(base64map.charAt(overflow));

      // Add padding
      while (base64.length % 4 != 0) base64.push('=');

      return base64.join('');
    },

    // Convert a base-64 string to a byte array
    base64ToBytes: function (base64) {
      // Use browser-native function if it exists
      if (typeof atob == 'function') return util.stringToBytes(atob(base64));

      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/gi, '');

      var bytes = [];

      for (var i = 0; i < base64.length; i++) {
        switch (i % 4) {
          case 1:
            bytes.push((base64map.indexOf(base64.charAt(i - 1)) << 2) | (base64map.indexOf(base64.charAt(i)) >>> 4));
            break;
          case 2:
            bytes.push(((base64map.indexOf(base64.charAt(i - 1)) & 0xf) << 4) | (base64map.indexOf(base64.charAt(i)) >>> 2));
            break;
          case 3:
            bytes.push(((base64map.indexOf(base64.charAt(i - 1)) & 0x3) << 6) | base64map.indexOf(base64.charAt(i)));
            break;
        }
      }

      return bytes;
    }
  });

  // Crypto mode namespace
  Crypto.mode = {};
})();

/*!
 * Crypto-JS v1.1.0
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2009, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */
(function () {
  // Shortcut
  var util = window.Crypto.util;

  window.Crypto.HMAC = function (hasher, message, key, options) {
    // Allow arbitrary length keys
    key = key.length > hasher._blocksize * 4 ? hasher(key, { asBytes: true }) : util.stringToBytes(key);

    // XOR keys with pad constants
    var okey = key,
      ikey = key.slice(0);
    for (var i = 0; i < hasher._blocksize * 4; i++) {
      okey[i] ^= 0x5c;
      ikey[i] ^= 0x36;
    }

    var hmacbytes = hasher(util.bytesToString(okey) + hasher(util.bytesToString(ikey) + message, { asString: true }), { asBytes: true });
    return options && options.asBytes ? hmacbytes : options && options.asString ? util.bytesToString(hmacbytes) : util.bytesToHex(hmacbytes);
  };
})();

/*
 * Crypto-JS v1.1.0
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2009, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */

(function () {
  var b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var a = (window.Crypto.util = {
    rotl: function (d, c) {
      return (d << c) | (d >>> (32 - c));
    },
    rotr: function (d, c) {
      return (d << (32 - c)) | (d >>> c);
    },
    endian: function (d) {
      if (d.constructor == Number) {
        return (a.rotl(d, 8) & 16711935) | (a.rotl(d, 24) & 4278255360);
      }
      for (var c = 0; c < d.length; c++) {
        d[c] = a.endian(d[c]);
      }
      return d;
    },
    randomBytes: function (d) {
      for (var c = []; d > 0; d--) {
        c.push(Math.floor(Math.random() * 256));
      }
      return c;
    },
    stringToBytes: function (e) {
      var c = [];
      for (var d = 0; d < e.length; d++) {
        c.push(e.charCodeAt(d));
      }
      return c;
    },
    bytesToString: function (c) {
      var e = [];
      for (var d = 0; d < c.length; d++) {
        e.push(String.fromCharCode(c[d]));
      }
      return e.join('');
    },
    stringToWords: function (f) {
      var e = [];
      for (var g = 0, d = 0; g < f.length; g++, d += 8) {
        e[d >>> 5] |= f.charCodeAt(g) << (24 - (d % 32));
      }
      return e;
    },
    bytesToWords: function (d) {
      var f = [];
      for (var e = 0, c = 0; e < d.length; e++, c += 8) {
        f[c >>> 5] |= d[e] << (24 - (c % 32));
      }
      return f;
    },
    wordsToBytes: function (e) {
      var d = [];
      for (var c = 0; c < e.length * 32; c += 8) {
        d.push((e[c >>> 5] >>> (24 - (c % 32))) & 255);
      }
      return d;
    },
    bytesToHex: function (c) {
      var e = [];
      for (var d = 0; d < c.length; d++) {
        e.push((c[d] >>> 4).toString(16));
        e.push((c[d] & 15).toString(16));
      }
      return e.join('');
    },
    hexToBytes: function (e) {
      var d = [];
      for (var f = 0; f < e.length; f += 2) {
        d.push(parseInt(e.substr(f, 2), 16));
      }
      return d;
    },
    bytesToBase64: function (d) {
      if (typeof btoa == 'function') {
        return btoa(a.bytesToString(d));
      }
      var c = [],
        f;
      for (var e = 0; e < d.length; e++) {
        switch (e % 3) {
          case 0:
            c.push(b.charAt(d[e] >>> 2));
            f = (d[e] & 3) << 4;
            break;
          case 1:
            c.push(b.charAt(f | (d[e] >>> 4)));
            f = (d[e] & 15) << 2;
            break;
          case 2:
            c.push(b.charAt(f | (d[e] >>> 6)));
            c.push(b.charAt(d[e] & 63));
            f = -1;
        }
      }
      if (f != undefined && f != -1) {
        c.push(b.charAt(f));
      }
      while (c.length % 4 != 0) {
        c.push('=');
      }
      return c.join('');
    },
    base64ToBytes: function (d) {
      if (typeof atob == 'function') {
        return a.stringToBytes(atob(d));
      }
      d = d.replace(/[^A-Z0-9+\/]/gi, '');
      var c = [];
      for (var e = 0; e < d.length; e++) {
        switch (e % 4) {
          case 1:
            c.push((b.indexOf(d.charAt(e - 1)) << 2) | (b.indexOf(d.charAt(e)) >>> 4));
            break;
          case 2:
            c.push(((b.indexOf(d.charAt(e - 1)) & 15) << 4) | (b.indexOf(d.charAt(e)) >>> 2));
            break;
          case 3:
            c.push(((b.indexOf(d.charAt(e - 1)) & 3) << 6) | b.indexOf(d.charAt(e)));
            break;
        }
      }
      return c;
    }
  });
  window.Crypto.mode = {};
})();
(function () {
  var a = Crypto.util;
  var b = (Crypto.SHA1 = function (e, c) {
    var d = a.wordsToBytes(b._sha1(e));
    return c && c.asBytes ? d : c && c.asString ? a.bytesToString(d) : a.bytesToHex(d);
  });
  b._sha1 = function (k) {
    var u = a.stringToWords(k),
      v = k.length * 8,
      o = [],
      q = 1732584193,
      p = -271733879,
      h = -1732584194,
      g = 271733878,
      f = -1009589776;
    u[v >> 5] |= 128 << (24 - (v % 32));
    u[(((v + 64) >>> 9) << 4) + 15] = v;
    for (var y = 0; y < u.length; y += 16) {
      var D = q,
        C = p,
        B = h,
        A = g,
        z = f;
      for (var x = 0; x < 80; x++) {
        if (x < 16) {
          o[x] = u[y + x];
        } else {
          var s = o[x - 3] ^ o[x - 8] ^ o[x - 14] ^ o[x - 16];
          o[x] = (s << 1) | (s >>> 31);
        }
        var r =
          ((q << 5) | (q >>> 27)) +
          f +
          (o[x] >>> 0) +
          (x < 20 ? ((p & h) | (~p & g)) + 1518500249 : x < 40 ? (p ^ h ^ g) + 1859775393 : x < 60 ? ((p & h) | (p & g) | (h & g)) - 1894007588 : (p ^ h ^ g) - 899497514);
        f = g;
        g = h;
        h = (p << 30) | (p >>> 2);
        p = q;
        q = r;
      }
      q += D;
      p += C;
      h += B;
      g += A;
      f += z;
    }
    return [q, p, h, g, f];
  };
  b._blocksize = 16;
})();
/* eslint-enable */
