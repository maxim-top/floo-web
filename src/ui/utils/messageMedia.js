const MAX_MEDIA_SIZE = 200;
const DEFAULT_MEDIA_WIDTH = 200;
const DEFAULT_MEDIA_HEIGHT = 150;

const getAttachment = (message) => {
  const attachment = (message && (message.attach || message.attachment)) || {};
  if (typeof attachment !== 'string') return attachment;
  try {
    return JSON.parse(attachment);
  } catch (error) {
    return {};
  }
};

export const messageMediaFrameStyle = (message) => {
  const attachment = getAttachment(message);
  const sourceWidth = Number(attachment.width);
  const sourceHeight = Number(attachment.height);
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) {
    return {
      width: `${DEFAULT_MEDIA_WIDTH}px`,
      height: `${DEFAULT_MEDIA_HEIGHT}px`
    };
  }
  const scale = Math.min(1, MAX_MEDIA_SIZE / sourceWidth, MAX_MEDIA_SIZE / sourceHeight);
  return {
    width: `${Math.max(1, Math.round(sourceWidth * scale))}px`,
    height: `${Math.max(1, Math.round(sourceHeight * scale))}px`
  };
};
