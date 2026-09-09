import { chats, people, activity } from '../data.js';
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

      <button class="compose" data-action="people" aria-label="Написать"><i class="ti ti-send"></i></button>
    </div>`;
}

export function searchChatsScreen(query = '') {
  clearHeader();
  const term = query.trim().toLowerCase();
  const rows = chats.filter(chat =>
    !term || chat.name.toLowerCase().includes(term) || chat.preview.toLowerCase().includes(term)
  );

  view.innerHTML = `
    <div class="search-page">
      <header class="chats-head">
        <button data-action="chats" aria-label="Назад"><i class="ti ti-x"></i></button>
        <h1>Поиск</h1>
        <span></span>
      </header>
      <div class="search-box">
        <i class="ti ti-search"></i>
        <input id="chatSearch" placeholder="Найти переписку..." value="${esc(query)}">
        <button type="button" id="clearSearch">×</button>
      </div>
      <div class="search-results">
        ${term
          ? rows.map((chat, index) => `
            <button class="chat-row" data-action="chat" data-id="${index}">
              ${avatar(chat.photo, chat.team)}
              <div class="chat-copy"><strong>${esc(chat.name)}</strong><span>${esc(chat.preview)}</span></div>
            </button>`).join('') || '<p class="search-none">Ничего не найдено</p>'
          : `<div class="chats-empty compact">
              <div class="empty-badge"><i class="ti ti-search"></i></div>
              <h2>Поиск по чатам</h2>
            </div>`}
      </div>
    </div>`;

  const input = view.querySelector('#chatSearch');
  input.focus();
  input.oninput = () => searchChatsScreen(input.value);
  view.querySelector('#clearSearch').onclick = () => searchChatsScreen('');
}

export function chatScreen(id) {
  clearHeader();
  const chat = chats[Number(id) || 0];
  const messages = chat.messages || [];

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
        <button aria-label="Ещё"><i class="ti ti-dots"></i></button>
      </header>

      <main class="chat-thread">
        <img class="chat-photo" src="${esc(chat.photo || people[0].photo)}" alt="">
        <p class="chat-meta">Вы познакомились с ${esc(chat.name)}</p>
        <span class="chat-pill">кофе</span>
        ${messages.map(message => `
          <div class="chat-bubble">
            ${avatar(chat.photo, chat.team)}
            <div>
              <div class="bubble-head"><b>${esc(message.name)}</b><time>${esc(message.time)}</time></div>
              <p>${esc(message.text)}</p>
            </div>
          </div>`).join('')}
      </main>

      <div class="message-bar">
        <button class="msg-add" aria-label="Вложение"><i class="ti ti-plus"></i></button>
        <label class="msg-field">
          <input placeholder="Написать сообщение" disabled>
          <i class="ti ti-mood-smile"></i>
        </label>
        <button aria-label="GIF">GIF</button>
        <button aria-label="Фото"><i class="ti ti-photo"></i></button>
        <button aria-label="Голос"><i class="ti ti-microphone"></i></button>
      </div>
    </div>`;
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
