import { people, defaultProfile } from '../data.js';
import { view, esc, clearHeader, showPlaceholder } from '../dom.js';
import { getState, saveState } from '../state.js';
import { navigate } from '../router.js';
import { allEvents, findEvent } from './community.js';
import { showCelebrate } from '../celebrate.js';
import { isLive } from '../api.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { peopleGoingBlockHtml, bindPeopleGoingBlock, closePeopleGoingSheet } from '../people-going.js';

const DEMO_GOING = {
  0: [
    { id: 1, name: 'Малика', age: 26, photo: people[0].photo, message: 'Новенькая в Мирабаде, давайте сходим на кофе ☕' },
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: 'Могу подсказать маршрут по улице' },
    { id: 3, name: 'Аня', age: 24, photo: people[2].photo, message: '' }
  ],
  1: [
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: 'Беру билет на вечерний сеанс' },
    { id: 3, name: 'Аня', age: 24, photo: people[2].photo, message: 'Кто за попкорн после?' }
  ],
  2: [
    { id: 1, name: 'Малика', age: 26, photo: people[0].photo, message: 'Утром на пробежку — буду рада компании' },
    { id: 2, name: 'Мила', age: 27, photo: people[1].photo, message: '' }
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

function priceLabel(event) {
  if (isFreeMode(event) && !isDoorMode(event)) return 'Бесплатно';
  if (isDoorMode(event)) return `на входе · ${money(event.price)}`;
  return money(event.price);
}

function buyLabel(event) {
  if (ticketForEvent(event.id)) return 'Мой билет';
  if (isFreeMode(event) && !isDoorMode(event)) return 'Записаться';
  if (isDoorMode(event)) return 'Забронировать';
  return 'Купить билет';
}

function meGuest() {
  const profile = getState().profile || defaultProfile;
  return {
    id: 'me',
    name: profile.name || defaultProfile.name,
    age: profile.age || defaultProfile.age,
    photo: profile.photo || defaultProfile.photo,
    message: ''
  };
}

function goingForEvent(eventId) {
  const key = Number(eventId);
  const demoRaw = Number.isFinite(key) && DEMO_GOING[key] ? DEMO_GOING[key] : [];
  const demo = demoRaw.map(person => ({ ...person, demo: true }));
  const mine = (getState().eventGoing || {})[eventId];
  if (!mine) return demo;
  return [mine, ...demo.filter(person => person.id !== 'me' && String(person.id) !== String(mine.id))];
}

function saveGoing(eventId, entry) {
  const state = getState();
  saveState({
    ...state,
    eventGoing: { ...(state.eventGoing || {}), [eventId]: entry },
    eventInterest: { ...(state.eventInterest || {}), [eventId]: true }
  });
}

function removeGoing(eventId) {
  const state = getState();
  const next = { ...(state.eventGoing || {}) };
  delete next[eventId];
  saveState({ ...state, eventGoing: next });
}

function toggleInterest(eventId) {
  const state = getState();
  const interested = { ...(state.eventInterest || {}) };
  const key = String(eventId);
  const wasOn = Boolean(interested[key] || interested[eventId]);
  if (wasOn) {
    delete interested[key];
    delete interested[eventId];
  } else {
    interested[eventId] = true;
  }
  saveState({ ...state, eventInterest: interested });
  return !wasOn;
}

function isInterested(eventId) {
  const interested = getState().eventInterest || {};
  return Boolean(interested[eventId] || interested[String(eventId)] || (getState().eventGoing || {})[eventId]);
}

/** Лента событий + покупка билета в Mini App. */
export function taneeshEventsScreen() {
  clearHeader();
  const feed = allEvents();

  view.innerHTML = `
    <div class="events-feed-page">
      <header class="chats-head">
        <h1>События</h1>
        <div class="events-head-actions">
          <button data-action="create-event" aria-label="Создать"><i class="ti ti-plus"></i></button>
        </div>
      </header>

      <p class="events-feed-lead">
        Создавайте свои встречи или ходите на афишу. Билет с QR — в Mini App.
      </p>

      <div class="events-feed">
        ${feed.map(event => {
          const goingPreview = goingForEvent(event.id).slice(0, 3);
          const source = event.source === 'yaqin'
            ? (event.hostId === 'me' ? 'Ваше' : 'Yaqin')
            : 'Афиша';
          return `
            <article class="taneesh-event-card">
              <button type="button" class="taneesh-event-hit" data-action="event" data-id="${esc(event.id)}">
                <div class="event-photo">
                  <img src="${esc(event.photo)}" alt="">
                </div>
                <div class="taneesh-event-copy">
                  <em class="taneesh-source ${event.source === 'yaqin' ? 'yaqin' : ''}">${source}</em>
                  <strong>${esc(event.title)}</strong>
                  <span>${esc(event.when)}</span>
                  <span>${esc(event.place)}</span>
                  <em class="taneesh-price">${esc(priceLabel(event))}</em>
                </div>
              </button>
              <div class="taneesh-event-foot">
                <div class="taneesh-going">
                  ${goingPreview.map(person => `<img src="${esc(person.photo)}" alt="">`).join('')}
                  <span>${goingForEvent(event.id).length}</span>
                </div>
              </div>
            </article>`;
        }).join('')}
      </div>
    </div>`;
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
    const going = goingForEvent(event.id);
    const tickets = ticketsForEvent(event.id);
    const guestTickets = tickets.filter(ticket => ticket.role !== 'host');
    const hostQr = hostTicket(event.id);
    const capacity = Number(event.capacity) || 0;
    const interested = going.length;
    const sold = guestTickets.length;
    const fill = capacity ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;
    const revenue = guestTickets.reduce((sum, ticket) => {
      if (ticket.mode === 'paid') return sum + Number(ticket.price || 0);
      return sum;
    }, 0);
    const doorExpected = isDoorMode(event)
      ? sold * Number(event.price || 0)
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
            <button class="hero-wave" type="button" id="hostShare" aria-label="Поделиться">
              <i class="ti ti-share"></i>
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
                ${capacity ? `<li><i class="ti ti-users"></i>до ${capacity} мест · занято ${sold}</li>` : ''}
                <li><i class="ti ti-ticket"></i>${esc(priceLabel(event))}</li>
              </ul>
            </section>

            <div class="people-going-wrap">
              ${peopleGoingBlockHtml(going, {
                title: 'Хотят пойти',
                empty: 'Пока никто не отметил интерес'
              })}
            </div>

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
                    <span>${sold} с билетом · ${interested} интерес</span>
                  </div>
                  <i class="ti ti-chevron-right"></i>
                </button>
              </div>
            </section>
          ` : ''}

          ${tab === 'guests' ? `
            <section class="me-panel event-detail-panel">
              <div class="me-section-head">
                <div><h3>С билетом</h3></div>
                <span class="host-count">${guestTickets.length}</span>
              </div>
              ${guestTickets.length ? `
                <div class="me-mini-list">
                  ${guestTickets.map(ticket => `
                    <button type="button" class="me-mini-row" data-action="ticket" data-id="${esc(ticket.id)}">
                      <img src="${esc(ticket.photo || event.photo)}" alt="">
                      <div>
                        <strong>${esc(ticket.code || 'Билет')}</strong>
                        <span>${ticket.mode === 'paid' ? 'Онлайн' : ticket.mode === 'door' ? 'На входе' : 'Бесплатно'} · ${esc(ticket.when || event.when || '')}</span>
                      </div>
                      <i class="ti ti-chevron-right"></i>
                    </button>`).join('')}
                </div>` : `
                <p class="host-empty">Пока нет оформленных билетов</p>`}
            </section>

            <section class="me-panel event-detail-panel">
              <div class="me-section-head">
                <div><h3>Интерес</h3></div>
                <span class="host-count">${going.length}</span>
              </div>
              ${going.length ? `
                <div class="me-mini-list">
                  ${going.map(person => `
                    <${person.id === 'me' ? 'div' : 'button type="button"'} class="me-mini-row" ${person.id === 'me' ? '' : `data-action="person" data-id="${esc(String(person.id))}"`}>
                      <img src="${esc(person.photo)}" alt="">
                      <div>
                        <strong>${esc(person.name)}${person.age ? `, ${person.age}` : ''}${person.id === 'me' ? ' · вы' : ''}</strong>
                        <span>${person.message ? esc(person.message) : 'Отметила интерес'}</span>
                      </div>
                      ${person.id === 'me' ? '' : '<i class="ti ti-chevron-right"></i>'}
                    </${person.id === 'me' ? 'div' : 'button'}>`).join('')}
                </div>` : `
                <p class="host-empty">Никто ещё не нажал «Хочу пойти»</p>`}
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
                  <strong>${sold}</strong>
                  <span>Билетов</span>
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
              <p class="host-empty soft">Статистика локальная · живой API подключим отдельно</p>
            </section>
          ` : ''}
        </div>
      </article>`;

    if (tab === 'overview') {
      bindPeopleGoingBlock(view, going, { title: 'Хотят пойти' });
    }

    view.querySelectorAll('[data-host-tab]').forEach(button => {
      button.addEventListener('click', () => {
        tab = button.dataset.hostTab;
        render();
      });
    });
    view.querySelector('#hostShare')?.addEventListener('click', () => shareEvent(event));
    view.querySelector('#hostShareRow')?.addEventListener('click', () => shareEvent(event));
  };

  render();
}

/** Гостевой экран события. */
function renderGuestEventDetail(event) {
  const owned = ticketForEvent(event.id);
  const sourceLabel = event.source === 'yaqin' ? 'Yaqin' : 'Афиша';

  const render = () => {
    closePeopleGoingSheet();
    const mine = (getState().eventGoing || {})[event.id];
    const want = isInterested(event.id) || mine;
    const metaLine = [event.when, event.place].filter(Boolean).join(' · ');
    const going = goingForEvent(event.id);
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
            <button class="hero-wave event-want-btn ${want ? 'on' : ''}" type="button" id="toggleWant" aria-label="${want ? 'Иду' : 'Хочу пойти'}" aria-pressed="${want ? 'true' : 'false'}">
              <i class="ti ${want ? 'ti-check' : 'ti-hand-stop'}"></i>
            </button>
          </div>
          ${event.description ? `<p class="person-bio">${esc(event.description)}</p>` : ''}
          <p class="event-want-hint">${want ? 'Статус: идёте' : 'Отметьте «Хочу пойти» — это не билет'}</p>
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
          ${!owned ? `
            <button type="button" class="event-ticket-link" data-action="checkout" data-id="${esc(event.id)}">
              ${isDoorMode(event) ? 'Оформить бронь' : isFreeMode(event) ? 'Получить QR' : 'Купить билет'} · отдельно от статуса
              <i class="ti ti-chevron-right"></i>
            </button>
          ` : ''}
        </section>

        <div class="people-going-wrap">
          ${peopleGoingBlockHtml(going, {
            title: 'Кто идёт',
            empty: 'Будьте первой — нажмите «Хочу пойти»'
          })}
        </div>

        ${owned ? `
          <div class="person-actions event-detail-actions">
            <button type="button" class="taneesh-buy-block" data-action="ticket" data-id="${esc(owned.id)}">
              Открыть QR
            </button>
            <p class="taneesh-detail-note">Билет уже оформлен — покажите QR на входе.</p>
          </div>
        ` : ''}
      </article>`;

    bindPeopleGoingBlock(view, going, { title: 'Кто идёт' });

    view.querySelector('#toggleWant')?.addEventListener('click', () => {
      if (want) {
        removeGoing(event.id);
        const state = getState();
        const interested = { ...(state.eventInterest || {}) };
        delete interested[event.id];
        delete interested[String(event.id)];
        saveState({ ...state, eventInterest: interested });
        render();
      } else {
        saveGoing(event.id, { ...meGuest(), message: '' });
        render();
        showCelebrate({
          title: 'Отметили интерес',
          subtitle: `«${event.title}» — это статус, не билет`,
          primaryLabel: 'Понятно',
          secondaryLabel: 'Пригласить подруг',
          shareText: `Хочу пойти на «${event.title}» — присоединяйся в Yaqin`,
          onPrimary: () => {}
        });
      }
    });
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
  const existing = ticketForEvent(event.id);
  if (existing) {
    navigate('ticket', existing.id);
    return;
  }

  const door = isDoorMode(event);
  const free = isFreeMode(event) && !door;
  const ticketPrice = door || free ? 0 : Number(event.price || 0);
  // fee только для online-paid; free/door — 0 в Mini App
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
      ${!isLive
        ? '<p class="ticket-checkout-note muted">Демо: деньги не списываются, QR сохраняется локально.</p>'
        : '<p class="ticket-checkout-note muted">После подтверждения сразу появится QR-код билета.</p>'}

      <button type="button" class="taneesh-buy-block" id="payTicket">
        ${total
          ? `${isLive ? 'Оплатить' : 'Демо: получить QR'} ${money(total)}`
          : door
            ? 'Забронировать и получить QR'
            : 'Получить QR'}
      </button>
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
      saveState({ ...state, tickets: [...(state.tickets || []), ticket] });
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

      <button type="button" class="taneesh-chip block" data-action="me">В профиль</button>
    </div>`;
}
