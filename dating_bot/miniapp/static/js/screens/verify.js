import { view, esc, setBackTitle, showLoading, showError } from '../dom.js';
import { isCurrentRender } from '../router.js';
import { loadVerification, saveDemoVerification } from '../repository.js';
import { isLive } from '../api.js';

const STEPS = [
  'Заполните анкету: имя, возраст, город и пару слов о себе.',
  'Получите одноразовый код в боте.',
  'Запишите видеосообщение-кружок на 5–10 секунд: назовите себя, произнесите код и покажите жесты ✌️ и 👍.',
  'Дождитесь решения модератора — уведомление придёт в бот.'
];

const VIEWS = {
  approved: {
    tone: 'ok',
    short: 'Подтверждена',
    icon: '✓',
    title: 'Анкета подтверждена',
    text: 'Ваша анкета видна другим участницам Yaqin.',
    action: null
  },
  in_review: {
    tone: 'wait',
    short: 'На проверке',
    icon: '⏳',
    title: 'Заявка на проверке',
    text: 'Модератор смотрит ваше видеосообщение. Уведомление придёт в бот.',
    action: null
  },
  awaiting_video: {
    tone: 'wait',
    short: 'Нужно видео',
    icon: '●',
    title: 'Код отправлен в бот',
    text: 'Откройте бот и запишите видеосообщение-кружок с кодом и жестами.',
    action: 'Открыть бот'
  },
  rejected: {
    tone: 'bad',
    short: 'Отклонена',
    icon: '×',
    title: 'Заявка отклонена',
    text: 'Проверьте анкету и отправьте новую заявку.',
    action: 'Отправить снова'
  },
  none: {
    tone: 'wait',
    short: 'Не пройдена',
    icon: '✿',
    title: 'Пройдите проверку',
    text: 'Проверка подтверждает, что анкета настоящая и соответствует правилам сервиса.',
    action: 'Получить код в боте'
  }
};

export function resolveView({ status, stage }) {
  if (status === 'approved') return VIEWS.approved;
  if (status === 'rejected') return VIEWS.rejected;
  if (stage === 'in_review') return VIEWS.in_review;
  if (stage === 'awaiting_video') return VIEWS.awaiting_video;
  return VIEWS.none;
}

export async function verifyScreen(_id, token) {
  setBackTitle('Проверка анкеты');
  showLoading('Проверяем статус...');

  let verification;
  try {
    verification = await loadVerification();
  } catch {
    if (isCurrentRender(token)) showError('Не удалось получить статус проверки.');
    return;
  }
  if (!isCurrentRender(token)) return;

  const state = resolveView(verification);
  view.innerHTML = `
    <div class="screen-content verify-page">
      <div class="verify-status verify-${state.tone}">
        <div class="verify-icon">${state.icon}</div>
        <h1>${esc(state.title)}</h1>
        <p>${esc(state.text)}</p>
      </div>
      <h2>Как проходит проверка</h2>
      <ol class="verify-steps">${STEPS.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      <p class="verify-note">Видео нужно для подтверждения подлинности анкеты, а не для автоматического определения пола по внешности.</p>
      ${state.action ? `<button class="button" data-action="verify-start">${esc(state.action)}</button>` : ''}
    </div>`;
}

export function startVerification() {
  const telegram = window.Telegram?.WebApp;
  const username = window.YAQIN_BOT_USERNAME || '';

  if (!isLive) {
    saveDemoVerification({ status: 'pending', stage: 'in_review' });
    return;
  }
  if (username && telegram?.openTelegramLink) {
    telegram.openTelegramLink(`https://t.me/${username}?start=verify`);
    return;
  }
  telegram?.showAlert?.('Отправьте команду /verify в боте, чтобы получить код.');
}
