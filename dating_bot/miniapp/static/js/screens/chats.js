import { chats, people, activity, groups, PHOTOS } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';

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
        <h1>Мои чаты</h1>
        <button data-action="search" aria-label="Поиск"><i class="ti ti-search"></i></button>
      </header>

      ${hasChats ? `
        <h2 class="chats-section">Новые знакомства</h2>
        <div class="new-friends">
          <div class="new-friend">
            <img src="${esc(people[0].photo)}">
            <b>НОВОЕ</b>
          </div>
        </div>
      ` : ''}

      <div class="chat-tabs">
        <button class="active">Личные${hasChats ? ' <span class="tab-badge">2</span>' : ''}</button>
        <button>Группы</button>
        <button>События</button>
      </div>

      ${hasChats
        ? `<div class="chat-list">${chats.map((chat, index) => `
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
            <h2>Пока нет личных чатов</h2>
            <p>Когда отправите или получите сообщение, оно появится здесь.</p>
          </div>`}

      <button class="compose" data-action="new-dm" aria-label="Написать"><i class="ti ti-send"></i></button>
    </div>`;
}

export function searchChatsScreen(queryOrId = '') {
  clearHeader();
  const query = typeof queryOrId === 'string' ? queryOrId : '';
  const term = query.trim().toLowerCase();
  const rows = chats.filter(chat =>
    !term || chat.name.toLowerCase().includes(term) || chat.preview.toLowerCase().includes(term)
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
          ? rows.map((chat, index) => `
            <button class="chat-row" data-action="chat" data-id="${index}">
              ${avatar(chat.photo, chat.team)}
              <div class="chat-copy"><strong>${esc(chat.name)}</strong><span>${esc(chat.preview)}</span></div>
            </button>`).join('') || '<p class="search-none">Ничего не найдено</p>'
          : `<div class="chats-empty compact">
              <div class="empty-badge"><i class="ti ti-user"></i></div>
              <h2>Поиск чатов</h2>
            </div>`}
      </div>
    </div>`;

  const input = view.querySelector('#chatSearch');
  input.focus();
  input.oninput = () => searchChatsScreen(input.value);
  view.querySelector('#clearSearch')?.addEventListener('click', () => searchChatsScreen(''));
}

export function newDmScreen() {
  clearHeader();
  const friends = people.slice(0, 3);
  const members = [people[1]];
  let selected = new Set();

  const render = () => {
    view.innerHTML = `
      <div class="new-dm-page">
        <header class="modal-head">
          <button data-action="chats" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Новое сообщение</h1>
          <button class="head-action ${selected.size ? 'on' : ''}" data-action="chat" data-id="0" ${selected.size ? '' : 'disabled'}>Чат</button>
        </header>
        <h2 class="invite-title">Пригласите в чат</h2>
        <input class="plain-search" id="dmSearch" placeholder="Поиск...">

        <h3 class="list-label">Подруги</h3>
        ${friends.map(person => row(person)).join('')}

        <h3 class="list-label">Из общих групп</h3>
        ${members.map(person => row(person)).join('')}
      </div>`;

    view.querySelectorAll('[data-pick]').forEach(button => {
      button.onclick = () => {
        const id = Number(button.dataset.pick);
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        render();
      };
    });
  };

  const row = person => `
    <button class="pick-row" type="button" data-pick="${person.id}">
      <img src="${esc(person.photo)}" alt="">
      <div>
        <strong>${esc(person.name)}</strong>
        <span>${esc(person.city)}</span>
      </div>
      <span class="pick-circle ${selected.has(person.id) ? 'on' : ''}"></span>
    </button>`;

  render();
}

export function chatScreen(id) {
  clearHeader();
  const chatId = Number(id) || 0;
  const chat = chats[chatId];
  const messages = chat.messages || [];
  const person = people.find(item => item.id === chat.personId);
  const pills = person?.looking?.slice(0, 3) || ['кофе'];
  const empty = messages.length === 0;
  const ui = getChatUi(chatId);

  const renderMessage = (message, index) => `
    <button class="chat-bubble" type="button" data-action="message-menu" data-id="${chat.personId || 0}" data-msg="${index}" data-chat="${chatId}">
      ${avatar(chat.photo, chat.team)}
      <div class="bubble-body">
        <div class="bubble-head">
          <b class="${message.link ? 'accent' : ''}">${esc(message.name)}</b>
          <time>${esc(message.time)}</time>
        </div>
        ${message.replyTo ? `
          <div class="bubble-quote">
            <img src="${esc(chat.photo || people[0].photo)}" alt="">
            <i class="ti ti-arrow-back-up"></i>
            <span>${esc(message.replyTo)}</span>
          </div>` : ''}
        ${message.text ? `<p>${message.text.split('\n').map(line => esc(line)).join('<br>')}</p>` : ''}
        ${message.image ? `<img class="bubble-image" src="${esc(message.image)}" alt="">` : ''}
        ${message.link ? `
          <div class="link-card">
            <img src="${esc(message.link.image)}" alt="">
            <div>
              <small>${esc(message.link.domain)}</small>
              <strong>${esc(message.link.title)}</strong>
              <span>${esc(message.link.desc)}</span>
            </div>
          </div>` : ''}
        ${message.reaction ? `
          <div class="bubble-reactions">
            <span>${message.reaction} 1</span>
            <i class="ti ti-mood-plus"></i>
          </div>` : ''}
      </div>
    </button>`;

  view.innerHTML = `
    <div class="chat-page">
      <header class="chat-top">
        <button class="chat-back" data-action="chats" aria-label="Назад">
          <i class="ti ti-chevron-left"></i>
          <span class="back-badge">2</span>
        </button>
        <div class="chat-peer">
          <h1>${esc(chat.name)}</h1>
          <p><i></i> Не в сети</p>
        </div>
        ${chat.personId ? `<button data-action="report-flow" data-id="${chat.personId}" aria-label="Ещё"><i class="ti ti-dots"></i></button>` : '<span></span>'}
      </header>

      <main class="chat-thread ${empty ? 'start' : ''}">
        ${!empty || true ? `
          <img class="chat-photo" src="${esc(chat.photo || people[0].photo)}" alt="">
          <p class="chat-meta">${empty
            ? `Это начало вашей переписки · ${esc(chat.name)}`
            : `Вы познакомились · ${esc(chat.name)}`}</p>
          <div class="chat-pills">${pills.map(tag => `<span class="chat-pill">${esc(tag)}</span>`).join('')}</div>
        ` : ''}
        ${messages.map(renderMessage).join('')}
      </main>

      ${ui.attachOpen ? `
        <div class="attach-menu">
          <button type="button" data-attach="photo"><span>Загрузить фото</span><i class="ti ti-photo"></i></button>
          <button type="button" data-attach="camera"><span>Сделать фото</span><i class="ti ti-camera"></i></button>
          <button type="button" data-attach="audio"><span>Записать аудио</span><i class="ti ti-microphone"></i></button>
          <button type="button" data-attach="file"><span>Загрузить файл</span><i class="ti ti-file"></i></button>
        </div>` : ''}

      ${ui.gifOpen ? `
        <div class="gif-sheet">
          <header><b>GIF</b><button type="button" id="closeGif"><i class="ti ti-x"></i></button></header>
          <div class="gif-grid">
            ${[PHOTOS.coffee, PHOTOS.city, PHOTOS.palms, PHOTOS.event].map(src => `
              <button type="button" data-gif="${esc(src)}"><img src="${esc(src)}" alt=""></button>`).join('')}
          </div>
        </div>` : ''}

      ${ui.reply ? `
        <div class="reply-bar">
          <i class="ti ti-arrow-back-up"></i>
          <div>
            <b>${esc(ui.reply.name)}</b>
            <span>${esc(ui.reply.text)}</span>
          </div>
          <button type="button" id="clearReply" aria-label="Отмена"><i class="ti ti-x"></i></button>
        </div>` : ''}

      ${ui.attachPhoto ? `
        <div class="draft-attach">
          <img src="${esc(ui.attachPhoto)}" alt="">
          <button type="button" id="clearAttach" aria-label="Убрать"><i class="ti ti-x"></i></button>
        </div>` : ''}

      <div class="message-bar">
        <button class="msg-add ${ui.attachOpen ? 'open' : ''}" id="toggleAttach" aria-label="Вложение">
          <i class="ti ti-${ui.attachOpen ? 'x' : 'plus'}"></i>
        </button>
        <label class="msg-field">
          <input id="msgInput" placeholder="Написать сообщение" value="${esc(ui.draft)}" maxlength="500">
          <i class="ti ti-mood-smile"></i>
        </label>
        ${ui.draft.trim() || ui.attachPhoto
          ? `<button class="msg-send" id="sendMsg" aria-label="Отправить"><i class="ti ti-arrow-up"></i></button>`
          : `<button id="openGif" aria-label="GIF">GIF</button>
             <button id="quickPhoto" aria-label="Фото"><i class="ti ti-photo"></i></button>
             <button aria-label="Голос"><i class="ti ti-microphone"></i></button>`}
      </div>
    </div>`;

  const input = view.querySelector('#msgInput');
  input?.addEventListener('input', () => {
    ui.draft = input.value;
    setChatUi(chatId, ui);
    const has = ui.draft.trim() || ui.attachPhoto;
    // lightweight toggle of send vs tools without full remount would be better; remount keeps focus issue
    // remount only when crossing empty/nonempty boundary
    const sendVisible = Boolean(view.querySelector('#sendMsg'));
    if (Boolean(has) !== sendVisible) chatScreen(chatId);
  });

  view.querySelector('#toggleAttach')?.addEventListener('click', () => {
    ui.attachOpen = !ui.attachOpen;
    ui.gifOpen = false;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#openGif')?.addEventListener('click', () => {
    ui.gifOpen = !ui.gifOpen;
    ui.attachOpen = false;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#closeGif')?.addEventListener('click', () => {
    ui.gifOpen = false;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelectorAll('[data-gif]').forEach(button => {
    button.onclick = () => {
      ui.attachPhoto = button.dataset.gif;
      ui.gifOpen = false;
      setChatUi(chatId, ui);
      chatScreen(chatId);
    };
  });
  view.querySelector('#quickPhoto')?.addEventListener('click', () => {
    ui.attachPhoto = PHOTOS.city;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelectorAll('[data-attach]').forEach(button => {
    button.onclick = () => {
      if (button.dataset.attach === 'photo' || button.dataset.attach === 'camera') ui.attachPhoto = PHOTOS.palms;
      ui.attachOpen = false;
      setChatUi(chatId, ui);
      chatScreen(chatId);
    };
  });
  view.querySelector('#clearReply')?.addEventListener('click', () => {
    ui.reply = null;
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
      image: ui.attachPhoto || undefined,
      replyTo: ui.reply?.text
    });
    chat.preview = ui.draft.trim() || 'Фото';
    ui.draft = '';
    ui.attachPhoto = null;
    ui.reply = null;
    ui.attachOpen = false;
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
    chatUiState.set(id, { attachOpen: false, gifOpen: false, reply: null, draft: '', attachPhoto: null });
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

export function beginReply(chatId, message, person) {
  const ui = getChatUi(chatId);
  ui.reply = { name: message?.name || person?.name || 'подруга', text: (message?.text || '').split('\n').pop() };
  ui.attachOpen = false;
  setChatUi(chatId, ui);
  chatScreen(chatId);
}

export function showMessageMenu(person, message, chatId = 0) {
  const first = esc((person?.name || message?.name || 'подруга').split(' ')[0]);
  const photo = person?.photo || message?.photo || people[0].photo;
  closeMessageMenu();
  const overlay = document.createElement('div');
  overlay.className = 'safety-overlay message-menu-overlay';
  overlay.innerHTML = `
    <div class="message-menu-stack">
      <div class="reaction-bar">
        ${['❤️', '🔥', '👍', '👎', '😂'].map(emoji => `<button type="button" data-action="close-sheet">${emoji}</button>`).join('')}
        <button type="button" data-action="close-sheet" aria-label="Ещё"><i class="ti ti-mood-plus"></i></button>
      </div>
      <div class="message-sheet">
        <button type="button" id="replyMsg">
          <span class="reply-icon"><img src="${esc(photo)}" alt=""><i class="ti ti-arrow-back-up"></i></span>
          Ответить · ${first}
        </button>
        <button type="button" data-action="close-sheet">
          <span class="sheet-icon blue"><i class="ti ti-copy"></i></span>
          Скопировать текст
        </button>
        <button type="button" data-action="report-flow" data-id="${person?.id || 0}">
          <span class="sheet-icon red"><i class="ti ti-flag"></i></span>
          Пожаловаться на сообщение
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
  overlay.querySelector('#replyMsg').onclick = () => {
    closeMessageMenu();
    beginReply(chatId, message, person);
  };
}

let messageMenuCloser = null;
export function closeMessageMenu() {
  messageMenuCloser?.();
}

export function groupNotificationsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let mode = 'you';
  const toggles = { joins: false, replies: true, updates: true, reactions: true };

  const render = () => {
    view.innerHTML = `
      <div class="settings-page">
        <header class="filters-head">
          <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Уведомления</h1>
          <span></span>
        </header>
        <p class="settings-hint group-title">${esc(group.title)}</p>
        <h3 class="settings-label">Уведомления</h3>
        <section class="settings-block">
          ${[
            ['all', 'Все', 'Уведомления о всех новых сообщениях и активности (рекомендуется)'],
            ['you', 'Только для вас', 'Только упоминания и ответы вам'],
            ['none', 'Ничего', 'Не получать уведомления об этой группе']
          ].map(([value, title, text]) => `
            <button class="settings-row stacked-btn radio-row" type="button" data-mode="${value}">
              <span>${title}<br><small>${text}</small></span>
              <span class="radio ${mode === value ? 'on' : ''}">${mode === value ? '<i class="ti ti-check"></i>' : ''}</span>
            </button>`).join('')}
        </section>
        <section class="settings-block">
          <label class="settings-row toggle stacked"><span>Новые участницы</span><input type="checkbox" data-key="joins" ${toggles.joins ? 'checked' : ''}></label>
          <label class="settings-row toggle stacked"><span>Ответы в ваших тредах</span><input type="checkbox" data-key="replies" ${toggles.replies ? 'checked' : ''}></label>
          <label class="settings-row toggle stacked"><span>Обновления группы</span><input type="checkbox" data-key="updates" ${toggles.updates ? 'checked' : ''}></label>
          <label class="settings-row toggle stacked"><span>Реакции на ваши сообщения</span><input type="checkbox" data-key="reactions" ${toggles.reactions ? 'checked' : ''}></label>
        </section>
      </div>`;

    view.querySelectorAll('[data-mode]').forEach(button => {
      button.onclick = () => {
        mode = button.dataset.mode;
        render();
      };
    });
    view.querySelectorAll('[data-key]').forEach(input => {
      input.onchange = () => {
        toggles[input.dataset.key] = input.checked;
      };
    });
  };

  render();
}

export function activityScreen() {
  clearHeader();
  view.innerHTML = `
    <div class="activity-page">
      <header class="chats-head">
        <h1>Лента</h1>
        <span></span>
      </header>
      <div class="activity-list">
        ${activity.map(item => `
          <div class="activity-item">
            <div class="activity-avatar">
              <img src="${esc(item.photo)}">
              ${item.verified ? '<span class="verified"><i class="ti ti-check"></i></span>' : ''}
            </div>
            <div class="activity-copy">
              <b>${esc(item.title)} <time>${esc(item.time)}</time></b>
              <span>${esc(item.text)}</span>
            </div>
            ${item.unread ? '<i class="unread-dot"></i>' : ''}
          </div>`).join('')}
      </div>
      <div class="activity-card">
        <div>
          <b>Добавьте email 💌</b>
          <span>Чтобы не потерять доступ к аккаунту</span>
        </div>
        <button type="button">Добавить</button>
      </div>
    </div>`;
}
