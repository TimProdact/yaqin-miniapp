import { defaultProfile, groups, promptPhoto, people, events, PHOTOS } from '../data.js';
import { getState, saveState } from '../state.js';
import { view, esc, setBackTitle, clearHeader, chipList, showLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { loadMatches, loadProfile, loadVerification, saveProfile } from '../repository.js';
import { resolveView } from './verify.js';
import { chatIdForPerson } from './chats.js';

let closeOverlay = null;

export function closeSettingsOverlay() {
  closeOverlay?.();
}

function mountSheet(markup, className = 'settings-overlay') {
  closeSettingsOverlay();
  const overlay = document.createElement('div');
  overlay.className = className;
  overlay.innerHTML = markup;
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeSettingsOverlay();
  });
  document.body.appendChild(overlay);
  document.body.classList.add('settings-sheet-open');
  closeOverlay = () => {
    overlay.remove();
    document.body.classList.remove('settings-sheet-open');
    closeOverlay = null;
  };
  return overlay;
}

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
          <button data-action="share-profile" aria-label="Поделиться"><i class="ti ti-share-2"></i></button>
          <button data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
        </div>
      </div>
      <div class="me-tabs">
        <button class="active">Анкета</button>
        <button data-action="my-events">События</button>
        <button data-action="friends">Подруги</button>
      </div>
      <div class="me-hero">
        <img src="${esc(profile.photo)}">
        <button class="edit-profile" data-action="edit">Редактировать</button>
        <button class="edit-photos-btn" data-action="edit-photos" aria-label="Фото"><i class="ti ti-pencil"></i></button>
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
        <div class="me-section-head">
          <h3>Мои группы</h3>
          <button type="button" class="me-link" data-action="profile-groups">На профиле</button>
        </div>
        <div class="groups-row">
          ${groups.filter(group => group.joined !== false).slice(0, 2).map(group => `
            <button type="button" data-action="group-hub" data-id="${group.id}">
              <img src="${esc(group.photo)}" alt=""><span>${esc(group.title)}</span>
            </button>`).join('')}
        </div>
      </section>
      <section class="me-section">
        <h3>Основное</h3>
        <div class="me-box" data-action="basic">
          <h4>Пол</h4><div class="big-chips"><span>${esc(profile.gender || 'Женщина')}</span></div>
          ${profile.work ? `<h4>Работа</h4><div class="big-chips"><span>${esc(profile.work)}</span></div>` : ''}
          ${profile.relationship ? `<h4>Отношения</h4><div class="big-chips"><span>${esc(profile.relationship)}</span></div>` : ''}
        </div>
      </section>
    </div>`;
}

export function settingsScreen() {
  clearHeader();
  const privacy = getState().privacy || { showOnline: true };
  const profileId = (getState().profileId || 'yaqin-demo-local').slice(0, 36);

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
          <input type="checkbox" id="showOnline" ${privacy.showOnline !== false ? 'checked' : ''}>
        </label>
        <button class="settings-row" data-action="account" type="button">
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
        <button class="settings-row" data-action="notifications" type="button">
          <span class="settings-icon green"><i class="ti ti-bell"></i></span>
          <span>Уведомления</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="privacy" type="button">
          <span class="settings-icon pink"><i class="ti ti-lock"></i></span>
          <span>Приватность</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="blocked" type="button">
          <span class="settings-icon red"><i class="ti ti-eye-off"></i></span>
          <span>Заблокированные</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="announcements" type="button">
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
        <button class="settings-row" data-action="help" type="button">
          <span class="settings-icon purple"><i class="ti ti-help-circle"></i></span>
          <span>Справка</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="feedback" type="button">
          <span class="settings-icon orange"><i class="ti ti-message"></i></span>
          <span>Отправить отзыв</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="legal" type="button">
          <span class="settings-icon pink"><i class="ti ti-file-text"></i></span>
          <span>Правовая информация</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <h3 class="settings-label">Аккаунт</h3>
      <section class="settings-block">
        <button class="settings-row danger" type="button" id="logoutBtn">
          <span class="settings-icon red"><i class="ti ti-logout"></i></span>
          <span>Выйти</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <footer class="settings-footer">
        <span class="settings-brand"><i class="ti ti-flower"></i></span>
        <p>Версия 1.0.0 · демо</p>
        <p>Profile ID: ${esc(profileId)}</p>
      </footer>
    </div>`;

  view.querySelector('#showOnline').onchange = event => {
    saveState({
      ...getState(),
      privacy: { ...(getState().privacy || {}), showOnline: event.target.checked }
    });
  };
  view.querySelector('#logoutBtn').onclick = () => {
    saveState({ ...getState(), onboarded: false, onboardingStep: 'start' });
    navigate('onboarding');
  };
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

export function privacyScreen() {
  clearHeader();
  const privacy = {
    showOnline: true,
    showInDiscover: true,
    readReceipts: true,
    allowInvites: true,
    ...(getState().privacy || {})
  };

  const render = () => {
    view.innerHTML = `
      <div class="settings-page">
        <header class="filters-head">
          <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Приватность</h1>
          <span></span>
        </header>
        <h3 class="settings-label">Видимость</h3>
        <section class="settings-block">
          <label class="settings-row toggle stacked">
            <span>Показывать онлайн<br><small>Другие увидят, когда вы в сети</small></span>
            <input type="checkbox" data-key="showOnline" ${privacy.showOnline ? 'checked' : ''}>
          </label>
          <label class="settings-row toggle stacked">
            <span>Показывать в ленте<br><small>Анкета появляется во вкладке «Люди»</small></span>
            <input type="checkbox" data-key="showInDiscover" ${privacy.showInDiscover ? 'checked' : ''}>
          </label>
        </section>
        <h3 class="settings-label">Общение</h3>
        <section class="settings-block">
          <label class="settings-row toggle stacked">
            <span>Отчёты о прочтении<br><small>Показывать, когда вы прочитали сообщение</small></span>
            <input type="checkbox" data-key="readReceipts" ${privacy.readReceipts ? 'checked' : ''}>
          </label>
          <label class="settings-row toggle stacked">
            <span>Приглашения в группы<br><small>Разрешить приглашать вас в группы</small></span>
            <input type="checkbox" data-key="allowInvites" ${privacy.allowInvites ? 'checked' : ''}>
          </label>
        </section>
      </div>`;

    view.querySelectorAll('[data-key]').forEach(input => {
      input.onchange = () => {
        privacy[input.dataset.key] = input.checked;
        saveState({ ...getState(), privacy: { ...privacy } });
      };
    });
  };
  render();
}

export function helpScreen() {
  clearHeader();
  const topics = [
    ['verify', 'Как пройти проверку анкеты', 'Запишите короткое видео с кодом — команда проверит вручную.'],
    ['groups', 'Как работают группы', 'Вступайте по вопросам или по приглашению, пишите в комнатах и на событиях.'],
    ['safety', 'Безопасность и жалобы', 'Можно пожаловаться или заблокировать прямо из профиля или чата.'],
    ['account', 'Почта и доступ', 'Добавьте email в аккаунте, чтобы не потерять доступ.']
  ];

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Справка</h1>
        <span></span>
      </header>
      <section class="settings-block">
        ${topics.map(([id, title, text]) => `
          <button class="settings-row stacked-btn" type="button" data-help="${id}">
            <span>${esc(title)}<br><small>${esc(text)}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>`).join('')}
      </section>
      <section class="settings-block">
        <button class="settings-row" data-action="feedback" type="button">
          <span class="settings-icon orange"><i class="ti ti-message"></i></span>
          <span>Написать в поддержку</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>
    </div>`;

  view.querySelectorAll('[data-help]').forEach(button => {
    button.onclick = () => {
      const topic = topics.find(item => item[0] === button.dataset.help);
      if (!topic) return;
      mountSheet(`
        <div class="help-sheet">
          <div class="confirm-handle"></div>
          <h2>${esc(topic[1])}</h2>
          <p>${esc(topic[2])}</p>
          <button class="announce-cta" data-action="close-sheet">Понятно</button>
        </div>`);
    };
  });
}

export function legalScreen() {
  clearHeader();
  const docs = [
    ['terms', 'Условия использования', 'Демо-текст: пользуясь Yaqin, вы соглашаетесь общаться уважительно и не нарушать законы Узбекистана.'],
    ['privacy', 'Политика конфиденциальности', 'Демо-текст: мы обрабатываем данные профиля и чатов только для работы сервиса. В Telegram Mini App часть данных приходит из Telegram.'],
    ['community', 'Правила сообществ', 'Демо-текст: без травли, спама, фейков и непристойного контента. Жалобы рассматривает модерация.']
  ];

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Правовая информация</h1>
        <span></span>
      </header>
      <section class="settings-block">
        ${docs.map(([id, title]) => `
          <button class="settings-row" type="button" data-legal="${id}">
            <span class="settings-icon pink"><i class="ti ti-file-text"></i></span>
            <span>${esc(title)}</span>
            <i class="ti ti-chevron-right"></i>
          </button>`).join('')}
      </section>
    </div>`;

  view.querySelectorAll('[data-legal]').forEach(button => {
    button.onclick = () => {
      const doc = docs.find(item => item[0] === button.dataset.legal);
      if (!doc) return;
      mountSheet(`
        <div class="help-sheet legal-sheet">
          <div class="confirm-handle"></div>
          <h2>${esc(doc[1])}</h2>
          <p>${esc(doc[2])}</p>
          <button class="announce-cta" data-action="close-sheet">Закрыть</button>
        </div>`);
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
  clearHeader();
  showLoading('Загружаем анкету...');

  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить анкету.');
    return;
  }
  if (!isCurrentRender(token)) return;

  const draft = {
    name: profile.name || '',
    age: profile.age || 25,
    city: profile.city || '',
    bio: profile.bio || '',
    tags: [...(profile.tags || ['кофе', 'кино'])],
    media: [...(profile.media || ['Sabrina Carpenter', 'Бриджертоны'])],
    looking: [...(profile.looking || ['книжный клуб'])],
    education: profile.education || '',
    work: profile.work || '',
    pronouns: profile.pronouns || '',
    gender: profile.gender || 'Женщина',
    sexuality: profile.sexuality || '',
    relationship: profile.relationship || '',
    instagram: profile.instagram || '',
    tiktok: profile.tiktok || '',
    website: profile.website || ''
  };
  let sheet = null; // tags | media | looking | relationship | gender
  const tagPool = ['кофе', 'кино', 'йога', 'книги', 'бег', 'еда', 'фото', 'прогулки', 'музыка'];
  const mediaPool = ['Sabrina Carpenter', 'Бриджертоны', 'подкасты', 'артхаус', 'плейлисты'];
  const lookingPool = ['книжный клуб', 'кофе', 'прогулки', 'спорт', 'путешествия'];
  const relationships = ['Не в отношениях', 'В отношениях', 'Помолвлена', 'Замужем', 'Всё сложно'];
  const genders = ['Женщина', 'Небинарная', 'Предпочитаю не указывать'];

  const render = () => {
    view.innerHTML = `
      <div class="edit-profile-page">
        <div class="edit-hero">
          <img src="${esc(profile.photo || profile.photos?.[0] || promptPhoto)}" alt="">
          <button class="edit-back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <button class="edit-done" id="saveEdit">Готово</button>
          <div class="me-dots"><span class="on"></span><span></span></div>
          <button class="edit-photos-fab" data-action="edit-photos" aria-label="Фото"><i class="ti ti-pencil"></i></button>
        </div>
        <section class="edit-card">
          <div class="edit-identity">
            <input class="edit-name" id="profileName" maxlength="40" value="${esc(draft.name)}">
            <p>
              <input class="edit-age" id="profileAge" type="number" min="18" max="100" value="${draft.age}">
              ·
              <input class="edit-city" id="profileCity" maxlength="60" value="${esc(draft.city)}">
              <i class="ti ti-pencil"></i>
            </p>
          </div>
          <textarea class="edit-motto" id="profileAbout" maxlength="120" placeholder="короткий девиз">${esc(draft.bio)}</textarea>

          <h3 class="settings-label">О себе</h3>
          <div class="me-box">
            <button type="button" class="edit-block-head" data-sheet="tags">
              <h4>Чем увлекаюсь</h4><i class="ti ti-pencil"></i>
            </button>
            <div class="big-chips">${chipList(draft.tags)}</div>
            <button type="button" class="edit-block-head" data-sheet="media">
              <h4>Сейчас смотрю / читаю / слушаю</h4><i class="ti ti-pencil"></i>
            </button>
            <div class="big-chips">${chipList(draft.media)}</div>
            <button type="button" class="edit-block-head" data-sheet="looking">
              <h4>Чего хочу</h4><i class="ti ti-pencil"></i>
            </button>
            <div class="big-chips">${chipList(draft.looking)}</div>
          </div>

          <h3 class="settings-label">Фотоответы</h3>
          <button class="edit-prompt-card" type="button" data-action="prompts">
            <img src="${esc(promptPhoto)}" alt="">
            <div>
              <b>Недавние кадры из галереи</b>
              <span>Добавить фотоответ</span>
            </div>
            <i class="ti ti-chevron-right"></i>
          </button>

          <h3 class="settings-label">Ваши группы</h3>
          <div class="edit-groups">
            ${groups.filter(group => group.joined !== false).slice(0, 2).map(group => `
              <button type="button" data-action="profile-groups">
                <img src="${esc(group.photo)}" alt="">
                <span>${esc(group.title)}</span>
              </button>`).join('')}
          </div>

          <h3 class="settings-label">Основное</h3>
          <div class="edit-basic-list">
            ${[
              ['education', 'Образование', draft.education || 'Добавить'],
              ['work', 'Работа', draft.work || 'Добавить'],
              ['pronouns', 'Местоимения', draft.pronouns || 'Добавить'],
              ['gender', 'Пол', draft.gender || 'Добавить'],
              ['sexuality', 'Ориентация', draft.sexuality || 'Добавить'],
              ['relationship', 'Отношения', draft.relationship || 'Добавить']
            ].map(([key, label, value]) => `
              <button type="button" class="edit-basic-row" data-field="${key}">
                <span>${label}</span>
                <b class="${value === 'Добавить' ? 'muted' : ''}">${esc(value)} <i class="ti ti-plus"></i></b>
              </button>`).join('')}
          </div>

          <h3 class="settings-label">Ссылки</h3>
          <div class="edit-basic-list">
            ${[
              ['instagram', 'Instagram', draft.instagram || 'Добавить'],
              ['tiktok', 'TikTok', draft.tiktok || 'Добавить'],
              ['website', 'Сайт', draft.website || 'Добавить']
            ].map(([key, label, value]) => `
              <button type="button" class="edit-basic-row" data-field="${key}">
                <span>${label}</span>
                <b class="${value === 'Добавить' ? 'muted' : ''}">${esc(value)} <i class="ti ti-plus"></i></b>
              </button>`).join('')}
          </div>
        </section>

        ${sheet === 'tags' || sheet === 'media' || sheet === 'looking' ? `
          <div class="edit-sheet">
            <header>
              <h2>${sheet === 'tags' ? 'Увлечения' : sheet === 'media' ? 'Сейчас в медиа' : 'Чего хочу'}</h2>
              <button type="button" id="closeSheet">Готово</button>
            </header>
            <div class="edit-chip-picker">
              ${(sheet === 'tags' ? tagPool : sheet === 'media' ? mediaPool : lookingPool).map(item => {
                const list = draft[sheet === 'looking' ? 'looking' : sheet];
                const on = list.includes(item);
                return `<button type="button" class="${on ? 'on' : ''}" data-chip="${esc(item)}">${esc(item)}</button>`;
              }).join('')}
            </div>
          </div>` : ''}

        ${sheet === 'relationship' || sheet === 'gender' ? `
          <div class="edit-sheet">
            <header>
              <h2>${sheet === 'relationship' ? 'Отношения' : 'Пол'}</h2>
              <button type="button" id="closeSheet">Сохранить</button>
            </header>
            <div class="edit-radio-list">
              ${(sheet === 'relationship' ? relationships : genders).map(item => `
                <button type="button" class="${draft[sheet] === item ? 'on' : ''}" data-pick="${esc(item)}">
                  <span>${esc(item)}</span>
                  ${draft[sheet] === item ? '<i class="ti ti-check"></i>' : ''}
                </button>`).join('')}
            </div>
          </div>` : ''}
      </div>`;

    const syncDraft = () => {
      draft.name = view.querySelector('#profileName')?.value || '';
      draft.age = Number(view.querySelector('#profileAge')?.value) || draft.age;
      draft.city = view.querySelector('#profileCity')?.value || '';
      draft.bio = view.querySelector('#profileAbout')?.value || '';
    };

    view.querySelectorAll('[data-sheet]').forEach(button => {
      button.onclick = () => {
        syncDraft();
        sheet = button.dataset.sheet;
        render();
      };
    });
    view.querySelector('#closeSheet')?.addEventListener('click', () => {
      sheet = null;
      render();
    });
    view.querySelectorAll('[data-chip]').forEach(button => {
      button.onclick = () => {
        const key = sheet === 'looking' ? 'looking' : sheet;
        const value = button.dataset.chip;
        const list = draft[key];
        const index = list.indexOf(value);
        if (index >= 0) list.splice(index, 1);
        else list.push(value);
        render();
      };
    });
    view.querySelectorAll('[data-pick]').forEach(button => {
      button.onclick = () => {
        draft[sheet] = button.dataset.pick;
        render();
      };
    });
    view.querySelectorAll('[data-field]').forEach(button => {
      button.onclick = () => {
        syncDraft();
        const key = button.dataset.field;
        if (key === 'relationship' || key === 'gender') {
          sheet = key;
          render();
          return;
        }
        const labels = {
          education: 'Образование',
          work: 'Работа',
          pronouns: 'Местоимения',
          sexuality: 'Ориентация',
          instagram: 'Instagram',
          tiktok: 'TikTok',
          website: 'Сайт'
        };
        const next = window.prompt(labels[key] || key, draft[key] || '');
        if (next !== null) {
          draft[key] = next.trim();
          render();
        }
      };
    });
    view.querySelector('#saveEdit').onclick = async () => {
      syncDraft();
      if (!draft.name.trim() || !Number.isInteger(draft.age) || draft.age < 18 || draft.age > 100) {
        showError('Проверьте имя и возраст: возраст должен быть от 18 до 100.');
        return;
      }
      try {
        await saveProfile({
          name: draft.name.trim(),
          age: draft.age,
          city: draft.city.trim(),
          about: draft.bio.trim(),
          tags: draft.tags,
          looking: draft.looking,
          media: draft.media,
          education: draft.education,
          work: draft.work,
          pronouns: draft.pronouns,
          gender: draft.gender,
          sexuality: draft.sexuality,
          relationship: draft.relationship,
          instagram: draft.instagram,
          tiktok: draft.tiktok,
          website: draft.website
        });
        navigate('me');
      } catch {
        showError('Анкета не сохранилась. Попробуйте ещё раз.');
      }
    };
  };

  render();
}

export async function editPhotosScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем фото...');
  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить фото.');
    return;
  }
  if (!isCurrentRender(token)) return;

  let photos = [...(profile.photos || [profile.photo, promptPhoto].filter(Boolean))];
  while (photos.length < 6) photos.push(null);
  const pool = [PHOTOS.city, PHOTOS.coffee, PHOTOS.books, PHOTOS.palms, PHOTOS.event, people[0].photo].filter(Boolean);

  const render = () => {
    const filled = photos.filter(Boolean).length;
    view.innerHTML = `
      <div class="edit-photos-page">
        <header class="filters-head">
          <button data-action="edit" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <span></span>
          <button class="head-action ${filled >= 2 ? 'on' : ''}" id="savePhotos" ${filled >= 2 ? '' : 'disabled'}>Сохранить</button>
        </header>
        <h1>Ваши фото</h1>
        <p class="photos-lead">Загрузите хотя бы два фото, чтобы другие видели, как вы выглядите.</p>
        <div class="photos-grid">
          ${photos.map((photo, index) => photo
            ? `<div class="photo-slot filled">
                <img src="${esc(photo)}" alt="">
                <span class="photo-badge">${index === 0 ? '<i class="ti ti-check"></i> Главное' : index + 1}</span>
                ${index ? `<button type="button" class="photo-make-main" data-main="${index}">Главное</button>` : ''}
                ${index ? `<button type="button" class="photo-remove" data-remove="${index}" aria-label="Удалить"><i class="ti ti-x"></i></button>` : ''}
              </div>`
            : `<button type="button" class="photo-slot empty" data-add="${index}" aria-label="Добавить"><i class="ti ti-plus"></i></button>`
          ).join('')}
        </div>
      </div>`;

    view.querySelectorAll('[data-add]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.add);
        const next = pool.find(src => !photos.includes(src)) || pool[index % pool.length];
        photos[index] = next;
        render();
      };
    });
    view.querySelectorAll('[data-remove]').forEach(button => {
      button.onclick = () => {
        photos[Number(button.dataset.remove)] = null;
        render();
      };
    });
    view.querySelectorAll('[data-main]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.main);
        const [main] = photos.splice(index, 1);
        photos.unshift(main);
        while (photos.length < 6) photos.push(null);
        photos = photos.slice(0, 6);
        render();
      };
    });
    view.querySelector('#savePhotos').onclick = async () => {
      const clean = photos.filter(Boolean);
      if (clean.length < 2) return;
      try {
        await saveProfile({
          name: profile.name,
          age: profile.age,
          city: profile.city,
          about: profile.bio,
          photo: clean[0],
          photos: clean
        });
        navigate('edit');
      } catch {
        showError('Фото не сохранились. Попробуйте ещё раз.');
      }
    };
  };
  render();
}

export async function friendsScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем подруг...');

  let matches;
  try {
    matches = await loadMatches();
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить список.');
    return;
  }
  if (!isCurrentRender(token)) return;

  let requests = people.filter(person => !matches.some(match => match.id === person.id)).slice(0, 2);
  let friends = matches.length ? [...matches] : people.slice(0, 3);
  let toast = '';

  const render = () => {
    view.innerHTML = `
      <div class="me-page friends-page">
        ${toast ? `<div class="friend-toast">${esc(toast)}</div>` : ''}
        <div class="me-top">
          <h1>Профиль</h1>
          <div>
            <button data-action="share-profile" aria-label="Поделиться"><i class="ti ti-share-2"></i></button>
            <button data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
          </div>
        </div>
        <div class="me-tabs">
          <button data-action="me">Анкета</button>
          <button data-action="my-events">События</button>
          <button class="active">Подруги${requests.length ? ` <b class="tab-dot">${requests.length}</b>` : ''}</button>
        </div>

        ${requests.length ? `
          <h2 class="friends-label">Заявки · ${requests.length}</h2>
          ${requests.map(person => `
            <div class="friend-row">
              <img src="${esc(person.photo)}" alt="">
              <div>
                <strong>${esc(person.name)}</strong>
                <span>${person.age} · ${esc(person.city)}</span>
              </div>
              <button class="friend-decline" type="button" data-decline="${person.id}" aria-label="Отклонить"><i class="ti ti-x"></i></button>
              <button class="friend-add" type="button" data-accept="${person.id}">Добавить</button>
            </div>`).join('')}
        ` : ''}

        <h2 class="friends-label">Все подруги · ${friends.length}</h2>
        ${friends.map(person => `
          <div class="friend-row">
            <img src="${esc(person.photo)}" alt="">
            <div>
              <strong>${esc(person.name)}</strong>
              <span>${person.age} · ${esc(person.city)}</span>
            </div>
            <button class="friend-msg" data-action="chat" data-id="${chatIdForPerson(person.id)}" aria-label="Написать"><i class="ti ti-send"></i></button>
          </div>`).join('')}
        <button class="add-friends" type="button" data-action="people">
          <span class="add-box"><i class="ti ti-plus"></i></span>
          Добавить подруг
        </button>
      </div>`;

    view.querySelectorAll('[data-accept]').forEach(button => {
      button.onclick = () => {
        const id = Number(button.dataset.accept);
        const person = requests.find(item => item.id === id);
        requests = requests.filter(item => item.id !== id);
        if (person && !friends.some(item => item.id === id)) friends = [person, ...friends];
        toast = 'Подруга добавлена';
        render();
        setTimeout(() => {
          toast = '';
          render();
        }, 1600);
      };
    });
    view.querySelectorAll('[data-decline]').forEach(button => {
      button.onclick = () => {
        requests = requests.filter(item => item.id !== Number(button.dataset.decline));
        render();
      };
    });
    view.querySelectorAll('.friend-row img, .friend-row strong').forEach(node => {
      const row = node.closest('.friend-row');
      const person = friends.find(item => item.name === row?.querySelector('strong')?.textContent)
        || requests.find(item => item.name === row?.querySelector('strong')?.textContent);
      if (!person) return;
      node.style.cursor = 'pointer';
      node.onclick = () => navigate('person', person.id);
    });
  };
  render();
}

export function myEventsScreen() {
  clearHeader();
  let month = 'Сентябрь 2026';
  const emptyMonths = ['Июль 2026', 'Август 2026', 'Октябрь 2026', 'Ноябрь 2026'];
  const rsvpMap = getState().rsvp || {};

  const render = () => {
    const empty = month !== 'Сентябрь 2026';
    view.innerHTML = `
      <div class="me-page my-events-page">
        <div class="me-top">
          <h1>Профиль</h1>
          <div>
            <button data-action="share-profile" aria-label="Поделиться"><i class="ti ti-share-2"></i></button>
            <button data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
          </div>
        </div>
        <div class="me-tabs">
          <button data-action="me">Анкета</button>
          <button class="active">События</button>
          <button data-action="friends">Подруги</button>
        </div>
        <button class="events-month" type="button" id="cycleMyMonth">${esc(month)} <i class="ti ti-chevron-down"></i></button>
        ${empty ? `
          <div class="events-empty-month">
            <i class="ti ti-calendar-off"></i>
            <p>В этом месяце пока нет событий</p>
          </div>` : `
          <div class="my-events-list">
            ${events.map(event => {
              const mine = rsvpMap[event.id];
              const badge = mine === 'going' ? 'Иду' : mine === 'maybe' ? 'Интересно' : mine === 'later' ? 'Позже' : 'RSVP';
              return `
              <article class="my-event-card" data-action="event" data-id="${event.id}">
                <div class="event-date"><span>${esc(event.month)}</span><b>${esc(event.day)}</b></div>
                <div>
                  <strong>${esc(event.title)}</strong>
                  <span>${esc(event.when)}</span>
                  <span>${esc(event.place)}</span>
                  <div class="event-foot">
                    <span>${event.going} идут</span>
                    <em>${badge}</em>
                  </div>
                </div>
              </article>`;
            }).join('')}
          </div>`}
      </div>`;
    view.querySelector('#cycleMyMonth').onclick = () => {
      const all = ['Сентябрь 2026', ...emptyMonths];
      month = all[(all.indexOf(month) + 1) % all.length];
      render();
    };
  };
  render();
}

export function profileGroupsScreen() {
  clearHeader();
  let selected = new Set(groups.filter(group => group.joined !== false).slice(0, 2).map(group => group.id));

  const render = () => {
    view.innerHTML = `
      <div class="profile-groups-page">
        <header class="modal-head">
          <button data-action="me" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Группы в профиле</h1>
          <button class="head-action on" data-action="me">Сохранить</button>
        </header>
        <p class="loc-sub">Выберите, какие группы видят другие в вашей анкете.</p>
        <div class="profile-groups-list">
          ${groups.map(group => `
            <button type="button" class="profile-group-row ${selected.has(group.id) ? 'on' : ''}" data-toggle="${group.id}">
              <img src="${esc(group.photo)}" alt="">
              <b>${esc(group.title)}</b>
              <span class="check">${selected.has(group.id) ? '<i class="ti ti-check"></i>' : ''}</span>
            </button>`).join('')}
        </div>
      </div>`;
    view.querySelectorAll('[data-toggle]').forEach(button => {
      button.onclick = () => {
        const id = Number(button.dataset.toggle);
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        render();
      };
    });
  };
  render();
}

export function promptsScreen(idOrForce = '') {
  clearHeader();
  const saved = getState().profile?.prompts || {};
  let prompts = [
    { id: 'concert', title: 'Мой последний концерт<br>(или мечта о нём)', photo: saved.concert || null },
    { id: 'hyper', title: 'Недавняя гиперфиксация', photo: saved.hyper || null },
    { id: 'place', title: 'Любимое место в городе', photo: saved.place || null }
  ];
  if (String(idOrForce) === 'filled' || String(idOrForce) === '1') {
    prompts[0].photo = prompts[0].photo || promptPhoto;
  }

  const render = () => {
    view.innerHTML = `
      <div class="prompts-page">
        <header class="filters-head">
          <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Фото из жизни</h1>
          <span></span>
        </header>
        <p class="prompts-lead">Добавьте кадры, которые расскажут о вас — селфи не обязательны.</p>

        ${prompts.map(item => item.photo
          ? `<article class="prompt-filled-card" data-id="${item.id}">
              <img src="${esc(item.photo)}" alt="">
              <button class="prompt-edit" type="button" data-pick="${item.id}" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
            </article>`
          : `<article class="prompt-life-card" data-prompt="${item.id}">
              <button class="prompt-dismiss" type="button" data-dismiss="${item.id}" aria-label="Скрыть"><i class="ti ti-x"></i></button>
              <h2>${item.title}</h2>
              <button class="prompt-add" type="button" data-pick="${item.id}"><i class="ti ti-camera"></i>Добавить фото</button>
            </article>`
        ).join('')}

        <button class="photos-save" type="button" id="savePrompts">Сохранить</button>
      </div>`;

    view.querySelectorAll('[data-dismiss]').forEach(button => {
      button.onclick = () => {
        prompts = prompts.filter(item => item.id !== button.dataset.dismiss);
        render();
      };
    });
    view.querySelectorAll('[data-pick]').forEach(button => {
      button.onclick = () => navigate('prompt-picker', button.dataset.pick);
    });
    view.querySelector('#savePrompts').onclick = async () => {
      const map = Object.fromEntries(prompts.filter(item => item.photo).map(item => [item.id, item.photo]));
      await saveProfile({ prompts: map });
      navigate('me');
    };
  };
  render();
}

export function promptPickerScreen(id = 'food') {
  clearHeader();
  const labels = {
    concert: 'Мой последний концерт (или мечта о нём)',
    hyper: 'Недавняя гиперфиксация',
    place: 'Любимое место в городе',
    food: 'Недавние фото еды из вашей галереи'
  };
  const title = labels[id] || labels.food;
  const pool = [promptPhoto, PHOTOS.city, PHOTOS.coffee, PHOTOS.books, PHOTOS.palms, PHOTOS.event];
  let slots = [...(getState().profile?.promptSlots?.[id] || Array(6).fill(null))];
  while (slots.length < 6) slots.push(null);

  const render = () => {
    view.innerHTML = `
      <div class="prompt-picker-page">
        <header class="picker-head">
          <button data-action="prompts" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        </header>
        <div class="prompt-title-pill">
          <span>${esc(title)}</span>
          <i class="ti ti-pencil"></i>
        </div>
        <div class="prompt-pick-grid">
          ${slots.map((photo, index) => photo
            ? `<button type="button" class="pick-slot filled" data-clear="${index}">
                <img src="${esc(photo)}" alt="">
                ${index === 0 ? '<span class="pick-main">Главное</span>' : ''}
                <i class="ti ti-x clear"></i>
              </button>`
            : `<button type="button" class="pick-slot empty" data-add="${index}"><i class="ti ti-plus"></i></button>`
          ).join('')}
        </div>
        <button class="photos-save" type="button" id="savePicker">Сохранить</button>
      </div>`;

    view.querySelectorAll('[data-add]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.add);
        slots[index] = pool[index % pool.length];
        render();
      };
    });
    view.querySelectorAll('[data-clear]').forEach(button => {
      button.onclick = () => {
        slots[Number(button.dataset.clear)] = null;
        render();
      };
    });
    view.querySelector('#savePicker').onclick = async () => {
      const main = slots.find(Boolean) || null;
      const profile = getState().profile || {};
      const prompts = { ...(profile.prompts || {}), [id]: main };
      const promptSlots = { ...(profile.promptSlots || {}), [id]: slots };
      await saveProfile({ prompts, promptSlots });
      navigate('prompts');
    };
  };
  render();
}

export function cameraRollScreen() {
  clearHeader();
  view.innerHTML = `
    <div class="camera-roll-page">
      <button class="ob-back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
      <div class="roll-visual">
        <div class="roll-card back"><img src="${esc(promptPhoto)}" alt=""><span class="top">Моё любимое место</span></div>
        <div class="roll-card front"><img src="${esc(defaultProfile.photo)}" alt=""><span>Прошлые выходные</span></div>
      </div>
      <h1>Поделитесь фото<br>из галереи</h1>
      <p>Несколько кадров, которые передают ваше настроение — селфи не нужны.</p>
      <button class="ob-next on" data-action="prompts">Далее</button>
    </div>`;
}

export function basicInfoScreen() {
  clearHeader();
  const profile = { ...defaultProfile, ...(getState().profile || {}) };
  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="me" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Основное</h1>
        <button class="head-action on" data-action="edit">Изменить</button>
      </header>
      <div class="edit-basic-list padded">
        ${[
          ['Пол', profile.gender || 'Женщина'],
          ['Образование', profile.education || '—'],
          ['Работа', profile.work || '—'],
          ['Местоимения', profile.pronouns || '—'],
          ['Ориентация', profile.sexuality || '—'],
          ['Отношения', profile.relationship || '—']
        ].map(([label, value]) => `
          <div class="edit-basic-row static">
            <span>${label}</span>
            <b>${esc(value)}</b>
          </div>`).join('')}
      </div>
    </div>`;
}

export function notificationsScreen() {
  clearHeader();
  const prefs = getState().notifications || { dm: true, reactions: true };
  const mine = groups.filter(group => group.joined);

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Уведомления</h1>
        <span></span>
      </header>

      <h3 class="settings-label">Уведомления аккаунта</h3>
      <section class="settings-block">
        <label class="settings-row toggle stacked">
          <span>Личные сообщения<br><small>Получать уведомления о личных сообщениях</small></span>
          <input type="checkbox" id="notifDm" ${prefs.dm ? 'checked' : ''}>
        </label>
        <label class="settings-row toggle stacked">
          <span>Реакции в ЛС<br><small>Получать уведомления о реакциях в личных сообщениях</small></span>
          <input type="checkbox" id="notifReactions" ${prefs.reactions ? 'checked' : ''}>
        </label>
      </section>

      <h3 class="settings-label">Уведомления групп</h3>
      <section class="settings-block">
        ${mine.map(group => `
          <button class="settings-row group-notif" type="button" data-action="group-notifications" data-id="${group.id}">
            <img class="notif-avatar" src="${esc(group.photo)}" alt="">
            <span>${esc(group.title)}<br><small>Все уведомления</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>`).join('') || '<p class="settings-hint">Нет групп</p>'}
      </section>
    </div>`;

  const save = () => {
    saveState({
      ...getState(),
      notifications: {
        dm: view.querySelector('#notifDm').checked,
        reactions: view.querySelector('#notifReactions').checked
      }
    });
  };
  view.querySelector('#notifDm').onchange = save;
  view.querySelector('#notifReactions').onchange = save;
}

export async function accountScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем аккаунт...');
  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить аккаунт.');
    return;
  }
  if (!isCurrentRender(token)) return;

  const email = getState().email || '';
  const savedUser = getState().username || getState().profile?.username;
  const slug = savedUser || String(profile.name || 'yaqin')
    .toLowerCase()
    .replace(/[а-яё]/gi, char => ({
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
      к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
      х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
    }[char.toLowerCase()] || ''))
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'yaqin';
  const username = `@${slug}`;

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Мой аккаунт</h1>
        <span></span>
      </header>

      <h3 class="settings-label">Данные аккаунта</h3>
      <section class="settings-block">
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-user"></i></span>
          <div><b>Имя</b><span>${esc(profile.name)}</span></div>
          <button type="button" data-edit="name" aria-label="Изменить"><i class="ti ti-dots"></i></button>
        </div>
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-at"></i></span>
          <div><b>Имя пользователя</b><span>${esc(username)}</span></div>
          <button type="button" data-edit="username" aria-label="Изменить"><i class="ti ti-dots"></i></button>
        </div>
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-phone"></i></span>
          <div><b>Телефон</b><span>через Telegram</span></div>
          <button type="button" data-edit="phone" aria-label="Подробнее"><i class="ti ti-dots"></i></button>
        </div>
        <button class="account-row" type="button" data-action="add-email">
          <span class="settings-icon blue square"><i class="ti ti-mail"></i></span>
          <div><b>Почта</b><span class="${email ? '' : 'link'}">${email ? esc(email) : 'Добавить почту +'}</span></div>
        </button>
      </section>

      <section class="settings-block danger-block">
        <button class="settings-row" type="button" data-action="delete-account">
          <span class="settings-icon red"><i class="ti ti-trash"></i></span>
          <span>Удалить аккаунт</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>
    </div>`;

  view.querySelectorAll('[data-edit]').forEach(button => {
    button.onclick = () => showAccountFieldSheet(button.dataset.edit, profile, username);
  });
}

export function announcementsScreen() {
  clearHeader();
  const show = getState().announcements !== false;

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Новости функций</h1>
        <span></span>
      </header>
      <section class="settings-block">
        <button class="settings-row stacked-btn" type="button" data-action="announcement-latest">
          <span>Посмотреть последние анонсы<br><small>Узнайте, что нового в Yaqin</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <label class="settings-row toggle stacked">
          <span>Показывать анонсы функций<br><small>Узнавайте о новостях Yaqin при выходе новых функций</small></span>
          <input type="checkbox" id="announceToggle" ${show ? 'checked' : ''}>
        </label>
      </section>
    </div>`;

  view.querySelector('#announceToggle').onchange = event => {
    saveState({ ...getState(), announcements: event.target.checked });
  };
}

export async function shareProfileScreen(_id, token) {
  clearHeader();
  showLoading('Готовим ссылку...');
  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось открыть профиль.');
    return;
  }
  if (!isCurrentRender(token)) return;

  const link = `https://t.me/yaqin_bot?start=u_${encodeURIComponent((profile.name || 'yaqin').toLowerCase())}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(link)}`;
  const shortName = profile.name.split(' ')[0];

  view.innerHTML = `
    <div class="share-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Поделиться профилем</h1>
        <span></span>
      </header>
      <div class="share-card">
        <h2>${esc(shortName)}</h2>
        <div class="share-visual">
          <img class="share-photo" src="${esc(profile.photo)}" alt="">
          <img class="share-qr" src="${esc(qr)}" alt="QR">
        </div>
      </div>
      <div class="share-actions">
        <button type="button" class="share-primary" id="shareLink"><i class="ti ti-share-2"></i>Поделиться ссылкой</button>
        <button type="button" class="share-gear" data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
      </div>
    </div>`;

  view.querySelector('#shareLink').onclick = async () => {
    const telegram = window.Telegram?.WebApp;
    if (telegram?.openTelegramLink) {
      telegram.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Мой профиль в Yaqin')}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      view.querySelector('#shareLink').textContent = 'Ссылка скопирована';
    } catch {
      /* ignore */
    }
  };
}

export function showFeedbackSheet() {
  const shake = getState().shakeFeedback !== false;
  const overlay = mountSheet(`
    <div class="feedback-sheet">
      <div class="confirm-handle"></div>
      <h2>Как мы можем сделать Yaqin лучше?</h2>
      <textarea id="feedbackText" maxlength="500" placeholder="Напишите отзыв здесь"></textarea>
      <label class="feedback-shake">
        <span>Встряхнуть телефон, чтобы оставить отзыв</span>
        <input type="checkbox" id="shakeToggle" ${shake ? 'checked' : ''}>
      </label>
      <button class="feedback-submit" id="feedbackSubmit" disabled>Отправить</button>
      <button class="feedback-skip" data-action="close-sheet" type="button">Пропустить</button>
    </div>`);

  const area = overlay.querySelector('#feedbackText');
  const submit = overlay.querySelector('#feedbackSubmit');
  area.oninput = () => {
    const ready = area.value.trim().length > 2;
    submit.disabled = !ready;
    submit.classList.toggle('on', ready);
  };
  overlay.querySelector('#shakeToggle').onchange = event => {
    saveState({ ...getState(), shakeFeedback: event.target.checked });
  };
  submit.onclick = () => {
    if (submit.disabled) return;
    closeSettingsOverlay();
    const banner = document.createElement('div');
    banner.id = 'block-banner';
    banner.className = 'block-banner';
    banner.textContent = 'Спасибо за отзыв';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2200);
  };
}

export function showAddEmailSheet() {
  const current = getState().email || '';
  const overlay = mountSheet(`
    <div class="email-sheet">
      <div class="confirm-handle"></div>
      <header class="modal-head">
        <button data-action="close-sheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Добавить почту</h1>
        <button class="head-action" id="emailAdd" disabled>Добавить</button>
      </header>
      <input class="email-input" id="emailField" type="email" placeholder="Введите адрес почты" value="${esc(current)}">
      <p class="email-note">Добавляя почту, вы соглашаетесь получать письма от нас. Отписаться можно внизу любого письма.</p>
    </div>`);

  const field = overlay.querySelector('#emailField');
  const add = overlay.querySelector('#emailAdd');
  const sync = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
    add.disabled = !valid;
    add.classList.toggle('on', valid);
  };
  field.oninput = sync;
  sync();
  field.focus();
  add.onclick = () => {
    if (add.disabled) return;
    saveState({ ...getState(), email: field.value.trim() });
    closeSettingsOverlay();
    showEmailSentSheet();
  };
}

function showEmailSentSheet() {
  mountSheet(`
    <div class="help-sheet email-sent-sheet">
      <div class="confirm-handle"></div>
      <div class="email-sent-badge"><i class="ti ti-mail"></i><span>SENT</span></div>
      <h2>Письмо отправлено 🎉</h2>
      <p>Перейдите по ссылке в письме. После подтверждения почта появится в аккаунте.</p>
      <button class="announce-cta" id="emailGotIt">Понятно</button>
    </div>`);
  document.getElementById('emailGotIt').onclick = () => {
    closeSettingsOverlay();
    accountScreen();
  };
}

function showAccountFieldSheet(field, profile, username) {
  if (field === 'phone') {
    mountSheet(`
      <div class="help-sheet">
        <div class="confirm-handle"></div>
        <h2>Телефон</h2>
        <p>Номер приходит из Telegram Mini App и не редактируется здесь. Чтобы сменить номер, обновите его в Telegram.</p>
        <button class="announce-cta" data-action="close-sheet">Понятно</button>
      </div>`);
    return;
  }

  const isName = field === 'name';
  const title = isName ? 'Имя' : 'Имя пользователя';
  const value = isName ? (profile.name || '') : username.replace(/^@/, '');
  const overlay = mountSheet(`
    <div class="email-sheet">
      <div class="confirm-handle"></div>
      <header class="modal-head">
        <button data-action="close-sheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>${title}</h1>
        <button class="head-action on" id="fieldSave">Сохранить</button>
      </header>
      <input class="email-input" id="fieldValue" maxlength="${isName ? 40 : 24}" value="${esc(value)}" ${isName ? '' : 'spellcheck="false"'}>
      <p class="email-note">${isName ? 'Имя видно в профиле и чатах.' : 'Только латиница, цифры и _.'}</p>
    </div>`);

  const input = overlay.querySelector('#fieldValue');
  input.focus();
  input.setSelectionRange(value.length, value.length);
  overlay.querySelector('#fieldSave').onclick = async () => {
    const next = input.value.trim();
    if (!next) return;
    if (isName) {
      await saveProfile({ name: next });
    } else {
      const slug = next.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'yaqin';
      saveState({ ...getState(), username: slug, profile: { ...(getState().profile || {}), username: slug } });
    }
    closeSettingsOverlay();
    accountScreen();
  };
}

export function showDeleteAccountDialog() {
  const overlay = mountSheet(`
    <div class="delete-dialog">
      <h2>Удалить аккаунт</h2>
      <p>Группы, которые вы создали, и переписки будут удалены. Действие нельзя отменить. Чтобы подтвердить, введите «Удалить» ниже.</p>
      <input id="deleteConfirm" placeholder="Удалить" autocomplete="off">
      <div class="delete-actions">
        <button type="button" data-action="close-sheet">Отмена</button>
        <button type="button" id="deleteConfirmBtn" disabled>Удалить</button>
      </div>
    </div>`, 'settings-overlay dialog-overlay');

  const input = overlay.querySelector('#deleteConfirm');
  const button = overlay.querySelector('#deleteConfirmBtn');
  input.oninput = () => {
    const ok = input.value.trim().toLowerCase() === 'удалить';
    button.disabled = !ok;
  };
  input.focus();
  button.onclick = () => {
    if (button.disabled) return;
    closeSettingsOverlay();
    localStorage.removeItem('yaqin-demo');
    navigate('onboarding');
  };
}

export function showAnnouncementLatest() {
  mountSheet(`
    <div class="announce-sheet">
      <div class="confirm-handle"></div>
      <div class="announce-hero">
        <img src="${esc(defaultProfile.photo)}" alt="">
        <span class="bubble wave"><i class="ti ti-hand-stop"></i></span>
        <span class="bubble filters"><i class="ti ti-adjustments-horizontal"></i></span>
      </div>
      <div class="announce-body">
        <h2>Что нового в Yaqin</h2>
        <time>9 сентября 2026</time>
        <p>Смотрите, что появилось в последней версии Yaqin.</p>
        <div class="announce-feature">
          <b>🎛️ Фильтры возраста и расстояния</b>
          <p>Находите подходящих людей на вкладке «Люди». Настройки сохраняются в профиле.</p>
        </div>
        <button class="announce-cta" data-action="close-sheet">В приложение</button>
        <p class="announce-legal">Нажимая «В приложение», вы соглашаетесь с <button type="button" class="legal-inline" data-action="legal">условиями и политикой</button>.</p>
      </div>
    </div>`);
}

export function applyStoredTheme() {
  const theme = getState().theme || { dark: false, followSystem: true };
  document.documentElement.dataset.theme = theme.followSystem ? 'system' : theme.dark ? 'dark' : 'light';
}
