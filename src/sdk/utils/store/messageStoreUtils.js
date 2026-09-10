import { toLong, toUnsignedLong } from '../tools';

export const markHistoryMessagesRead = (messages = [], readStatus, currentUid) =>
  messages.map((message) => ({
    ...message,
    ...(toLong(message.from || 0).eq(toLong(currentUid || 0)) ? {} : { status: readStatus, r: true })
  }));

export const mergeLatestMessages = (storedMessages = [], incomingMessages = [], limit = 100, preferStored = false) => {
  if (!incomingMessages.length) return storedMessages;
  if (storedMessages.length >= limit && incomingMessages.every((message) => toUnsignedLong(message.id).lt(toUnsignedLong(storedMessages[0].id)))) {
    return storedMessages;
  }

  const byId = new Map();
  const first = preferStored ? incomingMessages : storedMessages;
  const second = preferStored ? storedMessages : incomingMessages;
  first.forEach((message) => byId.set(toUnsignedLong(message.id).toString(), message));
  second.forEach((message) => byId.set(toUnsignedLong(message.id).toString(), message));
  const merged = Array.from(byId.values()).sort((a, b) => toUnsignedLong(a.id).comp(toUnsignedLong(b.id)));
  return merged.length > limit ? merged.slice(merged.length - limit) : merged;
};
