import { view, esc, clearHeader, showLoading, showError } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { loadVerification, saveDemoVerification } from '../repository.js';
import { isLive } from '../api.js';
import { getState, saveState } from '../state.js';

const STEPS = [
  'Откройте бот Yaqin и нажмите «Проверка».',
  'Получите одноразовый код.',
  'Запишите видеокружок 5–10 сек: назовите себя, произнесите код, покажите ✌️ и 👍.',
  'Дождитесь ответа модератора в боте.'
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
    title: 'Заявка у модератора',
    text: 'Видео уже в боте. Мы напишем, когда проверка закончится.',
    action: 'Продолжить',
    actionRoute: 'me'
  },
  awaiting_video: {
    tone: 'wait',
    short: 'Нужно видео',
    mode: 'intro',
    title: 'Код уже в боте',
    text: 'Откройте бот и запишите видеокружок с кодом и жестами.',
    action: 'Открыть бот',
    actionRoute: 'verify-start'
  },
  rejected: {
    tone: 'bad',
    short: 'Отклонена',
    mode: 'intro',
    title: 'Нужна новая проверка',
    text: 'Отправьте видеокружок ещё раз через бот.',
    action: 'Открыть бот',
    actionRoute: 'verify-start'
  },
  none: {
    tone: 'wait',
    short: 'Не пройдена',
    mode: 'intro',
    title: 'Проверка через бот',
    text: 'Чтобы Yaqin оставался безопасным, анкету подтверждают видеокружком с кодом — прямо в Telegram-боте.',
    action: 'Открыть бот',
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
      <ol class="verify-steps">${STEPS.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
      <p class="verify-note">Селфи в приложении нет — только видеокружок в боте.</p>
      <button class="verify-cta" id="verifyBegin">${esc(state.action)}</button>
      ${!isLive ? '<button class="verify-cta ghost" id="verifyDemo" type="button">Демо: отметить «на проверке»</button>' : ''}
    </div>`;

  view.querySelector('#verifyBegin').onclick = () => {
    if (state.actionRoute === 'verify-start') startVerification();
    else navigate(state.actionRoute);
  };
  view.querySelector('#verifyDemo')?.addEventListener('click', () => {
    saveDemoVerification({ status: 'pending', stage: 'in_review' });
    navigate('verify');
  });
}

export function startVerification() {
  const telegram = window.Telegram?.WebApp;
  const username = window.YAQIN_BOT_USERNAME || '';

  if (username && telegram?.openTelegramLink) {
    telegram.openTelegramLink(`https://t.me/${username}?start=verify`);
    return;
  }
  if (telegram?.showAlert) {
    telegram.showAlert('Отправьте /verify в боте, чтобы получить код.');
    return;
  }
  // Локальное демо без Telegram: имитируем «код выдан, ждём видео»
  saveDemoVerification({ status: 'pending', stage: 'awaiting_video' });
  saveState({ ...getState(), verifyStep: 'status' });
  navigate('verify');
}
