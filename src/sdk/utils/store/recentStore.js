import { toNumber } from '../tools';
import { getItem, saveItem, removeItem } from './storeBase';
import { fire } from '../cusEvent';
import infoStore from './infoStore';
var JSONBigString = require('json-bigint');

const checkTyping = (message) => {
  const { ext } = message;
  let s = {};
  try {
    s = JSONBigString.parse(ext);
  } catch (ex) {
    //
  }

  if (typeof s.input_status !== 'undefined') {
    let status = s.input_status;
    if (status === 'nothing') {
      // this.header.querySelector(".typing").style.display = "none";
    } else {
      // this.header.querySelector(".typing").style.display = "inline";
      // this.header.querySelector(".typing").innerHTML = status + "...";
    }
    return true;
  }
  return false;
};

const recentStore = {
  saveRecent: (meta) => {
    if (checkTyping(meta)) return;
    // 改为 从 meta 取 from, to， roster 消息，from是要存的，group消息，to 是要存的
    const { from, to, type, toType, attach, config, ext, timestamp } = meta;
    let content = meta.content;
    if (!content && !attach) {
      //两者都无，那就不是正常的消息了
      if (ext && ext.typing) {
        fire('onInputStatusMessage', { from, to, ext });
      }
      return;
    }
    if (type != 'text' && type != 'rtc') content = type;

    if (type === 'rtc' && (!config || !config.action || config.action !== 'record')) {
      // only rtc record message store in recent store.
      return;
    }

    let savedUid = toNumber(to);
    const uid = infoStore.getUid();
    if (savedUid === uid) {
      savedUid = toNumber(from);
    }

    let updateRecent = false;
    const allRecents = getItem('key_recent_store') || [];
    const index = allRecents.findIndex((item) => item.type === toType && item.id === savedUid);
    if (index > -1) {
      let item = allRecents[index];
      if (timestamp > item.timestamp || type === 'rtc') {
        updateRecent = true;
        allRecents.splice(index, 1);
      } else {
        // history message don't need update recent message.
      }
    } else {
      updateRecent = true;
    }

    if (updateRecent) {
      allRecents.unshift({
        type: toType,
        id: savedUid,
        content,
        ext,
        timestamp
      });
      saveItem('key_recent_store', allRecents);
      fire('recentlistUpdate');
    }
  },

  saveUnreadRecent: (xids, stype) => {
    xids.forEach((xid) => {
      const type = stype; // 'group' : 'roster';
      const allRecents = getItem('key_recent_store') || [];
      let content = '';
      let timestamp = '';
      const index = allRecents.findIndex((item) => item.type === type && item.id === xid);
      if (index > -1) {
        content = allRecents[index].content;
        timestamp = allRecents[index].timestamp;
        allRecents.splice(index, 1);
      }

      allRecents.unshift({
        type,
        id: xid,
        content,
        timestamp
      });
      saveItem('key_recent_store', allRecents);
    });
    fire('recentlistUpdate');
  },

  getRecents: () => {
    const recent = getItem('key_recent_store') || [];
    const rosterIds = recent.filter((x) => x.type == 'roster').map((x) => x.id);
    fire('imGetRecent', rosterIds);
    return recent;
  },

  getRecentById: (id) => {
    const list = getItem('key_recent_store') || [];
    const idx = list.findIndex((x) => x.id + '' === id + '');
    if (idx < 0) return { idx };

    const type = list[idx].type;
    return { idx, id, type };
  },

  deleteRecentById(id) {
    const { idx } = recentStore.getRecentById(id);
    if (idx < 0) return;

    const list = getItem('key_recent_store') || [];
    list.splice(idx, 1);
    saveItem('key_recent_store', list);
  },

  clear: () => {
    removeItem('key_recent_store');
  }
};

export default recentStore;
