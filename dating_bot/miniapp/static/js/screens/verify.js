import { clearHeader } from '../dom.js';
import { navigate } from '../router.js';

/** Проверка перенесена в Telegram-бот после /start — экран в Mini App больше не нужен. */
export function resolveView({ status }) {
  if (status === 'approved') {
    return { tone: 'ok', short: 'Подтверждена' };
  }
  if (status === 'rejected') {
    return { tone: 'bad', short: 'Отклонена' };
  }
  return { tone: 'wait', short: 'В боте' };
}

export async function verifyScreen() {
  clearHeader();
  navigate('me');
}

export function startVerification() {
  const username = String(window.YAQIN_BOT_USERNAME || '').trim();
  const telegram = window.Telegram?.WebApp;
  if (username) {
    const url = `https://t.me/${username}?start=verify`;
    try {
      if (telegram?.openTelegramLink) telegram.openTelegramLink(url);
      else window.open(url, '_blank', 'noopener');
    } catch (_) {
      window.open(url, '_blank', 'noopener');
    }
    return;
  }
  navigate('me');
}
