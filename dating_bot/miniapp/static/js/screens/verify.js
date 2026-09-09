import { view, esc, clearHeader, showLoading, showError } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { loadVerification, saveDemoVerification } from '../repository.js';
import { isLive } from '../api.js';

const STEPS = [
  'Заполните анкету: имя, возраст, город и пару слов о себе.',
  'Получите одноразовый код в боте.',
  'Запишите видеокружок на 5–10 секунд: назовите себя, произнесите код и покажите жесты ✌️ и 👍.',
  'Дождитесь решения модератора — уведомление придёт в бот.'
];

const VIEWS = {
  approved: {
    tone: 'ok',
    short: 'Подтверждена',
    mode: 'done',
    title: 'Анкета подтверждена',
    text: 'Ваша анкета видна другим участницам Yaqin.',
    action: 'Продолжить',
    actionRoute: 'me'
  },
  in_review: {
    tone: 'wait',
    short: 'На проверке',
    mode: 'submitted',
    title: 'Спасибо!',
    text: 'Данные для проверки успешно отправлены.',
    action: 'Продолжить',
    actionRoute: 'me'
  },
  awaiting_video: {
    tone: 'wait',
    short: 'Нужно видео',
    mode: 'intro',
    title: 'Код уже в боте',
    text: 'Откройте бот и запишите видеосообщение-кружок с кодом и жестами.',
    action: 'Открыть бот',
    actionRoute: 'verify-start'
  },
  rejected: {
    tone: 'bad',
    short: 'Отклонена',
    mode: 'intro',
    title: 'Нужна новая проверка',
    text: 'Проверьте анкету и отправьте заявку ещё раз через бот.',
    action: 'Отправить снова',
    actionRoute: 'verify-start'
  },
  none: {
    tone: 'wait',
    short: 'Не пройдена',
    mode: 'intro',
    title: 'Давайте проверим анкету',
    text: 'Чтобы Yaqin оставался безопасным, каждая анкета проходит ручную проверку через видеокружок с кодом.',
    action: 'Понятно',
    actionRoute: 'verify-start'
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
  clearHeader();
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

  if (state.mode === 'submitted' || state.mode === 'done') {
    view.innerHTML = `
      <div class="verify-submitted">
        <div class="verify-brand"><i class="ti ti-flower"></i></div>
        <div class="verify-check"><i class="ti ti-check"></i></div>
        <h1>${esc(state.title)}</h1>
        <p>${esc(state.text)}</p>
        <button class="verify-cta" data-action="${state.actionRoute}">${esc(state.action)}</button>
      </div>`;
    return;
  }

  view.innerHTML = `
    <div class="verify-intro">
      <button class="verify-close" data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
      <div class="verify-pair">
        <span class="verify-logo yaqin"><i class="ti ti-flower"></i></span>
        <span class="verify-dots"></span>
        <span class="verify-logo bot"><i class="ti ti-brand-telegram"></i></span>
      </div>
      <h1>${esc(state.title)}</h1>
      <p class="verify-lead">${esc(state.text)}</p>
      <ol class="verify-steps">${STEPS.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      <p class="verify-note">Видео нужно для подтверждения подлинности анкеты, а не для автоматического определения пола по внешности.</p>
      <button class="verify-cta" data-action="${state.actionRoute}">${esc(state.action)}</button>
    </div>`;
}

export function startVerification() {
  const telegram = window.Telegram?.WebApp;
  const username = window.YAQIN_BOT_USERNAME || '';

  if (!isLive) {
    saveDemoVerification({ status: 'pending', stage: 'in_review' });
    navigate('verify');
    return;
  }
  if (username && telegram?.openTelegramLink) {
    telegram.openTelegramLink(`https://t.me/${username}?start=verify`);
    return;
  }
  telegram?.showAlert?.('Отправьте команду /verify в боте, чтобы получить код.');
}
