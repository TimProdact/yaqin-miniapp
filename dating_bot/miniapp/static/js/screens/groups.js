import { groups, events } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';

export function groupsScreen() {
  clearHeader();
  const mine = groups.filter(group => group.joined);

  view.innerHTML = `
    <div class="groups-page">
      <header class="chats-head">
        <h1>Мои группы</h1>
        <span></span>
      </header>
      <button class="groups-sort" type="button">По алфавиту <i class="ti ti-chevron-down"></i></button>

      ${mine.length
        ? `<div class="groups-list">
            ${mine.map(group => `
              <button class="group-row ${group.id === 0 ? 'active' : ''}" data-action="group" data-id="${group.id}">
                <img src="${esc(group.photo)}" alt="">
                <div>
                  <strong>${esc(group.title)}</strong>
                  <span>${esc(group.active)}</span>
                </div>
              </button>`).join('')}
          </div>`
        : `<div class="groups-empty">
            <div class="empty-badge"><i class="ti ti-users"></i></div>
            <h2>Создайте группу</h2>
            <p>Соберите подруг по интересам, пригласите знакомых и планируйте встречи.</p>
            <button class="empty-primary" type="button">Создать группу</button>
          </div>`}

      <h2 class="groups-discover-title">Найти группу</h2>
      <div class="groups-discover">
        ${groups.filter(group => !group.joined).map(group => `
          <article class="discover-group">
            <img src="${esc(group.photo)}" alt="">
            <div>
              <b>${esc(group.title)}</b>
              <span>${esc(group.subtitle)}</span>
              <button data-action="group" data-id="${group.id}">Вступить</button>
            </div>
          </article>`).join('')}
      </div>

      <button class="compose" data-action="groups" aria-label="Создать"><i class="ti ti-plus"></i></button>
    </div>`;
}

export function groupScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0];

  view.innerHTML = `
    <article class="group-sheet">
      <div class="sheet-handle"></div>
      <header class="sheet-head">
        <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <button aria-label="Ещё"><i class="ti ti-dots"></i></button>
      </header>
      <img class="group-cover" src="${esc(group.photo)}" alt="">
      <h1>${esc(group.title)}</h1>
      <p class="group-about">${esc(group.about)}</p>
      <span class="group-city"><i class="ti ti-map-pin"></i>${esc(group.city)}</span>
      <p class="group-members">${group.members.toLocaleString('ru-RU')} участниц</p>
      <button class="group-join">${group.joined ? 'Открыть чат' : 'Вступить в группу'}</button>
    </article>`;
}

export function eventsScreen() {
  clearHeader();
  view.innerHTML = `
    <div class="events-page">
      <header class="chats-head">
        <h1>События</h1>
        <button data-action="me" aria-label="Профиль"><i class="ti ti-user"></i></button>
      </header>

      <section class="events-calendar">
        <h2>Сентябрь 2026</h2>
        <div class="cal-week">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(day => `<span>${day}</span>`).join('')}</div>
        <div class="cal-grid">
          ${Array.from({ length: 30 }, (_, index) => {
            const day = index + 1;
            const marked = events.some(event => Number(event.day) === day);
            const selected = day === 14;
            return `<button class="${selected ? 'on' : ''} ${marked ? 'dot' : ''}" type="button">${day}</button>`;
          }).join('')}
        </div>
      </section>

      <div class="events-list">
        ${events.map(event => `
          <button class="event-card" data-action="event" data-id="${event.id}">
            <div class="event-date"><span>${esc(event.month)}</span><b>${esc(event.day)}</b></div>
            <div class="event-copy">
              <strong>${esc(event.title)}</strong>
              <span class="when">${esc(event.when)}</span>
              <span class="where">${esc(event.place)}</span>
              <div class="event-foot">
                <span>${event.going} идут</span>
                <em>RSVP</em>
              </div>
            </div>
          </button>`).join('')}
      </div>
    </div>`;
}

export function eventScreen(id) {
  clearHeader();
  const event = events[Number(id) || 0];

  view.innerHTML = `
    <article class="event-sheet">
      <header class="sheet-head">
        <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <div>
          <button aria-label="Поделиться"><i class="ti ti-share-2"></i></button>
          <button aria-label="Ещё"><i class="ti ti-dots-vertical"></i></button>
        </div>
      </header>
      <img class="event-cover" src="${esc(event.photo)}" alt="">
      <h1>${esc(event.title)}</h1>
      <ul class="event-meta">
        <li><i class="ti ti-users"></i>${esc(event.group)}</li>
        <li><i class="ti ti-user"></i>Создала ${esc(event.host)}</li>
        <li><i class="ti ti-clock"></i>${esc(event.when)}</li>
        <li><i class="ti ti-map-pin"></i><div><b>${esc(event.place)}</b><span>${esc(event.address)}</span></div></li>
        <li><i class="ti ti-check"></i>${event.going} человек идут</li>
      </ul>
      <div class="event-avatars">
        ${Array.from({ length: 6 }, (_, index) => `<span style="--i:${index}"></span>`).join('')}
      </div>
      <div class="event-rsvp">
        <button type="button">В другой раз 😢</button>
        <button type="button">Интересно 👋</button>
        <button type="button" class="on">Иду 👍</button>
      </div>
    </article>`;
}
