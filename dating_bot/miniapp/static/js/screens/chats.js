import { chats, people, PHOTOS } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { getUserGroups } from './community.js';
import { interestsOf } from '../profile-fields.js';
import { navigate } from '../router.js';

export function chatIdForPerson(personId) {
  const index = chats.findIndex(chat => chat.personId === Number(personId));
  return index >= 0 ? index : 0;
}

function avatar(photo, team = false) {
  if (team) return `<div class="chat-avatar team"><i class="ti ti-flower"></i></div>`;
  return `<div class="chat-avatar">${photo ? `<img src="${esc(photo)}">` : '✿'}</div>`;
}

export function chatsScreen() {
  clearHeader();
  const hasChats = chats.length > 0;

  view.innerHTML = `
    <div class="chats-page">
      <header class="chats-head">
        <h1>Чаты</h1>
        <button data-action="search" aria-label="Поиск"><i class="ti ti-search"></i></button>
      </header>

      ${hasChats ? `
        <h2 class="chats-section">Новые знакомства</h2>
        <div class="new-friends">
          <div class="new-friend">
            <img src="${esc(people[0].photo)}" alt="">
            <b>НОВОЕ</b>
          </div>
        </div>
        <div class="chat-list">${chats.map((chat, index) => `
          <button class="chat-row" data-action="chat" data-id="${index}">
            ${avatar(chat.photo, chat.team)}
            <div class="chat-copy">
              <strong>${esc(chat.name)}</strong>
              <span>${esc(chat.preview)} · ${esc(chat.time)}</span>
            </div>
            ${chat.unread ? '<i class="unread-dot"></i>' : ''}
          </button>`).join('')}</div>`
      : `<div class="chats-empty">
          <div class="empty-badge"><i class="ti ti-message-circle"></i></div>
          <h2>Пока нет чатов</h2>
          <p>После взаимного привета переписка появится здесь.</p>
          <button class="empty-primary" type="button" data-action="people">Смотреть анкеты</button>
        </div>`}

      <button class="compose" data-action="new-dm" aria-label="Написать"><i class="ti ti-send"></i></button>
    </div>`;
}

export function searchChatsScreen(queryOrId = '') {
  clearHeader();
  let query = typeof queryOrId === 'string' ? queryOrId : '';
  const groups = getUserGroups();

  const render = () => {
    const term = query.trim().toLowerCase();
    const dmRows = chats
      .map((chat, index) => ({ chat, index }))
      .filter(({ chat }) =>
        !term || chat.name.toLowerCase().includes(term) || chat.preview.toLowerCase().includes(term)
      );
    const groupRows = groups.filter(group =>
      !term || group.title.toLowerCase().includes(term) || (group.about || '').toLowerCase().includes(term)
    );

    view.innerHTML = `
      <div class="search-page">
        <header class="modal-head">
          <button data-action="chats" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Поиск чатов</h1>
          <span></span>
        </header>
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input id="chatSearch" placeholder="Поиск переписок..." value="${esc(query)}" autofocus>
          ${term ? '<button type="button" id="clearSearch">×</button>' : ''}
        </div>
        <div class="search-results">
          ${term
            ? `
              ${dmRows.map(({ chat, index }) => `
                <button class="chat-row" data-action="chat" data-id="${index}">
                  ${avatar(chat.photo, chat.team)}
                  <div class="chat-copy"><strong>${esc(chat.name)}</strong><span>${esc(chat.preview)} · ${esc(chat.time)}</span></div>
                </button>`).join('')}
              ${groupRows.map(group => `
                <button class="chat-row" data-action="group-chat" data-id="${esc(group.id)}">
                  ${avatar(group.photo)}
                  <div class="chat-copy"><strong>${esc(group.title)}</strong><span>Группа</span></div>
                </button>`).join('')}
              ${!dmRows.length && !groupRows.length ? '<p class="search-none">Ничего не найдено</p>' : ''}
            `
            : `<div class="chats-empty compact">
                <div class="empty-badge"><i class="ti ti-messages"></i></div>
                <h2>Поиск переписок</h2>
                <p>Введите имя или фрагмент сообщения</p>
              </div>`}
        </div>
      </div>`;

    const input = view.querySelector('#chatSearch');
    input.focus();
    input.setSelectionRange(query.length, query.length);
    input.oninput = () => {
      query = input.value;
      render();
    };
    view.querySelector('#clearSearch')?.addEventListener('click', () => {
      query = '';
      render();
    });
  };
  render();
}

/** Выбор человека → сразу открыть его чат. */
export function newDmScreen() {
  clearHeader();
  const friends = people.slice(0, 6);
  let query = '';

  const render = () => {
    const term = query.trim().toLowerCase();
    const list = friends.filter(person => !term || person.name.toLowerCase().includes(term));
    view.innerHTML = `
      <div class="new-dm-page">
        <header class="modal-head">
          <button data-action="chats" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Новое сообщение</h1>
          <span></span>
        </header>
        <h2 class="invite-title">Кому написать</h2>
        <input class="plain-search" id="dmSearch" placeholder="Поиск..." value="${esc(query)}">
        <h3 class="list-label">Знакомства</h3>
        ${list.map(person => `
          <button class="pick-row" type="button" data-open-dm="${person.id}">
            <img src="${esc(person.photo)}" alt="">
            <div>
              <strong>${esc(person.name)}</strong>
              <span>${esc(person.city)}</span>
            </div>
            <i class="ti ti-chevron-right"></i>
          </button>`).join('') || '<p class="search-none">Никого не нашли</p>'}
      </div>`;

    view.querySelector('#dmSearch').oninput = event => {
      query = event.target.value;
      render();
    };
    view.querySelectorAll('[data-open-dm]').forEach(button => {
      button.onclick = () => navigate('chat', chatIdForPerson(Number(button.dataset.openDm)));
    });
    if (query) {
      const input = view.querySelector('#dmSearch');
      input.focus();
      input.setSelectionRange(query.length, query.length);
    }
  };
  render();
}

/** ЛС MVP: текст + фото. Без GIF / голоса / файлов / reply / реакций. */
export function chatScreen(id) {
  clearHeader();
  const chatId = Number(id) || 0;
  const chat = chats[chatId];
  const messages = chat.messages || [];
  const person = people.find(item => item.id === chat.personId);
  const pills = interestsOf(person).slice(0, 3);
  const emptyPills = pills.length ? pills : ['кофе'];
  const empty = messages.length === 0;
  const ui = getChatUi(chatId);
  const hasDraft = Boolean(ui.draft.trim() || ui.attachPhoto);

  const renderMessage = message => `
    <div class="chat-bubble ${message.from === 'me' ? 'mine' : ''}">
      ${message.from === 'me' ? '' : avatar(chat.photo, chat.team)}
      <div class="bubble-body">
        <div class="bubble-head">
          <b class="${message.link ? 'accent' : ''}">${esc(message.name)}</b>
          <time>${esc(message.time)}</time>
        </div>
        ${message.text ? `<p>${message.text.split('\n').map(line => esc(line)).join('<br>')}</p>` : ''}
        ${message.image ? `<img class="bubble-image" src="${esc(message.image)}" alt="">` : ''}
        ${message.audio ? `
          <div class="audio-bubble">
            <i class="ti ti-player-play-filled"></i>
            <div>
              <span class="audio-track"></span>
              <small>Аудиосообщение</small>
            </div>
            <time>${esc(message.audio.duration || '0:10')}</time>
          </div>` : ''}
        ${message.link ? `
          <div class="link-card">
            <img src="${esc(message.link.image)}" alt="">
            <div>
              <small>${esc(message.link.domain)}</small>
              <strong>${esc(message.link.title)}</strong>
              <span>${esc(message.link.desc)}</span>
            </div>
          </div>` : ''}
      </div>
    </div>`;

  view.innerHTML = `
    <div class="chat-page">
      <header class="chat-top">
        <button class="chat-back" data-action="chats" aria-label="Назад">
          <i class="ti ti-chevron-left"></i>
        </button>
        <div class="chat-peer">
          <h1>${esc(chat.name)}</h1>
          <p>Чат</p>
        </div>
        ${chat.personId ? `<button id="chatMenuBtn" aria-label="Ещё"><i class="ti ti-dots"></i></button>` : '<span></span>'}
      </header>

      ${ui.menuOpen ? `
        <div class="chat-menu-pop">
          <button type="button" data-action="person" data-id="${chat.personId}">Смотреть профиль</button>
          <button type="button" data-action="report-flow" data-id="${chat.personId}">Пожаловаться</button>
        </div>` : ''}

      <main class="chat-thread ${empty ? 'start' : ''}">
        <img class="chat-photo" src="${esc(chat.photo || people[0].photo)}" alt="">
        <p class="chat-meta">${empty
          ? `Это начало вашей переписки · ${esc(chat.name)}`
          : `Вы познакомились · ${esc(chat.name)}`}</p>
        <div class="chat-pills">${emptyPills.map(tag => `<span class="chat-pill">${esc(tag)}</span>`).join('')}</div>
        ${messages.map(renderMessage).join('')}
      </main>

      ${ui.attachPhoto ? `
        <div class="draft-attach">
          <img src="${esc(ui.attachPhoto)}" alt="">
          <button type="button" id="clearAttach" aria-label="Убрать"><i class="ti ti-x"></i></button>
        </div>` : ''}

      <div class="message-bar">
        <button class="msg-add" id="attachPhoto" aria-label="Фото"><i class="ti ti-photo"></i></button>
        <label class="msg-field">
          <input id="msgInput" placeholder="Написать сообщение" value="${esc(ui.draft)}" maxlength="500">
        </label>
        <button class="msg-send ${hasDraft ? 'on' : ''}" id="sendMsg" aria-label="Отправить" ${hasDraft ? '' : 'disabled'}>
          <i class="ti ti-arrow-up"></i>
        </button>
      </div>
    </div>`;

  const input = view.querySelector('#msgInput');
  input?.addEventListener('input', () => {
    ui.draft = input.value;
    setChatUi(chatId, ui);
    const has = Boolean(ui.draft.trim() || ui.attachPhoto);
    const send = view.querySelector('#sendMsg');
    if (send) {
      send.disabled = !has;
      send.classList.toggle('on', has);
    }
  });

  view.querySelector('#chatMenuBtn')?.addEventListener('click', () => {
    ui.menuOpen = !ui.menuOpen;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });

  view.querySelector('#attachPhoto')?.addEventListener('click', () => {
    ui.attachPhoto = PHOTOS.city;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#clearAttach')?.addEventListener('click', () => {
    ui.attachPhoto = null;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#sendMsg')?.addEventListener('click', () => {
    if (!ui.draft.trim() && !ui.attachPhoto) return;
    chat.messages = chat.messages || [];
    chat.messages.push({
      from: 'me',
      name: 'Вы',
      text: ui.draft.trim(),
      time: 'сейчас',
      image: ui.attachPhoto || undefined
    });
    chat.preview = ui.draft.trim() || 'Фото';
    ui.draft = '';
    ui.attachPhoto = null;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });

  if (ui.draft) {
    input?.focus();
    input?.setSelectionRange(ui.draft.length, ui.draft.length);
  }
}

const chatUiState = new Map();
function getChatUi(id) {
  if (!chatUiState.has(id)) {
    chatUiState.set(id, {
      menuOpen: false,
      draft: '',
      attachPhoto: null
    });
  }
  return { ...chatUiState.get(id) };
}
function setChatUi(id, ui) {
  chatUiState.set(id, ui);
}

export function primeChatUi(id, patch = {}) {
  setChatUi(id, { ...getChatUi(id), ...patch });
  chatScreen(id);
}

/** Оставляем API для main.js — короткий sheet без реакций/reply. */
export function showMessageMenu(person, message, chatId = 0) {
  closeMessageMenu();
  const overlay = document.createElement('div');
  overlay.className = 'safety-overlay message-menu-overlay';
  overlay.innerHTML = `
    <div class="message-menu-stack">
      <div class="message-sheet">
        <button type="button" id="copyMsg">
          <span class="sheet-icon blue"><i class="ti ti-copy"></i></span>
          Скопировать текст
        </button>
        <button type="button" data-action="report-flow" data-id="${person?.id || 0}">
          <span class="sheet-icon red"><i class="ti ti-flag"></i></span>
          Пожаловаться
        </button>
      </div>
    </div>`;
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeMessageMenu();
  });
  document.body.appendChild(overlay);
  document.body.classList.add('safety-open');
  messageMenuCloser = () => {
    overlay.remove();
    document.body.classList.remove('safety-open');
    messageMenuCloser = null;
  };
  overlay.querySelector('#copyMsg').onclick = async () => {
    try {
      await navigator.clipboard.writeText(message?.text || '');
    } catch {
      /* ignore */
    }
    closeMessageMenu();
  };
  void chatId;
}

let messageMenuCloser = null;
export function closeMessageMenu() {
  messageMenuCloser?.();
}
