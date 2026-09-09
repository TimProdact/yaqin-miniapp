import { defaultProfile, groups, promptPhoto, people } from '../data.js';
import { getState, saveState } from '../state.js';
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
  clearHeader();
  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Настройки</h1>
        <span></span>
      </header>

      <section class="settings-block">
        <label class="settings-row toggle">
          <span class="settings-icon green"><i class="ti ti-circle-filled"></i></span>
          <span>Показывать онлайн</span>
          <input type="checkbox" checked>
        </label>
        <button class="settings-row" type="button">
          <span class="settings-icon orange"><i class="ti ti-info-circle"></i></span>
          <span>Мой аккаунт</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="verify" type="button">
          <span class="settings-icon yellow"><i class="ti ti-shield-check"></i></span>
          <span>Проверка анкеты</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <h3 class="settings-label">Параметры</h3>
      <section class="settings-block">
        <button class="settings-row" type="button">
          <span class="settings-icon green"><i class="ti ti-bell"></i></span>
          <span>Уведомления</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" type="button">
          <span class="settings-icon pink"><i class="ti ti-lock"></i></span>
          <span>Приватность</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="blocked" type="button">
          <span class="settings-icon red"><i class="ti ti-eye-off"></i></span>
          <span>Заблокированные</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" type="button">
          <span class="settings-icon green"><i class="ti ti-info-circle"></i></span>
          <span>Новости функций</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="dark-mode" type="button">
          <span class="settings-icon blue"><i class="ti ti-bulb"></i></span>
          <span>Тёмная тема</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <h3 class="settings-label">Помощь</h3>
      <section class="settings-block">
        <button class="settings-row" type="button">
          <span class="settings-icon purple"><i class="ti ti-help-circle"></i></span>
          <span>Справка</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" type="button">
          <span class="settings-icon orange"><i class="ti ti-message"></i></span>
          <span>Отправить отзыв</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" type="button">
          <span class="settings-icon pink"><i class="ti ti-file-text"></i></span>
          <span>Правовая информация</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>
    </div>`;
}

export function blockedScreen() {
  clearHeader();
  const { blocked } = getState();
  const rows = people.filter(person => blocked.includes(person.id));

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Заблокированные</h1>
        <span></span>
      </header>
      ${rows.length
        ? `<div class="blocked-list">${rows.map(person => `
            <div class="blocked-row">
              <img src="${esc(person.photo)}" alt="">
              <div>
                <strong>${esc(person.name)}</strong>
                <span>${esc(person.city)}</span>
              </div>
              <button type="button" data-unblock="${person.id}">Разблок.</button>
            </div>`).join('')}</div>`
        : `<div class="blocked-empty">
            <div class="empty-badge"><i class="ti ti-ban"></i></div>
            <h2>Пока никого нет<br>в блоке</h2>
            <p>Если кого-то заблокируете, имя появится здесь.</p>
          </div>`}
    </div>`;

  view.querySelectorAll('[data-unblock]').forEach(button => {
    button.onclick = () => {
      const id = Number(button.dataset.unblock);
      const state = getState();
      saveState({ ...state, blocked: state.blocked.filter(item => item !== id) });
      blockedScreen();
    };
  });
}

export function darkModeScreen() {
  clearHeader();
  const theme = getState().theme || { dark: false, followSystem: true };

  const apply = next => {
    saveState({ ...getState(), theme: next });
    document.documentElement.dataset.theme = next.followSystem ? 'system' : next.dark ? 'dark' : 'light';
    darkModeScreen();
  };

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Тёмная тема</h1>
        <span></span>
      </header>
      <section class="settings-block">
        <label class="settings-row toggle">
          <span>Тёмная тема</span>
          <input type="checkbox" id="darkToggle" ${theme.dark && !theme.followSystem ? 'checked' : ''} ${theme.followSystem ? 'disabled' : ''}>
        </label>
        <label class="settings-row toggle stacked">
          <span>Как в системе<br><small>Yaqin подстроится под светлую или тёмную тему устройства</small></span>
          <input type="checkbox" id="systemToggle" ${theme.followSystem ? 'checked' : ''}>
        </label>
      </section>
    </div>`;

  view.querySelector('#darkToggle').onchange = event => {
    apply({ dark: event.target.checked, followSystem: false });
  };
  view.querySelector('#systemToggle').onchange = event => {
    apply({ dark: theme.dark, followSystem: event.target.checked });
  };
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
    <div class="screen-content edit-page">
      <input class="input" id="profileName" placeholder="Имя" maxlength="40" value="${esc(profile.name)}">
      <input class="input" id="profileAge" placeholder="Возраст" type="number" min="18" max="100" value="${profile.age}">
      <input class="input" id="profileCity" placeholder="Город" maxlength="60" value="${esc(profile.city)}">
      <textarea class="textarea" id="profileAbout" maxlength="500" placeholder="О себе">${esc(profile.bio)}</textarea>
      <button class="button" data-action="save-profile">Сохранить</button>
    </div>`;
}

export async function friendsScreen(_id, token) {
  setBackTitle('Подруги');
  showLoading('Загружаем список...');

  let matches;
  try {
    matches = await loadMatches();
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить список.');
    return;
  }
  if (!isCurrentRender(token)) return;

  if (!matches.length) {
    showPlaceholder('✿', 'Пока нет взаимных симпатий', 'Отправляйте приветы — мэтчи появятся здесь.');
    return;
  }

  view.innerHTML = `
    <div class="screen-content">
      ${matches.map(person => `
        <div class="chat-row" data-action="person" data-id="${person.id}">
          <div class="chat-avatar"><img src="${esc(person.photo)}"></div>
          <div><strong>${esc(person.name)}</strong><span>${person.age} • ${esc(person.city)}</span></div>
        </div>`).join('')}
    </div>`;
}

export function promptsScreen() {
  setBackTitle('Фотоответы');
  view.innerHTML = `
    <div class="screen-content">
      <img src="${esc(promptPhoto)}" style="width:100%;border-radius:20px">
      <p>Скоро здесь можно будет выбрать фото из галереи Telegram.</p>
    </div>`;
}

export function basicInfoScreen() {
  setBackTitle('Основное');
  view.innerHTML = `
    <div class="screen-content">
      <div class="me-box"><h4>Пол</h4><div class="big-chips"><span>Женщина</span></div></div>
    </div>`;
}

export function onboardingScreen() {
  clearHeader();
  view.innerHTML = `
    <div class="connected-page">
      <h1>Добро пожаловать<br>в Yaqin</h1>
      <button class="button" data-action="people">Начать</button>
    </div>`;
}

export function applyStoredTheme() {
  const theme = getState().theme || { dark: false, followSystem: true };
  document.documentElement.dataset.theme = theme.followSystem ? 'system' : theme.dark ? 'dark' : 'light';
}
