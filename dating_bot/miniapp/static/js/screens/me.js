import { defaultProfile, groups, promptPhoto, people } from '../data.js';
import { getState, saveState } from '../state.js';
import { view, esc, setBackTitle, clearHeader, chipList, showLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender } from '../router.js';
import { loadMatches, loadProfile, loadVerification } from '../repository.js';
import { resolveView } from './verify.js';

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
        <button class="settings-row" type="button">
          <span class="settings-icon purple"><i class="ti ti-help-circle"></i></span>
          <span>Справка</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="feedback" type="button">
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
          <button class="settings-row group-notif" type="button">
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
  const slug = String(profile.name || 'yaqin')
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
          <button type="button" aria-label="Ещё"><i class="ti ti-dots"></i></button>
        </div>
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-at"></i></span>
          <div><b>Имя пользователя</b><span>${esc(username)}</span></div>
          <button type="button" aria-label="Ещё"><i class="ti ti-dots"></i></button>
        </div>
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-phone"></i></span>
          <div><b>Телефон</b><span>через Telegram</span></div>
          <button type="button" aria-label="Ещё"><i class="ti ti-dots"></i></button>
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
        <p class="announce-legal">Нажимая «В приложение», вы соглашаетесь с <u>условиями и политикой</u>.</p>
      </div>
    </div>`);
}

export function applyStoredTheme() {
  const theme = getState().theme || { dark: false, followSystem: true };
  document.documentElement.dataset.theme = theme.followSystem ? 'system' : theme.dark ? 'dark' : 'light';
}
