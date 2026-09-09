import { defaultProfile, groups, promptPhoto } from '../data.js';
import { getState } from '../state.js';
import { view, esc, setBackTitle, clearHeader, chipList, showLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender } from '../router.js';
import { loadMatches, loadProfile, loadVerification } from '../repository.js';
import { resolveView } from './verify.js';

function verificationRow(verification) {
  const state = resolveView(verification);
  return `
    <button class="verify-row verify-${state.tone}" data-action="verify">
      <span class="verify-dot"></span>
      <span>Проверка анкеты</span>
      <span>${esc(state.short)}</span>
    </button>`;
}

export async function meScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем профиль...');

  let profile;
  let verification;
  try {
    [profile, verification] = await Promise.all([loadProfile(), loadVerification()]);
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить профиль.');
    return;
  }
  if (!isCurrentRender(token)) return;

  if (!profile) {
    showPlaceholder('✿', 'Анкета не создана', 'Создайте анкету в боте командой /profile.');
    return;
  }

  view.innerHTML = `
    <div class="me-page">
      <div class="me-top">
        <h1>Профиль</h1>
        <div>
          <button aria-label="Поделиться"><i class="ti ti-share-2"></i></button>
          <button data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
        </div>
      </div>
      <div class="me-tabs">
        <button class="active">Анкета</button>
        <button data-action="events">События</button>
        <button data-action="friends">Подруги</button>
      </div>
      <div class="me-hero">
        <img src="${esc(profile.photo)}">
        <button class="edit-profile" data-action="edit">Редактировать</button>
        <div class="me-dots"><span class="on"></span><span></span></div>
      </div>
      <section class="me-info">
        <h2>${esc(profile.name)}</h2>
        <p>${profile.age} • ${esc(profile.city)}</p>
        <p class="me-bio">${esc(profile.bio)}</p>
      </section>
      <section class="me-section">${verificationRow(verification)}</section>
      ${profile.tags?.length || profile.looking?.length ? `
      <section class="me-section">
        <h3>О себе</h3>
        <div class="me-box">
          ${profile.tags?.length ? `<h4>Чем увлекаюсь</h4><div class="big-chips">${chipList(profile.tags)}</div>` : ''}
          ${profile.looking?.length ? `<h4>Чего хочу</h4><div class="big-chips">${chipList(profile.looking)}</div>` : ''}
        </div>
      </section>` : ''}
      <section class="me-section">
        <h3>Фотоответы</h3>
        <div class="prompt-card" data-action="prompts">
          <img src="${esc(promptPhoto)}">
          <p>Недавние кадры из вашей галереи</p>
        </div>
      </section>
      <section class="me-section">
        <h3>Мои группы</h3>
        <div class="groups-row">
          ${groups.slice(0, 2).map(group => `
            <div><img src="${esc(group.photo)}"><span>${esc(group.title)}</span></div>`).join('')}
        </div>
      </section>
      <section class="me-section">
        <h3>Основное</h3>
        <div class="me-box" data-action="basic"><h4>Пол</h4><div class="big-chips"><span>Женщина</span></div></div>
      </section>
    </div>`;
}

export function settingsScreen() {
  setBackTitle('Настройки');
  view.innerHTML = `
    <div class="settings-list">
      <button data-action="verify">Проверка анкеты <span>›</span></button>
      <button>Аккаунт <span>›</span></button>
      <button>Уведомления <span>›</span></button>
      <button>Приватность и безопасность <span>›</span></button>
      <button>О Yaqin <span>›</span></button>
      <button class="danger">Выйти</button>
    </div>`;
}

export async function editScreen(_id, token) {
  setBackTitle('Редактировать анкету');
  showLoading('Загружаем анкету...');

  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить анкету.');
    return;
  }
  if (!isCurrentRender(token)) return;

  view.innerHTML = `
    <div class="screen-content form">
      <input class="input" id="profileName" placeholder="Имя" maxlength="40" value="${esc(profile.name)}">
      <input class="input" id="profileAge" placeholder="Возраст" type="number" min="18" max="100" value="${profile.age}">
      <input class="input" id="profileCity" placeholder="Город" maxlength="60" value="${esc(profile.city)}">
      <textarea class="textarea" id="profileAbout" maxlength="500" placeholder="О себе">${esc(profile.bio)}</textarea>
      <button class="button" data-action="save-profile">Сохранить</button>
    </div>`;
}

export async function friendsScreen(_id, token) {
  setBackTitle('Мои подруги');
  showLoading('Загружаем список...');

  let matches;
  try {
    matches = await loadMatches();
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить взаимные симпатии.');
    return;
  }
  if (!isCurrentRender(token)) return;

  if (!matches.length) {
    showPlaceholder('✿', 'Пока нет взаимных симпатий', 'Отправляйте приветы — мэтчи появятся здесь.');
    return;
  }

  view.innerHTML = `
    <div class="screen-content">
      <h1>Мои подруги</h1>
      ${matches.map(person => `
        <div class="match-row">
          <img class="match-photo" src="${esc(person.photo)}">
          <div class="match-info"><b>${esc(person.name)}</b><span>${esc(person.city)}</span></div>
        </div>`).join('')}
    </div>`;
}

export function promptsScreen() {
  setBackTitle('Фотоответы');
  view.innerHTML = `
    <div class="screen-content">
      <h1>Фотоответы</h1>
      <div class="prompt-card">
        <img src="${esc(promptPhoto)}">
        <p>Недавние кадры из вашей галереи</p>
      </div>
    </div>`;
}

export function basicInfoScreen() {
  setBackTitle('Основное');
  view.innerHTML = `
    <div class="screen-content me-box">
      <h4>Работа</h4><div class="big-chips"><span>Дизайнер</span></div>
      <h4>Языки</h4><div class="big-chips"><span>русский</span><span>узбекский</span></div>
      <h4>Пол</h4><div class="big-chips"><span>Женщина</span></div>
      <h4>Статус</h4><div class="big-chips"><span>Свободна</span></div>
    </div>`;
}

export function onboardingScreen() {
  clearHeader();
  view.innerHTML = `
    <div class="onboarding">
      <div class="onboarding-mark">✿</div>
      <h1>Добро пожаловать в Yaqin</h1>
      <p>Знакомьтесь, находите подруг и почувствуйте свой город ближе.</p>
      <button class="button" data-action="people">Создать анкету</button>
      <small>Только для девушек 18+</small>
    </div>`;
}
