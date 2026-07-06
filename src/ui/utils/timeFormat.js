import { toNumber } from '../third/tools';
import { getLocale } from '../../i18n';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeDate(timestamp) {
  if (!timestamp) return null;

  const value = toNumber(timestamp);
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatMessageTime(timestamp, now = new Date(), locale = getLocale()) {
  const date = normalizeDate(timestamp);
  if (!date) return '';

  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / DAY_IN_MS);

  if (dayDiff === 0) {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  if (dayDiff === 1) {
    return new Intl.RelativeTimeFormat(locale, {
      numeric: 'auto'
    }).format(-1, 'day');
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long'
    }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(date);
}

export default formatMessageTime;
