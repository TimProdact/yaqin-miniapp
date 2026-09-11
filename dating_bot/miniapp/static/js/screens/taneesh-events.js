import { people, defaultProfile } from '../data.js';
import { view, esc, clearHeader, showPlaceholder } from '../dom.js';
import { getState, saveState } from '../state.js';
import { navigate } from '../router.js';
import { allEvents, findEvent } from './community.js';
import { showCelebrate } from '../celebrate.js';
import { isLive } from '../api.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { peopleGoingBlockHtml, bindPeopleGoingBlock, closePeopleGoingSheet } from '../people-going.js';

/** Демо: купили билет / записались (жёсткое участие). */
const DEMO_ATTENDING = {
  0: [
    { id: 1, name: 'Малика', age: 26, photo: people[0].photo, message: 'Билет куплен' },
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: 'Билет куплен' }
  ],
  1: [
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: 'Билет куплен' }
  ],
  2: [
    { id: 1, name: 'Малика', age: 26, photo: people[0].photo, message: 'Бронь · оплата на входе' }
  ],
  4: [
    { id: 1, name: 'Малика', age: 26, photo: people[0].photo, message: 'Запись оформлена' },
    { id: 3, name: 'Аня', age: 24, photo: people[2].photo, message: 'Запись оформлена' }
  ]
};

/** Демо: нажали «Хочу пойти», но ещё без билета/записи. */
const DEMO_WANT = {
  0: [
    { id: 3, name: 'Аня', age: 24, photo: people[2].photo, message: '' }
  ],
  1: [
    { id: 3, name: 'Аня', age: 24, photo: people[2].photo, message: 'Кто за попкорн после?' },
    { id: 1, name: 'Малика', age: 26, photo: people[0].photo, message: 'Думаю взять билет' }
  ],
  2: [
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: 'Ещё не забронировала' }
  ],
  3: [
    { id: 1, name: 'Малика', age: 26, photo: people[0].photo, message: 'Планирую прийти' },
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: 'Если будет хорошая погода' },
    { id: 3, name: 'Аня', age: 24, photo: people[2].photo, message: '' }
  ],
  4: [
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: 'Ещё не записалась' }
  ]
};

function money(amount) {
  return `${Number(amount || 0).toLocaleString('ru-RU')} сум`;
}

function getTickets() {
  return getState().tickets || [];
}

function ticketForEvent(eventId) {
  const key = String(eventId);
  return getTickets().find(ticket => String(ticket.eventId) === key);
}

function ticketsForEvent(eventId) {
  const key = String(eventId);
  return getTickets().filter(ticket => String(ticket.eventId) === key);
}

function isEventHost(event) {
  return event?.hostId === 'me';
}

function hostTicket(eventId) {
  return ticketsForEvent(eventId).find(ticket => ticket.role === 'host') || ticketForEvent(eventId);
}

function shareEvent(event) {
  const text = `Приходи на «${event.title}» · ${event.when || ''} · ${event.place || ''} — Yaqin`;
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/yaqin_bot')}&text=${encodeURIComponent(text)}`);
      return;
    }
  } catch (_) { /* ignore */ }
  navigator.share?.({ text }).catch(() => {});
}

function isDoorMode(event) {
  const mode = event?.ticketMode || event?.paymentMode;
  return mode === 'door' || mode === 'at_door';
}

function isFreeMode(event) {
  if (event?.isFree === true) return true;
  const mode = event?.ticketMode;
  return mode === 'free' || (!mode && !Number(event?.price));
}

/** Свободный вход без регистрации — второй кнопки нет. */
function isOpenWalkIn(event) {
  if (!isFreeMode(event) || isDoorMode(event)) return false;
  const mode = event?.freeEntryMode || 'open';
  return mode === 'open' || mode === 'walkin';
}

/** Нужен учёт гостей: онлайн / на входе / бесплатно с регистрацией. */
function needsGuestPass(event) {
  if (isDoorMode(event)) return true;
  if (!isFreeMode(event)) return true;
  const mode = event?.freeEntryMode;
  return mode === 'approval' || mode === 'register' || mode === 'rsvp';
}

function priceLabel(event) {
  if (isOpenWalkIn(event)) return 'Свободный вход';
  if (isFreeMode(event) && !isDoorMode(event)) return 'Бесплатно · с записью';
  if (isDoorMode(event)) return `на входе · ${money(event.price)}`;
  return money(event.price);
}

/** Короткий бейдж на обложке карточки. */
function priceBadge(event) {
  if (isOpenWalkIn(event)) return 'Бесплатно';
  if (isFreeMode(event) && !isDoorMode(event)) return 'С записью';
  if (isDoorMode(event)) return money(event.price) || 'На входе';
  return money(event.price) || 'Билет';
}

function hardPassLabel(event) {
  if (ticketForEvent(event.id)) return 'Мой билет';
  if (isDoorMode(event)) return 'Оформить бронь';
  if (isFreeMode(event)) return 'Записаться';
  return 'Купить билет';
}

function meGuest(message = '') {
  const profile = getState().profile || defaultProfile;
  return {
    id: 'me',
    name: profile.name || defaultProfile.name,
    age: profile.age || defaultProfile.age,
    photo: profile.photo || defaultProfile.photo,
    message
  };
}

function demoList(map, eventId) {
  const key = Number(eventId);
  const raw = Number.isFinite(key) && map[key] ? map[key] : [];
  return raw.map(person => ({ ...person, demo: true }));
}

function mergeMeFirst(demo, mine) {
  if (!mine) return demo;
  return [mine, ...demo.filter(person => person.id !== 'me' && String(person.id) !== String(mine.id))];
}

/** Кто купил билет / записался / забронировал. */
function attendingForEvent(eventId) {
  const demo = demoList(DEMO_ATTENDING, eventId);
  const owned = ticketForEvent(eventId);
  if (!owned || owned.role === 'host') return demo;
  const label = owned.mode === 'door'
    ? 'Бронь · оплата на входе'
    : owned.mode === 'free'
      ? 'Запись оформлена'
      : 'Билет куплен';
  return mergeMeFirst(demo, meGuest(label));
}

/** Интерес без билета/записи. */
function wantingForEvent(eventId) {
  const attendingIds = new Set(attendingForEvent(eventId).map(person => String(person.id)));
  const demo = demoList(DEMO_WANT, eventId)
    .filter(person => !attendingIds.has(String(person.id)));
  if (ticketForEvent(eventId)) return demo;
  const mine = (getState().eventGoing || {})[eventId]
    || (getState().eventGoing || {})[String(eventId)];
  const flagged = isInterested(eventId);
  if (!mine && !flagged) return demo;
  return mergeMeFirst(demo, mine || meGuest());
}

/** @deprecated используйте attendingForEvent / wantingForEvent */
function goingForEvent(eventId) {
  return wantingForEvent(eventId);
}

function saveGoing(eventId, entry) {
  const state = getState();
  saveState({
    ...state,
    eventGoing: { ...(state.eventGoing || {}), [eventId]: entry },
    eventInterest: { ...(state.eventInterest || {}), [eventId]: true }
  });
}

function clearInterest(eventId) {
  const state = getState();
  const nextGoing = { ...(state.eventGoing || {}) };
  const nextInterest = { ...(state.eventInterest || {}) };
  delete nextGoing[eventId];
  delete nextGoing[String(eventId)];
  delete nextInterest[eventId];
  delete nextInterest[String(eventId)];
  saveState({ ...state, eventGoing: nextGoing, eventInterest: nextInterest });
}

function isInterested(eventId) {
  const interested = getState().eventInterest || {};
  return Boolean(interested[eventId] || interested[String(eventId)] || (getState().eventGoing || {})[eventId]);
}

function peopleBlocksHtml(event) {
  const attending = attendingForEvent(event.id);
  const wanting = wantingForEvent(event.id);
  const hard = needsGuestPass(event);
  return `
    ${hard ? `
      <div class="people-going-wrap">
        ${peopleGoingBlockHtml(attending, {
          key: 'attending',
          title: 'Кто идёт',
          empty: isDoorMode(event)
            ? 'Пока никто не оформил бронь'
            : isFreeMode(event)
              ? 'Пока никто не записался'
              : 'Пока никто не купил билет'
        })}
      </div>` : ''}
    <div class="people-going-wrap">
      ${peopleGoingBlockHtml(wanting, {
        key: 'wanting',
        title: 'Хотят пойти',
        empty: 'Пока никого'
      })}
    </div>`;
}

function bindPeopleBlocks(root, event) {
  if (needsGuestPass(event)) {
    bindPeopleGoingBlock(root, attendingForEvent(event.id), {
      key: 'attending',
      title: 'Кто идёт'
    });
  }
  bindPeopleGoingBlock(root, wantingForEvent(event.id), {
    key: 'wanting',
    title: 'Хотят пойти'
  });
}

/** Лента событий + покупка билета в Mini App. */
const MONTH_INDEX = {
  янв: 0, фев: 1, мар: 2, апр: 3, май: 4, июн: 5,
  июл: 6, авг: 7, сен: 8, окт: 9, ноя: 10, дек: 11
};
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

/** Дата события из day/month или строки when. */
function eventDate(event) {
  const monthKey = String(event?.month || '').toLowerCase();
  const day = Number(event?.day);
  if (Number.isFinite(day) && monthKey in MONTH_INDEX) {
    const year = new Date().getFullYear();
    return startOfDay(new Date(year, MONTH_INDEX[monthKey], day));
  }
  const match = String(event?.when || '').match(/(\d{1,2})\s+([а-яё]{3})/i);
  if (match) {
    const m = MONTH_INDEX[match[2].toLowerCase()];
    if (m != null) {
      return startOfDay(new Date(new Date().getFullYear(), m, Number(match[1])));
    }
  }
  if (event?.createdAt) {
    const created = new Date(event.createdAt);
    if (!Number.isNaN(created.getTime())) return startOfDay(created);
  }
  return null;
}

function weekendBounds(from = new Date()) {
  const today = startOfDay(from);
  const dow = today.getDay(); // 0 Sun … 6 Sat
  let sat;
  let sun;
  if (dow === 0) {
    sat = addDays(today, -1);
    sun = today;
  } else if (dow === 6) {
    sat = today;
    sun = addDays(today, 1);
  } else {
    sat = addDays(today, 6 - dow);
    sun = addDays(today, 7 - dow);
  }
  return { sat, sun };
}

function weekBounds(from = new Date()) {
  const today = startOfDay(from);
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(today, mondayOffset);
  const sunday = addDays(monday, 6);
  return { monday, sunday };
}

function matchesDateFilter(event, filter, pickIso) {
  if (filter === 'any') return true;
  const date = eventDate(event);
  if (!date) return filter === 'any';
  const today = startOfDay(new Date());
  if (filter === 'today') return date.getTime() === today.getTime();
  if (filter === 'tomorrow') return date.getTime() === addDays(today, 1).getTime();
  if (filter === 'weekend') {
    const { sat, sun } = weekendBounds(today);
    const t = date.getTime();
    return t >= sat.getTime() && t <= sun.getTime();
  }
  if (filter === 'week') {
    const { monday, sunday } = weekBounds(today);
    const t = date.getTime();
    return t >= monday.getTime() && t <= sunday.getTime();
  }
  if (filter === 'pick' && pickIso) {
    const pick = startOfDay(new Date(`${pickIso}T12:00:00`));
    if (Number.isNaN(pick.getTime())) return false;
    return date.getTime() === pick.getTime();
  }
  return true;
}

function eventCardHtml(event) {
  const hard = needsGuestPass(event);
  const previewPeople = hard
    ? attendingForEvent(event.id)
    : wantingForEvent(event.id);
  const preview = previewPeople.slice(0, 3);
  const count = previewPeople.length;
  return `
    <article class="taneesh-event-card">
      <button type="button" class="taneesh-event-hit" data-action="event" data-id="${esc(event.id)}">
        <div class="event-photo">
          <img src="${esc(event.photo)}" alt="">
          <em class="event-photo-badge">${esc(priceBadge(event))}</em>
        </div>
        <div class="taneesh-event-copy">
          <strong>${esc(event.title)}</strong>
          <span>${esc(event.when)}</span>
        </div>
      </button>
      <div class="taneesh-event-foot">
        <div class="taneesh-going">
          ${preview.map(person => `<img src="${esc(person.photo)}" alt="">`).join('')}
          <span>${count}</span>
        </div>
      </div>
    </article>`;
}

export function taneeshEventsScreen() {
  clearHeader();
  let dateFilter = 'any'; // any | today | tomorrow | weekend | week | pick
  let pickIso = '';
  let searchOpen = false;

  const filters = [
    ['any', 'Любая'],
    ['today', 'Сегодня'],
    ['tomorrow', 'Завтра'],
    ['weekend', 'Выходные'],
    ['week', 'Эта неделя'],
    ['pick', 'Дата']
  ];

  const render = () => {
    const feed = allEvents().filter(event => matchesDateFilter(event, dateFilter, pickIso));
    const pickLabel = pickIso
      ? (() => {
        const d = new Date(`${pickIso}T12:00:00`);
        return Number.isNaN(d.getTime()) ? 'Дата' : `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
      })()
      : 'Дата';
    const filterActive = dateFilter !== 'any';

    view.innerHTML = `
      <div class="events-feed-page">
        <div class="list-sticky-pill ${searchOpen ? 'is-search-open' : ''}">
          <header class="chats-head">
            <h1>События</h1>
            <div class="list-head-actions">
              <button type="button" id="toggleEventFilters" aria-label="${searchOpen ? 'Закрыть фильтры' : 'Фильтры'}" aria-expanded="${searchOpen ? 'true' : 'false'}" class="${searchOpen || filterActive ? 'on' : ''}">
                <i class="ti ${searchOpen ? 'ti-x' : 'ti-search'}"></i>
              </button>
            </div>
          </header>

          ${searchOpen ? `
            <div class="list-search-panel">
              <div class="events-date-bar">
                <div class="chats-pills events-date-pills" role="tablist" aria-label="Фильтр по дате">
                  ${filters.map(([id, label]) => `
                    <button type="button" class="${dateFilter === id ? 'on' : ''}" data-date-filter="${id}">
                      ${id === 'pick' ? esc(pickLabel) : esc(label)}
                    </button>`).join('')}
                </div>
                <input type="date" id="eventsPickDate" value="${esc(pickIso)}" hidden>
              </div>
            </div>` : ''}
        </div>

        <div class="events-feed">
          ${feed.length
            ? feed.map(eventCardHtml).join('')
            : `<div class="events-feed-empty">
                <p>Нет событий на эту дату</p>
                <button type="button" class="empty-primary" data-date-filter="any">Показать все</button>
              </div>`}
        </div>
      </div>`;

    view.querySelector('#toggleEventFilters')?.addEventListener('click', () => {
      searchOpen = !searchOpen;
      render();
    });
    view.querySelectorAll('[data-date-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const next = button.dataset.dateFilter;
        if (next === 'pick') {
          const input = view.querySelector('#eventsPickDate');
          if (!input) return;
          const onPicked = () => {
            pickIso = input.value || '';
            dateFilter = pickIso ? 'pick' : 'any';
            searchOpen = true;
            input.removeEventListener('change', onPicked);
            render();
          };
          input.addEventListener('change', onPicked);
          if (typeof input.showPicker === 'function') {
            try { input.showPicker(); } catch (_) { input.click(); }
          } else {
            input.click();
          }
          return;
        }
        dateFilter = next;
        pickIso = '';
        searchOpen = true;
        render();
      });
    });
  };

  render();
}

/** Карточка события: гость vs кабинет организатора (своё). */
export function taneeshEventDetailScreen(id) {
  clearHeader();
  const event = findEvent(id);
  if (!event) {
    showPlaceholder('✿', 'Событие не найдено', 'Вернитесь к афише и выберите другое.');
    return;
  }
  if (isEventHost(event)) {
    renderHostEventDashboard(event);
    return;
  }
  renderGuestEventDetail(event);
}

/** Кабинет своего события — блоки как профиль + вкладки. */
function renderHostEventDashboard(event) {
  let tab = 'overview'; // overview | guests | stats

  const render = () => {
    closePeopleGoingSheet();
    const attending = attendingForEvent(event.id);
    const wanting = wantingForEvent(event.id);
    const tickets = ticketsForEvent(event.id);
    const guestTickets = tickets.filter(ticket => ticket.role !== 'host');
    const hostQr = hostTicket(event.id);
    const capacity = Number(event.capacity) || 0;
    const interested = wanting.length;
    const soldCount = needsGuestPass(event)
      ? Math.max(guestTickets.length, attending.length)
      : 0;
    const fill = capacity ? Math.min(100, Math.round((soldCount / capacity) * 100)) : 0;
    const revenue = guestTickets.reduce((sum, ticket) => {
      if (ticket.mode === 'paid') return sum + Number(ticket.price || 0);
      return sum;
    }, 0);
    const doorExpected = isDoorMode(event)
      ? soldCount * Number(event.price || 0)
      : 0;
    const metaLine = [event.when, event.place].filter(Boolean).join(' · ');
    const tabs = [
      ['overview', 'Обзор'],
      ['guests', 'Гости'],
      ['stats', 'Статистика']
    ];

    view.innerHTML = `
      <article class="person-view event-detail-view host-event-page">
        <div class="person-hero event-detail-hero">
          <img class="person-hero-photo" src="${esc(event.photo)}" alt="">
          ${hasTelegramBack() ? '' : '<button class="hero-icon back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>'}
        </div>

        <section class="person-head">
          <div class="person-head-row">
            <div class="person-head-copy">
              <em class="taneesh-source yaqin">Ваше событие</em>
              <h1>${esc(event.title)}</h1>
              <p class="person-meta">${esc(metaLine)}</p>
              <p class="event-detail-price">${esc(priceLabel(event))}</p>
            </div>
            <button class="hero-wave" type="button" data-action="edit-event" data-id="${esc(event.id)}" aria-label="Редактировать">
              <i class="ti ti-pencil"></i>
            </button>
          </div>
          ${event.description ? `<p class="person-bio">${esc(event.description)}</p>` : ''}
        </section>

        <div class="host-event-tabs" role="tablist">
          ${tabs.map(([id, label]) => `
            <button type="button" class="${tab === id ? 'on' : ''}" data-host-tab="${id}" role="tab" aria-selected="${tab === id}">
              ${label}
            </button>`).join('')}
        </div>

        <div class="host-event-body">
          ${tab === 'overview' ? `
            <section class="me-panel event-detail-panel">
              <div class="me-section-head"><div><h3>Детали</h3></div></div>
              <ul class="taneesh-detail-meta">
                <li><i class="ti ti-calendar"></i>${esc(event.when)}</li>
                <li><i class="ti ti-map-pin"></i>${esc(event.place)}</li>
                ${event.address ? `<li><i class="ti ti-building"></i>${esc(event.address)}</li>` : ''}
                ${capacity ? `<li><i class="ti ti-users"></i>до ${capacity} мест · занято ${soldCount}</li>` : ''}
                <li><i class="ti ti-ticket"></i>${esc(priceLabel(event))}</li>
              </ul>
            </section>

            ${peopleBlocksHtml(event)}

            <section class="me-panel event-detail-panel">
              <div class="me-section-head"><div><h3>Действия</h3></div></div>
              <div class="me-mini-list">
                ${hostQr ? `
                  <button type="button" class="me-mini-row" data-action="ticket" data-id="${esc(hostQr.id)}">
                    <span class="host-action-icon"><i class="ti ti-qrcode"></i></span>
                    <div>
                      <strong>QR организатора</strong>
                      <span>Ваш вход / проверка на месте</span>
                    </div>
                    <i class="ti ti-chevron-right"></i>
                  </button>` : ''}
                <button type="button" class="me-mini-row" data-action="edit-event" data-id="${esc(event.id)}">
                  <span class="host-action-icon yellow"><i class="ti ti-pencil"></i></span>
                  <div>
                    <strong>Редактировать</strong>
                    <span>Название, время, место, вход</span>
                  </div>
                  <i class="ti ti-chevron-right"></i>
                </button>
                <button type="button" class="me-mini-row" id="hostShareRow">
                  <span class="host-action-icon blue"><i class="ti ti-share"></i></span>
                  <div>
                    <strong>Пригласить</strong>
                    <span>Ссылка на событие в Yaqin</span>
                  </div>
                  <i class="ti ti-chevron-right"></i>
                </button>
                <button type="button" class="me-mini-row" data-host-tab="guests">
                  <span class="host-action-icon green"><i class="ti ti-users"></i></span>
                  <div>
                    <strong>Гости</strong>
                    <span>${soldCount} идут · ${interested} интерес</span>
                  </div>
                  <i class="ti ti-chevron-right"></i>
                </button>
              </div>
            </section>
          ` : ''}

          ${tab === 'guests' ? `
            ${needsGuestPass(event) ? `
              <section class="me-panel event-detail-panel">
                <div class="me-section-head">
                  <div><h3>Кто идёт</h3></div>
                  <span class="host-count">${attending.length}</span>
                </div>
                ${attending.length ? `
                  <div class="me-mini-list">
                    ${attending.map(person => `
                      <${person.id === 'me' ? 'div' : 'button type="button"'} class="me-mini-row" ${person.id === 'me' ? '' : `data-action="person" data-id="${esc(String(person.id))}"`}>
                        <img src="${esc(person.photo)}" alt="">
                        <div>
                          <strong>${esc(person.name)}${person.age ? `, ${person.age}` : ''}${person.id === 'me' ? ' · вы' : ''}</strong>
                          <span>${person.message ? esc(person.message) : 'Билет / запись'}</span>
                        </div>
                        ${person.id === 'me' ? '' : '<i class="ti ti-chevron-right"></i>'}
                      </${person.id === 'me' ? 'div' : 'button'}>`).join('')}
                  </div>` : `
                  <p class="host-empty">Пока никто не оформил участие</p>`}
              </section>` : ''}

            <section class="me-panel event-detail-panel">
              <div class="me-section-head">
                <div><h3>Хотят пойти</h3></div>
                <span class="host-count">${wanting.length}</span>
              </div>
              ${wanting.length ? `
                <div class="me-mini-list">
                  ${wanting.map(person => `
                    <${person.id === 'me' ? 'div' : 'button type="button"'} class="me-mini-row" ${person.id === 'me' ? '' : `data-action="person" data-id="${esc(String(person.id))}"`}>
                      <img src="${esc(person.photo)}" alt="">
                      <div>
                        <strong>${esc(person.name)}${person.age ? `, ${person.age}` : ''}${person.id === 'me' ? ' · вы' : ''}</strong>
                        <span>${person.message ? esc(person.message) : 'Отметила интерес'}</span>
                      </div>
                      ${person.id === 'me' ? '' : '<i class="ti ti-chevron-right"></i>'}
                    </${person.id === 'me' ? 'div' : 'button'}>`).join('')}
                </div>` : `
                <p class="host-empty">Пока никого</p>`}
            </section>
          ` : ''}

          ${tab === 'stats' ? `
            <section class="me-panel event-detail-panel">
              <div class="me-section-head"><div><h3>Сводка</h3></div></div>
              <div class="host-stats-grid">
                <div class="host-stat">
                  <strong>${interested}</strong>
                  <span>Хотят пойти</span>
                </div>
                <div class="host-stat">
                  <strong>${soldCount}</strong>
                  <span>${needsGuestPass(event) ? 'Идут' : '—'}</span>
                </div>
                <div class="host-stat">
                  <strong>${capacity ? `${fill}%` : '—'}</strong>
                  <span>Заполнение</span>
                </div>
                <div class="host-stat">
                  <strong>${capacity || '—'}</strong>
                  <span>Вместимость</span>
                </div>
              </div>
            </section>

            <section class="me-panel event-detail-panel">
              <div class="me-section-head"><div><h3>Деньги</h3></div></div>
              <div class="me-mini-list">
                <div class="me-mini-row static">
                  <span class="host-action-icon yellow"><i class="ti ti-cash"></i></span>
                  <div>
                    <strong>${isDoorMode(event) ? money(doorExpected) : money(revenue)}</strong>
                    <span>${isDoorMode(event) ? 'Ожидаемо на входе' : isFreeMode(event) ? 'Бесплатное · выручки нет' : 'Оплачено в Mini App (демо)'}</span>
                  </div>
                </div>
                ${!isFreeMode(event) && !isDoorMode(event) ? `
                  <div class="me-mini-row static">
                    <span class="host-action-icon"><i class="ti ti-receipt"></i></span>
                    <div>
                      <strong>${money(event.fee || Math.round(Number(event.price || 0) * 0.1))} / билет</strong>
                      <span>Сервисный сбор гостя</span>
                    </div>
                  </div>` : ''}
              </div>
            </section>
          ` : ''}
        </div>
      </article>`;

    if (tab === 'overview') {
      bindPeopleBlocks(view, event);
    }

    view.querySelectorAll('[data-host-tab]').forEach(button => {
      button.addEventListener('click', () => {
        tab = button.dataset.hostTab;
        render();
      });
    });
    view.querySelector('#hostShareRow')?.addEventListener('click', () => shareEvent(event));
  };

  render();
}

/** Гостевой экран события. */
function renderGuestEventDetail(event) {
  const owned = ticketForEvent(event.id);
  const sourceLabel = event.source === 'yaqin' ? 'Yaqin' : 'Афиша';
  const hard = needsGuestPass(event);

  const render = () => {
    closePeopleGoingSheet();
    const mine = (getState().eventGoing || {})[event.id];
    const want = !owned && (isInterested(event.id) || mine);
    const metaLine = [event.when, event.place].filter(Boolean).join(' · ');
    view.innerHTML = `
      <article class="person-view event-detail-view">
        <div class="person-hero event-detail-hero">
          <img class="person-hero-photo" src="${esc(event.photo)}" alt="">
          ${hasTelegramBack() ? '' : '<button class="hero-icon back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>'}
        </div>

        <section class="person-head">
          <div class="person-head-row">
            <div class="person-head-copy">
              <em class="taneesh-source ${event.source === 'yaqin' ? 'yaqin' : ''}">${esc(sourceLabel)}</em>
              <h1>${esc(event.title)}</h1>
              <p class="person-meta">${esc(metaLine)}</p>
              <p class="event-detail-price">${esc(priceLabel(event))}</p>
            </div>
            <button class="hero-wave event-want-btn ${want ? 'on' : ''}" type="button" id="toggleWant" aria-label="${want ? 'Интерес снят' : 'Хочу пойти'}" aria-pressed="${want ? 'true' : 'false'}">
              <i class="ti ${want ? 'ti-check' : 'ti-hand-stop'}"></i>
            </button>
          </div>
          ${event.description ? `<p class="person-bio">${esc(event.description)}</p>` : ''}
        </section>

        <section class="me-panel event-detail-panel">
          <div class="me-section-head">
            <div><h3>Детали</h3></div>
          </div>
          <ul class="taneesh-detail-meta">
            <li><i class="ti ti-calendar"></i>${esc(event.when)}</li>
            <li><i class="ti ti-map-pin"></i>${esc(event.place)}</li>
            ${event.address ? `<li><i class="ti ti-building"></i>${esc(event.address)}</li>` : ''}
            ${event.capacity ? `<li><i class="ti ti-users"></i>до ${esc(String(event.capacity))} мест</li>` : ''}
            ${event.host ? `<li><i class="ti ti-user"></i>Организатор · ${esc(event.host)}</li>` : ''}
          </ul>
          ${Array.isArray(event.interests) && event.interests.length ? `
            <div class="chip-group">
              <h4>Интересы</h4>
              <div class="chips-wrap">
                ${event.interests.map(tag => `<span class="chip">${esc(tag)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </section>

        ${peopleBlocksHtml(event)}

        ${owned ? `
          <div class="sticky-page-cta">
            <button type="button" class="taneesh-buy-block" data-action="ticket" data-id="${esc(owned.id)}">
              Открыть QR
            </button>
          </div>
        ` : `
          <div class="sticky-page-cta">
            ${hard ? `
              <button type="button" class="taneesh-buy-block" data-action="checkout" data-id="${esc(event.id)}">
                ${esc(hardPassLabel(event))}
              </button>` : ''}
            <button type="button" class="taneesh-buy-block ${hard ? 'ghost' : ''}" id="stickyWant">
              ${want ? 'Отменить интерес' : 'Хочу пойти'}
            </button>
          </div>
        `}
      </article>`;

    bindPeopleBlocks(view, event);

    const toggleWant = () => {
      if (owned) return;
      if (want) {
        clearInterest(event.id);
        render();
      } else {
        saveGoing(event.id, meGuest());
        render();
        showCelebrate({
          title: 'Отметили интерес',
          primaryLabel: 'Понятно',
          secondaryLabel: 'Пригласить подруг',
          shareText: `Хочу пойти на «${event.title}» — присоединяйся в Yaqin`,
          onPrimary: () => {}
        });
      }
    };

    view.querySelector('#toggleWant')?.addEventListener('click', toggleWant);
    view.querySelector('#stickyWant')?.addEventListener('click', toggleWant);
  };

  render();
}

/** Чекаут билета (демо-оплата без бэкенда). */
export function ticketCheckoutScreen(eventId) {
  clearHeader();
  const event = findEvent(eventId);
  if (!event) {
    showPlaceholder('✿', 'Событие не найдено', 'Нельзя оформить билет — события нет.');
    return;
  }
  if (!needsGuestPass(event)) {
    navigate('event', event.id);
    return;
  }
  const existing = ticketForEvent(event.id);
  if (existing) {
    navigate('ticket', existing.id);
    return;
  }

  const door = isDoorMode(event);
  const free = isFreeMode(event) && !door;
  const ticketPrice = door || free ? 0 : Number(event.price || 0);
  const fee = door || free ? 0 : Number(event.fee || 0);
  const total = ticketPrice + fee;
  const modeNote = door
    ? `На входе организатору: ${money(event.price)}`
    : free
      ? 'Бесплатная запись · QR для входа'
      : 'Оплата онлайн · QR сразу после оплаты';

  view.innerHTML = `
    <div class="ticket-checkout-page">
      <header class="sheet-head">
        ${backControlHtml('back')}
        <h1>${free ? 'Запись' : door ? 'Бронь' : 'Оплата'}</h1>
        <span style="width:36px"></span>
      </header>

      <div class="ticket-checkout-card">
        <div class="event-photo">
          <img src="${esc(event.photo)}" alt="">
        </div>
        <div>
          <strong>${esc(event.title)}</strong>
          <span>${esc(event.when)}</span>
          <span>${esc(event.place)}</span>
        </div>
      </div>

      <section class="ticket-breakdown">
        <div><span>${door ? 'На входе' : 'Билет'}</span><b>${door ? money(event.price) : ticketPrice ? money(ticketPrice) : '0 сум'}</b></div>
        ${!door && !free && fee ? `<div><span>Сервисный сбор</span><b>${money(fee)}</b></div>` : ''}
        <div class="total"><span>${door || free ? 'Сейчас в Mini App' : 'К оплате в Mini App'}</span><b>${money(total)}</b></div>
      </section>

      <p class="ticket-checkout-note">${esc(modeNote)}</p>

      <div class="sticky-page-cta">
        <button type="button" class="taneesh-buy-block" id="payTicket">
          ${total
            ? `${isLive ? 'Оплатить' : 'Получить QR'} ${money(total)}`
            : door
              ? 'Забронировать и получить QR'
              : 'Записаться и получить QR'}
        </button>
      </div>
    </div>`;

  view.querySelector('#payTicket').onclick = () => {
    const button = view.querySelector('#payTicket');
    button.disabled = true;
    button.textContent = 'Готовим билет…';
    setTimeout(() => {
      const ticket = {
        id: `t-${event.id}-${Date.now()}`,
        eventId: event.id,
        title: event.title,
        when: event.when,
        place: event.place,
        photo: event.photo,
        mode: door ? 'door' : free ? 'free' : (event.ticketMode || 'paid'),
        role: 'guest',
        price: ticketPrice,
        fee,
        total,
        doorPay: door ? event.price : 0,
        demo: !isLive,
        code: `YQ-${String(event.id).replace(/^e-/, '').slice(-8).toUpperCase()}-${String(Date.now()).slice(-5)}`,
        createdAt: new Date().toISOString()
      };
      const state = getState();
      const nextGoing = { ...(state.eventGoing || {}) };
      const nextInterest = { ...(state.eventInterest || {}) };
      delete nextGoing[event.id];
      delete nextGoing[String(event.id)];
      delete nextInterest[event.id];
      delete nextInterest[String(event.id)];
      saveState({
        ...state,
        tickets: [...(state.tickets || []), ticket],
        eventGoing: nextGoing,
        eventInterest: nextInterest
      });
      navigate('ticket', ticket.id);
    }, 500);
  };
}

/** QR-билет после покупки. */
export function ticketScreen(ticketId) {
  clearHeader();
  const ticket =
    getTickets().find(item => String(item.id) === String(ticketId)) ||
    getTickets()[getTickets().length - 1];
  if (!ticket) {
    navigate('me');
    return;
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(ticket.code)}`;

  view.innerHTML = `
    <div class="ticket-page">
      <header class="sheet-head">
        ${backControlHtml('me', 'К профилю')}
        <h1>Билет</h1>
        <span style="width:36px"></span>
      </header>

      <div class="ticket-pass">
        <div class="event-photo ticket-pass-cover">
          <img src="${esc(ticket.photo)}" alt="">
        </div>
        <div class="ticket-pass-body">
          ${ticket.role === 'host' ? '<em class="ticket-role">Организатор</em>' : ''}
          <strong>${esc(ticket.title)}</strong>
          <span>${esc(ticket.when)}</span>
          <span>${esc(ticket.place)}</span>
          <div class="ticket-qr-wrap">
            <img src="${esc(qrUrl)}" alt="QR">
          </div>
          <code class="ticket-code">${esc(ticket.code)}</code>
          ${ticket.doorPay ? `<p class="ticket-door">Гости платят на входе: <b>${money(ticket.doorPay)}</b></p>` : ''}
          <p class="ticket-hint">${ticket.role === 'host' ? 'Ваш QR организатора · гости показывают свои билеты' : 'Покажите QR на входе'}</p>
        </div>
      </div>

      <div class="sticky-page-cta">
        <button type="button" class="taneesh-buy-block" data-action="me">В профиль</button>
      </div>
    </div>`;
}
