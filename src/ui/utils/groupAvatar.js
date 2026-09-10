const GROUP_AVATAR_SIZE = 120;
const GROUP_AVATAR_GAP = 2;
const GROUP_AVATAR_PADDING = 6;
const GROUP_AVATAR_RADIUS = 10;
const MEMBER_LIMIT = 9;
const DEFAULT_MEMBER_AVATAR = '/image/roster.png';
const pendingTasks = {};
const avatarCache = {};
const imageLoadCache = {};
let cacheEpoch = 0;

const getMemberId = (member) => {
  if (member && typeof member === 'object') {
    return member.user_id || member.uid || '';
  }
  return member || '';
};

const getRosterAvatar = (im, memberId) => {
  if (!memberId) {
    return '';
  }
  const rosterManage = (im || {}).rosterManage || {};
  if (rosterManage.getRosterInfo) {
    const rosterInfo = rosterManage.getRosterInfo(memberId) || {};
    if (rosterInfo.avatar) {
      return rosterInfo.avatar;
    }
  }
  if (rosterManage.getAllRosterDetail) {
    const allRosterMap = rosterManage.getAllRosterDetail() || {};
    const rosterInfo = allRosterMap[memberId] || allRosterMap[`${memberId}`] || {};
    return rosterInfo.avatar || '';
  }
  return '';
};

const getMemberAvatar = (im, member) => {
  if (member && typeof member === 'object') {
    return member.avatar || getRosterAvatar(im, getMemberId(member)) || '';
  }
  return '';
};

const resolveAvatarUrl = (im, avatar = '') => {
  const sysManage = (im || {}).sysManage || {};
  if (sysManage.getImage) {
    return sysManage.getImage({
      avatar,
      type: 'roster'
    });
  }
  return avatar || DEFAULT_MEMBER_AVATAR;
};

const getMemberSignature = (im, member = {}) => {
  if (!member || typeof member !== 'object') {
    return `${member || ''}`;
  }
  return [getMemberId(member), getMemberAvatar(im, member), member.display_name || '', member.nick_name || '', member.username || ''].join(':');
};

const normalizeMembers = (members = []) => members.filter(Boolean).slice(0, MEMBER_LIMIT);

const createSignature = (im, members = []) =>
  normalizeMembers(members)
    .map((member) => getMemberSignature(im, member))
    .join('|');

const getCachedGroupAvatarMeta = (im, groupId) => {
  void im;
  const groupKey = `${groupId || ''}`;
  if (!groupKey) {
    return null;
  }
  return avatarCache[groupKey] || null;
};

const saveCachedGroupAvatar = (im, groupId, payload = {}) => {
  void im;
  const groupKey = `${groupId || ''}`;
  if (!groupKey) {
    return;
  }
  avatarCache[groupKey] = payload;
};

const clearCachedGroupAvatar = (im, groupId) => {
  void im;
  const groupKey = `${groupId || ''}`;
  if (!groupKey) {
    return false;
  }
  const cached = avatarCache[groupKey];
  delete avatarCache[groupKey];
  return !!cached;
};

const loadImage = (src = '') => {
  if (!src) {
    return Promise.resolve(null);
  }
  if (imageLoadCache[src]) {
    return imageLoadCache[src];
  }

  let objectUrl = '';
  let imageSrc = src;
  let fetchPromise = Promise.resolve();

  if (/^https?:\/\//.test(src)) {
    fetchPromise = fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`avatar fetch failed: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        imageSrc = objectUrl;
      });
  }

  imageLoadCache[src] = fetchPromise
    .then(() => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageSrc;
      });
    })
    .catch(() => {
      return null;
    })
    .then((image) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      if (!image) {
        delete imageLoadCache[src];
      }
      return image;
    });
  return imageLoadCache[src];
};

const getRowDistribution = (count) => {
  if (count <= 0) {
    return [];
  }
  if (count <= 4) {
    if (count === 1) {
      return [1];
    }
    if (count === 2) {
      return [2];
    }
    if (count === 3) {
      return [1, 2];
    }
    return [2, 2];
  }
  if (count === 5) {
    return [2, 3];
  }
  if (count === 6) {
    return [3, 3];
  }
  if (count === 7) {
    return [1, 3, 3];
  }
  if (count === 8) {
    return [2, 3, 3];
  }
  return [3, 3, 3];
};

const getTileLayout = (count, index) => {
  if (count === 1) {
    const availableWidth = GROUP_AVATAR_SIZE - GROUP_AVATAR_PADDING * 2;
    const availableHeight = GROUP_AVATAR_SIZE - GROUP_AVATAR_PADDING * 2;
    const tileWidth = Math.floor((availableWidth - GROUP_AVATAR_GAP) / 2);
    const tileHeight = Math.floor((availableHeight - GROUP_AVATAR_GAP) / 2);
    return {
      x: GROUP_AVATAR_PADDING,
      y: GROUP_AVATAR_PADDING + Math.floor((availableHeight - tileHeight) / 2),
      width: tileWidth,
      height: tileHeight
    };
  }

  const rows = getRowDistribution(count);
  const availableWidth = GROUP_AVATAR_SIZE - GROUP_AVATAR_PADDING * 2;
  const availableHeight = GROUP_AVATAR_SIZE - GROUP_AVATAR_PADDING * 2;
  const gridColumns = count <= 4 ? 2 : 3;
  const gridRows = count <= 4 ? 2 : 3;
  const tileWidth = Math.floor((availableWidth - GROUP_AVATAR_GAP * (gridColumns - 1)) / gridColumns);
  const tileHeight = Math.floor((availableHeight - GROUP_AVATAR_GAP * (gridRows - 1)) / gridRows);
  const contentHeight = rows.length * tileHeight + Math.max(0, rows.length - 1) * GROUP_AVATAR_GAP;
  const topOffset = GROUP_AVATAR_PADDING + Math.floor((availableHeight - contentHeight) / 2);

  let offset = 0;
  let rowIndex = 0;
  while (rowIndex < rows.length) {
    const columns = rows[rowIndex];
    if (index < offset + columns) {
      const columnIndex = index - offset;
      const rowWidth = columns * tileWidth + (columns - 1) * GROUP_AVATAR_GAP;
      const x = GROUP_AVATAR_PADDING + Math.floor((availableWidth - rowWidth) / 2) + columnIndex * (tileWidth + GROUP_AVATAR_GAP);
      const y = topOffset + rowIndex * (tileHeight + GROUP_AVATAR_GAP);
      return {
        x,
        y,
        width: tileWidth,
        height: tileHeight
      };
    }
    offset += columns;
    rowIndex++;
  }

  return {
    x: GROUP_AVATAR_PADDING,
    y: GROUP_AVATAR_PADDING,
    width: tileWidth,
    height: tileHeight
  };
};

const withRoundedRectClip = (ctx, layout, draw) => {
  const radius = Math.min(GROUP_AVATAR_RADIUS, Math.floor(Math.min(layout.width, layout.height) / 4));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(layout.x + radius, layout.y);
  ctx.lineTo(layout.x + layout.width - radius, layout.y);
  ctx.quadraticCurveTo(layout.x + layout.width, layout.y, layout.x + layout.width, layout.y + radius);
  ctx.lineTo(layout.x + layout.width, layout.y + layout.height - radius);
  ctx.quadraticCurveTo(layout.x + layout.width, layout.y + layout.height, layout.x + layout.width - radius, layout.y + layout.height);
  ctx.lineTo(layout.x + radius, layout.y + layout.height);
  ctx.quadraticCurveTo(layout.x, layout.y + layout.height, layout.x, layout.y + layout.height - radius);
  ctx.lineTo(layout.x, layout.y + radius);
  ctx.quadraticCurveTo(layout.x, layout.y, layout.x + radius, layout.y);
  ctx.closePath();
  ctx.clip();
  draw();
  ctx.restore();
};

const drawImageCover = (ctx, image, layout) => {
  const scale = Math.max(layout.width / image.width, layout.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = layout.x + (layout.width - drawWidth) / 2;
  const dy = layout.y + (layout.height - drawHeight) / 2;
  withRoundedRectClip(ctx, layout, () => {
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  });
};

const drawFallback = (ctx, layout) => {
  withRoundedRectClip(ctx, layout, () => {
    ctx.fillStyle = '#f1f3f6';
    ctx.fillRect(layout.x, layout.y, layout.width, layout.height);
  });
};

const generateGroupAvatar = (im, members = []) => {
  const normalizedMembers = normalizeMembers(members);
  if (!normalizedMembers.length || typeof document === 'undefined') {
    return Promise.resolve('');
  }

  const canvas = document.createElement('canvas');
  canvas.width = GROUP_AVATAR_SIZE;
  canvas.height = GROUP_AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f1f3f6';
  ctx.fillRect(0, 0, GROUP_AVATAR_SIZE, GROUP_AVATAR_SIZE);

  const chain = normalizedMembers.reduce((promise, member, index) => {
    return promise.then(() => {
      const layout = getTileLayout(normalizedMembers.length, index);
      const avatarUrl = resolveAvatarUrl(im, getMemberAvatar(im, member));
      return loadImage(avatarUrl).then((image) => {
        if (image) {
          drawImageCover(ctx, image, layout);
          return;
        }
        return loadImage(resolveAvatarUrl(im, '')).then((defaultImage) => {
          if (defaultImage) {
            drawImageCover(ctx, defaultImage, layout);
            return;
          }
          drawFallback(ctx, layout);
        });
      });
    });
  }, Promise.resolve());

  return chain.then(() => canvas.toDataURL('image/png'));
};

const getCachedGroupAvatar = (im, groupId) => {
  const cached = getCachedGroupAvatarMeta(im, groupId);
  return (cached && cached.avatar) || '';
};

const clearAllCachedGroupAvatars = () => {
  Object.keys(avatarCache).forEach((groupId) => {
    delete avatarCache[groupId];
  });
  Object.keys(pendingTasks).forEach((taskKey) => {
    delete pendingTasks[taskKey];
  });
  Object.keys(imageLoadCache).forEach((src) => {
    delete imageLoadCache[src];
  });
  cacheEpoch++;
};

const refreshCachedGroupAvatar = (im, groupId, members = []) => {
  const taskEpoch = cacheEpoch;
  const signature = createSignature(im, members);
  const cached = getCachedGroupAvatarMeta(im, groupId);
  if (!signature) {
    return Promise.resolve({
      avatar: '',
      changed: clearCachedGroupAvatar(im, groupId)
    });
  }

  if (cached && cached.signature === signature && cached.avatar) {
    return Promise.resolve({
      avatar: cached.avatar,
      changed: false
    });
  }

  const taskKey = `${groupId}:${signature}`;
  if (!pendingTasks[taskKey]) {
    pendingTasks[taskKey] = generateGroupAvatar(im, members)
      .then((avatar) => {
        if (taskEpoch !== cacheEpoch) {
          return {
            avatar: '',
            changed: false
          };
        }
        saveCachedGroupAvatar(im, groupId, {
          signature,
          avatar,
          updatedAt: Date.now()
        });
        return {
          avatar,
          changed: !cached || cached.signature !== signature || cached.avatar !== avatar
        };
      })
      .finally(() => {
        delete pendingTasks[taskKey];
      });
  }
  return pendingTasks[taskKey];
};

const withDisplayGroupAvatar = (im, group = {}, options = {}) => {
  if (!group || !group.group_id) {
    return group;
  }

  if (group.avatar) {
    clearCachedGroupAvatar(im, group.group_id);
    return group;
  }

  const groupId = group.group_id;
  const members = Array.isArray(options.members) ? options.members.filter(Boolean) : (((im || {}).groupManage || {}).getGroupMembers || (() => []))(groupId).filter(Boolean);
  refreshCachedGroupAvatar(im, groupId, members)
    .then(({ changed, avatar }) => {
      if (!changed || !options.onUpdate) {
        return;
      }
      const groupMap = (((im || {}).groupManage || {}).getAllGroupDetail || (() => ({})))() || {};
      const latestGroup = groupMap[groupId] || groupMap[`${groupId}`] || {};
      if (!latestGroup.avatar) {
        options.onUpdate({
          group_id: groupId,
          avatar
        });
      }
    })
    .catch(() => {});

  return Object.assign({}, group, {
    avatar: (getCachedGroupAvatarMeta(im, groupId) || {}).avatar || ''
  });
};

export { clearAllCachedGroupAvatars, clearCachedGroupAvatar, getCachedGroupAvatar, getCachedGroupAvatarMeta, refreshCachedGroupAvatar, withDisplayGroupAvatar };
