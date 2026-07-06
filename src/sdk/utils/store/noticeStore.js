import { getItem, saveItem } from './storeBase';

const STORAGE_KEY = 'key_notice_store';
const MAX_NOTICE_COUNT = 50;

const getSafeNoticeList = () => {
  const items = getItem(STORAGE_KEY) || [];
  return Array.isArray(items) ? items : [];
};

const getPayload = (meta = {}) => meta.payload || {};
const getFromUid = (meta = {}) => (((meta || {}).payload || {}).from || {}).uid || ((meta || {}).from || {}).uid || 0;
const getToUids = (meta = {}) => {
  const payload = getPayload(meta);
  const to = payload.to || [];
  return Array.isArray(to)
    ? to
        .map((item) => (item && typeof item.uid !== 'undefined' ? Number(item.uid) : 0))
        .filter((uid) => uid >= 0)
        .sort((a, b) => a - b)
    : [];
};
const getGroupId = (meta = {}) => {
  const payload = getPayload(meta);
  return payload.gid && typeof payload.gid.uid !== 'undefined' ? Number(payload.gid.uid) : 0;
};

const getRosterThreadKey = (meta = {}) => {
  const payload = getPayload(meta);
  const type = payload.type || 0;
  const fromUid = Number(getFromUid(meta));
  const toUids = getToUids(meta);
  let subjectUid = fromUid;

  if (type === 3 || type === 4) {
    subjectUid = toUids[0] || fromUid;
  }

  return ['roster', subjectUid].join(':');
};

const getGroupThreadKey = (meta = {}) => {
  const payload = getPayload(meta);
  const type = payload.type || 0;
  const groupId = getGroupId(meta);
  const fromUid = Number(getFromUid(meta));
  const toUids = getToUids(meta);
  let subjectUid = fromUid;
  let threadType = `group-${type}`;

  if (type === 7 || type === 8 || type === 9) {
    threadType = 'group-apply';
    subjectUid = type === 7 ? fromUid : toUids[0] || fromUid;
  } else if (type === 10 || type === 11 || type === 12) {
    threadType = 'group-invite';
    subjectUid = type === 10 ? toUids[0] || fromUid : fromUid;
  } else if (toUids.length) {
    subjectUid = toUids[0];
  }

  return [threadType, groupId, subjectUid].join(':');
};

const getNoticeThreadKey = (meta = {}) => {
  const ns = meta.ns || 0;
  if (ns === 2) return getGroupThreadKey(meta);
  if (ns === 3) return getRosterThreadKey(meta);
  return [ns, meta.id || 0, meta.timestamp || 0].join(':');
};

const getNoticeKey = (meta = {}) => {
  return [meta.ns || 0, meta.id || 0, meta.timestamp || 0, getNoticeThreadKey(meta)].join(':');
};

const noticeStore = {
  saveNotice: (meta) => {
    if (!meta || !meta.payload) return;
    const items = getSafeNoticeList().filter((item) => getNoticeKey(item) !== getNoticeKey(meta));
    items.unshift(meta);
    if (items.length > MAX_NOTICE_COUNT) {
      items.length = MAX_NOTICE_COUNT;
    }
    saveItem(STORAGE_KEY, items);
  },
  getNotice: () => getSafeNoticeList(),
  removeNotice: (meta) => {
    if (!meta || !meta.payload) return;
    const threadKey = getNoticeThreadKey(meta);
    const items = getSafeNoticeList().filter((item) => getNoticeThreadKey(item) !== threadKey);
    saveItem(STORAGE_KEY, items);
  }
};

export default noticeStore;
