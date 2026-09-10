import { events, people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { getState, saveState } from '../state.js';

const TANEESH_STORE = 'https://apps.apple.com/search?term=Taneesh';

function activationStatus() {
  return getState().taneeshStatus || 'draft_in_taneesh';
}

function openTaneesh(reason) {
  const url = TANEESH_STORE;
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
  } catch (_) {
    /* ignore */
  }
  window.open(url, '_blank', 'noopener');
  console.info('[yaqin] open Taneesh', reason);
}

/** Лента событий Taneesh (read-only) + CTA в приложение. */
export function taneeshEventsScreen() {
  clearHeader();
  const status = activationStatus();
  const interested = getState().eventInterest || {};

  view.innerHTML = `
    <div class="events-feed-page">
      <header class="chats-head">
        <h1>События</h1>
      </header>

      <p class="events-feed-lead">
        Афиша из Taneesh. Смотрите бесплатно — билет только в приложении.
      </p>

      ${status !== 'active' ? `
        <button type="button" class="taneesh-activate-banner" data-open-taneesh="activate">
          <div>
            <b>Активируйте профиль в Taneesh</b>
            <span>Анкета уже как черновик. Откройте приложение, чтобы стать видимой и покупать билеты.</span>
          </div>
          <i class="ti ti-chevron-right"></i>
        </button>` : `
        <div class="taneesh-activate-banner on">
          <div>
            <b>Профиль активен в Taneesh</b>
            <span>Билеты и QR — в приложении.</span>
          </div>
        </div>`}

      <div class="events-feed">
        ${events.map(event => {
          const want = interested[event.id];
          const goingPreview = people.slice(0, 3);
          return `
            <article class="taneesh-event-card">
              <button type="button" class="taneesh-event-hit" data-action="event" data-id="${event.id}">
                <img src="${esc(event.photo)}" alt="">
                <div class="taneesh-event-copy">
                  <strong>${esc(event.title)}</strong>
                  <span>${esc(event.when)}</span>
                  <span>${esc(event.place)}</span>
                </div>
              </button>
              <div class="taneesh-event-foot">
                <div class="taneesh-going">
                  ${goingPreview.map(person => `<img src="${esc(person.photo)}" alt="">`).join('')}
                  <span>${event.going} идут</span>
                </div>
                <div class="taneesh-event-actions">
                  <button type="button" class="taneesh-chip ${want ? 'on' : ''}" data-interest="${event.id}">
                    Интересно
                  </button>
                  <button type="button" class="taneesh-buy" data-open-taneesh="ticket" data-id="${event.id}">
                    Билет в Taneesh
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

  view.querySelectorAll('[data-interest]').forEach(button => {
    button.onclick = () => {
      const id = Number(button.dataset.interest);
      const state = getState();
      const next = { ...(state.eventInterest || {}) };
      next[id] = !next[id];
      saveState({ ...state, eventInterest: next });
      taneeshEventsScreen();
    };
  });
}

/** Карточка события: детали + кто идёт + CTA билета. */
export function taneeshEventDetailScreen(id) {
  clearHeader();
  const event = events[Number(id) || 0] || events[0];
  const going = people.slice(0, 4);

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
        <ul class="taneesh-detail-meta">
          <li><i class="ti ti-calendar"></i>${esc(event.when)}</li>
          <li><i class="ti ti-map-pin"></i>${esc(event.place)}</li>
          <li><i class="ti ti-building"></i>${esc(event.address || '')}</li>
        </ul>
        <h3>Кто идёт</h3>
        <div class="taneesh-who">
          ${going.map(person => `
            <button type="button" class="taneesh-who-row" data-action="person" data-id="${person.id}">
              <img src="${esc(person.photo)}" alt="">
              <span>${esc(person.name)}, ${person.age}</span>
            </button>`).join('')}
        </div>
        <p class="taneesh-detail-note">
          Знакомиться здесь бесплатно. Чтобы купить билет и пройти по QR — откройте Taneesh.
        </p>
        <button type="button" class="taneesh-buy-block" id="buyTicket">
          Купить билет в Taneesh
        </button>
      </div>
    </article>`;

  view.querySelector('#buyTicket').onclick = () => openTaneesh('ticket-detail');
}
