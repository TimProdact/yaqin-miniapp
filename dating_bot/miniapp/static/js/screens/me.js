import { defaultProfile, promptPhoto, people, PHOTOS } from '../data.js';
import { getState, saveState, clearPersistedState } from '../state.js';
import { view, esc, clearHeader, chipList, showLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { loadProfile, loadVerification, saveProfile } from '../repository.js';
import { resolveView } from './verify.js';
import { getUserEvents, getUserGroups, isGroupPublic } from './community.js';
import {
  WORK_OPTIONS,
  CHIP_SHEETS,
  interestsOf,
  lookingOf,
  mediaOf,
  basicRowsFromProfile,
  filterOptions
} from '../profile-fields.js';

let closeOverlay = null;

export const ME_TABS = [
  { id: 'me', label: 'Профиль' },
  { id: 'my-events', label: 'События' },
  { id: 'my-tickets', label: 'Билеты' },
  { id: 'my-groups', label: 'Группы' }
];

function profileFillPercent(profile) {
  const checks = [
    Boolean(profile.name),
    Boolean(profile.age),
    Boolean(profile.city),
    Boolean(profile.bio),
    Boolean((profile.photos || []).length || profile.photo),
    interestsOf(profile).length > 0,
    lookingOf(profile).length > 0,
    Boolean(profile.work || (profile.languages || []).length)
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function listTickets() {
  return [...(getState().tickets || [])].reverse();
}

export function meTopHtml() {
  return `
    <div class="me-top">
      <h1>Профиль</h1>
      <div>
        <button data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
      </div>
    </div>`;
}

export function meTabsHtml(active) {
  return `
    <div class="me-tabs" role="tablist">
      ${ME_TABS.map(tab => `
        <button type="button" class="${tab.id === active ? 'active' : ''}" data-action="${tab.id}" role="tab" aria-selected="${tab.id === active}">
          ${tab.label}
        </button>`).join('')}
    </div>`;
}

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

function sectionHead(title, action, actionLabel = 'Все') {
  return `
    <div class="me-section-head">
      <div>
        <h3>${esc(title)}</h3>
      </div>
      ${action ? `<button type="button" class="me-section-all" data-action="${esc(action)}">${esc(actionLabel)} <i class="ti ti-chevron-right"></i></button>` : ''}
    </div>`;
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

  const photos = (profile.photos?.length ? profile.photos : [profile.photo]).filter(Boolean);
  const heroPhoto = photos[0] || profile.photo;
  const verify = resolveView(verification);
  const fill = profileFillPercent(profile);
  const tickets = listTickets().slice(0, 6);
  const events = getUserEvents().slice(0, 4);
  const groups = getUserGroups().slice(0, 4);
  const privacy = getState().privacy || { showOnline: true, showInFeed: true };
  const nextTicket = tickets[0];

  view.innerHTML = `
    <div class="me-page me-overview-page">
      ${meTopHtml()}

      <section class="me-panel me-panel-identity">
        <div class="me-identity">
          <button type="button" class="me-identity-avatar" data-action="edit-photos" aria-label="Фото">
            <img src="${esc(heroPhoto)}" alt="">
            ${verify.tone === 'ok' ? '<i class="ti ti-circle-check me-verified"></i>' : ''}
          </button>
          <div class="me-identity-copy">
            <h2>${esc(profile.name || 'Без имени')}${profile.age ? `, ${esc(String(profile.age))}` : ''}</h2>
            <button type="button" class="me-identity-city" data-action="city">
              <i class="ti ti-map-pin"></i> ${esc(profile.city || 'Город')}
            </button>
            <span class="me-fill-pill">Заполнен на ${fill}%</span>
          </div>
          <button type="button" class="me-identity-edit" data-action="edit" aria-label="Редактировать">
            <i class="ti ti-pencil"></i>
          </button>
        </div>
        ${profile.bio ? `<p class="me-overview-bio">${esc(profile.bio)}</p>` : ''}
      </section>

      <section class="me-panel">
        ${sectionHead('Мои билеты', 'my-tickets')}
        ${nextTicket ? `<p class="me-block-lead">Ближайший · ${esc(nextTicket.when || '')}</p>` : ''}
        ${tickets.length ? `
          <div class="me-rail" role="list">
            ${tickets.map(ticket => `
              <button type="button" class="me-ticket-card" data-action="ticket" data-id="${esc(ticket.id)}" role="listitem">
                <div class="me-ticket-photo"><img src="${esc(ticket.photo)}" alt=""></div>
                <div class="me-ticket-body">
                  <strong>${esc(ticket.title)}</strong>
                  <span>${esc(ticket.when || '')}</span>
                  <span>${esc(ticket.place || '')}</span>
                </div>
              </button>`).join('')}
          </div>` : `
          <button type="button" class="me-empty-card" data-action="events">
            <i class="ti ti-ticket"></i>
            <span>Пока нет билетов — откройте афишу</span>
          </button>`}
      </section>

      <section class="me-panel">
        ${sectionHead('Мои события', 'my-events')}
        ${events.length ? `
          <div class="me-mini-list">
            ${events.map(event => `
              <button type="button" class="me-mini-row" data-action="event" data-id="${esc(event.id)}">
                <img src="${esc(event.photo)}" alt="">
                <div>
                  <strong>${esc(event.title)}</strong>
                  <span>${esc(event.when)} · ${esc(event.place)}</span>
                </div>
                <i class="ti ti-chevron-right"></i>
              </button>`).join('')}
          </div>` : `
          <button type="button" class="me-empty-card" data-action="create-event">
            <i class="ti ti-calendar-plus"></i>
            <span>Создать своё событие</span>
          </button>`}
      </section>

      <section class="me-panel">
        ${sectionHead('Группы', 'my-groups')}
        ${groups.length ? `
          <div class="me-mini-list">
            ${groups.map(group => `
              <button type="button" class="me-mini-row" data-action="group" data-id="${esc(group.id)}">
                <img src="${esc(group.photo)}" alt="">
                <div>
                  <strong>${esc(group.title)}</strong>
                  <span>${group.members || 1} участниц${group.membership === 'pending' ? ' · заявка' : ''}</span>
                </div>
                <i class="ti ti-chevron-right"></i>
              </button>`).join('')}
          </div>` : `
          <button type="button" class="me-empty-card" data-action="groups">
            <i class="ti ti-users"></i>
            <span>Найти или создать группу</span>
          </button>`}
      </section>

      <section class="me-panel me-panel-util">
        <div class="settings-block me-util-block">
          <label class="settings-row toggle">
            <span class="settings-icon green square"><i class="ti ti-eye"></i></span>
            <span>Показывать в ленте<br><small>Анкета появляется во вкладке «Люди»</small></span>
            <input type="checkbox" id="showInFeed" ${privacy.showInFeed !== false ? 'checked' : ''}>
          </label>
          <button class="settings-row" type="button" data-action="verify">
            <span class="settings-icon yellow square"><i class="ti ti-shield-check"></i></span>
            <span>Проверка анкеты<br><small>${esc(verify.short)}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" id="inviteFriends">
            <span class="settings-icon blue square"><i class="ti ti-user-plus"></i></span>
            <span>Пригласить подруг<br><small>Ссылка на Yaqin</small></span>
            <i class="ti ti-share"></i>
          </button>
        </div>
      </section>
    </div>`;

  view.querySelector('#showInFeed')?.addEventListener('change', event => {
    saveState({
      ...getState(),
      privacy: { ...(getState().privacy || {}), showInFeed: event.target.checked }
    });
  });
  view.querySelector('#inviteFriends')?.addEventListener('click', () => {
    const text = 'Присоединяйся ко мне в Yaqin ✨';
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/yaqin_bot')}&text=${encodeURIComponent(text)}`);
        return;
      }
    } catch (_) { /* ignore */ }
    navigator.share?.({ text }).catch(() => {});
  });
}

/** Вкладка «События» — созданные вами. */
export function myEventsScreen() {
  clearHeader();
  const events = getUserEvents();

  view.innerHTML = `
    <div class="me-page my-hub-page">
      ${meTopHtml()}
      ${meTabsHtml('my-events')}
      ${events.length ? `
        <div class="my-hub-list">
          ${events.map(event => `
            <button type="button" class="my-hub-row" data-action="event" data-id="${esc(event.id)}">
              <img src="${esc(event.photo)}" alt="">
              <div>
                <strong>${esc(event.title)}</strong>
                <span>${esc(event.when)} · ${esc(event.place)}</span>
                <span class="my-hub-tag">${event.ticketMode === 'door' || event.ticketMode === 'at_door' ? 'на входе' : event.isFree === false && event.ticketMode === 'paid' ? 'платно' : 'бесплатно'}</span>
              </div>
              <i class="ti ti-chevron-right"></i>
            </button>`).join('')}
        </div>
        <div class="me-tab-cta">
          <button type="button" class="empty-primary" data-action="create-event">Создать событие</button>
        </div>` : `
        <div class="chats-empty me-tab-empty">
          <div class="empty-badge"><i class="ti ti-calendar-event"></i></div>
          <h2>Пока нет своих событий</h2>
          <p>Создайте встречу — бесплатную или с оплатой на входе. Гости получат QR.</p>
          <button class="empty-primary" type="button" data-action="create-event">Создать событие</button>
          <button class="empty-outline" type="button" data-action="events">Смотреть афишу</button>
        </div>`}
    </div>`;
}

/** Вкладка «Группы» — ваши группы. */
export function myGroupsScreen() {
  clearHeader();
  const groups = getUserGroups();

  view.innerHTML = `
    <div class="me-page my-hub-page">
      ${meTopHtml()}
      ${meTabsHtml('my-groups')}
      ${groups.length ? `
        <div class="my-hub-list">
          ${groups.map(group => `
            <button type="button" class="my-hub-row" data-action="group" data-id="${esc(group.id)}">
              <img src="${esc(group.photo)}" alt="">
              <div>
                <strong>${esc(group.title)}${isGroupPublic(group) ? '' : ' <em class="group-privacy">закрытая</em>'}${group.membership === 'pending' ? ' <em class="group-privacy">заявка</em>' : ''}</strong>
                <span>${group.members || 1} участниц · ${esc(group.city || 'Ташкент')}</span>
              </div>
              <i class="ti ti-chevron-right"></i>
            </button>`).join('')}
        </div>
        <div class="me-tab-cta">
          <button type="button" class="empty-primary" data-action="create-group">Создать группу</button>
        </div>` : `
        <div class="chats-empty me-tab-empty">
          <div class="empty-badge yellow"><i class="ti ti-users"></i></div>
          <h2>Пока нет групп</h2>
          <p>Создайте открытую или закрытую группу либо вступите из вкладки «Группы».</p>
          <button class="empty-primary" type="button" data-action="create-group">Создать группу</button>
          <button class="empty-outline" type="button" data-action="groups">Найти группы</button>
        </div>`}
    </div>`;
}

export function settingsScreen() {
  clearHeader();
  const state = getState();
  const privacy = state.privacy || { showOnline: true };
  const profile = { ...defaultProfile, ...(state.profile || {}) };
  const email = state.email || '';
  const profileId = (state.profileId || 'yaqin-demo-local').slice(0, 36);

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        ${backControlHtml('back')}
        <h1>Настройки</h1>
        <span></span>
      </header>

      <h3 class="settings-label">Основные</h3>
      <section class="settings-block">
        <button class="settings-row" data-action="edit" type="button">
          <span class="settings-icon purple square"><i class="ti ti-user"></i></span>
          <span>Имя<br><small>${esc(profile.name || 'Добавить')}</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="edit" type="button">
          <span class="settings-icon orange square"><i class="ti ti-cake"></i></span>
          <span>Возраст<br><small>${esc(String(profile.age || 'Добавить'))}</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="city" type="button">
          <span class="settings-icon blue square"><i class="ti ti-map-pin"></i></span>
          <span>Город<br><small>${esc(profile.city || 'Выбрать')}</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="add-email" type="button">
          <span class="settings-icon green square"><i class="ti ti-mail"></i></span>
          <span>Email<br><small>${esc(email || 'Добавить')}</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="verify" type="button">
          <span class="settings-icon yellow square"><i class="ti ti-shield-check"></i></span>
          <span>Проверка анкеты</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <h3 class="settings-label">Приложение</h3>
      <section class="settings-block">
        <label class="settings-row toggle">
          <span class="settings-icon green square"><i class="ti ti-circle-filled"></i></span>
          <span>Показывать онлайн</span>
          <input type="checkbox" id="showOnline" ${privacy.showOnline !== false ? 'checked' : ''}>
        </label>
        <button class="settings-row" data-action="notifications" type="button">
          <span class="settings-icon green square"><i class="ti ti-bell"></i></span>
          <span>Уведомления</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="dark-mode" type="button">
          <span class="settings-icon purple square"><i class="ti ti-moon"></i></span>
          <span>Тема</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="blocked" type="button">
          <span class="settings-icon red square"><i class="ti ti-eye-off"></i></span>
          <span>Чёрный список</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="help" type="button">
          <span class="settings-icon blue square"><i class="ti ti-help-circle"></i></span>
          <span>FAQ</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="feedback" type="button">
          <span class="settings-icon orange square"><i class="ti ti-message-report"></i></span>
          <span>Сообщить о проблеме</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row danger" type="button" id="logoutBtn">
          <span class="settings-icon red square"><i class="ti ti-logout"></i></span>
          <span>Выйти</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <div class="settings-plain-links">
        <button type="button" data-action="legal">Политика конфиденциальности</button>
        <button type="button" data-action="legal">Пользовательское соглашение</button>
        <button type="button" data-action="delete-account" class="danger">Удалить аккаунт</button>
      </div>

      <footer class="settings-footer">
        <span class="settings-brand"><i class="ti ti-flower"></i></span>
        <p>Yaqin · v 1.0.0</p>
        <p>ID: ${esc(profileId)}</p>
      </footer>
    </div>`;

  view.querySelector('#showOnline').onchange = event => {
    saveState({
      ...getState(),
      privacy: { ...(getState().privacy || {}), showOnline: event.target.checked }
    });
  };
  view.querySelector('#logoutBtn').onclick = () => {
    saveState({ ...getState(), onboarded: false, onboardingStep: 'welcome' });
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
        ${backControlHtml('back')}
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
    ...(getState().privacy || {})
  };

  const render = () => {
    view.innerHTML = `
      <div class="settings-page">
        <header class="filters-head">
          ${backControlHtml('back')}
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
    ['events', 'События и билеты', 'Смотрите афишу, отмечайте «хочу пойти» и покупайте билет с QR прямо в Mini App.'],
    ['safety', 'Безопасность и жалобы', 'Можно пожаловаться или заблокировать прямо из профиля или чата.'],
    ['account', 'Почта и доступ', 'Добавьте email в аккаунте, чтобы не потерять доступ.']
  ];

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        ${backControlHtml('back')}
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
    ['community', 'Правила общения', 'Демо-текст: без травли, спама, фейков и непристойного контента. Жалобы рассматривает модерация.']
  ];

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        ${backControlHtml('back')}
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
        ${backControlHtml('back')}
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
    age: Number(profile.age) || 25,
    city: profile.city || 'Ташкент',
    bio: profile.bio || '',
    interests: [...interestsOf(profile)],
    looking: [...lookingOf(profile)],
    media: [...mediaOf(profile)],
    work: profile.work || '',
    languages: [...(profile.languages || [])],
    instagram: profile.instagram || '',
    tiktok: profile.tiktok || '',
    website: profile.website || ''
  };
  /** null | interests | looking | media | languages | work | text */
  let sheet = null;
  let textField = null; // { key, label, prefix?, placeholder?, mode? }
  let textDraft = '';
  let sheetQuery = '';
  let sheetHint = '';
  let notice = '';
  let restoreSearchFocus = false;

  const TEXT_FIELDS = {
    instagram: {
      key: 'instagram',
      label: 'Instagram',
      prefix: '@',
      placeholder: 'username',
      mode: 'handle'
    },
    tiktok: {
      key: 'tiktok',
      label: 'TikTok',
      prefix: '@',
      placeholder: 'username',
      mode: 'handle'
    },
    website: {
      key: 'website',
      label: 'Сайт',
      prefix: '',
      placeholder: 'https://…',
      mode: 'url'
    }
  };

  const normalizeHandle = value => String(value || '').trim().replace(/^@+/, '');
  const normalizeWebsite = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.includes('.') && !raw.includes(' ')) return `https://${raw}`;
    return raw;
  };

  const chipSheetMarkup = key => {
    const meta = CHIP_SHEETS[key];
    if (!meta) return '';
    const selected = draft[key] || [];
    const filtered = filterOptions(meta.options, sheetQuery);
    const selectedFirst = [
      ...selected.filter(item => filtered.includes(item)),
      ...filtered.filter(item => !selected.includes(item))
    ];
    return `
      <div class="edit-sheet-scrim" id="sheetScrim"></div>
      <div class="edit-sheet edit-sheet--picker" role="dialog" aria-modal="true">
        <header class="edit-sheet-head">
          <button type="button" class="edit-sheet-close" id="closeSheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <div class="edit-sheet-titles">
            <h2>${esc(meta.title)}</h2>
            <p>${selected.length ? `выбрано ${selected.length} из ${meta.max}` : esc(meta.hint)}</p>
          </div>
          <span class="edit-sheet-spacer"></span>
        </header>
        <label class="edit-sheet-search">
          <i class="ti ti-search"></i>
          <input id="sheetSearch" type="search" enterkeyhint="search" placeholder="Поиск" value="${esc(sheetQuery)}" autocomplete="off">
          ${sheetQuery ? '<button type="button" class="edit-sheet-clear" id="clearSearch" aria-label="Очистить"><i class="ti ti-x"></i></button>' : ''}
        </label>
        ${sheetHint ? `<p class="edit-sheet-hint warn">${esc(sheetHint)}</p>` : ''}
        <div class="edit-chip-picker">
          ${selectedFirst.length
            ? selectedFirst.map(item => {
                const on = selected.includes(item);
                return `<button type="button" class="pick-chip ${on ? 'on' : ''}" data-chip="${esc(item)}">${esc(item)}</button>`;
              }).join('')
            : '<p class="edit-sheet-empty">Ничего не найдено</p>'}
        </div>
        <div class="edit-sheet-foot">
          <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
        </div>
      </div>`;
  };

  const workSheetMarkup = () => {
    const filtered = filterOptions(WORK_OPTIONS, sheetQuery);
    const custom = draft.work && !WORK_OPTIONS.includes(draft.work) ? draft.work : '';
    return `
      <div class="edit-sheet-scrim" id="sheetScrim"></div>
      <div class="edit-sheet edit-sheet--picker" role="dialog" aria-modal="true">
        <header class="edit-sheet-head">
          <button type="button" class="edit-sheet-close" id="closeSheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <div class="edit-sheet-titles">
            <h2>Работа</h2>
            <p>${draft.work ? esc(draft.work) : 'Выберите или напишите своё'}</p>
          </div>
          <span class="edit-sheet-spacer"></span>
        </header>
        <label class="edit-sheet-search">
          <i class="ti ti-search"></i>
          <input id="sheetSearch" type="search" enterkeyhint="search" placeholder="Поиск или своя должность" value="${esc(sheetQuery)}" autocomplete="off">
          ${sheetQuery ? '<button type="button" class="edit-sheet-clear" id="clearSearch" aria-label="Очистить"><i class="ti ti-x"></i></button>' : ''}
        </label>
        <div class="edit-chip-picker">
          ${filtered.map(item => `
            <button type="button" class="pick-chip ${draft.work === item ? 'on' : ''}" data-work="${esc(item)}">${esc(item)}</button>
          `).join('')}
        </div>
        <div class="edit-work-custom">
          <span>Своё значение</span>
          <input id="workCustom" type="text" maxlength="48" value="${esc(custom || (sheetQuery && !filtered.length ? sheetQuery : ''))}" placeholder="Например: продюсер" autocomplete="off">
        </div>
        <div class="edit-sheet-foot">
          ${draft.work ? '<button type="button" class="edit-sheet-clear-field" id="clearWork">Очистить</button>' : ''}
          <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
        </div>
      </div>`;
  };

  const textSheetMarkup = () => {
    if (!textField) return '';
    return `
      <div class="edit-sheet-scrim" id="sheetScrim"></div>
      <div class="edit-sheet edit-sheet--text" role="dialog" aria-modal="true">
        <header class="edit-sheet-head">
          <button type="button" class="edit-sheet-close" id="closeSheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <div class="edit-sheet-titles">
            <h2>${esc(textField.label)}</h2>
            <p>только в Yaqin</p>
          </div>
          <span class="edit-sheet-spacer"></span>
        </header>
        <label class="edit-text-wrap ${textField.prefix ? 'has-prefix' : ''}">
          ${textField.prefix ? `<span class="edit-text-prefix">${esc(textField.prefix)}</span>` : ''}
          <input class="edit-text-input" id="fieldInput" type="${textField.mode === 'url' ? 'url' : 'text'}" maxlength="80" value="${esc(textDraft)}" placeholder="${esc(textField.placeholder || textField.label)}" autocomplete="off" autocapitalize="off" spellcheck="false">
        </label>
        <div class="edit-sheet-foot">
          ${textDraft ? '<button type="button" class="edit-sheet-clear-field" id="clearText">Очистить</button>' : ''}
          <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
        </div>
      </div>`;
  };

  const render = () => {
    document.body.classList.toggle('edit-sheet-open', Boolean(sheet));
    const sheetHtml = CHIP_SHEETS[sheet]
      ? chipSheetMarkup(sheet)
      : sheet === 'work'
        ? workSheetMarkup()
        : sheet === 'text'
          ? textSheetMarkup()
          : '';

    view.innerHTML = `
      <div class="edit-profile-page">
        <div class="edit-hero">
          <img src="${esc(profile.photo || profile.photos?.[0] || promptPhoto)}" alt="">
          ${hasTelegramBack() ? '<span class="head-spacer"></span>' : '<button class="edit-back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>'}
          <button type="button" class="edit-done" id="saveEdit">Готово</button>
          <div class="me-dots"><span class="on"></span><span></span></div>
          <button type="button" class="edit-photos-fab" data-action="edit-photos" aria-label="Фото"><i class="ti ti-pencil"></i></button>
        </div>
        <section class="edit-card">
          ${notice ? `<p class="edit-notice">${esc(notice)}</p>` : ''}
          <div class="edit-identity">
            <input class="edit-name" id="profileName" maxlength="40" value="${esc(draft.name)}" placeholder="Имя" autocomplete="off">
            <p>
              <input class="edit-age" id="profileAge" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="${esc(String(draft.age))}" aria-label="Возраст">
              ·
              <span class="edit-city-static">${esc(draft.city || 'Ташкент')}</span>
            </p>
          </div>
          <textarea class="edit-motto" id="profileAbout" maxlength="120" placeholder="короткий девиз" rows="2">${esc(draft.bio)}</textarea>

          <h3 class="settings-label">О себе</h3>
          <div class="me-box">
            <button type="button" class="edit-block-head" data-sheet="interests">
              <h4>Интересы</h4><i class="ti ti-pencil"></i>
            </button>
            <button type="button" class="edit-chips-hit" data-sheet="interests">
              <div class="big-chips">${draft.interests.length ? chipList(draft.interests) : '<span class="chip-empty">Добавить</span>'}</div>
            </button>
            <button type="button" class="edit-block-head" data-sheet="looking">
              <h4>Чего хочу</h4><i class="ti ti-pencil"></i>
            </button>
            <button type="button" class="edit-chips-hit" data-sheet="looking">
              <div class="big-chips">${draft.looking.length ? chipList(draft.looking) : '<span class="chip-empty">Добавить</span>'}</div>
            </button>
            <button type="button" class="edit-block-head" data-sheet="media">
              <h4>Сейчас смотрю / читаю</h4><i class="ti ti-pencil"></i>
            </button>
            <button type="button" class="edit-chips-hit" data-sheet="media">
              <div class="big-chips">${draft.media.length ? chipList(draft.media) : '<span class="chip-empty">Добавить</span>'}</div>
            </button>
          </div>

          <h3 class="settings-label">Основное</h3>
          <div class="edit-basic-list">
            ${[
              ['work', 'Работа', draft.work || 'Добавить'],
              ['languages', 'Языки', draft.languages.length ? draft.languages.join(', ') : 'Добавить']
            ].map(([key, label, value]) => `
              <button type="button" class="edit-basic-row" data-field="${key}">
                <span>${label}</span>
                <b class="${value === 'Добавить' ? 'muted' : ''}">${esc(value)} <i class="ti ti-plus"></i></b>
              </button>`).join('')}
          </div>

          <h3 class="settings-label">Ссылки <small style="font-weight:500;opacity:.55">только в Yaqin</small></h3>
          <div class="edit-basic-list">
            ${[
              ['instagram', 'Instagram', draft.instagram ? `@${draft.instagram}` : 'Добавить'],
              ['tiktok', 'TikTok', draft.tiktok ? `@${draft.tiktok}` : 'Добавить'],
              ['website', 'Сайт', draft.website || 'Добавить']
            ].map(([key, label, value]) => `
              <button type="button" class="edit-basic-row" data-field="${key}">
                <span>${label}</span>
                <b class="${value === 'Добавить' ? 'muted' : ''}">${esc(value)} <i class="ti ti-plus"></i></b>
              </button>`).join('')}
          </div>
        </section>

        ${sheetHtml}
      </div>`;

    const syncDraft = () => {
      draft.name = view.querySelector('#profileName')?.value || '';
      const ageRaw = String(view.querySelector('#profileAge')?.value || '').replace(/\D/g, '');
      const ageNum = Number(ageRaw);
      if (Number.isFinite(ageNum) && ageNum > 0) draft.age = ageNum;
      draft.bio = view.querySelector('#profileAbout')?.value || '';
    };

    const openSheet = next => {
      syncDraft();
      notice = '';
      sheetHint = '';
      sheetQuery = '';
      sheet = next;
      render();
    };

    const commitTextSheet = () => {
      if (sheet !== 'text' || !textField) return;
      const input = view.querySelector('#fieldInput');
      const raw = input ? input.value : textDraft;
      if (textField.mode === 'handle') draft[textField.key] = normalizeHandle(raw);
      else if (textField.mode === 'url') draft[textField.key] = normalizeWebsite(raw);
      else draft[textField.key] = String(raw || '').trim();
      textField = null;
      textDraft = '';
    };

    const commitWorkSheet = () => {
      if (sheet !== 'work') return;
      const custom = view.querySelector('#workCustom')?.value?.trim() || '';
      if (custom) draft.work = custom;
    };

    const closeSheet = () => {
      commitTextSheet();
      commitWorkSheet();
      sheet = null;
      sheetQuery = '';
      sheetHint = '';
      render();
    };

    view.querySelectorAll('[data-sheet]').forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        openSheet(button.dataset.sheet);
      };
    });
    view.querySelector('#sheetScrim')?.addEventListener('click', closeSheet);
    view.querySelector('#closeSheet')?.addEventListener('click', closeSheet);
    view.querySelector('#doneSheet')?.addEventListener('click', closeSheet);

    const search = view.querySelector('#sheetSearch');
    if (search) {
      if (restoreSearchFocus) {
        search.focus();
        const len = search.value.length;
        search.setSelectionRange(len, len);
        restoreSearchFocus = false;
      }
      search.oninput = () => {
        sheetQuery = search.value;
        restoreSearchFocus = true;
        render();
      };
    }
    view.querySelector('#clearSearch')?.addEventListener('click', () => {
      sheetQuery = '';
      restoreSearchFocus = true;
      render();
    });

    view.querySelectorAll('[data-chip]').forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        const value = button.dataset.chip;
        const meta = CHIP_SHEETS[sheet];
        const list = draft[sheet];
        if (!meta || !list) return;
        const index = list.indexOf(value);
        if (index >= 0) {
          list.splice(index, 1);
          sheetHint = '';
        } else if (list.length >= meta.max) {
          sheetHint = `Можно выбрать максимум ${meta.max}`;
        } else {
          list.push(value);
          sheetHint = '';
        }
        restoreSearchFocus = Boolean(sheetQuery);
        render();
      };
    });

    view.querySelectorAll('[data-work]').forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        const value = button.dataset.work;
        draft.work = draft.work === value ? '' : value;
        const custom = view.querySelector('#workCustom');
        if (custom) custom.value = '';
        render();
      };
    });
    view.querySelector('#clearWork')?.addEventListener('click', () => {
      draft.work = '';
      sheetQuery = '';
      render();
    });
    const workCustom = view.querySelector('#workCustom');
    if (workCustom) {
      workCustom.oninput = () => {
        const value = workCustom.value.trim();
        if (value) draft.work = value;
      };
      workCustom.onkeydown = event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          closeSheet();
        }
      };
    }

    view.querySelectorAll('[data-field]').forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        syncDraft();
        const key = button.dataset.field;
        if (key === 'languages') {
          openSheet('languages');
          return;
        }
        if (key === 'work') {
          openSheet('work');
          return;
        }
        const meta = TEXT_FIELDS[key];
        if (!meta) return;
        textField = meta;
        textDraft = draft[key] || '';
        openSheet('text');
      };
    });

    const fieldInput = view.querySelector('#fieldInput');
    if (fieldInput) {
      fieldInput.focus();
      fieldInput.setSelectionRange(textDraft.length, textDraft.length);
      fieldInput.oninput = () => {
        textDraft = fieldInput.value;
      };
      fieldInput.onkeydown = event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          closeSheet();
        }
      };
    }
    view.querySelector('#clearText')?.addEventListener('click', () => {
      textDraft = '';
      draft[textField.key] = '';
      render();
    });

    view.querySelector('#saveEdit').onclick = async event => {
      event.preventDefault();
      event.stopPropagation();
      if (sheet) closeSheet();
      syncDraft();
      const ageOk = Number.isFinite(draft.age) && draft.age >= 18 && draft.age <= 100;
      if (!draft.name.trim() || !ageOk) {
        notice = 'Проверьте имя и возраст (от 18 до 100).';
        render();
        return;
      }
      const button = view.querySelector('#saveEdit');
      if (button) {
        button.disabled = true;
        button.textContent = '…';
      }
      try {
        await saveProfile({
          ...profile,
          name: draft.name.trim(),
          age: Math.round(draft.age),
          city: draft.city,
          about: draft.bio.trim(),
          bio: draft.bio.trim(),
          interests: draft.interests,
          looking: draft.looking,
          media: draft.media,
          work: draft.work,
          languages: draft.languages,
          instagram: normalizeHandle(draft.instagram),
          tiktok: normalizeHandle(draft.tiktok),
          website: normalizeWebsite(draft.website),
          photo: profile.photo,
          photos: profile.photos
        });
        document.body.classList.remove('edit-sheet-open');
        navigate('me');
      } catch {
        notice = 'Анкета не сохранилась. Попробуйте ещё раз.';
        render();
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
          ${backControlHtml('edit')}
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

export function basicInfoScreen() {
  clearHeader();
  const profile = { ...defaultProfile, ...(getState().profile || {}) };
  const rows = basicRowsFromProfile(profile);
  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        ${backControlHtml('me')}
        <h1>Основное</h1>
        <button class="head-action on" data-action="edit">Изменить</button>
      </header>
      <div class="edit-basic-list padded">
        ${(rows.length ? rows : [{ label: 'Пока пусто', value: 'Заполните в редактировании' }]).map(row => `
          <div class="edit-basic-row static">
            <span>${esc(row.label)}</span>
            <b>${esc(row.value)}</b>
          </div>`).join('')}
      </div>
    </div>`;
}

export function notificationsScreen() {
  clearHeader();
  const prefs = getState().notifications || { dm: true, reactions: true, events: true, tickets: true };

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        ${backControlHtml('back')}
        <h1>Уведомления</h1>
        <span></span>
      </header>

      <h3 class="settings-label">Знакомства</h3>
      <section class="settings-block">
        <label class="settings-row toggle stacked">
          <span>Личные сообщения<br><small>Новые сообщения после взаимного привета</small></span>
          <input type="checkbox" id="notifDm" ${prefs.dm !== false ? 'checked' : ''}>
        </label>
        <label class="settings-row toggle stacked">
          <span>Реакции в ЛС<br><small>Реакции на ваши сообщения</small></span>
          <input type="checkbox" id="notifReactions" ${prefs.reactions !== false ? 'checked' : ''}>
        </label>
      </section>

      <h3 class="settings-label">События</h3>
      <section class="settings-block">
        <label class="settings-row toggle stacked">
          <span>Интересные события<br><small>«Хочу пойти» и ответы в «Кто идёт»</small></span>
          <input type="checkbox" id="notifEvents" ${prefs.events !== false ? 'checked' : ''}>
        </label>
        <label class="settings-row toggle stacked">
          <span>Билеты<br><small>Напоминания о купленных билетах и QR</small></span>
          <input type="checkbox" id="notifTickets" ${prefs.tickets !== false ? 'checked' : ''}>
        </label>
      </section>
    </div>`;

  const save = () => {
    saveState({
      ...getState(),
      notifications: {
        dm: view.querySelector('#notifDm').checked,
        reactions: view.querySelector('#notifReactions').checked,
        events: view.querySelector('#notifEvents').checked,
        tickets: view.querySelector('#notifTickets').checked
      }
    });
  };
  view.querySelector('#notifDm').onchange = save;
  view.querySelector('#notifReactions').onchange = save;
  view.querySelector('#notifEvents').onchange = save;
  view.querySelector('#notifTickets').onchange = save;
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
        ${backControlHtml('back')}
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
      <p>Анкета, чаты и билеты в демо будут удалены. Действие нельзя отменить. Чтобы подтвердить, введите «Удалить» ниже.</p>
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
    clearPersistedState();
    navigate('onboarding');
  };
}

export function applyStoredTheme() {
  const theme = getState().theme || { dark: false, followSystem: true };
  document.documentElement.dataset.theme = theme.followSystem ? 'system' : theme.dark ? 'dark' : 'light';
}
