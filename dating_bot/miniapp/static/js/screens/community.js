import { events as taneeshEvents, PHOTOS, defaultProfile } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';
import { getState, saveState } from '../state.js';

const COVER_POOL = [PHOTOS.palms, PHOTOS.coffee, PHOTOS.city, PHOTOS.books, PHOTOS.event, PHOTOS.mila].filter(Boolean);

const THEMES = [
  { name: 'Синий', color: '#3b6ef5' },
  { name: 'Коралл', color: '#ff5a5f' },
  { name: 'Фиолетовый', color: '#8b5cf6' },
  { name: 'Зелёный', color: '#34c759' }
];

const TAG_CHOICES = ['кофе', 'прогулки', 'книги', 'йога', 'музыка', 'кино', 'спорт', 'еда', 'искусство', 'путешествия'];

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

/** Создание группы — BFF `07-groups/create-group--071`. Закрытие → чаты. */
export function createGroupScreen() {
  clearHeader();
  let name = '';
  let about = '';
  let city = '';
  let isPublic = true;
  let cover = null;
  let coverIndex = 0;
  let tags = new Set();
  let theme = THEMES[0];
  let locOpen = false;
  let themeOpen = false;
  let tagsOpen = false;

  const render = () => {
    const canCreate = name.trim().length > 1;

    if (locOpen) {
      view.innerHTML = `
        <div class="group-location-page">
          <header class="modal-head">
            <span></span>
            <h1>Локация</h1>
            <button class="head-action on" id="locDone">Готово</button>
          </header>
          <p class="loc-sub">Добавьте город для группы</p>
          <div class="loc-map">
            <span class="loc-pin">${esc(city || 'Ташкент')}</span>
          </div>
          <button class="loc-current" id="locCurrent"><i class="ti ti-current-location"></i> Текущее местоположение</button>
          <button class="loc-everywhere" id="locEverywhere">Установить «Везде»</button>
        </div>`;
      view.querySelector('#locCurrent').onclick = () => { city = 'Ташкент'; locOpen = false; render(); };
      view.querySelector('#locEverywhere').onclick = () => { city = 'Везде'; locOpen = false; render(); };
      view.querySelector('#locDone').onclick = () => { locOpen = false; render(); };
      return;
    }

    if (themeOpen) {
      view.innerHTML = `
        <div class="group-theme-page">
          <header class="modal-head">
            <button id="themeBack" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
            <h1>Цвет темы</h1>
            <span></span>
          </header>
          <div class="theme-grid">
            ${THEMES.map(item => `
              <button type="button" class="theme-swatch ${theme.name === item.name ? 'on' : ''}" data-theme="${esc(item.name)}" style="--swatch:${item.color}">
                <i></i><span>${esc(item.name)}</span>
              </button>`).join('')}
          </div>
        </div>`;
      view.querySelector('#themeBack').onclick = () => { themeOpen = false; render(); };
      view.querySelectorAll('[data-theme]').forEach(button => {
        button.onclick = () => {
          theme = THEMES.find(item => item.name === button.dataset.theme) || theme;
          themeOpen = false;
          render();
        };
      });
      return;
    }

    if (tagsOpen) {
      view.innerHTML = `
        <div class="group-tags-page">
          <header class="modal-head">
            <button id="tagsBack" aria-label="Закрыть"><i class="ti ti-x"></i></button>
            <h1>Теги</h1>
            <button class="head-action on" id="tagsDone">Готово</button>
          </header>
          <p class="loc-sub">Выберите до 5 интересов группы</p>
          <div class="tags-cloud">
            ${TAG_CHOICES.map(item => `
              <button type="button" class="tag-chip ${tags.has(item) ? 'on' : ''}" data-tag="${esc(item)}">${esc(item)}</button>`).join('')}
          </div>
        </div>`;
      view.querySelectorAll('[data-tag]').forEach(button => {
        button.onclick = () => {
          const value = button.dataset.tag;
          if (tags.has(value)) tags.delete(value);
          else if (tags.size < 5) tags.add(value);
          render();
        };
      });
      view.querySelector('#tagsBack').onclick = () => { tagsOpen = false; render(); };
      view.querySelector('#tagsDone').onclick = () => { tagsOpen = false; render(); };
      return;
    }

    const tagLabel = tags.size
      ? `${[...tags][0]}${tags.size > 1 ? ` +${tags.size - 1}` : ''}`
      : 'Теги';

    view.innerHTML = `
      <div class="create-group-page">
        <header class="modal-head">
          <button data-action="chats" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Создать группу</h1>
          <button class="head-action ${canCreate ? 'on coral' : ''}" id="createGroupBtn" ${canCreate ? '' : 'disabled'}>Создать</button>
        </header>

        <div class="create-cover ${cover ? 'has-photo' : ''}">
          ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ФОТО</span>`}
          <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
        </div>

        <input class="create-name" id="groupName" placeholder="Название группы..." value="${esc(name)}">
        <button class="create-desc" type="button" id="groupAboutToggle">${about ? esc(about) : 'Добавить описание'}</button>
        <textarea class="create-about ${about ? 'show' : ''}" id="groupAbout" placeholder="О группе">${esc(about)}</textarea>

        <div class="create-chips">
          <button type="button" id="setCity"><i class="ti ti-map-pin"></i>${city ? esc(city) : 'Добавить локацию'}</button>
          <button type="button" id="setTag"><i class="ti ti-tag"></i>${esc(tagLabel)}</button>
        </div>

        <h3 class="settings-label">Параметры</h3>
        <div class="settings-block">
          <button class="settings-row" type="button" id="openTheme">
            <span class="settings-icon" style="background:${theme.color}"></span>
            <span>Цвет темы<br><small>${esc(theme.name)}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <label class="settings-row toggle">
            <span class="settings-icon"><i class="ti ti-eye"></i></span>
            <span>Публичная группа<br><small>Вступить может каждая</small></span>
            <input type="checkbox" id="groupPublic" ${isPublic ? 'checked' : ''}>
          </label>
        </div>
        <p class="create-legal">Нажимая «Создать», вы соглашаетесь с <button type="button" class="legal-inline" data-action="legal">правилами общения Yaqin</button>.</p>
      </div>`;

    view.querySelector('#groupName').oninput = event => {
      name = event.target.value;
      const btn = view.querySelector('#createGroupBtn');
      const ready = name.trim().length > 1;
      btn.disabled = !ready;
      btn.classList.toggle('on', ready);
      btn.classList.toggle('coral', ready);
    };
    view.querySelector('#groupAboutToggle').onclick = () => {
      view.querySelector('#groupAbout').classList.add('show');
      view.querySelector('#groupAbout').focus();
    };
    view.querySelector('#groupAbout').oninput = event => { about = event.target.value; };
    view.querySelector('#groupPublic').onchange = event => { isPublic = event.target.checked; };
    view.querySelector('#setCover').onclick = () => {
      cover = nextCover(coverIndex++);
      render();
    };
    view.querySelector('#setCity').onclick = () => { locOpen = true; render(); };
    view.querySelector('#openTheme').onclick = () => { themeOpen = true; render(); };
    view.querySelector('#setTag').onclick = () => { tagsOpen = true; render(); };
    view.querySelector('#createGroupBtn').onclick = () => {
      if (!name.trim()) return;
      const profile = getState().profile || defaultProfile;
      const group = {
        id: `g-${Date.now()}`,
        title: name.trim(),
        about: about.trim() || 'Группа в Yaqin',
        city: city || 'Ташкент',
        photo: cover || nextCover(0),
        isPublic,
        theme,
        tags: [...tags],
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
    navigate('chats');
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
          <button class="chat-back" data-action="chats" aria-label="Назад">
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

/** Создание события → попадает в общую ленту с Taneesh. */
export function createEventScreen() {
  clearHeader();
  let title = '';
  let place = '';
  let address = 'Ташкент';
  let when = 'Вс, 21 сен · 11:00';
  let cover = null;
  let coverIndex = 0;
  let ticketMode = 'free';
  let price = 45000;

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
        <button class="settings-row" type="button" id="eventAddress">
          <span class="settings-icon green"><i class="ti ti-map-pin"></i></span>
          <span>Адрес<br><small>${esc(address)}</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>

        <h3 class="settings-label">Билет</h3>
        <div class="create-chips" style="padding:0 16px;flex-wrap:wrap">
          ${[
            ['free', 'Бесплатно'],
            ['door', 'На входе'],
            ['paid', 'Платный']
          ].map(([mode, label]) => `
            <button type="button" class="${ticketMode === mode ? 'on' : ''}" data-mode="${mode}">${label}</button>`).join('')}
        </div>
        ${ticketMode !== 'free' ? `
          <input class="create-name smaller" id="eventPrice" type="number" min="0" step="1000" value="${price}" placeholder="Цена, сум">` : ''}
      </div>`;

    const syncReady = () => {
      const btn = view.querySelector('#createEventBtn');
      const ok = title.trim().length > 1 && place.trim().length > 1;
      btn.disabled = !ok;
      btn.classList.toggle('on', ok);
    };

    view.querySelector('#eventTitle').oninput = event => { title = event.target.value; syncReady(); };
    view.querySelector('#eventPlace').oninput = event => { place = event.target.value; syncReady(); };
    view.querySelector('#eventPrice')?.addEventListener('input', event => {
      price = Number(event.target.value) || 0;
    });
    view.querySelector('#setCover').onclick = () => {
      cover = nextCover(coverIndex++);
      render();
    };
    view.querySelector('#eventWhen').onclick = () => {
      when = when.includes('21') ? 'Сб, 20 сен · 10:00' : 'Вс, 21 сен · 11:00';
      render();
    };
    view.querySelector('#eventAddress').onclick = () => {
      address = address === 'Ташкент' ? 'Мирабад, ул. Шевченко' : 'Ташкент';
      render();
    };
    view.querySelectorAll('[data-mode]').forEach(button => {
      button.onclick = () => {
        ticketMode = button.dataset.mode;
        render();
      };
    });
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
        address,
        group: 'Yaqin',
        host: profile.name || 'Вы',
        going: 1,
        photo: cover || nextCover(1),
        ticketMode,
        price: ticketMode === 'free' ? 0 : price,
        fee: ticketMode === 'paid' ? Math.round(price * 0.1) : ticketMode === 'door' ? 5000 : 0,
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
