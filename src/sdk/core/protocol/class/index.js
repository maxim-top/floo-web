import * as provision from './provision';
// import * as syncdl from './syncdl';
import * as syncul from './syncul';
// import * as unreaddl from './unreaddl';
import * as frame from './frame';
// import { decode as xidDecode } from './xid';
// import { decode as noticeDecode } from './notice';
// import { STATIC_FRAME_COMMAND } from '@utils/static';

// use int64 as long in protobuf
import protobuf from 'protobufjs/light';
import Long from 'long';
protobuf.util.Long = Long;
protobuf.configure();

const { encode: provisionEncode } = provision;
const { encode: frameEncode, decode: frameDecode } = frame;
// const { decode: unreaddlDecode } = unreaddl;
// const { decode: syncdlDecode } = syncdl;
const { encode: synculEncode } = syncul;

const packProvision = (provisionObj) => {
  const payload = provisionObj.payload;
  const bytes = provisionEncode(payload);
  provisionObj.payload = bytes;
  return frameEncode(provisionObj);
};

// 消息，等，meta定
const packSyncul = (synculObj) => {
  const { payload } = synculObj;
  const bytes = synculEncode(payload);
  synculObj.payload = bytes;
  return frameEncode(synculObj);
};

const packUnreadul = () => {
  const obj = {
    vsn: 0,
    compress_method: 0,
    command: 0
  };
  return frameEncode(obj);
};

const unpack = (bytes) => {
  const frmObj = frameDecode(bytes);
  return frmObj;
};

export { packSyncul, packProvision, unpack, packUnreadul, frameEncode };
