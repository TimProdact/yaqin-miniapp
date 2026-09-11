import { esc } from './dom.js';

/** Грубые бакеты для демо-времени в сообщениях. */
export function messageDayBucket(message, index, list) {
  const t = String(message?.time || '').toLowerCase();
  if (!t || t.includes('только') || t === 'сейчас' || t.includes('мин')) return 'today';
  if (t.includes('час') || t.includes('ч')) return 'today';
  if (t.includes('вчера')) return 'yesterday';
  if (t.includes('д') || t.includes('нед') || t.includes('н ')) return 'earlier';
  // без метки — группа с предыдущим
  if (index > 0) return messageDayBucket(list[index - 1], index - 1, list);
  return 'today';
}

const DAY_LABEL = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  earlier: 'Ранее'
};

export function isSystemMessage(message) {
  if (!message) return false;
  if (message.system || message.from === 'system') return true;
  const text = String(message.text || '');
  return /^(группа создана|.* вступила|.* вышла|.* присоединил|вышли из группы)/i.test(text.trim());
}

/**
 * Рендер ленты: date chips + пузыри.
 * renderBubble(message, index, list) → html string
 */
export function threadMessagesHtml(messages, renderBubble) {
  const list = messages || [];
  let lastDay = null;
  const parts = [];
  list.forEach((message, index) => {
    if (isSystemMessage(message)) {
      const day = messageDayBucket(message, index, list);
      if (day !== lastDay) {
        parts.push(`<div class="chat-day-chip" role="separator">${esc(DAY_LABEL[day] || 'Сегодня')}</div>`);
        lastDay = day;
      }
      parts.push(`
        <div class="chat-system-msg" role="status">
          <span>${esc(message.text || '')}</span>
        </div>`);
      return;
    }
    const day = messageDayBucket(message, index, list);
    if (day !== lastDay) {
      parts.push(`<div class="chat-day-chip" role="separator">${esc(DAY_LABEL[day] || 'Сегодня')}</div>`);
      lastDay = day;
    }
    parts.push(renderBubble(message, index, list));
  });
  return parts.join('');
}
