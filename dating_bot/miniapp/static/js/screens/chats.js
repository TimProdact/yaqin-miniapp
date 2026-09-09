import { chats, people, activity, groups, PHOTOS } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';

function avatar(photo, team = false) {
  if (team) return `<div class="chat-avatar team"><i class="ti ti-flower"></i></div>`;
  return `<div class="chat-avatar">${photo ? `<img src="${esc(photo)}">` : '✿'}</div>`;
}

export function chatsScreen() {
  clearHeader();
  let tab = 'dms';
  const groupChats = groups.filter(group => group.joined !== false).slice(0, 3);

  const render = () => {
    const hasChats = chats.length > 0;
    view.innerHTML = `
      <div class="chats-page">
        <header class="chats-head">
          <h1>Мои чаты</h1>
          <button data-action="search" aria-label="Поиск"><i class="ti ti-search"></i></button>
        </header>

        ${tab === 'dms' && hasChats ? `
          <h2 class="chats-section">Новые знакомства</h2>
          <div class="new-friends">
            <div class="new-friend">
              <img src="${esc(people[0].photo)}" alt="">
              <b>НОВОЕ</b>
            </div>
          </div>` : ''}

        <div class="chat-tabs">
          <button class="${tab === 'dms' ? 'active' : ''}" data-ctab="dms">Личные${hasChats ? ' <span class="tab-badge">2</span>' : ''}</button>
          <button class="${tab === 'groups' ? 'active' : ''}" data-ctab="groups">Группы</button>
          <button class="${tab === 'events' ? 'active' : ''}" data-ctab="events">События</button>
        </div>

        ${tab === 'dms' ? (hasChats
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
            </div>`) : ''}

        ${tab === 'groups' ? `
          <div class="chat-list">
            ${groupChats.map(group => `
              <button class="chat-row" data-action="group-chat" data-id="${group.id}">
                ${avatar(group.photo)}
                <div class="chat-copy">
                  <strong>${esc(group.title)}</strong>
                  <span>${esc(group.active || 'чат группы')}</span>
                </div>
              </button>`).join('') || `
              <div class="chats-empty">
                <div class="empty-badge"><i class="ti ti-users"></i></div>
                <h2>Пока нет групповых чатов</h2>
                <p>Вступите в группу — переписка появится здесь.</p>
              </div>`}
          </div>` : ''}

        ${tab === 'events' ? `
          <div class="chats-empty">
            <div class="empty-badge"><i class="ti ti-calendar-event"></i></div>
            <h2>Пока нет чатов событий</h2>
            <p>Когда отметите «Иду», чат события появится здесь.</p>
            <button class="empty-primary" type="button" data-action="events">Смотреть события</button>
          </div>` : ''}

        <button class="compose" data-action="new-dm" aria-label="Написать"><i class="ti ti-send"></i></button>
      </div>`;

    view.querySelectorAll('[data-ctab]').forEach(button => {
      button.onclick = () => {
        tab = button.dataset.ctab;
        render();
      };
    });
  };
  render();
}

export function searchChatsScreen(queryOrId = '') {
  clearHeader();
  let query = typeof queryOrId === 'string' ? queryOrId : '';

  const render = () => {
    const term = query.trim().toLowerCase();
    const rows = chats
      .map((chat, index) => ({ chat, index }))
      .filter(({ chat }) =>
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
            ? rows.map(({ chat, index }) => `
              <button class="chat-row" data-action="chat" data-id="${index}">
                ${avatar(chat.photo, chat.team)}
                <div class="chat-copy"><strong>${esc(chat.name)}</strong><span>${esc(chat.preview)} · ${esc(chat.time)}</span></div>
              </button>`).join('') || '<p class="search-none">Ничего не найдено</p>'
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

export function newDmScreen() {
  clearHeader();
  const friends = people.slice(0, 3);
  const members = people.slice(1, 3);
  let selected = new Set();
  let query = '';

  const render = () => {
    const term = query.trim().toLowerCase();
    const filter = list => list.filter(person => !term || person.name.toLowerCase().includes(term));
    view.innerHTML = `
      <div class="new-dm-page">
        <header class="modal-head">
          <button data-action="chats" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Новое сообщение</h1>
          <button class="head-action ${selected.size ? 'on' : ''}" data-action="chat" data-id="0" ${selected.size ? '' : 'disabled'}>Чат</button>
        </header>
        <h2 class="invite-title">Пригласите в чат</h2>
        <input class="plain-search" id="dmSearch" placeholder="Поиск..." value="${esc(query)}">

        <h3 class="list-label">Подруги</h3>
        ${filter(friends).map(person => row(person)).join('') || '<p class="search-none">Никого не нашли</p>'}

        <h3 class="list-label">Из общих групп</h3>
        ${filter(members).map(person => row(person)).join('')}
      </div>`;

    view.querySelector('#dmSearch').oninput = event => {
      query = event.target.value;
      render();
    };
    view.querySelectorAll('[data-pick]').forEach(button => {
      button.onclick = () => {
        const id = Number(button.dataset.pick);
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        render();
      };
    });
    if (query) {
      const input = view.querySelector('#dmSearch');
      input.focus();
      input.setSelectionRange(query.length, query.length);
    }
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
    <button class="chat-bubble ${message.from === 'me' ? 'mine' : ''}" type="button" data-action="message-menu" data-id="${chat.personId || 0}" data-msg="${index}" data-chat="${chatId}">
      ${message.from === 'me' ? '' : avatar(chat.photo, chat.team)}
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
        ${message.reaction ? `
          <div class="bubble-reactions">
            <span>${message.reaction} 1</span>
            <i class="ti ti-mood-plus"></i>
          </div>` : ''}
      </div>
    </button>`;

  const recSecs = ui.recording?.secs || 0;
  const recLabel = `00:${String(recSecs).padStart(2, '0')}/01:00`;
  const hasDraft = Boolean(ui.draft.trim() || ui.attachPhoto || ui.attachAudio);

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
        ${chat.personId ? `<button id="chatMenuBtn" aria-label="Ещё"><i class="ti ti-dots"></i></button>` : '<span></span>'}
      </header>

      ${ui.menuOpen ? `
        <div class="chat-menu-pop">
          <button type="button" data-action="person" data-id="${chat.personId}">Смотреть профиль</button>
          <button type="button" id="removeFriend">Удалить из подруг</button>
          <button type="button" data-action="report-flow" data-id="${chat.personId}">Пожаловаться</button>
        </div>` : ''}

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

      ${ui.attachAudio ? `
        <div class="draft-audio">
          <i class="ti ti-player-play-filled"></i>
          <div>
            <span class="audio-track"></span>
            <small>Аудиосообщение</small>
          </div>
          <time>0:${String(ui.attachAudio.secs || 10).padStart(2, '0')}</time>
          <button type="button" id="clearAudio" aria-label="Убрать"><i class="ti ti-x"></i></button>
        </div>` : ''}

      ${ui.recording ? `
        <div class="record-bar">
          <div class="record-pill ${recSecs > 0 ? 'live' : ''}">
            <i class="rec-dot"></i>
            <span id="recTimer">${recLabel}</span>
            ${recSecs > 0 ? '<span class="rec-wave" aria-hidden="true"></span>' : ''}
          </div>
          <button class="record-stop" id="stopRecord" aria-label="Стоп">
            ${recSecs > 0 ? '<i class="stop-sq"></i>' : '<i class="stop-dot"></i>'}
          </button>
        </div>` : `
      <div class="message-bar">
        <button class="msg-add ${ui.attachOpen ? 'open' : ''}" id="toggleAttach" aria-label="Вложение">
          <i class="ti ti-${ui.attachOpen ? 'x' : 'plus'}"></i>
        </button>
        <label class="msg-field">
          <input id="msgInput" placeholder="Написать сообщение" value="${esc(ui.draft)}" maxlength="500">
          <i class="ti ti-mood-smile"></i>
        </label>
        ${hasDraft
          ? `<button class="msg-send" id="sendMsg" aria-label="Отправить"><i class="ti ti-arrow-up"></i></button>`
          : `<button id="openGif" aria-label="GIF">GIF</button>
             <button id="quickPhoto" aria-label="Фото"><i class="ti ti-photo"></i></button>
             <button id="startRecord" aria-label="Голос"><i class="ti ti-microphone"></i></button>`}
      </div>`}
    </div>`;

  const input = view.querySelector('#msgInput');
  input?.addEventListener('input', () => {
    ui.draft = input.value;
    setChatUi(chatId, ui);
    const has = ui.draft.trim() || ui.attachPhoto || ui.attachAudio;
    const sendVisible = Boolean(view.querySelector('#sendMsg'));
    if (Boolean(has) !== sendVisible) chatScreen(chatId);
  });

  view.querySelector('#chatMenuBtn')?.addEventListener('click', () => {
    ui.menuOpen = !ui.menuOpen;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#removeFriend')?.addEventListener('click', () => {
    ui.menuOpen = false;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });

  view.querySelector('#toggleAttach')?.addEventListener('click', () => {
    ui.attachOpen = !ui.attachOpen;
    ui.gifOpen = false;
    ui.menuOpen = false;
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
  const beginRecording = (secs = 0) => {
    stopRecordTick();
    ui.recording = { secs };
    ui.attachOpen = false;
    ui.gifOpen = false;
    ui.menuOpen = false;
    setChatUi(chatId, ui);
    chatScreen(chatId);
    startRecordTick(chatId);
  };
  view.querySelector('#startRecord')?.addEventListener('click', () => beginRecording(0));
  view.querySelector('#stopRecord')?.addEventListener('click', () => {
    stopRecordTick();
    const secs = Math.max(ui.recording?.secs || 0, 1);
    ui.recording = null;
    ui.attachAudio = { secs };
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelectorAll('[data-attach]').forEach(button => {
    button.onclick = () => {
      const kind = button.dataset.attach;
      if (kind === 'photo' || kind === 'camera') ui.attachPhoto = PHOTOS.palms;
      if (kind === 'audio') {
        ui.attachOpen = false;
        setChatUi(chatId, ui);
        beginRecording(0);
        return;
      }
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
  view.querySelector('#clearAudio')?.addEventListener('click', () => {
    ui.attachAudio = null;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });
  view.querySelector('#sendMsg')?.addEventListener('click', () => {
    if (!ui.draft.trim() && !ui.attachPhoto && !ui.attachAudio) return;
    chat.messages = chat.messages || [];
    chat.messages.push({
      from: 'me',
      name: 'Вы',
      text: ui.draft.trim(),
      time: 'сейчас',
      image: ui.attachPhoto || undefined,
      audio: ui.attachAudio ? { duration: `0:${String(ui.attachAudio.secs).padStart(2, '0')}` } : undefined,
      replyTo: ui.reply?.text
    });
    chat.preview = ui.draft.trim() || (ui.attachAudio ? 'Аудиосообщение' : 'Фото');
    ui.draft = '';
    ui.attachPhoto = null;
    ui.attachAudio = null;
    ui.reply = null;
    ui.attachOpen = false;
    setChatUi(chatId, ui);
    chatScreen(chatId);
  });

  if (ui.recording) startRecordTick(chatId);

  if (ui.draft) {
    input?.focus();
    input?.setSelectionRange(ui.draft.length, ui.draft.length);
  }
}

let recordTimer = null;
function stopRecordTick() {
  if (recordTimer) {
    clearInterval(recordTimer);
    recordTimer = null;
  }
}
function startRecordTick(chatId) {
  stopRecordTick();
  recordTimer = setInterval(() => {
    const ui = getChatUi(chatId);
    if (!ui.recording) {
      stopRecordTick();
      return;
    }
    const prev = ui.recording.secs || 0;
    const next = Math.min(60, prev + 1);
    ui.recording = { secs: next };
    setChatUi(chatId, ui);
    const el = document.querySelector('#recTimer');
    if (el) el.textContent = `00:${String(next).padStart(2, '0')}/01:00`;
    if (prev === 0 && next === 1) chatScreen(chatId);
    if (next >= 60) {
      stopRecordTick();
      ui.recording = null;
      ui.attachAudio = { secs: 60 };
      setChatUi(chatId, ui);
      chatScreen(chatId);
    }
  }, 1000);
}

const chatUiState = new Map();
function getChatUi(id) {
  if (!chatUiState.has(id)) {
    chatUiState.set(id, {
      attachOpen: false,
      gifOpen: false,
      menuOpen: false,
      reply: null,
      draft: '',
      attachPhoto: null,
      attachAudio: null,
      recording: null
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
  let emailHidden = false;
  let dismissed = new Set();
  let accepted = new Set();

  const render = () => {
    const items = activity.filter(item => !dismissed.has(item.id));
    view.innerHTML = `
      <div class="activity-page">
        <header class="chats-head">
          <h1>Лента</h1>
          <span></span>
        </header>
        ${!emailHidden ? `
          <div class="activity-card">
            <div>
              <b>Добавьте email 💌</b>
              <span>Чтобы не потерять доступ к аккаунту</span>
            </div>
            <button type="button" data-action="add-email">Добавить</button>
            <button type="button" class="activity-card-x" id="hideEmail" aria-label="Скрыть"><i class="ti ti-x"></i></button>
          </div>` : ''}
        <div class="activity-list">
          ${items.map(item => `
            <div class="activity-item ${item.unread ? 'unread' : ''}">
              <button class="activity-main" type="button"
                ${item.action ? `data-action="${item.action}" data-id="${item.actionId ?? ''}"` : ''}>
                <div class="activity-avatar">
                  <img src="${esc(item.photo)}" alt="">
                  ${item.verified ? '<span class="verified"><i class="ti ti-check"></i></span>' : ''}
                  ${item.kind === 'event' ? '<span class="kind-badge"><i class="ti ti-calendar-event"></i></span>' : ''}
                </div>
                <div class="activity-copy">
                  ${item.month ? `<small class="activity-month">${esc(item.month)}</small>` : ''}
                  <b>${esc(item.title)} <time>${esc(item.time)}</time></b>
                  <span>${esc(item.text)}</span>
                </div>
                ${item.unread && item.kind !== 'friend' ? '<i class="unread-dot"></i>' : ''}
              </button>
              ${item.kind === 'friend' && !accepted.has(item.id) ? `
                <button type="button" class="friend-add" data-accept="${esc(item.id)}">Добавить</button>` : ''}
              ${item.kind === 'friend' && accepted.has(item.id) ? '<em class="added-pill">Добавлено</em>' : ''}
            </div>`).join('') || '<p class="muted activity-empty">Пока тихо — зайдите позже</p>'}
        </div>
      </div>`;

    view.querySelector('#hideEmail')?.addEventListener('click', event => {
      event.stopPropagation();
      emailHidden = true;
      render();
    });
    view.querySelectorAll('[data-accept]').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        accepted.add(button.dataset.accept);
        render();
      };
    });
  };
  render();
}
