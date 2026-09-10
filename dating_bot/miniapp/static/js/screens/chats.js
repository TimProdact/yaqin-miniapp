import { people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { listAllGroups, allEvents } from './community.js';
import { interestsOf } from '../profile-fields.js';
import { navigate } from '../router.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { getState } from '../state.js';
import {
  listVisibleChats,
  getChatByIndex,
  chatIndexForPerson,
  matchedPeople,
  appendChatMessage,
  markChatRead,
  unreadChatCount
} from '../match.js';

/** @deprecated use chatIndexForPerson — оставлено для совместимости импортов */
export function chatIdForPerson(personId) {
  const index = chatIndexForPerson(personId);
  return index >= 0 ? index : 0;
}

function avatar(photo, team = false) {
  if (team) return `<div class="chat-avatar team"><i class="ti ti-flower"></i></div>`;
  return `<div class="chat-avatar">${photo ? `<img src="${esc(photo)}">` : '✿'}</div>`;
}

function syncChatsBadge() {
  const badge = document.querySelector('.nav button[data-tab="chats"] .badge');
  if (!badge) return;
  const count = unreadChatCount();
  badge.hidden = count < 1;
  badge.textContent = String(count);
}

export function chatsScreen() {
  clearHeader();
  let segment = 'all'; // all | dm | groups | events
  syncChatsBadge();

  const buildRows = () => {
    const chats = listVisibleChats();
    const dmItems = chats.map((chat, index) => ({
      kind: chat.team ? 'team' : 'dm',
      key: `c-${index}`,
      action: 'chat',
      id: index,
      name: chat.name,
      preview: chat.preview || '',
      time: chat.time || '',
      photo: chat.photo,
      team: Boolean(chat.team),
      unread: Boolean(chat.unread)
    }));
    const groupItems = listAllGroups().map(group => {
      const last = group.messages?.[group.messages.length - 1];
      return {
        kind: 'group',
        key: `g-${group.id}`,
        action: 'group',
        id: group.id,
        name: group.title,
        preview: last?.text || group.about || 'Группа',
        time: last?.time || '',
        photo: group.photo,
        unread: false
      };
    });
    const interested = getState().eventInterest || {};
    const going = getState().eventGoing || {};
    const eventItems = allEvents()
      .filter(event => interested[event.id] || interested[String(event.id)] || going[event.id])
      .map(event => ({
        kind: 'event',
        key: `e-${event.id}`,
        action: 'event',
        id: event.id,
        name: event.title,
        preview: event.when || 'Событие',
        time: '',
        photo: event.photo,
        unread: false
      }));

    let rows = [];
    if (segment === 'all') rows = [...dmItems, ...groupItems];
    else if (segment === 'dm') rows = dmItems.filter(item => item.kind === 'dm' || item.kind === 'team');
    else if (segment === 'groups') rows = groupItems;
    else if (segment === 'events') rows = eventItems;

    return { rows, dmCount: dmItems.filter(i => i.kind === 'dm').length, hasAny: dmItems.length + groupItems.length > 0 };
  };

  const render = () => {
    const { rows, dmCount, hasAny } = buildRows();
    const pills = [
      ['all', 'Все'],
      ['dm', 'Знакомства'],
      ['groups', 'Группы'],
      ['events', 'События']
    ];

    view.innerHTML = `
      <div class="chats-page">
        <header class="chats-head">
          <h1>Чаты</h1>
          <button data-action="search" aria-label="Поиск"><i class="ti ti-search"></i></button>
        </header>

        <div class="chats-pills" role="tablist">
          ${pills.map(([id, label]) => `
            <button type="button" class="${segment === id ? 'on' : ''}" data-segment="${id}">${label}</button>
          `).join('')}
        </div>

        ${rows.length ? `
          <div class="chat-list">${rows.map(row => `
            <button class="chat-row" data-action="${row.action}" data-id="${esc(row.id)}">
              ${row.kind === 'group' || row.kind === 'event'
                ? `<div class="chat-avatar"><img src="${esc(row.photo)}" alt=""></div>`
                : avatar(row.photo, row.team)}
              <div class="chat-copy">
                <strong>${esc(row.name)}</strong>
                <span>${esc(row.preview)}${row.time ? ` · ${esc(row.time)}` : ''}</span>
              </div>
              ${row.unread ? '<i class="unread-dot"></i>' : ''}
              ${row.kind === 'group' ? '<em class="chat-kind">группа</em>' : ''}
              ${row.kind === 'event' ? '<em class="chat-kind">событие</em>' : ''}
            </button>`).join('')}</div>` : `
          <div class="chats-empty compact">
            <div class="empty-badge"><i class="ti ti-message-circle"></i></div>
            <h2>${segment === 'events' ? 'Пока нет событий' : 'Пока нет переписок'}</h2>
            <p>${segment === 'events'
              ? 'События появятся после интереса на афише.'
              : 'Чат откроется при взаимном привете.'}</p>
            <button class="empty-primary" type="button" data-action="${segment === 'events' ? 'events' : 'people'}">${segment === 'events' ? 'К событиям' : 'Смотреть анкеты'}</button>
          </div>`}

      </div>`;

    view.querySelectorAll('[data-segment]').forEach(button => {
      button.onclick = () => {
        segment = button.dataset.segment;
        render();
      };
    });
  };

  render();
}

export function searchChatsScreen(queryOrId = '') {
  clearHeader();
  let query = typeof queryOrId === 'string' ? queryOrId : '';
  const groups = listAllGroups();

  const render = () => {
    const term = query.trim().toLowerCase();
    const chats = listVisibleChats();
    const dmRows = chats
      .map((chat, index) => ({ chat, index }))
      .filter(({ chat }) =>
        !term || chat.name.toLowerCase().includes(term) || (chat.preview || '').toLowerCase().includes(term)
      );
    const groupRows = groups.filter(group =>
      !term || group.title.toLowerCase().includes(term) || (group.about || '').toLowerCase().includes(term)
    );

    view.innerHTML = `
      <div class="search-page">
        <header class="modal-head">
          ${backControlHtml('chats')}
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
                  <div class="chat-copy"><strong>${esc(chat.name)}</strong><span>${esc(chat.preview)}</span></div>
                </button>`).join('')}
              ${groupRows.map(group => `
                <button class="chat-row" data-action="group" data-id="${esc(group.id)}">
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

/** Только мэтчи — без взаимного привета писать нельзя. */
export function newDmScreen() {
  clearHeader();
  const friends = matchedPeople();
  let query = '';

  const render = () => {
    const term = query.trim().toLowerCase();
    const list = friends.filter(person => !term || person.name.toLowerCase().includes(term));
    view.innerHTML = `
      <div class="new-dm-page">
        <header class="modal-head">
          ${backControlHtml('chats')}
          <h1>Написать</h1>
          <span></span>
        </header>
        <h2 class="invite-title">Взаимные приветы</h2>
        <input class="plain-search" id="dmSearch" placeholder="Поиск..." value="${esc(query)}">
        ${list.length
          ? list.map(person => `
            <button class="pick-row" type="button" data-open-dm="${person.id}">
              <img src="${esc(person.photo)}" alt="">
              <div>
                <strong>${esc(person.name)}</strong>
                <span>${esc(person.city)}</span>
              </div>
              <i class="ti ti-chevron-right"></i>
            </button>`).join('')
          : `<div class="chats-empty compact">
              <p class="search-none">Пока нет взаимных приветов. Сначала помашите в «Люди».</p>
              <button class="empty-primary" type="button" data-action="people">К анкетам</button>
            </div>`}
      </div>`;

    view.querySelector('#dmSearch')?.addEventListener('input', event => {
      query = event.target.value;
      render();
    });
    view.querySelectorAll('[data-open-dm]').forEach(button => {
      button.onclick = () => {
        const index = chatIndexForPerson(Number(button.dataset.openDm));
        if (index >= 0) navigate('chat', index);
      };
    });
  };
  render();
}

export function chatScreen(id) {
  clearHeader();
  const chatId = Number(id);
  const chat = getChatByIndex(chatId);
  if (!chat) {
    navigate('chats');
    return;
  }

  if (chat.personId) markChatRead(chat.personId);
  syncChatsBadge();

  const messages = chat.messages || [];
  const person = people.find(item => item.id === chat.personId);
  const pills = interestsOf(person).slice(0, 3);
  const emptyPills = pills.length ? pills : ['кофе'];
  const empty = messages.length === 0;
  const ui = getChatUi(chatId);
  const hasDraft = Boolean(ui.draft.trim() || ui.attachPhoto);

  const renderMessage = message => {
    const mine = message.from === 'me';
    return `
    <div class="chat-bubble ${mine ? 'mine' : ''}">
      ${mine ? '' : avatar(chat.photo, chat.team)}
      <div class="bubble-body">
        <div class="bubble-head">
          <b>${esc(mine ? 'Вы' : message.name)}</b>
          <time>${esc(message.time)}</time>
        </div>
        ${message.replyTo ? `<div class="bubble-reply"><small>В ответ</small><span>${esc(message.replyTo)}</span></div>` : ''}
        ${message.text ? `<p>${message.text.split('\n').map(line => esc(line)).join('<br>')}</p>` : ''}
        ${message.image ? `<img class="bubble-image" src="${esc(message.image)}" alt="">` : ''}
        ${message.link ? `
          <a class="link-card" href="${esc(message.link.url)}" target="_blank" rel="noopener">
            ${message.link.image ? `<img src="${esc(message.link.image)}" alt="">` : ''}
            <div>
              <small>${esc(message.link.domain || '')}</small>
              <strong>${esc(message.link.title || '')}</strong>
              ${message.link.desc ? `<span>${esc(message.link.desc)}</span>` : ''}
            </div>
          </a>` : ''}
        ${message.audio ? `
          <div class="audio-bubble" role="group" aria-label="Голосовое">
            <i class="ti ti-player-play-filled"></i>
            <div>
              <span class="audio-track"></span>
              <small>${esc(message.audio.duration || '0:00')}</small>
            </div>
            <time>${esc(message.time)}</time>
          </div>` : ''}
        ${message.reaction ? `
          <div class="bubble-reactions">
            <span>${esc(message.reaction)}</span>
          </div>` : ''}
      </div>
    </div>`;
  };

  const peerOnline = Boolean(person?.online ?? true);
  const peerStatus = peerOnline
    ? '<p class="chat-peer-status on"><i aria-hidden="true"></i>в сети</p>'
    : '<p class="chat-peer-status">была недавно</p>';
  const peerPhoto = chat.photo || person?.photo || people[0].photo;

  view.innerHTML = `
    <div class="chat-page">
      <header class="chat-top">
        ${hasTelegramBack()
          ? ''
          : '<button type="button" class="chat-back" data-action="chats" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>'}
        ${chat.personId
          ? `<button type="button" class="chat-peer chat-peer-btn" data-action="person" data-id="${esc(chat.personId)}">
              <img class="chat-peer-photo" src="${esc(peerPhoto)}" alt="">
              <span class="chat-peer-copy">
                <h1>${esc(chat.name)}</h1>
                ${peerStatus}
              </span>
            </button>`
          : `<div class="chat-peer">
              <img class="chat-peer-photo" src="${esc(peerPhoto)}" alt="">
              <span class="chat-peer-copy">
                <h1>${esc(chat.name)}</h1>
                ${chat.team ? '<p>Команда Yaqin</p>' : '<p>Чат</p>'}
              </span>
            </div>`}
        ${chat.personId
          ? '<button type="button" id="chatMenuBtn" aria-label="Ещё"><i class="ti ti-dots"></i></button>'
          : '<span class="head-spacer" aria-hidden="true"></span>'}
      </header>

      ${ui.menuOpen && chat.personId ? `
        <div class="chat-menu-pop">
          <button type="button" data-action="person" data-id="${chat.personId}">Смотреть профиль</button>
          <button type="button" data-action="report-flow" data-id="${chat.personId}">Пожаловаться</button>
        </div>` : ''}

      <main class="chat-thread ${empty ? 'start' : ''}">
        ${chat.team ? '' : `
          <section class="chat-intro me-panel">
            <img class="chat-photo" src="${esc(chat.photo || people[0].photo)}" alt="">
            <p class="chat-meta">${empty
              ? `Это начало вашей переписки · ${esc(chat.name)}`
              : `Вы познакомились · ${esc(chat.name)}`}</p>
            <div class="chat-pills">${emptyPills.map(tag => `<span class="chat-pill">${esc(tag)}</span>`).join('')}</div>
          </section>`}
        ${messages.map(renderMessage).join('')}
      </main>

      ${ui.attachPhoto ? `
        <div class="draft-attach">
          <img src="${esc(ui.attachPhoto)}" alt="">
          <button type="button" id="clearAttach" aria-label="Убрать"><i class="ti ti-x"></i></button>
        </div>` : ''}
      <div class="message-bar">
        <button class="msg-add" id="attachPhoto" aria-label="Фото"><i class="ti ti-photo"></i></button>
        <input type="file" id="attachFile" accept="image/jpeg,image/png,image/webp" hidden>
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
    view.querySelector('#attachFile')?.click();
  });
  view.querySelector('#attachFile')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const okType = /^(image\/jpeg|image\/png|image\/webp)$/i.test(file.type)
      || /\.(jpe?g|png|webp)$/i.test(file.name || '');
    if (!okType) {
      window.Telegram?.WebApp?.showAlert?.('Можно только фото: JPG, PNG или WebP')
        || window.alert('Можно только фото: JPG, PNG или WebP');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      ui.attachPhoto = String(reader.result || '');
      setChatUi(chatId, ui);
      chatScreen(chatId);
    };
    reader.readAsDataURL(file);
  });
  view.querySelector('#clearAttach')?.addEventListener('click', () => {
    ui.attachPhoto = null;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#sendMsg')?.addEventListener('click', () => {
    if (!ui.draft.trim() && !ui.attachPhoto) return;
    appendChatMessage(chat.team ? 'team' : chat.personId, {
      from: 'me',
      name: 'Вы',
      text: ui.draft.trim(),
      time: 'сейчас',
      image: ui.attachPhoto || undefined
    });
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
