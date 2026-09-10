import { events as taneeshEvents, PHOTOS, defaultProfile } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';
import { getState, saveState } from '../state.js';

const COVER_POOL = [PHOTOS.palms, PHOTOS.coffee, PHOTOS.city, PHOTOS.books, PHOTOS.event, PHOTOS.mila].filter(Boolean);

export function getUserGroups() {
  return getState().userGroups || [];
}

export function findUserGroup(id) {
  return getUserGroups().find(group => String(group.id) === String(id));
}

export function getUserEvents() {
  return getState().userEvents || [];
}

/** Taneesh-афиша + события, созданные в Yaqin. */
export function allEvents() {
  const catalog = taneeshEvents.map(event => ({ ...event, source: 'taneesh' }));
  const mine = getUserEvents().map(event => ({ ...event, source: event.source || 'yaqin' }));
  return [...mine, ...catalog];
}

export function findEvent(id) {
  const list = allEvents();
  return list.find(event => String(event.id) === String(id)) || list[0];
}

function nextCover(index = 0) {
  return COVER_POOL[index % COVER_POOL.length] || PHOTOS.city;
}

/** Вкладка «Группы» — BFF my-groups--069, без хаба комнат. */
export function groupsScreen() {
  clearHeader();
  const groups = getUserGroups();

  view.innerHTML = `
    <div class="groups-tab-page">
      <header class="chats-head">
        <h1>Группы</h1>
        <span></span>
      </header>

      ${groups.length
        ? `<div class="groups-tab-list">${groups.map(group => {
            const last = group.messages?.[group.messages.length - 1];
            return `
              <button class="group-tab-row" type="button" data-action="group-chat" data-id="${esc(group.id)}">
                <img src="${esc(group.photo)}" alt="">
                <div>
                  <strong>${esc(group.title)}</strong>
                  <span>${esc(last?.text || group.about || 'Группа')} · ${esc(last?.time || 'новая')}</span>
                </div>
              </button>`;
          }).join('')}</div>`
        : `<div class="groups-tab-empty">
            <div class="empty-badge yellow"><i class="ti ti-users"></i></div>
            <h2>Создайте группу</h2>
            <p>Соберите людей по интересам и планируйте встречи вместе.</p>
            <button class="empty-primary" type="button" data-action="create-group">Создать группу</button>
          </div>`}

      <button class="compose" data-action="create-group" aria-label="Создать"><i class="ti ti-plus"></i></button>
    </div>`;
}

/** Создание группы — только название + фото. */
export function createGroupScreen() {
  clearHeader();
  let name = '';
  let cover = null;
  let coverIndex = 0;

  const render = () => {
    const canCreate = name.trim().length > 1;
    view.innerHTML = `
      <div class="create-group-page">
        <header class="modal-head">
          <button data-action="groups" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Создать группу</h1>
          <button class="head-action ${canCreate ? 'on coral' : ''}" id="createGroupBtn" ${canCreate ? '' : 'disabled'}>Создать</button>
        </header>

        <div class="create-cover ${cover ? 'has-photo' : ''}">
          ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ФОТО</span>`}
          <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
        </div>

        <input class="create-name" id="groupName" placeholder="Название группы..." value="${esc(name)}">
        <p class="create-legal">Название и фото — остальное можно добавить позже в чате.</p>
      </div>`;

    view.querySelector('#groupName').oninput = event => {
      name = event.target.value;
      const btn = view.querySelector('#createGroupBtn');
      const ready = name.trim().length > 1;
      btn.disabled = !ready;
      btn.classList.toggle('on', ready);
      btn.classList.toggle('coral', ready);
    };
    view.querySelector('#setCover').onclick = () => {
      cover = nextCover(coverIndex++);
      render();
    };
    view.querySelector('#createGroupBtn').onclick = () => {
      if (!name.trim()) return;
      const profile = getState().profile || defaultProfile;
      const group = {
        id: `g-${Date.now()}`,
        title: name.trim(),
        about: 'Группа в Yaqin',
        city: 'Ташкент',
        photo: cover || nextCover(0),
        isPublic: true,
        members: 1,
        online: 1,
        createdAt: new Date().toISOString(),
        ownerName: profile.name || 'Вы',
        messages: [
          {
            from: 'me',
            name: profile.name || 'Вы',
            text: 'Группа создана. Можно писать здесь.',
            time: 'сейчас'
          }
        ]
      };
      const state = getState();
      saveState({ ...state, userGroups: [group, ...(state.userGroups || [])] });
      navigate('group-chat', group.id);
    };
  };

  render();
}

/** Простой чат группы (без комнат/постов). */
export function groupChatScreen(id) {
  clearHeader();
  const group = findUserGroup(id);
  if (!group) {
    navigate('groups');
    return;
  }

  let draft = '';
  const messages = [...(group.messages || [])];

  const persist = () => {
    const state = getState();
    const list = (state.userGroups || []).map(item =>
      String(item.id) === String(group.id) ? { ...item, messages: [...messages] } : item
    );
    saveState({ ...state, userGroups: list });
  };

  const render = () => {
    view.innerHTML = `
      <div class="chat-page group-chat-lite">
        <header class="chat-top">
          <button class="chat-back" data-action="groups" aria-label="Назад">
            <i class="ti ti-chevron-left"></i>
          </button>
          <div class="chat-peer">
            <h1>${esc(group.title)}</h1>
            <p>${group.members || 1} участниц · ${esc(group.city || '')}</p>
          </div>
          <span></span>
        </header>

        <div class="chat-thread">
          ${messages.map(message => `
            <div class="chat-bubble ${message.from === 'me' ? 'mine' : ''}">
              <div class="bubble-body">
                <div class="bubble-head">
                  <b>${esc(message.name || 'Участница')}</b>
                  <time>${esc(message.time || '')}</time>
                </div>
                <p>${esc(message.text || '')}</p>
              </div>
            </div>`).join('')}
        </div>

        <form class="chat-compose" id="groupSend">
          <input id="groupDraft" placeholder="Сообщение..." value="${esc(draft)}" autocomplete="off">
          <button type="submit" aria-label="Отправить"><i class="ti ti-send"></i></button>
        </form>
      </div>`;

    const input = view.querySelector('#groupDraft');
    input.focus();
    input.oninput = () => { draft = input.value; };
    view.querySelector('#groupSend').onsubmit = event => {
      event.preventDefault();
      const text = draft.trim();
      if (!text) return;
      const profile = getState().profile || defaultProfile;
      messages.push({
        from: 'me',
        name: profile.name || 'Вы',
        text,
        time: 'сейчас'
      });
      draft = '';
      persist();
      render();
    };
  };

  render();
}

/** Создание события — название, место, когда, обложка. */
export function createEventScreen() {
  clearHeader();
  let title = '';
  let place = '';
  let when = 'Вс, 21 сен · 11:00';
  let cover = null;
  let coverIndex = 0;

  const render = () => {
    const ready = title.trim().length > 1 && place.trim().length > 1;
    view.innerHTML = `
      <div class="create-event-page">
        <header class="modal-head">
          <button data-action="events" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Новое событие</h1>
          <button class="head-action coral ${ready ? 'on' : ''}" id="createEventBtn" ${ready ? '' : 'disabled'}>Создать</button>
        </header>

        <div class="create-cover ${cover ? 'has-photo' : ''}" style="border-radius:20px;width:min(100%,320px);height:160px;margin:12px auto 8px">
          ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ОБЛОЖКА</span>`}
          <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
        </div>

        <input class="create-name" id="eventTitle" placeholder="Название события" value="${esc(title)}">
        <input class="create-name smaller" id="eventPlace" placeholder="Место" value="${esc(place)}">

        <button class="settings-row" type="button" id="eventWhen">
          <span class="settings-icon blue"><i class="ti ti-calendar-event"></i></span>
          <span>Когда<br><small>${esc(when)}</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <p class="create-legal">Билет можно настроить позже. Сейчас событие появится в ленте как бесплатное.</p>
      </div>`;

    const syncReady = () => {
      const btn = view.querySelector('#createEventBtn');
      const ok = title.trim().length > 1 && place.trim().length > 1;
      btn.disabled = !ok;
      btn.classList.toggle('on', ok);
    };

    view.querySelector('#eventTitle').oninput = event => { title = event.target.value; syncReady(); };
    view.querySelector('#eventPlace').oninput = event => { place = event.target.value; syncReady(); };
    view.querySelector('#setCover').onclick = () => {
      cover = nextCover(coverIndex++);
      render();
    };
    view.querySelector('#eventWhen').onclick = () => {
      when = when.includes('21') ? 'Сб, 20 сен · 10:00' : 'Вс, 21 сен · 11:00';
      render();
    };
    view.querySelector('#createEventBtn').onclick = () => {
      if (!(title.trim().length > 1 && place.trim().length > 1)) return;
      const profile = getState().profile || defaultProfile;
      const event = {
        id: `e-${Date.now()}`,
        title: title.trim(),
        when,
        day: when.match(/\d+/)?.[0] || '21',
        month: 'сен',
        place: place.trim(),
        address: 'Ташкент',
        group: 'Yaqin',
        host: profile.name || 'Вы',
        going: 1,
        photo: cover || nextCover(1),
        ticketMode: 'free',
        price: 0,
        fee: 0,
        currency: 'UZS',
        source: 'yaqin',
        createdAt: new Date().toISOString()
      };
      const state = getState();
      saveState({ ...state, userEvents: [event, ...(state.userEvents || [])] });
      navigate('event', event.id);
    };
  };

  render();
}
