/**
 * Deep links в Mini App / бот:
 *   t.me/<bot>?startapp=e_<eventId>
 *   t.me/<bot>/<short>?startapp=e_<eventId>
 *   t.me/<bot>?start=e_<eventId>  → бот шлёт кнопку с startapp
 *
 * start_param / startapp: A-Z a-z 0-9 _ - , до 64 символов.
 */

import { findEvent, allEvents } from './screens/community.js';

const PENDING_KEY = 'yaqin-pending-deep';

export function botUsername() {
  const fromConfig = String(window.YAQIN_BOT_USERNAME || '').trim().replace(/^@/, '');
  if (fromConfig) return fromConfig;
  try {
    const fromTg = String(window.Telegram?.WebApp?.initDataUnsafe?.receiver?.username || '').trim();
    if (fromTg) return fromTg;
  } catch (_) { /* ignore */ }
  return 'yaqin_bot';
}

export function miniAppShortName() {
  return String(window.YAQIN_MINIAPP_SHORT_NAME || '').trim();
}

/** Telegram-safe payload for an event. */
export function encodeEventStartParam(eventId) {
  const raw = String(eventId ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!raw) return '';
  return `e_${raw}`.slice(0, 64);
}

export function decodeEventStartParam(param) {
  const p = String(param || '').trim();
  if (!p) return null;
  if (/^e_/i.test(p)) return p.slice(2);
  if (/^event_/i.test(p)) return p.slice(6);
  return null;
}

/** Точный id или хвост (как в YQHOST-xxxxxxxx). */
export function resolveEventFromStartParam(param) {
  const key = decodeEventStartParam(param);
  if (!key) return null;
  const exact = findEvent(key);
  if (exact) return exact;
  const list = allEvents();
  const bySuffix = list.find(event => {
    const id = String(event.id);
    return id === key
      || id.endsWith(key)
      || id.replace(/^e-/, '') === key
      || id.replace(/[^a-zA-Z0-9]/g, '').endsWith(key.replace(/[^a-zA-Z0-9]/g, ''));
  });
  return bySuffix || null;
}

/** Ссылка для QR / шаринга: сразу в Mini App с startapp. */
export function eventDeepLink(eventId) {
  const param = encodeEventStartParam(eventId);
  if (!param) return `https://t.me/${botUsername()}`;
  const short = miniAppShortName();
  if (short) return `https://t.me/${botUsername()}/${short}?startapp=${encodeURIComponent(param)}`;
  return `https://t.me/${botUsername()}?startapp=${encodeURIComponent(param)}`;
}

/** Fallback через чат бота (/start). */
export function eventBotStartLink(eventId) {
  const param = encodeEventStartParam(eventId);
  if (!param) return `https://t.me/${botUsername()}`;
  return `https://t.me/${botUsername()}?start=${encodeURIComponent(param)}`;
}

export function qrImageUrl(data, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

function readStartParamFromEnvironment() {
  try {
    const fromTg = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (fromTg) return String(fromTg);
  } catch (_) { /* ignore */ }

  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('startapp')
      || url.searchParams.get('tgWebAppStartParam')
      || url.searchParams.get('start');
    if (q) return String(q);
    const hash = (url.hash || '').replace(/^#/, '');
    if (hash.startsWith('startapp=')) return decodeURIComponent(hash.slice('startapp='.length));
    if (/^e_/i.test(hash)) return hash;
  } catch (_) { /* ignore */ }

  return '';
}

export function readLaunchDeepLink() {
  const param = readStartParamFromEnvironment();
  if (!param) return null;
  const event = resolveEventFromStartParam(param);
  if (event) {
    return { route: 'event', id: event.id, param };
  }
  const key = decodeEventStartParam(param);
  if (key) {
    return { route: 'event', id: key, param, missing: true };
  }
  return null;
}

export function stashPendingDeepLink(link) {
  if (!link) return;
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(link));
  } catch (_) { /* ignore */ }
}

export function takePendingDeepLink() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function peekPendingDeepLink() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/** Открыть отложенный deep link (после онбординга / апрува). */
export function applyPendingDeepLink(navigateFn) {
  const link = takePendingDeepLink();
  if (!link || link.route !== 'event') return false;
  const event = resolveEventFromStartParam(link.param) || findEvent(link.id);
  if (event) {
    navigateFn('event', event.id);
    return true;
  }
  if (link.id != null && link.id !== '') {
    navigateFn('event', link.id);
    return true;
  }
  return false;
}
