import { getItem, saveItem } from './storeBase';

const noticeStore = {
  saveNotice: (meta) => {
    const items = getItem('key_notice_store') || [];
    items.push(meta);
    const len = items.length;
    if (len > 50) {
      items.splice(0, len - 50);
    }
    saveItem('key_notice_store', items);
  },
  getNotice: () => getItem('key_notice_store') || [],
  removeNotice: (/*meta*/) => {
    //
  }
};

export default noticeStore;
