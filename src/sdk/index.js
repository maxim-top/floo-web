import rosterManage from './manage/rosterManage';
import groupManage from './manage/groupManage';
import userManage from './manage/userManage';
import sysManage from './manage/sysManage';
import rtcManage from './manage/rtcManager';
import webim from './core/base/index';

webim.rosterManage = rosterManage;
webim.groupManage = groupManage;
webim.userManage = userManage;
webim.sysManage = sysManage;
webim.rtcManage = rtcManage;

export function flooim(config) {
  new webim(config);
  return webim;
}

export default flooim;

window.flooIM = (config) => flooim(config);
