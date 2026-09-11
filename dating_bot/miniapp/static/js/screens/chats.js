import { people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { listAllGroups, allEvents } from './community.js';
import { interestsOf } from '../profile-fields.js';
import { navigate } from '../router.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { getState } from '../state.js';
import {
  bindComposerAttach,
  composerShellHtml,
  hasComposerPayload,
  shareBubbleHtml
} from '../chat-composer.js';
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

function chatPreviewText(chat) {
  const raw = (chat.preview || '').trim();
  if (!raw) return chat.team ? 'Сообщения от команды' : 'Начните переписку';
  if (raw === 'Вы познакомились') return 'Вы познакомились · напишите первой';
  return raw;
}

function groupListPreview(group) {
  const messages = group.messages || [];
  const last = messages[messages.length - 1];
  if (!last) return 'Напишите первой';
  if (last.image && !last.text) return last.from === 'me' ? 'Вы: фото' : 'Фото';
  if (last.share) return last.from === 'me' ? 'Вы: вложение' : 'Вложение';
  const text = String(last.text || '').trim();
  if (!text || /^группа создана/i.test(text)) {
    return messages.length <= 1 ? 'Напишите первой' : 'Нет текста';
  }
  if (last.from === 'me') return `Вы: ${text}`;
  return last.name ? `${last.name}: ${text}` : text;
}

function eventListPreview(event) {
  const parts = [event.when, event.place].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Событие в Yaqin';
}

function sortChatRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    return 0;
  });
}

function chatRowHtml(row, { showKind = false } = {}) {
  const media = row.kind === 'group' || row.kind === 'event'
    ? `<div class="content-thumb chat-content-thumb"><img src="${esc(row.photo)}" alt=""></div>`
    : avatar(row.photo, row.team);
  const kindLabel = showKind && row.kind === 'group'
    ? '<em class="chat-kind-inline">группа</em>'
    : showKind && row.kind === 'event'
      ? '<em class="chat-kind-inline">событие</em>'
      : '';
  return `
    <button class="chat-row${row.unread ? ' unread' : ''}${row.pinned ? ' pinned' : ''}" data-action="${row.action}" data-id="${esc(row.id)}">
      ${media}
      <div class="chat-copy">
        <div class="chat-copy-top">
          <strong>${esc(row.name)}</strong>
          ${kindLabel}
        </div>
        <span>${esc(row.preview)}</span>
      </div>
      <div class="chat-row-meta">
        ${row.time ? `<time>${esc(row.time)}</time>` : '<span class="chat-row-meta-spacer"></span>'}
        ${row.unread ? '<i class="unread-dot" aria-label="Непрочитано"></i>' : ''}
        ${row.pinned && !row.unread ? '<i class="ti ti-pinned chat-pin" aria-hidden="true"></i>' : ''}
      </div>
    </button>`;
}

export function chatsScreen() {
  clearHeader();
  let segment = 'all'; // all | dm | groups | events
  let query = '';
  let searchOpen = false;
  syncChatsBadge();

  const buildRows = () => {
    const chats = listVisibleChats();
    const dmItems = chats.map((chat, index) => ({
      kind: chat.team ? 'team' : 'dm',
      key: `c-${index}`,
      action: 'chat',
      id: index,
      name: chat.name,
      preview: chatPreviewText(chat),
      time: chat.time || '',
      photo: chat.photo,
      team: Boolean(chat.team),
      pinned: Boolean(chat.team),
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
        preview: groupListPreview(group),
        time: last?.time || '',
        photo: group.photo,
        pinned: false,
        unread: Boolean(group.unread)
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
        preview: eventListPreview(event),
        time: '',
        photo: event.photo,
        pinned: false,
        unread: false
      }));

    let rows = [];
    if (segment === 'all') rows = sortChatRows([...dmItems, ...groupItems]);
    else if (segment === 'dm') rows = sortChatRows(dmItems.filter(item => item.kind === 'dm' || item.kind === 'team'));
    else if (segment === 'groups') rows = sortChatRows(groupItems);
    else if (segment === 'events') rows = sortChatRows(eventItems);

    const term = query.trim().toLowerCase();
    if (term) {
      rows = rows.filter(row =>
        row.name.toLowerCase().includes(term)
        || (row.preview || '').toLowerCase().includes(term)
      );
    }

    return { rows, dmCount: dmItems.filter(i => i.kind === 'dm').length, hasAny: dmItems.length + groupItems.length > 0 };
  };

  const render = () => {
    const { rows } = buildRows();
    const term = query.trim();
    const pills = [
      ['all', 'Все'],
      ['dm', 'Знакомства'],
      ['groups', 'Группы'],
      ['events', 'События']
    ];
    const filterActive = segment !== 'all' || Boolean(term);
    const showKind = segment === 'all';

    view.innerHTML = `
      <div class="chats-page">
        <div class="list-sticky-pill ${searchOpen ? 'is-search-open' : ''}">
          <header class="chats-head">
            <h1>Чаты</h1>
            <div class="list-head-actions">
              <button type="button" id="toggleChatSearch" aria-label="${searchOpen ? 'Закрыть поиск' : 'Поиск'}" aria-expanded="${searchOpen ? 'true' : 'false'}" class="${searchOpen || filterActive ? 'on' : ''}">
                <i class="ti ${searchOpen ? 'ti-x' : 'ti-search'}"></i>
              </button>
            </div>
          </header>

          ${searchOpen ? `
            <div class="list-search-panel">
              <div class="search-box chats-search">
                <i class="ti ti-search"></i>
                <input id="chatListSearch" type="search" placeholder="Поиск" value="${esc(query)}" enterkeyhint="search">
                ${term ? '<button type="button" id="clearChatSearch" aria-label="Очистить">×</button>' : ''}
              </div>
              <div class="chats-pills" role="tablist">
                ${pills.map(([id, label]) => `
                  <button type="button" class="${segment === id ? 'on' : ''}" data-segment="${id}">${label}</button>
                `).join('')}
              </div>
            </div>` : ''}
        </div>

        ${rows.length ? `
          <div class="chat-list">${rows.map(row => chatRowHtml(row, { showKind })).join('')}</div>` : `
          <div class="chats-empty compact">
            <div class="empty-badge"><i class="ti ti-message-circle"></i></div>
            <h2>${term
              ? 'Ничего не найдено'
              : segment === 'events' ? 'Пока нет событий' : 'Пока нет переписок'}</h2>
            <p>${term
              ? 'Попробуйте другое имя или фрагмент сообщения.'
              : segment === 'events'
                ? 'События появятся после интереса на афише.'
                : 'Чат откроется при взаимном привете.'}</p>
            ${term ? '' : `<button class="empty-primary" type="button" data-action="${segment === 'events' ? 'events' : 'people'}">${segment === 'events' ? 'К событиям' : 'Смотреть анкеты'}</button>`}
          </div>`}

      </div>`;

    view.querySelector('#toggleChatSearch')?.addEventListener('click', () => {
      searchOpen = !searchOpen;
      render();
      if (searchOpen) {
        view.querySelector('#chatListSearch')?.focus({ preventScroll: true });
        const page = view.querySelector('.chats-page');
        if (page) page.scrollLeft = 0;
      }
    });
    const input = view.querySelector('#chatListSearch');
    input?.addEventListener('input', () => {
      query = input.value;
      render();
      const next = view.querySelector('#chatListSearch');
      if (next) {
        next.focus({ preventScroll: true });
        const pos = query.length;
        next.setSelectionRange(pos, pos);
      }
      const page = view.querySelector('.chats-page');
      if (page) page.scrollLeft = 0;
    });
    view.querySelector('#clearChatSearch')?.addEventListener('click', () => {
      query = '';
      render();
      view.querySelector('#chatListSearch')?.focus({ preventScroll: true });
      const page = view.querySelector('.chats-page');
      if (page) page.scrollLeft = 0;
    });
    view.querySelectorAll('[data-segment]').forEach(button => {
      button.onclick = () => {
        segment = button.dataset.segment;
        searchOpen = true;
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
              ${dmRows.map(({ chat, index }) => chatRowHtml({
                kind: chat.team ? 'team' : 'dm',
                action: 'chat',
                id: index,
                name: chat.name,
                preview: chatPreviewText(chat),
                time: chat.time || '',
                photo: chat.photo,
                team: Boolean(chat.team),
                pinned: Boolean(chat.team),
                unread: Boolean(chat.unread)
              })).join('')}
              ${groupRows.map(group => chatRowHtml({
                kind: 'group',
                action: 'group',
                id: group.id,
                name: group.title,
                preview: groupListPreview(group),
                time: group.messages?.[group.messages.length - 1]?.time || '',
                photo: group.photo,
                pinned: false,
                unread: Boolean(group.unread)
              }, { showKind: true })).join('')}
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
  const attach = {
    photo: ui.attachPhoto || null,
    share: ui.attachShare || null,
    menuOpen: Boolean(ui.attachMenuOpen),
    pickMode: ui.attachPickMode || null,
    openFile: Boolean(ui.attachOpenFile)
  };

  const renderMessage = (message, index, list) => {
    const mine = message.from === 'me';
    const prev = list[index - 1];
    // В ЛС имя уже в chat-top; подпись только в командном чате при смене автора
    const showName = !mine && !chat.personId && (!prev || prev.from === 'me' || prev.name !== message.name);
    return `
    <div class="chat-bubble ${mine ? 'mine' : ''}${showName ? ' with-name' : ''}">
      <div class="bubble-body">
        ${showName ? `<div class="bubble-name">${esc(message.name || chat.name)}</div>` : ''}
        ${message.replyTo ? `<div class="bubble-reply"><small>В ответ</small><span>${esc(message.replyTo)}</span></div>` : ''}
        ${message.text ? `<p>${message.text.split('\n').map(line => esc(line)).join('<br>')}</p>` : ''}
        ${message.image ? `<img class="bubble-image" src="${esc(message.image)}" alt="">` : ''}
        ${message.share ? shareBubbleHtml(message.share) : ''}
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
        ${!chat.team && empty ? `
          <section class="chat-intro me-panel">
            <img class="chat-photo" src="${esc(chat.photo || people[0].photo)}" alt="">
            <p class="chat-meta">Это начало вашей переписки · ${esc(chat.name)}</p>
            <div class="chat-pills">${emptyPills.map(tag => `<span class="chat-pill">${esc(tag)}</span>`).join('')}</div>
          </section>` : ''}
        ${messages.map(renderMessage).join('')}
      </main>

      ${composerShellHtml({
        draft: ui.draft,
        attach,
        inputId: 'msgInput',
        sendId: 'sendMsg',
        fileInputId: 'attachFile'
      })}
    </div>`;

  const input = view.querySelector('#msgInput');
  input?.addEventListener('input', () => {
    ui.draft = input.value;
    setChatUi(chatId, ui);
    const has = hasComposerPayload(ui.draft, {
      photo: ui.attachPhoto,
      share: ui.attachShare
    });
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

  const composer = view.querySelector('.chat-composer');
  bindComposerAttach(composer, {
    getAttach: () => ({
      photo: ui.attachPhoto || null,
      share: ui.attachShare || null,
      menuOpen: Boolean(ui.attachMenuOpen),
      pickMode: ui.attachPickMode || null,
      openFile: Boolean(ui.attachOpenFile)
    }),
    setAttach: next => {
      ui.attachPhoto = next.photo || null;
      ui.attachShare = next.share || null;
      ui.attachMenuOpen = Boolean(next.menuOpen);
      ui.attachPickMode = next.pickMode || null;
      ui.attachOpenFile = Boolean(next.openFile);
      setChatUi(chatId, ui);
    },
    onRerender: () => chatScreen(chatId),
    fileInputId: 'attachFile'
  });

  view.querySelector('#sendMsg')?.addEventListener('click', () => {
    if (!hasComposerPayload(ui.draft, { photo: ui.attachPhoto, share: ui.attachShare })) return;
    appendChatMessage(chat.team ? 'team' : chat.personId, {
      from: 'me',
      name: 'Вы',
      text: ui.draft.trim(),
      time: 'сейчас',
      image: ui.attachPhoto || undefined,
      share: ui.attachShare || undefined
    });
    ui.draft = '';
    ui.attachPhoto = null;
    ui.attachShare = null;
    ui.attachMenuOpen = false;
    ui.attachPickMode = null;
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
      attachPhoto: null,
      attachShare: null,
      attachMenuOpen: false,
      attachPickMode: null,
      attachOpenFile: false
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
