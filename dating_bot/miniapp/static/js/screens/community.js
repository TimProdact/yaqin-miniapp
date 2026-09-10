import { events as taneeshEvents, PHOTOS, defaultProfile, demoGroups, people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';
import { getState, saveState } from '../state.js';
import { showCelebrate } from '../celebrate.js';
import { INTEREST_OPTIONS, filterOptions } from '../profile-fields.js';

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

/** Открыть группу: публичные вступают сразу; закрытые — только просмотр, пока не приняты. */
export function openGroup(id) {
  const existing = getUserGroups().find(group => String(group.id) === String(id));
  if (existing) return existing;
  const catalog = demoGroups.find(group => String(group.id) === String(id));
  if (!catalog) return null;
  if (catalog.isPublic === false) {
    return { ...catalog, membership: 'none' };
  }
  const joined = {
    ...catalog,
    catalog: false,
    membership: 'member',
    joinedAt: new Date().toISOString(),
    messages: [...(catalog.messages || [])]
  };
  const state = getState();
  saveState({ ...state, userGroups: [joined, ...(state.userGroups || [])] });
  return joined;
}

export function isGroupPublic(group) {
  return group?.isPublic !== false;
}

export function isGroupMember(group) {
  if (!group) return false;
  if (group.membership === 'none' || group.membership === 'pending') return false;
  return getUserGroups().some(item => String(item.id) === String(group.id));
}

/** Демо: заявка в закрытую группу → принимаем сразу. */
export function requestJoinGroup(id) {
  const existing = getUserGroups().find(group => String(group.id) === String(id));
  if (existing) return existing;
  const catalog = demoGroups.find(group => String(group.id) === String(id));
  if (!catalog) return null;
  const joined = {
    ...catalog,
    catalog: false,
    membership: 'member',
    joinedAt: new Date().toISOString(),
    messages: [
      ...(catalog.messages || []),
      {
        from: 'them',
        name: 'Модератор',
        text: 'Заявка принята. Добро пожаловать в группу!',
        time: 'сейчас'
      }
    ]
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

function groupMatchesFilter(group, filter) {
  if (filter === 'open') return isGroupPublic(group);
  if (filter === 'closed') return !isGroupPublic(group);
  return true;
}

/** Вкладка «Группы» — список + поиск + фильтр открытые/закрытые. */
export function groupsScreen() {
  clearHeader();
  let query = '';
  let filter = 'all'; // all | open | closed

  const render = () => {
    const term = query.trim().toLowerCase();
    const groups = listAllGroups()
      .filter(group => groupMatchesFilter(group, filter))
      .filter(group => groupMatchesQuery(group, term));
    const mineCount = getUserGroups().length;
    const pills = [
      ['all', 'Все'],
      ['open', 'Открытые'],
      ['closed', 'Закрытые']
    ];

    view.innerHTML = `
      <div class="groups-tab-page">
        <header class="chats-head">
          <h1>Группы</h1>
          <div class="events-head-actions">
            <button data-action="create-group" aria-label="Создать группу"><i class="ti ti-plus"></i></button>
          </div>
        </header>

        <div class="search-box groups-search">
          <i class="ti ti-search"></i>
          <input id="groupSearch" type="search" placeholder="Поиск групп" value="${esc(query)}" enterkeyhint="search">
          ${term ? '<button type="button" id="clearGroupSearch" aria-label="Очистить">×</button>' : ''}
        </div>

        <div class="chats-pills groups-pills" role="tablist">
          ${pills.map(([id, label]) => `
            <button type="button" class="${filter === id ? 'on' : ''}" data-filter="${id}">${label}</button>
          `).join('')}
        </div>

        ${groups.length
          ? `<div class="groups-tab-list">${groups.map(group => {
              const open = isGroupPublic(group);
              const last = group.messages?.[group.messages.length - 1];
              const meta = last?.text
                || (group.members ? `${group.members} участниц` : group.about)
                || 'Группа';
              return `
                <button class="group-tab-row" type="button" data-open-group="${esc(group.id)}">
                  <div class="group-tab-avatar">
                    <img src="${esc(group.photo)}" alt="">
                    ${open ? '' : '<i class="ti ti-lock group-tab-lock" aria-hidden="true"></i>'}
                  </div>
                  <div>
                    <strong>${esc(group.title)}${open ? '' : ' <em class="group-privacy">закрытая</em>'}</strong>
                    <span>${esc(meta)}${last?.time ? ` · ${esc(last.time)}` : ''}</span>
                  </div>
                </button>`;
            }).join('')}</div>`
          : term || filter !== 'all'
            ? `<p class="search-none">${term ? 'Ничего не найдено' : filter === 'closed' ? 'Пока нет закрытых групп' : 'Пока нет открытых групп'}</p>`
            : `<div class="groups-tab-empty">
                <div class="empty-badge yellow"><i class="ti ti-users"></i></div>
                <h2>Создайте группу</h2>
                <p>Соберите людей по интересам — открытую или закрытую.</p>
                <button class="empty-primary" type="button" data-action="create-group">Создать группу</button>
              </div>`}

        ${!term && filter === 'all' && groups.length && !mineCount ? `
          <p class="groups-tab-hint">Открытые — вход сразу. Закрытые — по заявке.</p>
        ` : ''}
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
    view.querySelectorAll('[data-filter]').forEach(button => {
      button.onclick = () => {
        filter = button.dataset.filter;
        render();
      };
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

/** Создание группы — название, фото, открытая/закрытая. */
export function createGroupScreen() {
  clearHeader();
  let name = '';
  let cover = null;
  let coverIndex = 0;
  let isPublic = true;

  const render = () => {
    const canCreate = name.trim().length > 1;
    view.innerHTML = `
      <div class="create-group-page">
        <header class="modal-head">
          <button data-action="groups" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Создать группу</h1>
          <span></span>
        </header>

        <div class="create-cover ${cover ? 'has-photo' : ''}">
          ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ФОТО</span>`}
          <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
        </div>

        <input class="create-name" id="groupName" placeholder="Название группы..." value="${esc(name)}" maxlength="60" autocomplete="off">

        <h3 class="settings-label">Тип группы</h3>
        <div class="create-chips" id="groupPrivacyChips">
          <button type="button" class="${isPublic ? 'on' : ''}" data-privacy="open">
            <i class="ti ti-world"></i> Открытая
          </button>
          <button type="button" class="${!isPublic ? 'on' : ''}" data-privacy="closed">
            <i class="ti ti-lock"></i> Закрытая
          </button>
        </div>
        <p class="create-legal">
          ${isPublic
            ? 'Любая может вступить сразу и писать в чат.'
            : 'Вход только по заявке. Вы принимаете участниц вручную.'}
        </p>

        <div class="create-sticky-cta">
          <button type="button" class="create-submit ${canCreate ? 'on' : ''}" id="createGroupBtn" ${canCreate ? '' : 'disabled'}>Создать</button>
        </div>
      </div>`;

    view.querySelector('#groupName').oninput = event => {
      name = event.target.value;
      const btn = view.querySelector('#createGroupBtn');
      const ready = name.trim().length > 1;
      btn.disabled = !ready;
      btn.classList.toggle('on', ready);
    };
    view.querySelector('#setCover').onclick = () => {
      cover = nextCover(coverIndex++);
      render();
    };
    view.querySelectorAll('[data-privacy]').forEach(button => {
      button.onclick = () => {
        isPublic = button.dataset.privacy === 'open';
        render();
      };
    });
    view.querySelector('#createGroupBtn').onclick = () => {
      if (!name.trim()) return;
      const profile = getState().profile || defaultProfile;
      const group = {
        id: `g-${Date.now()}`,
        title: name.trim(),
        about: isPublic ? 'Открытая группа в Yaqin' : 'Закрытая группа в Yaqin',
        city: 'Ташкент',
        photo: cover || nextCover(0),
        isPublic,
        members: 1,
        online: 1,
        membership: 'member',
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
        subtitle: `${group.title} · ${isPublic ? 'открытая' : 'закрытая'}`,
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

/** Хаб группы: обложка, участницы, чат / заявка / пригласить. */
export function groupHubScreen(id) {
  clearHeader();
  const group = openGroup(id);
  if (!group) {
    navigate('groups');
    return;
  }
  const members = groupMembers(group);
  const memberCount = group.members || members.length;
  const member = isGroupMember(group);
  const open = isGroupPublic(group);

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
        <em class="group-hub-city">${esc(group.city || 'Ташкент')} · ${open ? 'открытая' : 'закрытая'}</em>
        <h1>${esc(group.title)}${open ? '' : ' <i class="ti ti-lock"></i>'}</h1>
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
        ${member
          ? `
            <button type="button" class="group-hub-chat" data-action="group-chat" data-id="${esc(group.id)}">Чат</button>
            <button type="button" class="group-hub-invite" id="inviteGroup">Пригласить</button>`
          : open
            ? `<button type="button" class="group-hub-chat" id="joinOpenGroup">Вступить</button>`
            : `<button type="button" class="group-hub-chat" id="requestJoin">Подать заявку</button>`}
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
  view.querySelector('#inviteGroup')?.addEventListener('click', share);
  view.querySelector('#requestJoin')?.addEventListener('click', () => {
    const joined = requestJoinGroup(group.id);
    if (!joined) return;
    showCelebrate({
      title: 'Вы в группе!',
      subtitle: 'Заявка принята (демо). Можно писать в чат.',
      primaryLabel: 'Открыть чат',
      onPrimary: () => navigate('group-chat', joined.id)
    });
    navigate('group', joined.id);
  });
  view.querySelector('#joinOpenGroup')?.addEventListener('click', () => {
    const joined = requestJoinGroup(group.id);
    if (joined) navigate('group-chat', joined.id);
  });
}

/** Простой чат группы (без комнат/постов). */
export function groupChatScreen(id) {
  clearHeader();
  const group = openGroup(id);
  if (!group) {
    navigate('groups');
    return;
  }
  if (!isGroupMember(group)) {
    navigate('group', id);
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

/** Создание события — поля как в Taneesh: ряды → модалки. */
export function createEventScreen() {
  clearHeader();
  const WHEN_OPTIONS = [
    { when: 'Сегодня · 19:00', day: String(new Date().getDate()), month: 'сен' },
    { when: 'Завтра · 11:00', day: String(new Date().getDate() + 1), month: 'сен' },
    { when: 'Сб, 20 сен · 10:00', day: '20', month: 'сен' },
    { when: 'Вс, 21 сен · 11:00', day: '21', month: 'сен' },
    { when: 'Пт, 26 сен · 19:30', day: '26', month: 'сен' },
    { when: 'Сб, 27 сен · 16:00', day: '27', month: 'сен' }
  ];
  const PLACE_OPTIONS = [
    'Кофейня в центре',
    'Парк Ашхабад',
    'Мирабад',
    'Юнусабад',
    'Чиланзар',
    'Next',
    'Magic City',
    'Бродвей',
    'Самарканд · Регистан',
    'Онлайн'
  ];
  const INTEREST_MAX = 5;

  let title = '';
  let place = '';
  let city = 'Ташкент';
  let description = '';
  let interests = [];
  let whenIdx = 3;
  let cover = null;
  let coverIndex = 0;
  let ticketMode = 'free';
  let doorPrice = '50000';
  let capacity = '30';
  let sheet = null;
  let sheetQuery = '';
  let draftText = '';
  let restoreFocus = false;

  const whenOf = () => WHEN_OPTIONS[whenIdx] || WHEN_OPTIONS[0];
  const preview = (text, empty) => {
    const value = String(text || '').trim();
    if (!value) return empty;
    return value.length > 42 ? `${value.slice(0, 42)}…` : value;
  };

  const closeSheet = () => {
    sheet = null;
    sheetQuery = '';
    draftText = '';
    restoreFocus = false;
    render();
  };

  const sheetHead = (heading, sub) => `
    <header class="edit-sheet-head">
      <button type="button" class="edit-sheet-close" id="closeSheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
      <div class="edit-sheet-titles"><h2>${esc(heading)}</h2><p>${esc(sub)}</p></div>
      <span class="edit-sheet-spacer"></span>
    </header>`;

  const renderSheet = () => {
    if (sheet === 'when') {
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--picker create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Когда', 'Выберите дату и время')}
          <div class="create-when-list">
            ${WHEN_OPTIONS.map((option, index) => `
              <button type="button" class="create-when-row ${index === whenIdx ? 'on' : ''}" data-when="${index}">
                <span>${esc(option.when)}</span>
                ${index === whenIdx ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
        </div>`;
    }

    if (sheet === 'place') {
      const filtered = filterOptions(PLACE_OPTIONS, sheetQuery);
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--picker create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Место', 'Где пройдёт встреча')}
          <label class="edit-sheet-search">
            <i class="ti ti-search"></i>
            <input id="sheetSearch" type="search" placeholder="Поиск или своё место" value="${esc(sheetQuery)}" autocomplete="off">
          </label>
          <div class="create-when-list">
            ${filtered.map(item => `
              <button type="button" class="create-when-row ${place === item ? 'on' : ''}" data-place="${esc(item)}">
                <span>${esc(item)}</span>
                ${place === item ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
          <div class="edit-work-custom">
            <span>Своё место</span>
            <input id="placeCustom" type="text" maxlength="80" value="${esc(PLACE_OPTIONS.includes(place) ? '' : place)}" placeholder="Адрес или название" autocomplete="off">
          </div>
          <div class="edit-sheet-foot">
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'description') {
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--text create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Описание', 'Расскажите, что будет')}
          <textarea class="create-sheet-textarea" id="descInput" maxlength="400" rows="6" placeholder="Коротко о встрече, дресс-код, что взять с собой…">${esc(draftText)}</textarea>
          <div class="edit-sheet-foot">
            ${draftText ? '<button type="button" class="edit-sheet-clear-field" id="clearDesc">Очистить</button>' : ''}
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'interests') {
      const filtered = filterOptions(INTEREST_OPTIONS, sheetQuery);
      const ordered = [
        ...interests.filter(item => filtered.includes(item)),
        ...filtered.filter(item => !interests.includes(item))
      ];
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--picker create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Интересы', interests.length ? `выбрано ${interests.length} из ${INTEREST_MAX}` : 'Выберите темы события')}
          <label class="edit-sheet-search">
            <i class="ti ti-search"></i>
            <input id="sheetSearch" type="search" placeholder="Поиск" value="${esc(sheetQuery)}" autocomplete="off">
          </label>
          <div class="edit-chip-picker">
            ${ordered.map(item => `
              <button type="button" class="pick-chip ${interests.includes(item) ? 'on' : ''}" data-interest="${esc(item)}">${esc(item)}</button>
            `).join('') || '<p class="edit-sheet-empty">Ничего не найдено</p>'}
          </div>
          <div class="edit-sheet-foot">
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'capacity') {
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--text create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Места', 'Сколько гостей ждёте')}
          <div class="create-when-list">
            ${['10', '20', '30', '50', '100'].map(item => `
              <button type="button" class="create-when-row ${capacity === item ? 'on' : ''}" data-capacity="${item}">
                <span>до ${item}</span>
                ${capacity === item ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
          <div class="edit-work-custom">
            <span>Своё число</span>
            <input id="capacityCustom" type="text" inputmode="numeric" maxlength="4" value="${esc(['10', '20', '30', '50', '100'].includes(capacity) ? '' : capacity)}" placeholder="например 25" autocomplete="off">
          </div>
          <div class="edit-sheet-foot">
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    return '';
  };

  const render = () => {
    const ready = title.trim().length > 1 && place.trim().length > 1
      && (ticketMode === 'free' || Number(String(doorPrice).replace(/\D/g, '')) > 0);
    const when = whenOf();
    const doorSum = Number(String(doorPrice).replace(/\D/g, '')) || 0;

    view.innerHTML = `
      <div class="create-event-page">
        <header class="modal-head">
          <button data-action="events" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Новое событие</h1>
          <span></span>
        </header>

        <div class="create-cover create-event-cover ${cover ? 'has-photo' : ''}">
          ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ОБЛОЖКА</span>`}
          <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
        </div>

        <input class="create-name" id="eventTitle" placeholder="Название события" value="${esc(title)}" maxlength="80" autocomplete="off">

        <div class="create-field-rows">
          <button class="settings-row" type="button" data-sheet="place">
            <span class="settings-icon orange square"><i class="ti ti-map-pin"></i></span>
            <span>Место<br><small>${esc(preview(place, 'Добавить'))}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="when">
            <span class="settings-icon blue square"><i class="ti ti-calendar-event"></i></span>
            <span>Когда<br><small>${esc(when.when)}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="description">
            <span class="settings-icon purple square"><i class="ti ti-align-left"></i></span>
            <span>Описание<br><small>${esc(preview(description, 'Добавить'))}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="interests">
            <span class="settings-icon pink square"><i class="ti ti-sparkles"></i></span>
            <span>Интересы<br><small>${esc(interests.length ? interests.join(', ') : 'Добавить')}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="capacity">
            <span class="settings-icon green square"><i class="ti ti-users"></i></span>
            <span>Места<br><small>до ${esc(capacity || '30')}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
        </div>

        <h3 class="settings-label">Вход</h3>
        <div class="create-chips" id="ticketModeChips">
          <button type="button" class="${ticketMode === 'free' ? 'on' : ''}" data-mode="free">
            <i class="ti ti-ticket"></i> Бесплатно
          </button>
          <button type="button" class="${ticketMode === 'door' ? 'on' : ''}" data-mode="door">
            <i class="ti ti-cash"></i> Оплата на входе
          </button>
        </div>

        ${ticketMode === 'door' ? `
          <label class="create-price-field">
            <span>Сумма на входе</span>
            <div class="create-price-input">
              <input id="doorPrice" type="text" inputmode="numeric" value="${esc(doorPrice)}" placeholder="50000" maxlength="10" autocomplete="off">
              <em>сум</em>
            </div>
          </label>
        ` : ''}

        <p class="create-legal">
          ${ticketMode === 'free'
            ? 'Гость записывается бесплатно и получает QR для входа.'
            : `Гость бронирует место бесплатно, на входе платит ${doorSum ? doorSum.toLocaleString('ru-RU') + ' сум' : 'указанную сумму'} и показывает QR.`}
        </p>

        <div class="create-sticky-cta">
          <button type="button" class="create-submit ${ready ? 'on' : ''}" id="createEventBtn" ${ready ? '' : 'disabled'}>Создать</button>
        </div>
      </div>

      ${renderSheet()}`;

    const syncReady = () => {
      const btn = view.querySelector('#createEventBtn');
      if (!btn) return;
      const priceOk = ticketMode === 'free' || Number(String(doorPrice).replace(/\D/g, '')) > 0;
      const ok = title.trim().length > 1 && place.trim().length > 1 && priceOk;
      btn.disabled = !ok;
      btn.classList.toggle('on', ok);
    };

    view.querySelector('#eventTitle').oninput = event => { title = event.target.value; syncReady(); };
    view.querySelector('#setCover').onclick = () => {
      cover = nextCover(coverIndex++);
      render();
    };
    view.querySelectorAll('[data-sheet]').forEach(button => {
      button.onclick = () => {
        sheet = button.dataset.sheet;
        sheetQuery = '';
        if (sheet === 'description') draftText = description;
        render();
      };
    });
    view.querySelectorAll('[data-mode]').forEach(button => {
      button.onclick = () => {
        ticketMode = button.dataset.mode === 'door' ? 'door' : 'free';
        render();
      };
    });
    const priceInput = view.querySelector('#doorPrice');
    if (priceInput) {
      priceInput.oninput = event => {
        doorPrice = event.target.value.replace(/[^\d]/g, '');
        event.target.value = doorPrice;
        syncReady();
      };
    }

    view.querySelector('#sheetScrim')?.addEventListener('click', closeSheet);
    view.querySelector('#closeSheet')?.addEventListener('click', closeSheet);
    view.querySelector('#doneSheet')?.addEventListener('click', () => {
      if (sheet === 'place') {
        const custom = view.querySelector('#placeCustom')?.value?.trim() || '';
        if (custom) place = custom;
      }
      if (sheet === 'description') {
        description = (view.querySelector('#descInput')?.value || draftText || '').trim();
      }
      if (sheet === 'capacity') {
        const custom = view.querySelector('#capacityCustom')?.value?.replace(/\D/g, '') || '';
        if (custom) capacity = custom;
      }
      closeSheet();
    });

    view.querySelectorAll('[data-when]').forEach(button => {
      button.onclick = () => {
        whenIdx = Number(button.dataset.when);
        closeSheet();
      };
    });
    view.querySelectorAll('[data-place]').forEach(button => {
      button.onclick = () => {
        place = button.dataset.place;
        const custom = view.querySelector('#placeCustom');
        if (custom) custom.value = '';
        render();
      };
    });
    view.querySelectorAll('[data-capacity]').forEach(button => {
      button.onclick = () => {
        capacity = button.dataset.capacity;
        render();
      };
    });
    view.querySelectorAll('[data-interest]').forEach(button => {
      button.onclick = () => {
        const value = button.dataset.interest;
        const index = interests.indexOf(value);
        if (index >= 0) interests.splice(index, 1);
        else if (interests.length < INTEREST_MAX) interests.push(value);
        restoreFocus = Boolean(sheetQuery);
        render();
      };
    });

    const search = view.querySelector('#sheetSearch');
    if (search) {
      if (restoreFocus) {
        search.focus();
        const len = search.value.length;
        search.setSelectionRange(len, len);
        restoreFocus = false;
      }
      search.oninput = () => {
        sheetQuery = search.value;
        restoreFocus = true;
        render();
      };
    }

    const descInput = view.querySelector('#descInput');
    if (descInput) {
      descInput.focus();
      descInput.oninput = () => { draftText = descInput.value; };
    }
    view.querySelector('#clearDesc')?.addEventListener('click', () => {
      draftText = '';
      description = '';
      render();
    });

    view.querySelector('#createEventBtn').onclick = () => {
      if (!(title.trim().length > 1 && place.trim().length > 1)) return;
      const profile = getState().profile || defaultProfile;
      const slot = whenOf();
      const price = ticketMode === 'door' ? Number(String(doorPrice).replace(/\D/g, '')) || 0 : 0;
      if (ticketMode === 'door' && price < 1) return;

      const eventId = `e-${Date.now()}`;
      const event = {
        id: eventId,
        title: title.trim(),
        when: slot.when,
        day: slot.day,
        month: slot.month,
        place: place.trim(),
        address: city,
        description: description.trim(),
        interests: [...interests],
        capacity: Number(capacity) || 30,
        group: 'Yaqin',
        host: profile.name || 'Вы',
        hostId: 'me',
        going: 1,
        photo: cover || nextCover(1),
        isFree: ticketMode === 'free',
        ticketMode,
        paymentMode: ticketMode === 'door' ? 'at_door' : undefined,
        price,
        fee: 0,
        currency: 'UZS',
        source: 'yaqin',
        createdAt: new Date().toISOString()
      };

      const hostTicket = {
        id: `t-${eventId}-host`,
        eventId,
        title: event.title,
        when: event.when,
        place: event.place,
        photo: event.photo,
        mode: ticketMode,
        role: 'host',
        price: 0,
        fee: 0,
        total: 0,
        doorPay: ticketMode === 'door' ? price : 0,
        code: `YQHOST-${eventId.slice(-8).toUpperCase()}`,
        createdAt: new Date().toISOString()
      };

      const state = getState();
      saveState({
        ...state,
        userEvents: [event, ...(state.userEvents || [])],
        tickets: [hostTicket, ...(state.tickets || [])],
        eventGoing: {
          ...(state.eventGoing || {}),
          [eventId]: {
            id: 'me',
            name: profile.name || defaultProfile.name,
            age: profile.age || defaultProfile.age,
            photo: profile.photo || defaultProfile.photo,
            message: 'Организатор'
          }
        },
        eventInterest: { ...(state.eventInterest || {}), [eventId]: true }
      });

      showCelebrate({
        title: 'Событие создано',
        subtitle: ticketMode === 'free'
          ? 'Гости запишутся и получат QR. Ваш QR уже в «Билеты».'
          : 'Гости бронируют место, платят на входе и показывают QR.',
        primaryLabel: 'Открыть QR',
        secondaryLabel: 'К событию',
        shareText: `Иду на «${event.title}» — присоединяйся в Yaqin`,
        onPrimary: () => navigate('ticket', hostTicket.id),
        onSecondary: () => navigate('event', eventId)
      });
      navigate('event', eventId);
    };
  };

  render();
}
