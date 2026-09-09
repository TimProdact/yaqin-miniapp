import { chats, people } from '../data.js';
import { view, esc, setTitle, setBackTitle } from '../dom.js';

function avatar(photo) {
  return `<div class="chat-avatar">${photo ? `<img src="${esc(photo)}">` : '✿'}</div>`;
}

export function chatsScreen() {
  setTitle('My chats');
  view.innerHTML = `
    <div class="screen-content">
      <div class="chats-title">
        <h2>My chats</h2>
        <button data-action="search"><i class="ti ti-search"></i></button>
      </div>
      <h2>New Friends</h2>
      <div class="new-friend"><img src="${esc(people[0].photo)}"><b>NEW</b></div>
      <div class="chat-tabs">
        <button class="active">DMs <b>2</b></button>
        <button>Threads</button>
        <button>Events</button>
      </div>
      ${chats.map((chat, index) => `
        <div class="chat-row" data-action="chat" data-id="${index}">
          ${avatar(chat.photo)}
          <div><strong>${esc(chat.name)}</strong><span>${esc(chat.preview)} · 1d</span></div>
          <i></i>
        </div>`).join('')}
      <button class="compose">✈</button>
    </div>`;
}

export function searchChatsScreen(query = '') {
  const term = query.trim().toLowerCase();
  const rows = chats.filter(chat =>
    !term || chat.name.toLowerCase().includes(term) || chat.preview.toLowerCase().includes(term)
  );

  setBackTitle('Search chats');
  view.innerHTML = `
    <div class="search-page">
      <div class="search-box">
        <i class="ti ti-search"></i>
        <input id="chatSearch" placeholder="Search conversations..." value="${esc(query)}">
        <button id="clearSearch">×</button>
      </div>
      <div class="search-results">
        ${term
          ? rows.map(chat => `
            <div class="chat-row">
              ${avatar(chat.photo)}
              <div><strong>${esc(chat.name)}</strong><span>${esc(chat.preview)}</span></div>
              <time>1d</time>
            </div>`).join('')
          : '<div class="search-empty"><div>♟</div><h2>Search chats</h2></div>'}
      </div>
    </div>`;

  const input = view.querySelector('#chatSearch');
  input.focus();
  input.oninput = () => searchChatsScreen(input.value);
  view.querySelector('#clearSearch').onclick = () => searchChatsScreen('');
}

export function chatScreen(id) {
  const chat = chats[Number(id) || 0];
  view.innerHTML = `
    <div class="chat-page">
      <header>
        <button data-action="chats">←</button>
        <div><h1>${esc(chat.name)}</h1><p>● Offline</p></div>
        <button>•••</button>
      </header>
      <main>
        <img class="chat-photo" src="${esc(chat.photo || people[0].photo)}">
        <p>This is the beginning of your chat history<br>with ${esc(chat.name)}</p>
        <div class="chat-tags"><span>Photography</span><span>Coffee</span></div>
      </main>
      <div class="message-bar">＋ <span>Send a message</span> ☺ GIF ▣ 🎙</div>
    </div>`;
}

export function activityScreen() {
  setTitle('Activity');
  view.innerHTML = `
    <div class="screen-content activity-list">
      <div class="activity-item">
        <div class="activity-icon like-icon">♥</div>
        <div><b>Мила отправила симпатию</b><span>Только что</span></div>
      </div>
      <div class="activity-item">
        <div class="activity-icon">✦</div>
        <div><b>У вас новый мэтч с Милой</b><span>1 час назад</span></div>
      </div>
      <div class="activity-item">
        <div class="activity-icon">♟</div>
        <div><b>Добро пожаловать в Yaqin</b><span>Вчера</span></div>
      </div>
    </div>`;
}
