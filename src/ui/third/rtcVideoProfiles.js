export const VIDEO_PROFILE_STORAGE_KEY = 'lanying_im_video_profile';
export const ADAPTIVE_VIDEO_STORAGE_KEY = 'lanying_im_adaptive_video_enabled';
export const DEFAULT_VIDEO_PROFILE_KEY = '480_360';

export const VIDEO_PROFILE_OPTIONS = [
  { key: '240_180', labelKey: '240_180', shortLabel: '240_180', width: 180, height: 240 },
  { key: '320_180', labelKey: '320_180', shortLabel: '320_180', width: 180, height: 320 },
  { key: '320_240', labelKey: '320_240', shortLabel: '320_240', width: 240, height: 320 },
  { key: '480_360', labelKey: '480_360', shortLabel: '480_360', width: 360, height: 480 },
  { key: '640_360', labelKey: '640_360', shortLabel: '640_360', width: 360, height: 640 },
  { key: '640_480', labelKey: '640_480', shortLabel: '640_480', width: 480, height: 640 },
  { key: '960_720', labelKey: '960_720', shortLabel: '960_720', width: 720, height: 960 },
  { key: '1280_720', labelKey: '1280_720', shortLabel: '1280_720', width: 720, height: 1280 },
  { key: '1920_1080', labelKey: '1920_1080', shortLabel: '1920_1080', width: 1080, height: 1920 }
];

const isSupportedVideoProfileKey = (key) => {
  return VIDEO_PROFILE_OPTIONS.some((option) => option.key === key);
};

export const getStoredVideoProfileKey = () => {
  const storedKey = window.localStorage.getItem(VIDEO_PROFILE_STORAGE_KEY);
  if (isSupportedVideoProfileKey(storedKey)) {
    return storedKey;
  }
  return DEFAULT_VIDEO_PROFILE_KEY;
};

export const persistVideoProfileKey = (key) => {
  window.localStorage.setItem(VIDEO_PROFILE_STORAGE_KEY, isSupportedVideoProfileKey(key) ? key : DEFAULT_VIDEO_PROFILE_KEY);
};

export const findVideoProfileOption = (key) => {
  return VIDEO_PROFILE_OPTIONS.find((option) => option.key === key) || VIDEO_PROFILE_OPTIONS.find((option) => option.key === DEFAULT_VIDEO_PROFILE_KEY) || VIDEO_PROFILE_OPTIONS[0];
};

export const adaptiveVideoEnabled = () => {
  const storedValue = window.localStorage.getItem(ADAPTIVE_VIDEO_STORAGE_KEY);
  if (storedValue == null) {
    return true;
  }
  return storedValue === 'true';
};

export const setAdaptiveVideoEnabled = (enabled) => {
  window.localStorage.setItem(ADAPTIVE_VIDEO_STORAGE_KEY, enabled ? 'true' : 'false');
};

export const getStartupVideoProfileOption = (profileKey) => {
  if (adaptiveVideoEnabled()) {
    return findVideoProfileOption(DEFAULT_VIDEO_PROFILE_KEY);
  }
  return findVideoProfileOption(profileKey);
};

export const getProfileIndex = (profileKey) => {
  const index = VIDEO_PROFILE_OPTIONS.findIndex((option) => option.key === profileKey);
  return index >= 0 ? index : VIDEO_PROFILE_OPTIONS.findIndex((option) => option.key === DEFAULT_VIDEO_PROFILE_KEY);
};

export const getLowerVideoProfileOption = (profileKey) => {
  const currentIndex = getProfileIndex(profileKey);
  return VIDEO_PROFILE_OPTIONS[Math.max(0, currentIndex - 1)];
};

export const getHigherVideoProfileOption = (profileKey) => {
  const currentIndex = getProfileIndex(profileKey);
  return VIDEO_PROFILE_OPTIONS[Math.min(VIDEO_PROFILE_OPTIONS.length - 1, currentIndex + 1)];
};
