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

/** Карточка события: layout как у анкеты человека. */
export function taneeshEventDetailScreen(id) {
  clearHeader();
  const event = findEvent(id);
  if (!event) {
    showPlaceholder('✿', 'Событие не найдено', 'Вернитесь к афише и выберите другое.');
    return;
  }
  const owned = ticketForEvent(event.id);
  const sourceLabel = event.source === 'yaqin'
    ? (event.hostId === 'me' || event.host === (getState().profile?.name) ? 'Ваше событие' : 'Yaqin')
    : 'Афиша';

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
