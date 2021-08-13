import http from '../core/base/io/index';
import { fire } from '../utils/cusEvent';
import { infoStore, messageStore, recentStore, rosterStore } from '../utils/store';
import { formatJson } from '../utils/tools';
import { makeDeleteMessage, makeRecallMessage, makeUnreadMessage } from '../core/base/messageMaker';

const asyncGetRosterIdList = (force) => {
  if (force) {
    return http.rosterList({}).then((res) => {
      rosterStore.saveRosterList(res);
      return res.map((roster) => roster.user_id || roster);
    });
  }
  return Promise.resolve(rosterStore.getRosterList());
};

const asyncGetRosterInfo = (roster_id, force) => {
  const ret = rosterStore.getRosterInfo(roster_id);
  if (ret && ret.username && !force) {
    return Promise.resolve(ret);
  }

  return http
    .rosterListPost({
      list: [roster_id]
    })
    .then((res) => {
      rosterStore.saveRosterInfo(res);
      fire('onRosterInfoUpdate', [roster_id]);
      return (res.length && res[0]) || {};
    });
};

const asyncRegester = (opt) => http.userRegister(opt);

const asyncDeleteRoster = (param) => {
  return http.rosterDelete(param).then((res) => {
    rosterStore.removeRoster(param.user_id);
    recentStore.deleteRecentById(param.user_id);
    fire('onRosterListUpdate');
    return res;
  });
};

const asnycGetRosterListDetailByIds = (roster_ids) => {
  // todo ... fix一下
  if (!roster_ids || !roster_ids.length) {
    return Promise.resolve({});
  }
  const allMap = rosterStore.getAllRosterInfos();
  const sret = [];
  roster_ids.forEach((item) => {
    const ritem = allMap[item];
    if (!ritem || !ritem.username) {
      sret.push(item);
    }
  });
  const setArr = Array.from(new Set(sret));
  if (!setArr.length) {
    return Promise.resolve();
  } else {
    return http
      .rosterListPost({
        list: setArr
      })
      .then((res) => {
        rosterStore.saveRosterInfo(res);
        fire('onRosterInfoUpdate', setArr);
        return res;
      });
  }
};

const getAllRosterDetail = () => rosterStore.getAllRosterInfos();

const asyncGetUserProfile = (force) => {
  const item = infoStore.getProfile();
  if (item && (item.name || item.mobile) && !force) {
    return Promise.resolve(item);
  }
  return http.userProfile().then((res) => {
    infoStore.saveProfile(res);
    return res;
  });
};

const getRosterMessageByRid = (uid) => messageStore.getRosterMessage(uid);

const readRosterMessage = (roster_id, mid) => {
  fire('imReadRosterMessage', {
    roster_id,
    mid
  });
};

const recallMessage = (uid, mid) => {
  const smessage = makeRecallMessage(uid, mid);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

const unreadMessage = (uid, mid) => {
  const smessage = makeUnreadMessage(uid, mid);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

const deleteMessage = (uid, mid) => {
  const smessage = makeDeleteMessage(uid, mid);
  fire('swapSendMessage', formatJson(smessage));
  fire('sendMessage', smessage);
};

const getRosterInfo = (rid) => rosterStore.getRosterInfo(rid);

const getUnreadCount = (uid) => messageStore.getUnreadByRosterId(uid);

export default {
  asyncGetRosterIdList,
  asyncGetRosterInfo,
  asyncRegester,
  asnycGetRosterListDetailByIds,
  asyncGetUserProfile,
  getRosterMessageByRid,
  readRosterMessage,
  asyncDeleteRoster,
  getAllRosterDetail,
  recallMessage,
  deleteMessage,
  getUnreadCount,
  unreadMessage,
  getRosterInfo,
  asyncGetApplyList: http.rosterApplylist,
  asyncGetBlockedlist: http.rosterBlockedlist,
  asyncBlockeAdd: http.rosterBlockedAdd,
  asyncBlockeRemove: http.rosterBlockeRemove,
  asyncApply: http.rosterApply,
  asyncAccept: http.rosterAccept,
  asyncDecline: http.rosterDecline,
  asyncUpdateRosterExt: http.rosterExt,
  asyncSearchRosterByName: http.rosterName,
  asyncSearchRosterById: http.rosterId
};
