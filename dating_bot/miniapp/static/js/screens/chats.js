import { people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { listAllGroups, allEvents, isGroupOwner, isGroupPublic } from './community.js';
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
import {
  chatPrefKey,
  isChatArchived,
  isChatMuted,
  isChatPinned,
  toggleChatArchive,
  toggleChatMute,
  toggleChatPin
} from '../chat-prefs.js';
import { isSystemMessage, threadMessagesHtml } from '../chat-thread.js';

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
  return parts.length ? parts.join(' · ') : 'Обсуждение события';
}

function groupSearchBlob(group) {
  const memberNames = (group.membersList || group.joinRequests || [])
    .map(person => person?.name || '')
    .join(' ');
  const last = group.messages?.[group.messages.length - 1];
  return `${group.title || ''} ${group.about || ''} ${group.city || ''} ${memberNames} ${last?.text || ''} ${last?.name || ''}`.toLowerCase();
}

function sortChatRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    return 0;
  });
}

function sectionHtml(title, rows, opts) {
  if (!rows.length) return '';
  return `
    <section class="chat-section">
      <h2 class="chat-section-title">${esc(title)}</h2>
      <div class="chat-section-list">${rows.map(row => chatRowHtml(row, opts)).join('')}</div>
    </section>`;
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
  const title = row.kind === 'event' ? `Обсуждение · ${row.name}` : row.name;
  return `
    <div class="chat-row-wrap${row.unread ? ' unread' : ''}${row.pinned ? ' pinned' : ''}${row.muted ? ' muted' : ''}">
      <button class="chat-row" type="button" data-action="${row.action}" data-id="${esc(row.id)}">
        ${media}
        <div class="chat-copy">
          <div class="chat-copy-top">
            <strong>${esc(title)}</strong>
            ${kindLabel}
          </div>
          <span>${esc(row.preview)}</span>
        </div>
        <div class="chat-row-meta">
          ${row.time ? `<time>${esc(row.time)}</time>` : '<span class="chat-row-meta-spacer"></span>'}
          <span class="chat-row-flags">
            ${row.muted ? '<i class="ti ti-bell-off chat-mute-icon" aria-label="Без уведомлений"></i>' : ''}
            ${row.unread && !row.muted ? '<i class="unread-dot" aria-label="Непрочитано"></i>' : ''}
            ${row.pinned && !(row.unread && !row.muted) ? '<i class="ti ti-pinned chat-pin" aria-hidden="true"></i>' : ''}
          </span>
        </div>
      </button>
      <button type="button" class="chat-row-more" data-chat-menu="${esc(row.key)}" aria-label="Ещё">
        <i class="ti ti-dots"></i>
      </button>
    </div>`;
}

function enrichRowFlags(row) {
  const key = chatPrefKey(row);
  const muted = isChatMuted(key);
  const archived = isChatArchived(key);
  const pinned = Boolean(row.team) || isChatPinned(key) || Boolean(row.pinned);
  return {
    ...row,
    key,
    muted,
    archived,
    pinned,
    unread: muted ? false : Boolean(row.unread)
  };
}

export function chatsScreen() {
  clearHeader();
  let segment = 'all'; // all | dm | groups | events | archive
  let query = '';
  let searchOpen = false;
  let composeOpen = false;
  let menuKey = null;
  syncChatsBadge();

  const buildBuckets = () => {
    const chats = listVisibleChats();
    const dmItems = chats.map((chat, index) => enrichRowFlags({
      kind: chat.team ? 'team' : 'dm',
      action: 'chat',
      id: index,
      personId: chat.personId,
      name: chat.name,
      preview: chatPreviewText(chat),
      time: chat.time || '',
      photo: chat.photo,
      team: Boolean(chat.team),
      pinned: Boolean(chat.team),
      unread: Boolean(chat.unread),
      searchText: `${chat.name} ${chat.preview || ''} ${(chat.messages || []).map(m => m.text || '').join(' ')}`
    }));
    const groupItems = listAllGroups().map(group => {
      const last = group.messages?.[group.messages.length - 1];
      return enrichRowFlags({
        kind: 'group',
        action: isGroupPublic(group) || group.membership === 'member' || isGroupOwner(group) ? 'group' : 'group',
        id: group.id,
        name: group.title,
        preview: groupListPreview(group),
        time: last?.time || '',
        photo: group.photo,
        pinned: false,
        unread: Boolean(group.unread),
        searchText: groupSearchBlob(group),
        requests: isGroupOwner(group) ? (group.joinRequests || []).length : 0
      });
    });
    const interested = getState().eventInterest || {};
    const going = getState().eventGoing || {};
    const eventItems = allEvents()
      .filter(event => interested[event.id] || interested[String(event.id)] || going[event.id])
      .map(event => enrichRowFlags({
        kind: 'event',
        action: 'event',
        id: event.id,
        name: event.title,
        preview: eventListPreview(event),
        time: '',
        photo: event.photo,
        pinned: false,
        unread: false,
        searchText: `${event.title} ${event.place || ''} ${event.when || ''} ${event.description || ''}`
      }));

    const term = query.trim().toLowerCase();
    const matchTerm = row => !term
      || row.name.toLowerCase().includes(term)
      || (row.preview || '').toLowerCase().includes(term)
      || (row.searchText || '').toLowerCase().includes(term);

    const live = row => !row.archived;
    const archived = row => row.archived;

    return {
      dm: sortChatRows(dmItems.filter(live).filter(matchTerm)),
      groups: sortChatRows(groupItems.filter(live).filter(matchTerm)),
      events: sortChatRows(eventItems.filter(live).filter(matchTerm)),
      archive: sortChatRows([...dmItems, ...groupItems, ...eventItems].filter(archived).filter(matchTerm)),
      requestGroups: groupItems.filter(row => live(row) && row.requests > 0)
    };
  };

  const render = () => {
    const buckets = buildBuckets();
    const term = query.trim();
    const pills = [
      ['all', 'Все'],
      ['dm', 'Знакомства'],
      ['groups', 'Группы'],
      ['events', 'События'],
      ['archive', 'Архив']
    ];
    const filterActive = segment !== 'all' || Boolean(term);
    const showKind = false;

    let listHtml = '';
    if (segment === 'all') {
      const req = buckets.requestGroups;
      listHtml = `
        ${req.length ? `
          <section class="chat-section chat-section-requests">
            <h2 class="chat-section-title">Заявки</h2>
            <div class="chat-section-list">
              ${req.map(row => `
                <button class="chat-request-row" type="button" data-action="group" data-id="${esc(row.id)}">
                  <span class="settings-icon orange square"><i class="ti ti-user-plus"></i></span>
                  <span>
                    <strong>${esc(row.name)}</strong>
                    <small>${row.requests} ${row.requests === 1 ? 'заявка' : row.requests < 5 ? 'заявки' : 'заявок'} в группу</small>
                  </span>
                  <i class="ti ti-chevron-right"></i>
                </button>`).join('')}
            </div>
          </section>` : ''}
        ${sectionHtml('Знакомства', buckets.dm, { showKind })}
        ${sectionHtml('Группы', buckets.groups, { showKind })}
        ${sectionHtml('События', buckets.events, { showKind })}
      `;
      if (!buckets.dm.length && !buckets.groups.length && !buckets.events.length && !req.length) {
        listHtml = '';
      }
    } else if (segment === 'dm') listHtml = buckets.dm.length ? `<div class="chat-list">${buckets.dm.map(r => chatRowHtml(r)).join('')}</div>` : '';
    else if (segment === 'groups') listHtml = buckets.groups.length ? `<div class="chat-list">${buckets.groups.map(r => chatRowHtml(r)).join('')}</div>` : '';
    else if (segment === 'events') listHtml = buckets.events.length ? `<div class="chat-list">${buckets.events.map(r => chatRowHtml(r)).join('')}</div>` : '';
    else if (segment === 'archive') listHtml = buckets.archive.length ? `<div class="chat-list">${buckets.archive.map(r => chatRowHtml(r)).join('')}</div>` : '';

    const empty = !listHtml;
    const menuRow = menuKey
      ? [...buckets.dm, ...buckets.groups, ...buckets.events, ...buckets.archive].find(row => row.key === menuKey)
      : null;

    view.innerHTML = `
      <div class="chats-page">
        <div class="list-sticky-pill ${searchOpen ? 'is-search-open' : ''}">
          <header class="chats-head">
            <h1>Чаты</h1>
            <div class="list-head-actions">
              <button type="button" id="toggleChatCompose" aria-label="Создать" aria-expanded="${composeOpen ? 'true' : 'false'}" class="${composeOpen ? 'on' : ''}">
                <i class="ti ti-plus"></i>
              </button>
              <button type="button" id="toggleChatSearch" aria-label="${searchOpen ? 'Закрыть поиск' : 'Поиск'}" aria-expanded="${searchOpen ? 'true' : 'false'}" class="${searchOpen || filterActive ? 'on' : ''}">
                <i class="ti ${searchOpen ? 'ti-x' : 'ti-search'}"></i>
              </button>
            </div>
          </header>

          ${composeOpen ? `
            <div class="chat-compose-pop" role="menu">
              <button type="button" role="menuitem" data-action="new-dm"><i class="ti ti-message"></i>Новый чат</button>
              <button type="button" role="menuitem" data-action="create-group"><i class="ti ti-users"></i>Новая группа</button>
              <button type="button" role="menuitem" data-action="create-event"><i class="ti ti-calendar-event"></i>Новое событие</button>
            </div>` : ''}

          <div class="list-search-panel ${searchOpen ? '' : 'is-collapsed-pills'}">
            ${searchOpen ? `
              <div class="search-box chats-search">
                <i class="ti ti-search"></i>
                <input id="chatListSearch" type="search" placeholder="Имя, сообщение, группа…" value="${esc(query)}" enterkeyhint="search">
                ${term ? '<button type="button" id="clearChatSearch" aria-label="Очистить">×</button>' : ''}
              </div>` : ''}
            <div class="chats-pills" role="tablist">
              ${pills.map(([id, label]) => `
                <button type="button" class="${segment === id ? 'on' : ''}" data-segment="${id}">${label}</button>
              `).join('')}
            </div>
          </div>
        </div>

        ${!empty ? listHtml : `
          <div class="chats-empty compact">
            <div class="empty-badge"><i class="ti ti-message-circle"></i></div>
            <h2>${term
              ? 'Ничего не найдено'
              : segment === 'events' ? 'Пока нет событий'
                : segment === 'archive' ? 'Архив пуст'
                  : 'Пока нет переписок'}</h2>
            <p>${term
              ? 'Попробуйте имя, текст сообщения или название группы.'
              : segment === 'events'
                ? 'События появятся после интереса на афише.'
                : segment === 'archive'
                  ? 'Сюда попадают чаты, которые вы архивировали.'
                  : 'Чат откроется при взаимном привете.'}</p>
            ${term || segment === 'archive' ? '' : `<button class="empty-primary" type="button" data-action="${segment === 'events' ? 'events' : 'people'}">${segment === 'events' ? 'К событиям' : 'Смотреть анкеты'}</button>`}
          </div>`}

        ${menuRow ? `
          <div class="chat-sheet-scrim" id="chatMenuScrim"></div>
          <div class="chat-action-sheet" role="dialog" aria-modal="true">
            <header>
              <strong>${esc(menuRow.kind === 'event' ? `Обсуждение · ${menuRow.name}` : menuRow.name)}</strong>
              <button type="button" id="closeChatMenu" aria-label="Закрыть"><i class="ti ti-x"></i></button>
            </header>
            <button type="button" data-pref="pin">${menuRow.pinned && !menuRow.team ? 'Открепить' : 'Закрепить'}</button>
            <button type="button" data-pref="mute">${menuRow.muted ? 'Включить уведомления' : 'Без уведомлений'}</button>
            <button type="button" data-pref="archive">${menuRow.archived ? 'Вернуть из архива' : 'В архив'}</button>
            ${menuRow.kind === 'dm' && menuRow.personId ? `<button type="button" data-action="person" data-id="${esc(menuRow.personId)}">Открыть профиль</button>` : ''}
            ${menuRow.kind === 'group' ? `<button type="button" data-action="group" data-id="${esc(menuRow.id)}">Открыть группу</button>` : ''}
            ${menuRow.kind === 'event' ? `<button type="button" data-action="event" data-id="${esc(menuRow.id)}">Открыть событие</button>` : ''}
            ${menuRow.kind === 'dm' && menuRow.personId ? `<button type="button" class="danger" data-action="report-flow" data-id="${esc(menuRow.personId)}">Пожаловаться</button>` : ''}
          </div>` : ''}
      </div>`;

    view.querySelector('#toggleChatSearch')?.addEventListener('click', () => {
      searchOpen = !searchOpen;
      composeOpen = false;
      render();
      if (searchOpen) view.querySelector('#chatListSearch')?.focus({ preventScroll: true });
    });
    view.querySelector('#toggleChatCompose')?.addEventListener('click', () => {
      composeOpen = !composeOpen;
      menuKey = null;
      render();
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
    });
    view.querySelector('#clearChatSearch')?.addEventListener('click', () => {
      query = '';
      render();
      view.querySelector('#chatListSearch')?.focus({ preventScroll: true });
    });
    view.querySelectorAll('[data-segment]').forEach(button => {
      button.onclick = () => {
        segment = button.dataset.segment;
        searchOpen = segment !== 'all' ? true : searchOpen;
        composeOpen = false;
        menuKey = null;
        render();
      };
    });
    view.querySelectorAll('[data-chat-menu]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        menuKey = button.dataset.chatMenu;
        composeOpen = false;
        render();
      });
    });
    view.querySelector('#chatMenuScrim')?.addEventListener('click', () => {
      menuKey = null;
      render();
    });
    view.querySelector('#closeChatMenu')?.addEventListener('click', () => {
      menuKey = null;
      render();
    });
    view.querySelectorAll('[data-pref]').forEach(button => {
      button.addEventListener('click', () => {
        if (!menuRow) return;
        const key = menuRow.key;
        if (button.dataset.pref === 'mute') toggleChatMute(key);
        if (button.dataset.pref === 'archive') toggleChatArchive(key);
        if (button.dataset.pref === 'pin' && !menuRow.team) toggleChatPin(key);
        menuKey = null;
        syncChatsBadge();
        render();
      });
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
  const replyTo = ui.replyTo || '';

  const prefKey = chatPrefKey({
    kind: chat.team ? 'team' : 'dm',
    team: chat.team,
    personId: chat.personId,
    id: chatId
  });
  const muted = isChatMuted(prefKey);

  const renderMessage = (message, index, list) => {
    if (isSystemMessage(message)) return '';
    const mine = message.from === 'me';
    const prev = list[index - 1];
    const showName = !mine && !chat.personId && (!prev || prev.from === 'me' || prev.name !== message.name);
    return `
    <div class="chat-bubble ${mine ? 'mine' : ''}${showName ? ' with-name' : ''}${message.reaction ? ' has-reaction' : ''}">
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
              <div class="chat-avatar team chat-peer-photo"><i class="ti ti-flower"></i></div>
              <span class="chat-peer-copy">
                <h1>${esc(chat.name)}</h1>
                <p>${muted ? 'Без уведомлений' : 'Команда Yaqin'}</p>
              </span>
            </div>`}
        <button type="button" id="chatMenuBtn" aria-label="Ещё"><i class="ti ti-dots"></i></button>
      </header>

      ${ui.menuOpen ? `
        <div class="chat-menu-pop">
          ${chat.personId ? `<button type="button" data-action="person" data-id="${chat.personId}">Смотреть профиль</button>` : ''}
          <button type="button" id="toggleChatMute">${muted ? 'Включить уведомления' : 'Без уведомлений'}</button>
          ${chat.personId ? `<button type="button" data-action="report-flow" data-id="${chat.personId}">Пожаловаться</button>` : ''}
        </div>` : ''}

      <main class="chat-thread ${empty ? 'start' : ''}">
        ${!chat.team && empty ? `
          <section class="chat-intro me-panel">
            <img class="chat-photo" src="${esc(chat.photo || people[0].photo)}" alt="">
            <p class="chat-meta">Это начало вашей переписки · ${esc(chat.name)}</p>
            <div class="chat-pills">${emptyPills.map(tag => `<span class="chat-pill">${esc(tag)}</span>`).join('')}</div>
          </section>` : ''}
        ${threadMessagesHtml(messages, renderMessage)}
      </main>

      ${ui.replyTo ? `
        <div class="chat-reply-bar">
          <div>
            <small>В ответ</small>
            <span>${esc(ui.replyTo)}</span>
          </div>
          <button type="button" id="clearReply" aria-label="Отменить ответ"><i class="ti ti-x"></i></button>
        </div>` : ''}

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

  view.querySelector('#clearReply')?.addEventListener('click', () => {
    ui.replyTo = '';
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });

  view.querySelector('#chatMenuBtn')?.addEventListener('click', () => {
    ui.menuOpen = !ui.menuOpen;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#toggleChatMute')?.addEventListener('click', () => {
    toggleChatMute(prefKey);
    ui.menuOpen = false;
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
      replyTo: ui.replyTo || undefined,
      image: ui.attachPhoto || undefined,
      share: ui.attachShare || undefined
    });
    ui.draft = '';
    ui.replyTo = '';
    ui.attachPhoto = null;
    ui.attachShare = null;
    ui.attachMenuOpen = false;
    ui.attachPickMode = null;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });

  if (ui.draft || ui.replyTo) {
    input?.focus();
    if (ui.draft) input?.setSelectionRange(ui.draft.length, ui.draft.length);
  }
}

const chatUiState = new Map();
function getChatUi(id) {
  if (!chatUiState.has(id)) {
    chatUiState.set(id, {
      menuOpen: false,
      draft: '',
      replyTo: '',
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
      <div class="message-react-row" role="group" aria-label="Реакция">
        ${['❤️', '🔥', '👏', '😂', '🙏'].map(emoji => `
          <button type="button" class="message-react" data-react="${emoji}">${emoji}</button>`).join('')}
      </div>
      <div class="message-sheet">
        <button type="button" id="replyMsg">
          <span class="sheet-icon blue"><i class="ti ti-arrow-back-up"></i></span>
          Ответить
        </button>
        <button type="button" id="copyMsg">
          <span class="sheet-icon blue"><i class="ti ti-copy"></i></span>
          Скопировать текст
        </button>
        ${person?.id ? `
          <button type="button" data-action="report-flow" data-id="${person.id}">
            <span class="sheet-icon red"><i class="ti ti-flag"></i></span>
            Пожаловаться
          </button>` : ''}
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
  overlay.querySelector('#replyMsg')?.addEventListener('click', () => {
    const snippet = String(message?.text || 'сообщение').slice(0, 80);
    primeChatUi(chatId, { draft: '', replyTo: snippet });
    closeMessageMenu();
  });
  overlay.querySelectorAll('[data-react]').forEach(button => {
    button.addEventListener('click', () => {
      if (message) message.reaction = button.dataset.react;
      closeMessageMenu();
      chatScreen(chatId);
    });
  });
}

let messageMenuCloser = null;
export function closeMessageMenu() {
  messageMenuCloser?.();
}
