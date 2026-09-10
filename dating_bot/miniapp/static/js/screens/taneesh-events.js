import { events, people, defaultProfile } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { getState, saveState } from '../state.js';
import { navigate } from '../router.js';

const TANEESH_STORE = 'https://apps.apple.com/search?term=Taneesh';

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
  return getTickets().find(ticket => Number(ticket.eventId) === Number(eventId));
}

function activationStatus() {
  return getState().taneeshStatus || 'draft_in_taneesh';
}

function openTaneesh(reason) {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(TANEESH_STORE);
      return;
    }
  } catch (_) {
    /* ignore */
  }
  window.open(TANEESH_STORE, '_blank', 'noopener');
  console.info('[yaqin] open Taneesh', reason);
}

function priceLabel(event) {
  if (event.ticketMode === 'free') return 'Бесплатно';
  if (event.ticketMode === 'door') return `от ${money(event.fee)} · на входе`;
  return money(event.price);
}

function buyLabel(event) {
  if (ticketForEvent(event.id)) return 'Мой билет';
  if (event.ticketMode === 'free') return 'Записаться';
  if (event.ticketMode === 'door') return 'Забронировать';
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
  const demo = DEMO_GOING[Number(eventId)] || DEMO_GOING[0];
  const mine = (getState().eventGoing || {})[eventId];
  if (!mine) return demo;
  return [mine, ...demo.filter(person => person.id !== 'me')];
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

function renderWhoList(eventId) {
  const going = goingForEvent(eventId);
  return going.map(person => {
    const isMe = person.id === 'me';
    const attrs = isMe ? '' : `data-action="person" data-id="${person.id}"`;
    return `
      <${isMe ? 'div' : 'button type="button"'} class="taneesh-who-row ${isMe ? 'me' : ''}" ${attrs}>
        <img src="${esc(person.photo)}" alt="">
        <div class="taneesh-who-copy">
          <span>${esc(person.name)}${person.age ? `, ${person.age}` : ''}${isMe ? ' · вы' : ''}</span>
          ${person.message ? `<small>${esc(person.message)}</small>` : ''}
        </div>
      </${isMe ? 'div' : 'button'}>`;
  }).join('');
}

/** Лента событий + покупка билета в Mini App. */
export function taneeshEventsScreen() {
  clearHeader();
  const status = activationStatus();
  const interested = getState().eventInterest || {};
  const tickets = getTickets();

  view.innerHTML = `
    <div class="events-feed-page">
      <header class="chats-head">
        <h1>События</h1>
        <button data-action="my-tickets" aria-label="Билеты">
          <i class="ti ti-ticket"></i>
          ${tickets.length ? `<b class="ticket-count">${tickets.length}</b>` : ''}
        </button>
      </header>

      <p class="events-feed-lead">
        Афиша Taneesh. Можно отметить «хочу пойти» и купить билет здесь.
      </p>

      ${status !== 'active' ? `
        <button type="button" class="taneesh-activate-banner" data-open-taneesh="activate">
          <div>
            <b>Активируйте профиль в Taneesh</b>
            <span>Билеты и «хочу пойти» уже здесь. Активация — чтобы анкета была видима в приложении.</span>
          </div>
          <i class="ti ti-chevron-right"></i>
        </button>` : ''}

      <div class="events-feed">
        ${events.map(event => {
          const want = interested[event.id] || (getState().eventGoing || {})[event.id];
          const owned = ticketForEvent(event.id);
          const goingPreview = goingForEvent(event.id).slice(0, 3);
          return `
            <article class="taneesh-event-card">
              <button type="button" class="taneesh-event-hit" data-action="event" data-id="${event.id}">
                <img src="${esc(event.photo)}" alt="">
                <div class="taneesh-event-copy">
                  <strong>${esc(event.title)}</strong>
                  <span>${esc(event.when)}</span>
                  <span>${esc(event.place)}</span>
                  <em class="taneesh-price">${esc(priceLabel(event))}</em>
                </div>
              </button>
              <div class="taneesh-event-foot">
                <div class="taneesh-going">
                  ${goingPreview.map(person => `<img src="${esc(person.photo)}" alt="">`).join('')}
                  <span>${goingForEvent(event.id).length} хотят пойти</span>
                </div>
                <div class="taneesh-event-actions">
                  <button type="button" class="taneesh-chip ${want ? 'on' : ''}" data-action="event" data-id="${event.id}">
                    ${want ? 'Иду' : 'Хочу пойти'}
                  </button>
                  <button type="button" class="taneesh-buy ${owned ? 'owned' : ''}" data-action="${owned ? 'ticket' : 'checkout'}" data-id="${owned ? owned.id : event.id}">
                    ${buyLabel(event)}
                  </button>
                </div>
              </div>
            </article>`;
        }).join('')}
      </div>
    </div>`;

  view.querySelectorAll('[data-open-taneesh]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openTaneesh(button.dataset.openTaneesh);
    };
  });
}

/** Карточка события: кто идёт + хочу пойти + билет. */
export function taneeshEventDetailScreen(id) {
  clearHeader();
  const event = events[Number(id) || 0] || events[0];
  const owned = ticketForEvent(event.id);
  let composerOpen = false;
  let draft = ((getState().eventGoing || {})[event.id]?.message) || '';

  const render = () => {
    const mine = (getState().eventGoing || {})[event.id];
    view.innerHTML = `
      <article class="taneesh-event-detail">
        <header class="sheet-head">
          <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Событие</h1>
          <span style="width:36px"></span>
        </header>
        <img class="taneesh-detail-cover" src="${esc(event.photo)}" alt="">
        <div class="taneesh-detail-body">
          <h2>${esc(event.title)}</h2>
          <p class="taneesh-detail-price">${esc(priceLabel(event))}</p>
          <ul class="taneesh-detail-meta">
            <li><i class="ti ti-calendar"></i>${esc(event.when)}</li>
            <li><i class="ti ti-map-pin"></i>${esc(event.place)}</li>
            <li><i class="ti ti-building"></i>${esc(event.address || '')}</li>
          </ul>

          <h3>Кто идёт</h3>
          <div class="taneesh-who">
            ${renderWhoList(event.id)}
          </div>

          ${composerOpen ? `
            <div class="want-go-composer">
              <label for="wantGoMsg">Сообщение для других</label>
              <textarea id="wantGoMsg" maxlength="140" rows="3" placeholder="Например: я новая в городе, давайте сходим вместе">${esc(draft)}</textarea>
              <div class="want-go-actions">
                <button type="button" class="taneesh-chip" id="cancelWant">Отмена</button>
                <button type="button" class="taneesh-buy" id="saveWant">Опубликовать</button>
              </div>
            </div>` : `
            <div class="event-cta-stack">
              <button type="button" class="taneesh-want ${mine ? 'on' : ''}" id="toggleWant">
                ${mine ? 'Вы идёте · изменить' : 'Хочу пойти'}
              </button>
              ${mine ? `<button type="button" class="taneesh-chip block" id="leaveWant">Не иду</button>` : ''}
              <button type="button" class="taneesh-buy-block" data-action="${owned ? 'ticket' : 'checkout'}" data-id="${owned ? owned.id : event.id}">
                ${owned ? 'Открыть билет' : buyLabel(event)}
              </button>
            </div>
            <p class="taneesh-detail-note">
              «Хочу пойти» — бесплатно, чтобы найти компанию. Билет с QR — отдельно, тоже здесь.
            </p>`}
        </div>
      </article>`;

    view.querySelector('#toggleWant')?.addEventListener('click', () => {
      composerOpen = true;
      draft = mine?.message || '';
      render();
    });
    view.querySelector('#leaveWant')?.addEventListener('click', () => {
      removeGoing(event.id);
      composerOpen = false;
      render();
    });
    view.querySelector('#cancelWant')?.addEventListener('click', () => {
      composerOpen = false;
      render();
    });
    view.querySelector('#saveWant')?.addEventListener('click', () => {
      const message = view.querySelector('#wantGoMsg')?.value.trim() || '';
      saveGoing(event.id, { ...meGuest(), message });
      composerOpen = false;
      render();
    });
  };

  render();
}

/** Чекаут билета (демо-оплата). */
export function ticketCheckoutScreen(eventId) {
  clearHeader();
  const event = events[Number(eventId) || 0] || events[0];
  const existing = ticketForEvent(event.id);
  if (existing) {
    navigate('ticket', existing.id);
    return;
  }

  const ticketPrice = event.ticketMode === 'door' || event.ticketMode === 'free' ? 0 : Number(event.price || 0);
  const fee = Number(event.fee || 0);
  const total = ticketPrice + fee;
  const modeNote =
    event.ticketMode === 'door'
      ? `На входе организатору: ${money(event.price)}`
      : event.ticketMode === 'free'
        ? 'Бесплатная запись · 1 билет на человека'
        : '100% цены билета уходит организатору';

  view.innerHTML = `
    <div class="ticket-checkout-page">
      <header class="sheet-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Оплата</h1>
        <span style="width:36px"></span>
      </header>

      <div class="ticket-checkout-card">
        <img src="${esc(event.photo)}" alt="">
        <div>
          <strong>${esc(event.title)}</strong>
          <span>${esc(event.when)}</span>
          <span>${esc(event.place)}</span>
        </div>
      </div>

      <section class="ticket-breakdown">
        <div><span>Билет</span><b>${ticketPrice ? money(ticketPrice) : '0 сум'}</b></div>
        <div><span>Сервисный сбор</span><b>${money(fee)}</b></div>
        <div class="total"><span>К оплате сейчас</span><b>${money(total)}</b></div>
      </section>

      <p class="ticket-checkout-note">${esc(modeNote)}</p>
      <p class="ticket-checkout-note muted">Демо-оплата: платёжный шлюз подключим к Taneesh API. Сейчас билет выдаётся сразу.</p>

      <button type="button" class="taneesh-buy-block" id="payTicket">
        ${total ? `Оплатить ${money(total)}` : 'Получить билет'}
      </button>
    </div>`;

  view.querySelector('#payTicket').onclick = () => {
    const button = view.querySelector('#payTicket');
    button.disabled = true;
    button.textContent = 'Оплачиваем…';
    setTimeout(() => {
      const ticket = {
        id: `t-${event.id}-${Date.now()}`,
        eventId: event.id,
        title: event.title,
        when: event.when,
        place: event.place,
        photo: event.photo,
        mode: event.ticketMode || 'paid',
        price: ticketPrice,
        fee,
        total,
        doorPay: event.ticketMode === 'door' ? event.price : 0,
        code: `YQ${event.id}${String(Date.now()).slice(-6)}`,
        createdAt: new Date().toISOString()
      };
      const state = getState();
      saveState({ ...state, tickets: [...(state.tickets || []), ticket] });
      navigate('ticket', ticket.id);
    }, 700);
  };
}

/** QR-билет после покупки. */
export function ticketScreen(ticketId) {
  clearHeader();
  const ticket =
    getTickets().find(item => String(item.id) === String(ticketId)) ||
    getTickets()[getTickets().length - 1];
  if (!ticket) {
    navigate('my-tickets');
    return;
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(ticket.code)}`;

  view.innerHTML = `
    <div class="ticket-page">
      <header class="sheet-head">
        <button data-action="events" aria-label="К событиям"><i class="ti ti-x"></i></button>
        <h1>Билет</h1>
        <span style="width:36px"></span>
      </header>

      <div class="ticket-pass">
        <img class="ticket-pass-cover" src="${esc(ticket.photo)}" alt="">
        <div class="ticket-pass-body">
          <strong>${esc(ticket.title)}</strong>
          <span>${esc(ticket.when)}</span>
          <span>${esc(ticket.place)}</span>
          <div class="ticket-qr-wrap">
            <img src="${esc(qrUrl)}" alt="QR">
          </div>
          <code class="ticket-code">${esc(ticket.code)}</code>
          ${ticket.doorPay ? `<p class="ticket-door">На входе организатору: <b>${money(ticket.doorPay)}</b></p>` : ''}
          <p class="ticket-hint">Покажите QR контролёру на входе</p>
        </div>
      </div>

      <button type="button" class="taneesh-chip block" data-action="my-tickets">Все билеты</button>
    </div>`;
}

/** Список купленных билетов — вкладка профиля. */
export function myTicketsScreen() {
  clearHeader();
  const tickets = [...getTickets()].reverse();

  view.innerHTML = `
    <div class="me-page my-tickets-page">
      <div class="me-top">
        <h1>Профиль</h1>
        <div>
          <button data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
        </div>
      </div>
      <div class="me-tabs">
        <button data-action="me">Анкета</button>
        <button class="active">Билеты</button>
      </div>

      ${tickets.length ? `
        <div class="my-tickets-list">
          ${tickets.map(ticket => `
            <button type="button" class="my-ticket-row" data-action="ticket" data-id="${esc(ticket.id)}">
              <img src="${esc(ticket.photo)}" alt="">
              <div>
                <strong>${esc(ticket.title)}</strong>
                <span>${esc(ticket.when)}</span>
                <span class="ticket-code-inline">${esc(ticket.code)}</span>
              </div>
              <i class="ti ti-chevron-right"></i>
            </button>`).join('')}
        </div>` : `
        <div class="chats-empty" style="padding:48px 20px">
          <div class="empty-badge"><i class="ti ti-ticket"></i></div>
          <h2>Пока нет билетов</h2>
          <p>Купите билет на событие — он появится здесь с QR.</p>
          <button class="empty-primary" type="button" data-action="events">К событиям</button>
        </div>`}
    </div>`;
}
