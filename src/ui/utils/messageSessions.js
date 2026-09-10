import { toUnsignedLong } from '../third/tools';

export const MESSAGE_SESSION_LIMIT = 10;
export const VISIBLE_MESSAGE_LIMIT = 100;
export const HISTORY_REVEAL_BATCH_SIZE = 20;

export const conversationKey = (sid) => `${sid}`;
export const messageKey = (message) => (message && typeof message.id !== 'undefined' ? toUnsignedLong(message.id).toString() : '');
export const isPendingMessage = (message) => !!(message && message.__pendingMessage);

let pendingMessageSequence = 0;

const localSendOrder = (message) => Number((message && message.__pendingOrder) || 0);

const appendPendingMessages = (confirmedMessages, pendingMessages) => {
  const anchoredPending = [];
  const legacyPending = [];
  pendingMessages.forEach((message) => {
    if (Object.prototype.hasOwnProperty.call(message, '__pendingAfterMid')) anchoredPending.push(message);
    else legacyPending.push(message);
  });
  anchoredPending.sort((a, b) => {
    const comparison = toUnsignedLong(a.__pendingAfterMid || 0).comp(toUnsignedLong(b.__pendingAfterMid || 0));
    return comparison || localSendOrder(a) - localSendOrder(b);
  });
  legacyPending.sort((a, b) => localSendOrder(a) - localSendOrder(b));
  if (!anchoredPending.length) return confirmedMessages.concat(legacyPending);

  const messages = [];
  let pendingIndex = 0;
  confirmedMessages.forEach((message) => {
    const confirmedMid = toUnsignedLong(message.id);
    while (pendingIndex < anchoredPending.length && toUnsignedLong(anchoredPending[pendingIndex].__pendingAfterMid || 0).comp(confirmedMid) < 0) {
      messages.push(anchoredPending[pendingIndex++]);
    }
    messages.push(message);
    while (pendingIndex < anchoredPending.length && toUnsignedLong(anchoredPending[pendingIndex].__pendingAfterMid || 0).eq(confirmedMid)) {
      messages.push(anchoredPending[pendingIndex++]);
    }
  });
  if (pendingIndex < anchoredPending.length) messages.push(...anchoredPending.slice(pendingIndex));
  if (legacyPending.length) messages.push(...legacyPending);
  return messages;
};

const findPendingStartIndex = (messages) => {
  let low = 0;
  let high = messages.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (isPendingMessage(messages[middle])) high = middle;
    else low = middle + 1;
  }
  return low;
};

export const findMessageInsertionIndex = (messages = [], mid) => {
  const target = toUnsignedLong(mid);
  let low = 0;
  let high = findPendingStartIndex(messages);
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const comparison = toUnsignedLong(messages[middle].id).comp(target);
    if (comparison < 0) low = middle + 1;
    else high = middle;
  }
  return low;
};

export const findMessageIndex = (messages = [], mid) => {
  if (typeof mid === 'undefined' || mid === null) return -1;
  const index = findMessageInsertionIndex(messages, mid);
  return index < messages.length && toUnsignedLong(messages[index].id).eq(toUnsignedLong(mid)) ? index : -1;
};

export const createMessageSession = (sid) => ({
  sid: conversationKey(sid),
  messages: [],
  cachedHistoryMessages: [],
  needsMessageCompaction: false,
  messageCompactionOverlapIds: new Set(),
  localMessagesLoaded: false,
  nextKey: '0',
  historyLoading: false,
  historyBlockedUntilReconnect: false,
  historyExhausted: false,
  historyQueryTimes: 0,
  pendingHistoryCursor: null,
  historyError: '',
  lastHistoryRequestId: 0,
  discardPendingHistoryResponse: false,
  viewport: null,
  measurements: Object.create(null),
  measurementWidth: 0,
  deletedMessageIds: new Set()
});

export const mergeMessages = (oldMessages = [], newMessages = [], sendingMessages = []) => {
  const incoming = newMessages
    .filter((message) => message && typeof message.id !== 'undefined')
    .slice()
    .sort((a, b) => toUnsignedLong(a.id).comp(toUnsignedLong(b.id)));
  const existing = oldMessages || [];
  const existingConfirmed = existing.filter((message) => !isPendingMessage(message));
  const pending = existing.filter(isPendingMessage);
  const merged = [];
  let i = 0;
  let j = 0;

  while (i < incoming.length && j < existingConfirmed.length) {
    const comparison = toUnsignedLong(incoming[i].id).comp(toUnsignedLong(existingConfirmed[j].id));
    if (comparison < 0) {
      merged.push(incoming[i++]);
    } else if (comparison > 0) {
      merged.push(existingConfirmed[j++]);
    } else {
      merged.push(incoming[i++]);
      j += 1;
    }
  }
  if (i < incoming.length) merged.push(...incoming.slice(i));
  if (j < existingConfirmed.length) merged.push(...existingConfirmed.slice(j));

  if (sendingMessages.length) {
    const ids = new Set(merged.concat(pending).map(messageKey));
    sendingMessages.forEach((message) => {
      const id = messageKey(message);
      if (!id || ids.has(id)) return;
      ids.add(id);
      pending.push({
        ...message,
        __pendingMessage: true,
        __pendingOrder: ++pendingMessageSequence,
        __pendingAfterMid: merged.length ? messageKey(merged[merged.length - 1]) : ''
      });
    });
  }
  return appendPendingMessages(merged, pending);
};

export const compactMessagesForDisplay = (messages = [], cachedHistoryMessages = [], limit = VISIBLE_MESSAGE_LIMIT) => {
  const confirmedMessages = messages.filter((message) => !isPendingMessage(message));
  const pendingMessages = messages.filter(isPendingMessage);
  const visibleConfirmedMessages = confirmedMessages.slice(-limit);
  const hiddenMessages = confirmedMessages.slice(0, Math.max(0, confirmedMessages.length - limit));
  let mergedCachedHistoryMessages = cachedHistoryMessages;
  if (!cachedHistoryMessages.length) mergedCachedHistoryMessages = hiddenMessages;
  else if (hiddenMessages.length && toUnsignedLong(cachedHistoryMessages[cachedHistoryMessages.length - 1].id).lt(toUnsignedLong(hiddenMessages[0].id))) {
    mergedCachedHistoryMessages = cachedHistoryMessages.concat(hiddenMessages);
  } else if (hiddenMessages.length) mergedCachedHistoryMessages = mergeMessages(cachedHistoryMessages, hiddenMessages);
  return {
    messages: appendPendingMessages(visibleConfirmedMessages, pendingMessages),
    cachedHistoryMessages: mergedCachedHistoryMessages
  };
};

export const mergeHistoryMessages = (oldMessages = [], historyMessages = [], deletedMessageIds = new Set()) => {
  const history = historyMessages
    .filter((message) => message && typeof message.id !== 'undefined' && !deletedMessageIds.has(messageKey(message)))
    .slice()
    .sort((a, b) => toUnsignedLong(a.id).comp(toUnsignedLong(b.id)));
  const existing = oldMessages || [];
  const existingConfirmed = existing.filter((message) => !isPendingMessage(message));
  const pending = existing.filter(isPendingMessage);
  const merged = [];
  let i = 0;
  let j = 0;

  while (i < history.length && j < existingConfirmed.length) {
    const comparison = toUnsignedLong(history[i].id).comp(toUnsignedLong(existingConfirmed[j].id));
    if (comparison < 0) merged.push(history[i++]);
    else if (comparison > 0) merged.push(existingConfirmed[j++]);
    else {
      merged.push(existingConfirmed[j++]);
      i += 1;
    }
  }
  if (i < history.length) merged.push(...history.slice(i));
  if (j < existingConfirmed.length) merged.push(...existingConfirmed.slice(j));
  return appendPendingMessages(merged, pending);
};

export const touchSessionOrder = (order = [], sid) => {
  const key = conversationKey(sid);
  return order.filter((item) => item !== key).concat(key);
};

export const historyCursorForSession = (session) => {
  if (!session) return '0';
  if (session.historyQueryTimes > 0) return `${session.nextKey || 0}`;
  const firstConfirmedMessage = session.messages && session.messages.find((message) => !isPendingMessage(message));
  return firstConfirmedMessage ? messageKey(firstConfirmedMessage) : '0';
};

export const shouldContinuePastOverlappingHistory = (pendingCursor, nextKey, addedCount) => {
  const current = `${pendingCursor || 0}`;
  const next = `${nextKey || 0}`;
  return addedCount === 0 && next !== '0' && next !== current;
};

export const canRestoreMeasurements = (cachedWidth, currentWidth) => cachedWidth > 0 && Math.abs(cachedWidth - currentWidth) <= 1;

export const findIndexAtOffset = (prefixHeights, messageCount, offset) => {
  if (!messageCount) return 0;
  let low = 0;
  let high = messageCount;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((prefixHeights[middle + 1] || 0) < offset) low = middle + 1;
    else high = middle;
  }
  return Math.min(low, messageCount - 1);
};
