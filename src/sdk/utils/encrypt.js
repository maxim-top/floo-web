import CryptoJS from 'crypto-js';

function mapKey(key) {
  const seed = Number(toUint8(key).join(''));
  const dict = new Array(256);

  for (let i = 0; i < 256; i++) {
    const temp = dict[i] || i;
    const rand = ((seed % (i + 1)) + i) % 256;
    dict[i] = dict[rand] || rand;
    dict[rand] = temp;
  }

  return dict;
}

function toUint8(str) {
  return str
    .toString()
    .split('')
    .map((char) => char.charCodeAt(0));
}

function byteIn(keyMap, val, index) {
  for (let i = 0; i < keyMap.length; i++) {
    if (keyMap[i] === val) return (i + keyMap[index]) % 256;
  }
}

function byteOut(keyMap, val, index) {
  const diff = val - keyMap[index];
  return keyMap[diff < 0 ? 256 + diff : diff];
}

function encrypt(bytes, key) {
  if (typeof bytes === 'string') bytes = toUint8(bytes);
  return bytes.map(byteIn.bind(null, mapKey(String(key))));
}

function decrypt(bytes, key) {
  return bytes.map(byteOut.bind(null, mapKey(String(key))));
}

const cryptoEncrypt = (str, key) => {
  return CryptoJS.AES.encrypt(str, key);
};

const cryptoDecript = (str, key) => {
  return CryptoJS.AES.decrypt(str, key);
};

// tools from wasm
/*
function Encrypt (plainText, key, iv) {
  var key = CryptoJS.enc.Utf8.parse(key);
  var iv = CryptoJS.enc.Utf8.parse(iv);
  var encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();  //返回的是base64格式的密文
}

function Decrypt (encryptedText, key, iv) {
  var key = CryptoJS.enc.Utf8.parse(key);
  var iv = CryptoJS.enc.Utf8.parse(iv);
  var decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  const ret = decrypted.toString(CryptoJS.enc.Utf8);
  return ret;
}
*/

export { encrypt, decrypt, cryptoEncrypt, cryptoDecript };
