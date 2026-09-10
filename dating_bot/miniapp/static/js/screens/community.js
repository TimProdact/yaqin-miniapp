import { events as taneeshEvents, PHOTOS, defaultProfile, demoGroups, people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';
import { getState, saveState } from '../state.js';
import { showCelebrate } from '../celebrate.js';

const COVER_POOL = [PHOTOS.palms, PHOTOS.coffee, PHOTOS.city, PHOTOS.books, PHOTOS.event, PHOTOS.mila].filter(Boolean);

export function getUserGroups() {
  return getState().userGroups || [];
}

/** Каталог + созданные пользователем (без дублей по id). */
export function listAllGroups() {
  const mine = getUserGroups();
  const mineIds = new Set(mine.map(group => String(group.id)));
  const catalog = demoGroups
    .filter(group => !mineIds.has(String(group.id)))
    .map(group => ({ ...group }));
  return [...mine, ...catalog];
}

export function findUserGroup(id) {
  return getUserGroups().find(group => String(group.id) === String(id))
    || demoGroups.find(group => String(group.id) === String(id))
    || null;
}

/** Открыть группу: каталожные копируются в userGroups при первом входе. */
export function openGroup(id) {
  const existing = getUserGroups().find(group => String(group.id) === String(id));
  if (existing) return existing;
  const catalog = demoGroups.find(group => String(group.id) === String(id));
  if (!catalog) return null;
  const joined = {
    ...catalog,
    catalog: false,
    joinedAt: new Date().toISOString(),
    messages: [...(catalog.messages || [])]
  };
  const state = getState();
  saveState({ ...state, userGroups: [joined, ...(state.userGroups || [])] });
  return joined;
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

function groupMatchesQuery(group, term) {
  if (!term) return true;
  const hay = `${group.title || ''} ${group.about || ''} ${group.city || ''}`.toLowerCase();
  return hay.includes(term);
}

/** Вкладка «Группы» — список + поиск как в Telegram. */
export function groupsScreen() {
  clearHeader();
  let query = '';

  const render = () => {
    const term = query.trim().toLowerCase();
    const groups = listAllGroups().filter(group => groupMatchesQuery(group, term));
    const mineCount = getUserGroups().length;

    view.innerHTML = `
      <div class="groups-tab-page">
        <header class="chats-head">
          <h1>Группы</h1>
          <span></span>
        </header>

        <div class="search-box groups-search">
          <i class="ti ti-search"></i>
          <input id="groupSearch" type="search" placeholder="Поиск" value="${esc(query)}" enterkeyhint="search">
          ${term ? '<button type="button" id="clearGroupSearch" aria-label="Очистить">×</button>' : ''}
        </div>

        ${groups.length
          ? `<div class="groups-tab-list">${groups.map(group => {
              const last = group.messages?.[group.messages.length - 1];
              const meta = last?.text
                || (group.members ? `${group.members} участниц` : group.about)
                || 'Группа';
              return `
                <button class="group-tab-row" type="button" data-open-group="${esc(group.id)}">
                  <img src="${esc(group.photo)}" alt="">
                  <div>
                    <strong>${esc(group.title)}</strong>
                    <span>${esc(meta)}${last?.time ? ` · ${esc(last.time)}` : ''}</span>
                  </div>
                </button>`;
            }).join('')}</div>`
          : term
            ? `<p class="search-none">Ничего не найдено</p>`
            : `<div class="groups-tab-empty">
                <div class="empty-badge yellow"><i class="ti ti-users"></i></div>
                <h2>Создайте группу</h2>
                <p>Соберите людей по интересам и планируйте встречи вместе.</p>
                <button class="empty-primary" type="button" data-action="create-group">Создать группу</button>
              </div>`}

        ${!term && groups.length && !mineCount ? `
          <p class="groups-tab-hint">Публичные группы рядом. Нажмите, чтобы открыть.</p>
        ` : ''}

        <button class="compose" data-action="create-group" aria-label="Создать"><i class="ti ti-plus"></i></button>
      </div>`;

    const input = view.querySelector('#groupSearch');
    input?.addEventListener('input', () => {
      query = input.value;
      render();
      const next = view.querySelector('#groupSearch');
      if (next) {
        next.focus();
        const pos = query.length;
        next.setSelectionRange(pos, pos);
      }
    });
    view.querySelector('#clearGroupSearch')?.addEventListener('click', () => {
      query = '';
      render();
      view.querySelector('#groupSearch')?.focus();
    });
    view.querySelectorAll('[data-open-group]').forEach(button => {
      button.onclick = () => {
        const group = openGroup(button.dataset.openGroup);
        if (group) navigate('group', group.id);
      };
    });
  };

  render();
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
      showCelebrate({
        title: 'Группа создана!',
        subtitle: group.title,
        primaryLabel: 'Открыть группу',
        secondaryLabel: 'Пригласить подруг',
        shareText: `Присоединяйся к группе «${group.title}» в Yaqin`,
        onPrimary: () => navigate('group', group.id),
        onClose: () => navigate('group', group.id)
      });
    };
  };

  render();
}

function groupMembers(group) {
  const count = Math.min(8, Math.max(3, Number(group.members) || 4));
  return people.slice(0, count).map(person => ({
    id: person.id,
    name: person.name,
    photo: person.photo,
    city: person.city
  }));
}

/** Хаб группы: обложка, участницы, чат / пригласить. */
export function groupHubScreen(id) {
  clearHeader();
  const group = openGroup(id);
  if (!group) {
    navigate('groups');
    return;
  }
  const members = groupMembers(group);
  const memberCount = group.members || members.length;

  view.innerHTML = `
    <div class="group-hub-page">
      <header class="group-hub-top">
        <button type="button" data-action="groups" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <button type="button" id="shareGroup" aria-label="Поделиться"><i class="ti ti-share"></i></button>
      </header>

      <div class="group-hub-cover event-photo">
        <img src="${esc(group.photo)}" alt="">
      </div>

      <section class="group-hub-body">
        <em class="group-hub-city">${esc(group.city || 'Ташкент')}</em>
        <h1>${esc(group.title)}</h1>
        <p class="group-hub-about">${esc(group.about || 'Группа в Yaqin')}</p>
        <p class="group-hub-meta">${memberCount} участниц${group.online ? ` · ${group.online} онлайн` : ''}</p>

        <h3>Участницы</h3>
        <div class="group-hub-members">
          ${members.map(person => `
            <button type="button" class="group-hub-member" data-action="person" data-id="${person.id}">
              <img src="${esc(person.photo)}" alt="">
              <span>${esc(person.name)}</span>
            </button>`).join('')}
        </div>
      </section>

      <div class="group-hub-cta">
        <button type="button" class="group-hub-chat" data-action="group-chat" data-id="${esc(group.id)}">Чат</button>
        <button type="button" class="group-hub-invite" id="inviteGroup">Пригласить</button>
      </div>
    </div>`;

  const share = () => {
    const text = `Присоединяйся к группе «${group.title}» в Yaqin`;
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/yaqin_bot')}&text=${encodeURIComponent(text)}`);
        return;
      }
    } catch (_) { /* ignore */ }
    navigator.share?.({ text }).catch(() => {});
  };
  view.querySelector('#shareGroup').onclick = share;
  view.querySelector('#inviteGroup').onclick = share;
}

/** Простой чат группы (без комнат/постов). */
export function groupChatScreen(id) {
  clearHeader();
  const group = openGroup(id);
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
          <button class="chat-back" data-action="group" data-id="${esc(group.id)}" aria-label="Назад">
            <i class="ti ti-chevron-left"></i>
          </button>
          <button type="button" class="chat-peer chat-peer-btn" data-action="group" data-id="${esc(group.id)}">
            <h1>${esc(group.title)}</h1>
            <p>${group.members || 1} участниц · ${esc(group.city || '')}</p>
          </button>
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

        <div class="create-cover create-event-cover ${cover ? 'has-photo' : ''}">
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
