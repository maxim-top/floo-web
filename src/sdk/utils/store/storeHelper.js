import log from '../log';
import { fire } from '../cusEvent';
let MAX_TIMES = 5;
let MIN_STORAGE_SIZE = 128 * 1024;
let KEY_DELETE_MIN_SIZE = 32 * 1024;

const setItem = function (key, value) {
  setItemInternal(key, value, 1);
};

const setItemInternal = function (key, value, times) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    if (e.name === 'QuotaExceededError' && times <= MAX_TIMES) {
      freeSpace(getKeyValueSize(key, value), times);
      setItemInternal(key, value, times + 1);
    } else {
      throw e;
    }
  }
};

const analyzeLocalStorageUsage = function () {
  let typeStorageMap = new Map();

  // 遍历 localStorage
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    let value = localStorage.getItem(key);

    // 去掉 key 中的所有数字，得到 key 类型
    let keyType = getKeyType(key);

    if (!keyType.startsWith('_')) {
      // TODO DELETE
      continue;
    }

    // 计算 key + value 的存储大小
    let size = getKeyValueSize(key, value);

    // 累加该 key 类型的存储大小
    typeStorageMap.set(keyType, (typeStorageMap.get(keyType) || 0) + size);
  }

  // 按存储大小降序排序
  let sortedEntries = [...typeStorageMap.entries()].sort((a, b) => b[1] - a[1]);

  let totalSize = 0;
  sortedEntries.forEach(([type, size]) => {
    totalSize += size;
  });
  // 显示统计结果
  log.info(`localStorage 已用大小：${(totalSize / 1024).toFixed(2)} KB`);
  log.info('localStorage 各 key 类型的存储占用情况（按大小降序）：');
  sortedEntries.forEach(([type, size]) => {
    log.info(`Key 类型: "${type}" -> 占用 ${(size / 1024).toFixed(2)} KB , ${size / totalSize}`);
  });

  return sortedEntries;
};

const freeSpace = function (needSize, times = 1) {
  log.info(`freeSpace start | needSize=${(needSize / 1024).toFixed(2)} KB, times=${times}`);
  const start = Date.now();
  const usage = analyzeLocalStorageUsage();
  let totalSize = 0;
  let freeSize = 0;
  usage.forEach(([keyType, size]) => {
    totalSize += size;
  });
  if (totalSize < needSize || totalSize < MIN_STORAGE_SIZE) {
    return freeSize;
  }

  let firstStageRatio = 0.5;
  let secondStageRatio = Math.min(0.5, 0.1 * Math.max(1, times));
  if (totalSize * firstStageRatio * secondStageRatio < needSize) {
    secondStageRatio = Math.max(secondStageRatio, (needSize / (totalSize * firstStageRatio)) * 0.5);
  }
  let nowSize = 0;
  for (let [keyType, size] of usage) {
    freeSize += freeKeySpace(keyType, secondStageRatio, times);
    nowSize += size;
    if (nowSize > totalSize * firstStageRatio) {
      break;
    }
  }
  const end = Date.now();
  log.info(`freeSpace finish | totalSize=${(totalSize / 1024).toFixed(2)} KB , freeSize=${(freeSize / 1024).toFixed(2)} KB, times=${times}, totalTime=${end - start} ms`);
  return freeSize;
};

const freeKeySpace = function (keyType, ratio, times) {
  log.info(`freeKeySpace start | keyType=${keyType}, ratio=${ratio}, times=${times}`);
  switch (keyType) {
    case '_key_roster_message_store_':
    case '_key_group_message_store_':
    case '_key_recent_store':
      return freeMessageSpace(keyType, ratio, times);
    default:
      if (times >= MAX_TIMES) {
        return freeAllKey(keyType, ratio, times);
      }
      return 0;
  }
};

const toDateTimeStr = function (timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const freeAllKey = function (keyType, ratio, times) {
  log.info(`freeAllKey start | keyType=${keyType}, ratio=${ratio}`);
  let freeSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    let value = localStorage.getItem(key);
    let nowKeyType = getKeyType(key);
    if (nowKeyType != keyType) {
      continue;
    }
    let size = getKeyValueSize(key, value);
    if (size < KEY_DELETE_MIN_SIZE) {
      continue;
    }
    localStorage.removeItem(key);
    freeSize += size;
  }
  return freeSize;
};

const freeMessageSpace = function (keyType, ratio, times) {
  log.info(`freeMessageSpace start | keyType=${keyType}, ratio=${ratio}`);
  let queue = [];
  let freeSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    let value = localStorage.getItem(key);
    let nowKeyType = getKeyType(key);
    if (nowKeyType != keyType) {
      continue;
    }
    try {
      let data = JSON.parse(value);
      for (let cid in data) {
        let cid_msgs = data[cid];
        for (let j in cid_msgs) {
          let cid_msg = cid_msgs[j];
          if (cid_msg.timestamp) {
            queue.push({
              timestamp: cid_msg.timestamp ? Number(cid_msg.timestamp) : j,
              key: key,
              sub_key: cid,
              id: cid_msg.id,
              index: j
            });
          }
        }
      }
    } catch (e) {
      log.error(e);
    }
  }
  if (queue.length == 0) {
    return freeSize;
  }
  let freeNum = Math.max(1, Math.round(queue.length * ratio));
  let free_queue = queue.sort((a, b) => a.timestamp - b.timestamp).slice(0, freeNum);
  let free_map = new Map();
  free_queue.forEach((item) => {
    //log.info(`🔹 will delete key: ${item.key}, timestamp:${toDateTimeStr(item.timestamp)}, sub_key:${item.sub_key}, index:${item.index} `);
    let old_value = free_map.get(item.key) || [];
    old_value.push(item);
    free_map.set(item.key, old_value);
  });
  for (let [key, itemList] of free_map.entries()) {
    let value = localStorage.getItem(key);
    try {
      let data = JSON.parse(value);
      let old_size = getKeyValueSize(key, value);
      let ids = new Set();
      let sub_keys = new Set();
      itemList.forEach((item) => {
        ids.add(item.id);
        sub_keys.add(item.sub_key);
      });
      sub_keys.forEach((sub_key) => {
        let sub_data = data[sub_key];
        if (sub_data) {
          let new_sub_data = sub_data.filter((item) => !ids.has(item.id));
          data[sub_key] = new_sub_data;
        }
      });
      let new_value = JSON.stringify(data);
      localStorage.setItem(key, new_value);
      const conversationType = key.indexOf('key_roster_message_store') >= 0 ? 'roster' : key.indexOf('key_group_message_store') >= 0 ? 'group' : '';
      if (conversationType) {
        fire('imLocalStorageConversationMessagesPruned', {
          type: conversationType,
          conversationIds: Array.from(sub_keys)
        });
      }
      let new_size = getKeyValueSize(key, new_value);
      freeSize += old_size - new_size;
      //log.info(`free key space size | key=${key}, size:${old_size - new_size} `);
    } catch (e) {
      log.error(e);
    }
  }
  log.info(`freeMessageSpace finish | keyType=${keyType}, ratio=${ratio}, freeSize=${(freeSize / 1024).toFixed(2)} KB`);
  return freeSize;
};

const getKeyValueSize = function (key, value) {
  // 计算 UTF-16 字符串所占的字节数（每个字符 2 字节）
  return (key.length + value.length) * 2;
};

const getKeyType = function (key) {
  return key.replace(/\d+/g, '');
};

export { setItem };
