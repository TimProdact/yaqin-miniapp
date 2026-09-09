import { groups, events, people, PHOTOS } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';

const JOIN_QUESTIONS = [
  {
    text: 'Вы живёте в Ташкенте или планируете переезд?',
    type: 'choice',
    options: ['Да', 'Нет']
  },
  {
    text: 'Сколько вам лет?',
    type: 'text',
    placeholder: 'Ваш ответ'
  },
  {
    text: 'Зачем хотите вступить в группу?',
    type: 'choice',
    options: ['Найти подруг', 'Ходить на встречи', 'Просто посмотреть']
  },
  {
    text: 'Что хотите получить от этой группы?',
    type: 'text',
    placeholder: 'Ваш ответ'
  }
];

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
            <button class="empty-primary" data-action="create-group">Создать группу</button>
          </div>`}

      <h2 class="groups-discover-title">Найти группу</h2>
      <div class="groups-discover">
        ${groups.filter(group => !group.joined).map(group => `
          <article class="discover-group">
            <img src="${esc(group.photo)}" alt="">
            <div>
              <b>${esc(group.title)}</b>
              <span>${esc(group.subtitle)}</span>
              <button data-action="join-group" data-id="${group.id}">Вступить</button>
            </div>
          </article>`).join('')}
      </div>

      <button class="compose" data-action="create-group" aria-label="Создать"><i class="ti ti-plus"></i></button>
    </div>`;
}

export function groupScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0];
  let menuOpen = false;

  const render = () => {
    view.innerHTML = `
      <article class="group-sheet">
        <div class="sheet-handle"></div>
        <header class="sheet-head">
          <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <button id="groupSheetMenu" aria-label="Ещё"><i class="ti ti-dots"></i></button>
        </header>
        ${menuOpen ? `
          <div class="group-sheet-menu">
            <button type="button" data-action="share-profile">Поделиться</button>
            <button type="button" data-action="report-flow" data-id="1">Пожаловаться</button>
            ${group.joined ? `<button type="button" class="danger" id="leaveGroup">Покинуть группу</button>` : ''}
          </div>` : ''}
        <img class="group-cover" src="${esc(group.photo)}" alt="">
        <h1>${esc(group.title)}</h1>
        <p class="group-about">${esc(group.about)}</p>
        <span class="group-city"><i class="ti ti-map-pin"></i>${esc(group.city)}</span>
        <p class="group-members">${group.members.toLocaleString('ru-RU')} участниц · ${group.online || 3} онлайн</p>
        ${group.joined ? `
          <div class="group-quick">
            <button data-action="group-hub" data-id="${group.id}">Комнаты</button>
            <button data-action="group-chat" data-id="${group.id}">Чат</button>
            <button data-action="invite-friends" data-id="${group.id}">Пригласить</button>
          </div>` : ''}
        <button class="group-join" data-action="${group.joined ? 'group-hub' : 'join-group'}" data-id="${group.id}">
          ${group.joined ? 'Открыть группу' : 'Вступить в группу'}
        </button>
      </article>`;
    view.querySelector('#groupSheetMenu').onclick = () => {
      menuOpen = !menuOpen;
      render();
    };
    view.querySelector('#leaveGroup')?.addEventListener('click', () => {
      leaveGroupConfirm(group.id);
    });
  };
  render();
}

export function groupChatScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  const arrivals = group.arrivals || [];
  const question = group.joinQuestion || 'Расскажите немного о себе';
  let welcome = true;
  let attachOpen = false;
  let draft = '';
  let mentionOpen = false;
  let roomMenu = false;
  let muted = false;
  let pinOpen = true;

  const render = () => {
    const has = draft.trim().length > 0;
    view.innerHTML = `
      <div class="group-chat-page">
        <header class="gchat-top">
          <button class="gchat-back" data-action="group-hub" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <img class="gchat-avatar" src="${esc(group.photo)}" alt="">
          <button class="gchat-peer room-switch" type="button" id="toggleChatMenu">
            <h1>Чат группы <i class="ti ti-chevron-down"></i></h1>
            <p><i class="online"></i> ${group.online || 3} онлайн${muted ? ' · без звука' : ''}</p>
          </button>
          <button data-action="group" data-id="${group.id}" aria-label="Участницы"><i class="ti ti-users"></i></button>
        </header>
        ${roomMenu ? `
          <div class="room-menu-pop">
            <button type="button" data-action="group" data-id="${group.id}"><i class="ti ti-users"></i> Участницы</button>
            <button type="button" data-action="group-pins" data-id="${group.id}"><i class="ti ti-pin"></i> Закрепы</button>
            <button type="button" id="muteChat"><i class="ti ti-bell-${muted ? 'off' : 'ringing'}"></i> ${muted ? 'Включить звук' : 'Без звука'}</button>
            <button type="button" class="danger" data-action="leave-group" data-id="${group.id}"><i class="ti ti-logout"></i> Выйти</button>
          </div>` : ''}

        ${welcome ? `
          <div class="gchat-newbar">
            <span>1 новое сообщение</span>
            <button type="button" id="closeNew" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          </div>` : ''}
        ${pinOpen ? `
        <div class="gchat-pinned">
          <i class="ti ti-pin"></i>
          <div>
            <b>Закреплено</b>
            <span>Правила: уважение, без спама, только девушки</span>
          </div>
          <button type="button" id="closePin" aria-label="Скрыть"><i class="ti ti-x"></i></button>
        </div>` : ''}

        <main class="gchat-thread">
          ${arrivals.map(item => `
            <article class="gchat-join">
              <img src="${esc(item.photo)}" alt="">
              <div>
                <div class="gchat-join-head">
                  <b>${esc(item.name)}</b>
                  <span class="just-joined"><i class="ti ti-hand-stop"></i> Только вступила</span>
                  <time>${esc(item.time)}</time>
                </div>
                <p class="gchat-join-body">
                  Присоединилась и ответила:<br>
                  <em>В: ${esc(question)}</em><br>
                  <em>О: ${esc(item.answer)}</em>
                </p>
              </div>
            </article>`).join('')}

          <article class="gchat-msg">
            <img src="${esc(people[0].photo)}" alt="">
            <div>
              <div class="gchat-join-head">
                <b>${esc(people[0].name)}</b>
                <time>сегодня</time>
              </div>
              <p>Кто на кофе в субботу в Мирабаде?</p>
              <button class="gchat-thread-link" type="button" data-action="group-thread" data-id="${group.id}">1 ответ · Смотреть тред <i class="ti ti-chevron-right"></i></button>
            </div>
          </article>
          <article class="gchat-msg">
            <img src="${esc(people[1].photo)}" alt="">
            <div>
              <div class="gchat-join-head">
                <b>${esc(people[1].name)}</b>
                <time>5 мин</time>
              </div>
              <p>Вот место у Moon — там тихо</p>
              <img class="gchat-image" src="${esc(PHOTOS.coffee)}" alt="">
              <div class="bubble-reactions">
                <span>❤️ 2</span>
                <i class="ti ti-mood-plus"></i>
              </div>
            </div>
          </article>
        </main>

        ${welcome ? `
          <div class="gchat-welcome">
            <span>👋</span>
            <p>Привет! Добро пожаловать в «${esc(group.title)}» 🌟 Напишите первое сообщение</p>
            <button type="button" id="closeWelcome" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          </div>` : ''}

        <div class="gchat-typing"><i></i><i></i><i></i><span>Мила печатает…</span></div>
        <button class="jump-latest" type="button" id="jumpLatest">К новым <i class="ti ti-chevron-down"></i></button>
        ${mentionOpen ? `
          <div class="mention-strip">
            ${people.slice(0,3).map(person => `<button type="button" data-mention="${esc(person.name)}"><img src="${esc(person.photo)}" alt=""><span>${esc(person.name)}</span></button>`).join('')}
          </div>` : ''}
        ${attachOpen ? `
          <div class="attach-menu">
            <button type="button" data-gattach="photo"><span>Загрузить фото</span><i class="ti ti-photo"></i></button>
            <button type="button" data-gattach="camera"><span>Сделать фото</span><i class="ti ti-camera"></i></button>
            <button type="button" data-gattach="file"><span>Загрузить файл</span><i class="ti ti-file"></i></button>
          </div>` : ''}

        <div class="message-bar">
          <button class="msg-add ${attachOpen ? 'open' : ''}" id="gAttach" aria-label="Вложение"><i class="ti ti-${attachOpen ? 'x' : 'plus'}"></i></button>
          <label class="msg-field">
            <input id="gMsg" placeholder="Написать сообщение" value="${esc(draft)}">
            <i class="ti ti-mood-smile"></i>
          </label>
          ${has
            ? `<button class="msg-send" id="gSend" aria-label="Отправить"><i class="ti ti-arrow-up"></i></button>`
            : `<button aria-label="GIF">GIF</button>
               <button aria-label="Фото"><i class="ti ti-photo"></i></button>
               <button aria-label="Голос"><i class="ti ti-microphone"></i></button>`}
        </div>
      </div>`;

    view.querySelector('#toggleChatMenu')?.addEventListener('click', () => {
      roomMenu = !roomMenu;
      attachOpen = false;
      render();
    });
    view.querySelector('#muteChat')?.addEventListener('click', () => {
      muted = !muted;
      roomMenu = false;
      render();
    });
    view.querySelector('#closeWelcome')?.addEventListener('click', () => {
      welcome = false;
      render();
    });
    view.querySelector('#closeNew')?.addEventListener('click', () => {
      view.querySelector('.gchat-newbar')?.remove();
    });
    view.querySelector('#closePin')?.addEventListener('click', () => {
      pinOpen = false;
      render();
    });
    view.querySelector('#jumpLatest')?.addEventListener('click', () => {
      view.querySelector('.gchat-thread')?.scrollTo({ top: 9999, behavior: 'smooth' });
    });
    view.querySelector('#gAttach')?.addEventListener('click', () => {
      attachOpen = !attachOpen;
      roomMenu = false;
      render();
    });
    view.querySelectorAll('[data-gattach]').forEach(button => {
      button.onclick = () => {
        attachOpen = false;
        render();
      };
    });
    const input = view.querySelector('#gMsg');
    input?.addEventListener('input', () => {
      draft = input.value;
      const nextMention = /(?:^|\s)@$/.test(draft) || /(?:^|\s)@[\wа-яё]*$/i.test(draft);
      const mentionChanged = nextMention !== mentionOpen;
      mentionOpen = nextMention;
      const next = draft.trim().length > 0;
      if (next !== has || mentionChanged) render();
    });
    view.querySelectorAll('[data-mention]').forEach(button => {
      button.onclick = () => {
        draft = draft.replace(/@[^\s]*$/, `@${button.dataset.mention} `);
        mentionOpen = false;
        render();
      };
    });
    view.querySelector('#gSend')?.addEventListener('click', () => {
      draft = '';
      attachOpen = false;
      welcome = false;
      render();
    });
    if (draft) {
      input?.focus();
      input?.setSelectionRange(draft.length, draft.length);
    }
  };

  render();
}

export function groupThreadScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let draft = '';

  const render = () => {
    const has = draft.trim().length > 0;
    view.innerHTML = `
      <div class="group-chat-page thread">
        <header class="gchat-top thread-top">
          <button class="gchat-back" data-action="group-chat" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <div class="gchat-peer center">
            <h1>Тред в 💬 чате группы <i class="ti ti-chevron-down"></i></h1>
            <p>🏙️ ${esc(group.title)} ⭐</p>
          </div>
          <span></span>
        </header>
        <main class="gchat-thread">
          <article class="gchat-msg">
            <img src="${esc(people[0].photo)}" alt="">
            <div>
              <div class="gchat-join-head"><b>${esc(people[0].name)}</b><time>4 д</time></div>
              <p>Кто на кофе в субботу в Мирабаде?</p>
            </div>
          </article>
          <div class="thread-divider"><span>2 ответа</span></div>
          <article class="gchat-msg">
            <img src="${esc(people[1].photo)}" alt="">
            <div>
              <div class="gchat-join-head"><b>${esc(people[1].name)}</b><time>4 д</time></div>
              <p>Я! Давайте в Moon</p>
              <div class="bubble-reactions">
                <span>❤️ 1</span>
                <i class="ti ti-mood-plus"></i>
              </div>
            </div>
          </article>
          <article class="gchat-msg">
            <img src="${esc(people[2].photo)}" alt="">
            <div>
              <div class="gchat-join-head">
                <b>${esc(people[2].name)}</b>
                <span class="just-joined"><i class="ti ti-hand-stop"></i> Только вступила</span>
                <time>только что</time>
              </div>
              <p>Тоже хочу, запишите меня</p>
            </div>
          </article>
        </main>
        <div class="message-bar">
          <button class="msg-add" aria-label="Вложение"><i class="ti ti-plus"></i></button>
          <label class="msg-field">
            <input id="threadInput" placeholder="Написать сообщение" value="${esc(draft)}">
            <i class="ti ti-mood-smile"></i>
          </label>
          ${has
            ? `<button class="msg-send" aria-label="Отправить"><i class="ti ti-arrow-up"></i></button>`
            : `<button aria-label="GIF">GIF</button>
               <button aria-label="Фото"><i class="ti ti-photo"></i></button>
               <button aria-label="Голос"><i class="ti ti-microphone"></i></button>`}
        </div>
      </div>`;
    const input = view.querySelector('#threadInput');
    input.oninput = () => {
      draft = input.value;
      const next = draft.trim().length > 0;
      if (next !== has) render();
    };
    if (draft) {
      input.focus();
      input.setSelectionRange(draft.length, draft.length);
    }
  };
  render();
}

export function groupHubScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let menuOpen = false;
  let tab = 'rooms';
  let memberQuery = '';
  let onlineOnly = false;
  const rooms = [
    { id: 'intros', icon: 'star', title: 'Знакомства', subtitle: 'представьтесь здесь' },
    { id: 'chat', icon: 'message-circle', title: 'Чат', subtitle: 'общий разговор группы', action: 'group-chat' },
    { id: 'events', icon: 'calendar-event', title: 'События', subtitle: 'посты про встречи', action: 'group-posts' },
    { id: 'recs', icon: 'file-text', title: 'Рекомендации', subtitle: 'места и идеи' }
  ];
  const members = people.slice(0, 4).map((person, index) => ({
    ...person,
    role: index === 0 ? 'Организатор' : 'Участница',
    city: person.city || 'Ташкент',
    online: index < 2
  }));
  const pastEvents = [
    { title: 'Утренний кофе-walk', when: 'Завершено 5 дн. назад', went: true, photo: PHOTOS.coffee },
    { title: 'Пилатес + матча', when: 'Завершено неделю назад', went: true, photo: PHOTOS.event },
    { title: 'Книжный вечер', when: 'Завершено 2 нед. назад', went: false, photo: PHOTOS.books }
  ];

  const render = () => {
    const filtered = members.filter(person => {
      if (onlineOnly && !person.online) return false;
      if (!memberQuery.trim()) return true;
      return person.name.toLowerCase().includes(memberQuery.toLowerCase());
    });

    view.innerHTML = `
      <div class="group-hub-page">
        <header class="hub-top">
          <button data-action="groups" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <div class="hub-actions">
            <button data-action="group-media" data-id="${group.id}" aria-label="Медиа"><i class="ti ti-photo"></i></button>
            <button data-action="group-search" data-id="${group.id}" aria-label="Поиск"><i class="ti ti-search"></i></button>
            <button id="hubMenu" aria-label="Ещё"><i class="ti ti-dots"></i></button>
          </div>
        </header>
        ${menuOpen ? `
          <div class="hub-menu-pop">
            <button type="button" data-action="organize-rooms" data-id="${group.id}"><i class="ti ti-arrows-sort"></i> Упорядочить комнаты</button>
            <button type="button" id="tabMembers"><i class="ti ti-users"></i> Участницы</button>
            <button type="button" data-action="group-settings" data-id="${group.id}"><i class="ti ti-settings"></i> Настройки</button>
            <button type="button" data-action="report-flow" data-id="1"><i class="ti ti-flag"></i> Жалобы</button>
          </div>` : ''}
        <div class="hub-identity">
          <img src="${esc(group.photo)}" alt="">
          <div>
            <h1>${esc(group.title)}</h1>
            <p>${group.members.toLocaleString('ru-RU')} участниц</p>
            <p class="hub-online"><i></i> ${group.online || 3} в сети</p>
          </div>
          <button class="hub-invite" type="button" data-action="invite-friends" data-id="${group.id}"><i class="ti ti-user-plus"></i> Пригласить</button>
        </div>
        <div class="hub-tabs">
          <button class="${tab === 'rooms' ? 'on' : ''}" data-tab="rooms">Комнаты</button>
          <button class="${tab === 'events' ? 'on' : ''}" data-tab="events">События</button>
          <button class="${tab === 'members' ? 'on' : ''}" data-tab="members">Участницы</button>
          <button class="${tab === 'info' ? 'on' : ''}" data-tab="info">О группе</button>
        </div>
        ${tab === 'members' ? `
          <div class="hub-members-tools">
            <label class="plain-search-wrap">
              <i class="ti ti-search"></i>
              <input class="plain-search" id="memberSearch" placeholder="Поиск" value="${esc(memberQuery)}">
            </label>
            <button type="button" class="online-chip ${onlineOnly ? 'on' : ''}" id="onlineOnly">Онлайн · ${members.filter(m => m.online).length}</button>
          </div>
          <div class="hub-members">
            ${filtered.map(person => `
              <button class="hub-member" type="button" data-action="person" data-id="${person.id}">
                <span class="hub-member-ava">
                  <img src="${esc(person.photo)}" alt="">
                  ${person.online ? '<i class="dot"></i>' : ''}
                </span>
                <div>
                  <strong>${esc(person.name)}</strong>
                  <span>${esc(person.city)}</span>
                </div>
              </button>`).join('') || '<p class="muted">Никого не нашли</p>'}
          </div>` : ''}
        ${tab === 'events' ? `
          <h3 class="hub-label">ПРОШЛЫЕ</h3>
          <div class="hub-past-events">
            ${pastEvents.map(item => `
              <article class="hub-past-card">
                <img src="${esc(item.photo)}" alt="">
                <div>
                  <b>${esc(item.title)}</b>
                  <span>${esc(item.when)}</span>
                  ${item.went ? '<em>Я ходила</em>' : ''}
                </div>
              </article>`).join('')}
          </div>
          <button class="hub-create-event" type="button" data-action="create-event" data-id="${group.id}"><i class="ti ti-calendar-plus"></i> Создать событие</button>` : ''}
        ${tab === 'info' ? `
          <section class="hub-info">
            <h3>Об этой группе</h3>
            <p>${esc(group.about)}</p>
            <div class="hub-info-stats">
              <div><b>2024</b><span>основана</span></div>
              <div><b>${group.members.toLocaleString('ru-RU')}</b><span>участниц</span></div>
            </div>
            <div class="hub-welcome-block">
              <h4>Добро пожаловать в ${esc(group.title)}</h4>
              <p>Представьтесь в комнате «Знакомства» и загляните в события.</p>
              <button type="button" data-action="group-posts" data-id="${group.id}">Открыть комнаты</button>
            </div>
            <button class="hub-info-link" type="button" data-action="group" data-id="${group.id}">Подробнее о группе</button>
          </section>` : ''}
        ${tab === 'rooms' ? `
          <h3 class="hub-label">КОМНАТЫ</h3>
          <div class="hub-rooms">
            ${rooms.map(room => `
              <button class="hub-room" type="button" ${room.action ? `data-action="${room.action}" data-id="${group.id}"` : ''}>
                <span class="hub-room-icon"><i class="ti ti-${room.icon}"></i></span>
                <div class="hub-room-copy">
                  <b>${esc(room.title)}</b>
                  <span>${esc(room.subtitle)}</span>
                </div>
              </button>`).join('')}
          </div>
          <button class="join-more-rooms" type="button" data-action="organize-rooms" data-id="${group.id}">Ещё комнаты</button>
          <h3 class="hub-label">МУЗЫКА <i class="ti ti-chevron-down"></i></h3>
          <button class="hub-room" type="button" data-action="group-chat" data-id="${group.id}">
            <span class="hub-room-icon"><i class="ti ti-music"></i></span>
            <div class="hub-room-copy">
              <b>Топ треков недели</b>
              <span>Кидайте самый частый трек сюда</span>
            </div>
          </button>` : ''}
        <button class="compose coral" data-action="create-post" data-id="${group.id}" aria-label="Создать"><i class="ti ti-plus"></i></button>
      </div>`;
    view.querySelector('#hubMenu').onclick = () => {
      menuOpen = !menuOpen;
      render();
    };
    view.querySelector('#tabMembers')?.addEventListener('click', () => {
      tab = 'members';
      menuOpen = false;
      render();
    });
    view.querySelector('#memberSearch')?.addEventListener('input', event => {
      memberQuery = event.target.value;
      render();
    });
    view.querySelector('#onlineOnly')?.addEventListener('click', () => {
      onlineOnly = !onlineOnly;
      render();
    });
    view.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => {
        tab = button.dataset.tab;
        menuOpen = false;
        render();
      };
    });
    if (memberQuery) {
      const input = view.querySelector('#memberSearch');
      input?.focus();
      input?.setSelectionRange(memberQuery.length, memberQuery.length);
    }
  };
  render();
}

export function groupMediaScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let section = 'upcoming';
  const upcoming = events.slice(0, 3).map((event, index) => ({
    ...event,
    badge: index === 0 ? 'скоро' : 'открыто'
  }));
  const media = [PHOTOS.coffee, PHOTOS.city, PHOTOS.palms, PHOTOS.event, PHOTOS.books, people[0].photo].filter(Boolean);

  const render = () => {
    view.innerHTML = `
      <div class="group-media-page">
        <header class="modal-head">
          <button data-action="group-hub" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>${esc(group.title)}</h1>
          <span></span>
        </header>
        <div class="media-seg">
          <button class="${section === 'upcoming' ? 'on' : ''}" data-sec="upcoming">События</button>
          <button class="${section === 'media' ? 'on' : ''}" data-sec="media">Медиа</button>
        </div>
        ${section === 'upcoming' ? `
          <h3 class="hub-label">СКОРО</h3>
          <div class="media-upcoming">
            ${upcoming.map(event => `
              <article class="media-event-card" data-action="event" data-id="${event.id}">
                <img src="${esc(event.photo || PHOTOS.event)}" alt="">
                <div>
                  <b>${esc(event.title)}</b>
                  <span>${esc(event.when || event.date || 'скоро')}</span>
                  <span class="place">${esc(event.place || event.city || 'Ташкент')}</span>
                </div>
                <button type="button" data-action="event" data-id="${event.id}">Подробнее</button>
              </article>`).join('')}
          </div>` : `
          <div class="media-grid">
            ${media.map(src => `<img src="${esc(src)}" alt="">`).join('')}
          </div>`}
      </div>`;
    view.querySelectorAll('[data-sec]').forEach(button => {
      button.onclick = () => {
        section = button.dataset.sec;
        render();
      };
    });
  };
  render();
}

const SORT_OPTIONS = [
  { id: 'activity', label: 'Недавняя активность', icon: 'clock' },
  { id: 'newest', label: 'Новые', icon: 'arrow-up' },
  { id: 'comments', label: 'Больше комментариев', icon: 'message-2' },
  { id: 'reactions', label: 'Больше реакций', icon: 'mood-smile' }
];

export function groupPostsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let roomOpen = false;
  let roomMenu = false;
  let sortOpen = false;
  let reactOpen = null;
  let room = 'События';
  let postMenu = null;
  let viewMode = 'list';
  let sort = 'newest';
  let expanded = new Set();
  let pinned = new Set([0]);
  let muted = false;
  const rooms = ['Знакомства', 'Чат', 'События', 'Рекомендации'];
  const posts = [
    {
      author: people[0],
      owner: true,
      when: '21 июля',
      title: 'Как создавать и делиться событиями в Yaqin 🌼',
      preview: 'Создавайте и находите встречи в Ташкенте',
      body: 'Книжный клуб, пикник в парке или поход на барахолку — здесь можно создать событие и пригласить подруг из группы.',
      comments: 0,
      ago: 'Обновлено давно',
      edited: true,
      thumb: PHOTOS.event,
      reacts: [{ e: '👏', n: 0 }, { e: '❤️', n: 4 }]
    },
    {
      author: people[0],
      owner: true,
      when: '22 марта',
      title: 'ЗНАКОМСТВА ДОЛЖНЫ БЫТЬ В РАДОСТЬ 🤩',
      preview: '',
      body: 'Привет @чат — эта комната была тихой, но я её обновила: простой и тёплый способ заводить подруг в Ташкенте!! Если давно молчали — сейчас самое время.',
      comments: 7,
      ago: 'Активно давно',
      edited: true,
      reacts: [{ e: '❤️', n: 6 }, { e: '🙌', n: 5 }, { e: '👏', n: 5 }, { e: '🎉', n: 5 }]
    },
    {
      author: people[1],
      owner: false,
      when: 'сегодня',
      title: '🎶 Кофейный плейлист недели',
      preview: 'Делитесь треками и голосуйте за настроение',
      body: '',
      comments: 2,
      ago: '2 ч назад',
      image: PHOTOS.coffee,
      poll: true,
      reacts: [{ e: '❤️', n: 3 }]
    }
  ];

  const closePops = () => {
    roomOpen = false;
    roomMenu = false;
    sortOpen = false;
    postMenu = null;
    reactOpen = null;
  };

  const render = () => {
    const sortLabel = SORT_OPTIONS.find(item => item.id === sort)?.label || 'Новые';
    const ordered = [...posts].sort((a, b) => {
      if (sort === 'comments') return b.comments - a.comments;
      if (sort === 'reactions') {
        const sum = post => post.reacts.reduce((n, r) => n + r.n, 0);
        return sum(b) - sum(a);
      }
      if (sort === 'activity') return (b.ago.includes('ч') ? 1 : 0) - (a.ago.includes('ч') ? 1 : 0);
      return 0;
    });

    view.innerHTML = `
      <div class="group-posts-page">
        <header class="gchat-top">
          <button class="gchat-back" data-action="group-hub" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <img class="gchat-avatar" src="${esc(group.photo)}" alt="">
          <button class="gchat-peer room-switch" type="button" id="toggleRooms">
            <h1>${esc(room)} <i class="ti ti-chevron-down"></i></h1>
            <p><i class="online"></i> ${group.online || 12} онлайн${muted ? ' · без звука' : ''}</p>
          </button>
          <button type="button" id="toggleRoomMenu" aria-label="Меню комнаты"><i class="ti ti-dots"></i></button>
        </header>
        ${roomOpen ? `
          <div class="room-switch-pop">
            ${rooms.map(item => `
              <button type="button" class="${item === room ? 'on' : ''}" data-room="${esc(item)}">${esc(item)}</button>`).join('')}
          </div>` : ''}
        ${roomMenu ? `
          <div class="room-menu-pop">
            <button type="button" data-action="group" data-id="${group.id}"><i class="ti ti-users"></i> Участницы</button>
            <button type="button" data-action="group-pins" data-id="${group.id}"><i class="ti ti-pin"></i> Закрепы</button>
            <button type="button" id="toggleMute"><i class="ti ti-bell-${muted ? 'off' : 'ringing'}"></i> ${muted ? 'Включить звук' : 'Без звука'}</button>
            <button type="button" class="danger" data-action="leave-group" data-id="${group.id}"><i class="ti ti-logout"></i> Выйти</button>
          </div>` : ''}
        ${sortOpen ? `
          <div class="sort-pop">
            ${SORT_OPTIONS.map(item => `
              <button type="button" class="${item.id === sort ? 'on' : ''}" data-sort="${item.id}">
                <span>${esc(item.label)}</span>
                <i class="ti ti-${item.icon}"></i>
              </button>`).join('')}
          </div>` : ''}
        ${postMenu !== null ? `
          <div class="post-menu-pop">
            <button type="button" data-action="post-comments" data-id="${group.id}">Комментарий</button>
            <button type="button" id="copyPost">Скопировать текст</button>
            <button type="button" data-pin="${postMenu}">${pinned.has(postMenu) ? 'Открепить' : 'Закрепить'}</button>
            <button type="button" data-pin-top="${postMenu}">Закрепить сверху</button>
            <button type="button" class="danger" data-action="report-flow" data-id="1">Пожаловаться</button>
          </div>` : ''}
        ${reactOpen !== null ? `
          <div class="react-pop">
            ${['❤️', '👏', '🙌', '🎉', '🔥', '😂'].map(emoji => `
              <button type="button" data-react-emoji="${emoji}">${emoji}</button>`).join('')}
          </div>` : ''}
        <div class="posts-toolbar">
          <button type="button" id="toggleSort">${esc(sortLabel)} <i class="ti ti-chevron-down"></i></button>
          <div class="posts-view-toggle">
            <button class="${viewMode === 'grid' ? 'on' : ''}" data-view="grid" aria-label="Сетка"><i class="ti ti-layout-grid"></i></button>
            <button class="${viewMode === 'list' ? 'on' : ''}" data-view="list" aria-label="Лента"><i class="ti ti-list"></i></button>
          </div>
        </div>
        ${pinned.size ? `
          <button class="posts-pinned-bar" type="button" data-action="group-pins" data-id="${group.id}">
            <i class="ti ti-pin"></i> Закреплено · ${pinned.size}
          </button>` : ''}
        <div class="posts-feed ${viewMode}">
          ${ordered.map((post, index) => {
            const open = expanded.has(index);
            const long = Boolean(post.body);
            return `
              <article class="post-card ${pinned.has(index) ? 'is-pinned' : ''}">
                <header>
                  <img src="${esc(post.author.photo)}" alt="">
                  <div>
                    <b>${esc(post.author.name)}${post.owner ? ' <span class="owner-badge"><i class="ti ti-home"></i> Организатор</span>' : ''}</b>
                    <time>${esc(post.when)}</time>
                  </div>
                  <button class="post-menu-btn" type="button" data-post-menu="${index}" aria-label="Ещё"><i class="ti ti-dots"></i></button>
                </header>
                <div class="post-main ${post.thumb && !open ? 'with-thumb' : ''}">
                  <div>
                    <h2>${esc(post.title)}</h2>
                    ${post.preview ? `<p class="post-sub">${esc(post.preview)}</p>` : ''}
                    ${long ? `
                      <p class="post-body">${esc(open ? post.body : `${post.body.slice(0, 90)}…`)}
                        <button type="button" class="show-more" data-expand="${index}">${open ? 'Свернуть' : 'Ещё'}</button>
                        ${post.edited ? '<em class="edited">(изменено)</em>' : ''}
                      </p>` : ''}
                  </div>
                  ${post.thumb && !open ? `<img class="post-thumb" src="${esc(post.thumb)}" alt="">` : ''}
                </div>
                ${post.image ? `<img class="post-image" src="${esc(post.image)}" alt="">` : ''}
                ${post.poll ? `
                  <div class="post-poll compact">
                    <h3>ваше настроение сейчас</h3>
                    <button type="button" class="poll-option"><span>отлично 😄</span><b>42%</b></button>
                    <button type="button" class="poll-option"><span>нормально 😐</span><b>33%</b></button>
                    <button type="button" class="poll-option"><span>грустно 😭</span><b>25%</b></button>
                    <footer>12 ответов</footer>
                  </div>` : ''}
                <div class="post-reacts">
                  ${post.reacts.map(r => `<button type="button">${r.e} ${r.n}</button>`).join('')}
                  <button type="button" data-react-open="${index}" aria-label="Реакция"><i class="ti ti-mood-plus"></i></button>
                </div>
                <footer>
                  <button type="button" data-action="post-comments" data-id="${group.id}">${post.comments} комментариев</button>
                  <span class="ago">${esc(post.ago)}</span>
                </footer>
              </article>`;
          }).join('')}
        </div>
        <section class="posts-welcome">
          <span class="welcome-mark">✿</span>
          <h2>Добро пожаловать в ${esc(room)}</h2>
          <button type="button" data-action="organize-rooms" data-id="${group.id}"><i class="ti ti-pencil"></i> Изменить название</button>
        </section>
        <button class="create-post-bar" type="button" data-action="create-post" data-id="${group.id}"><i class="ti ti-pencil"></i> Создать пост</button>
      </div>`;

    view.querySelectorAll('[data-view]').forEach(button => {
      button.onclick = () => {
        viewMode = button.dataset.view;
        closePops();
        render();
      };
    });
    view.querySelector('#toggleRooms').onclick = () => {
      roomOpen = !roomOpen;
      roomMenu = false;
      sortOpen = false;
      postMenu = null;
      render();
    };
    view.querySelector('#toggleRoomMenu').onclick = () => {
      roomMenu = !roomMenu;
      roomOpen = false;
      sortOpen = false;
      postMenu = null;
      render();
    };
    view.querySelector('#toggleSort').onclick = () => {
      sortOpen = !sortOpen;
      roomOpen = false;
      roomMenu = false;
      postMenu = null;
      render();
    };
    view.querySelector('#toggleMute')?.addEventListener('click', () => {
      muted = !muted;
      roomMenu = false;
      render();
    });
    view.querySelectorAll('[data-sort]').forEach(button => {
      button.onclick = () => {
        sort = button.dataset.sort;
        sortOpen = false;
        render();
      };
    });
    view.querySelectorAll('[data-post-menu]').forEach(button => {
      button.onclick = () => {
        const idx = Number(button.dataset.postMenu);
        postMenu = postMenu === idx ? null : idx;
        roomOpen = false;
        roomMenu = false;
        sortOpen = false;
        reactOpen = null;
        render();
      };
    });
    view.querySelectorAll('[data-expand]').forEach(button => {
      button.onclick = () => {
        const idx = Number(button.dataset.expand);
        if (expanded.has(idx)) expanded.delete(idx);
        else expanded.add(idx);
        render();
      };
    });
    view.querySelectorAll('[data-pin], [data-pin-top]').forEach(button => {
      button.onclick = () => {
        const idx = Number(button.dataset.pin ?? button.dataset.pinTop);
        if (pinned.has(idx)) pinned.delete(idx);
        else pinned.add(idx);
        postMenu = null;
        render();
      };
    });
    view.querySelector('#copyPost')?.addEventListener('click', () => {
      postMenu = null;
      render();
    });
    view.querySelectorAll('[data-react-open]').forEach(button => {
      button.onclick = () => {
        const idx = Number(button.dataset.reactOpen);
        reactOpen = reactOpen === idx ? null : idx;
        postMenu = null;
        render();
      };
    });
    view.querySelectorAll('[data-react-emoji]').forEach(button => {
      button.onclick = () => {
        const post = ordered[reactOpen];
        if (post) {
          const emoji = button.dataset.reactEmoji;
          const found = post.reacts.find(r => r.e === emoji);
          if (found) found.n += 1;
          else post.reacts.push({ e: emoji, n: 1 });
        }
        reactOpen = null;
        render();
      };
    });
    view.querySelectorAll('[data-room]').forEach(button => {
      button.onclick = () => {
        room = button.dataset.room;
        roomOpen = false;
        if (room === 'Чат') {
          navigate('group-chat', group.id);
          return;
        }
        render();
      };
    });
  };
  render();
}

export function groupPinsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let empty = false;

  const render = () => {
    view.innerHTML = `
      <div class="group-pins-page">
        <header class="modal-head">
          <button data-action="group-posts" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Закрепы</h1>
          <button type="button" id="togglePinsEmpty" class="head-action">${empty ? 'Демо' : 'Пусто'}</button>
        </header>
        ${empty ? `
          <div class="pins-empty">
            <i class="ti ti-pin"></i>
            <h2>Пока нет закрепов</h2>
            <p>Закрепите важное сообщение: удерживайте его в комнате и выберите «Закрепить».</p>
          </div>` : `
          <article class="pin-card">
            <header>
              <img src="${esc(people[0].photo)}" alt="">
              <div>
                <b>${esc(people[0].name)}</b>
                <time>закреплено</time>
              </div>
            </header>
            <h2>Как создавать и делиться событиями в Yaqin</h2>
            <p class="post-sub">Создавайте и находите встречи в Ташкенте</p>
            <p class="post-body">Сначала создайте пост в комнате, нажмите иконку календаря, заполните место и время — и поделитесь событием с группой.</p>
            <div class="pin-steps">
              <div><b>1</b><span>Иконка календаря в посте</span></div>
              <div><b>2</b><span>Место, время и описание</span></div>
              <div><b>3</b><span>Опубликовать и пригласить</span></div>
            </div>
          </article>`}
      </div>`;
    view.querySelector('#togglePinsEmpty').onclick = () => {
      empty = !empty;
      render();
    };
  };
  render();
}

export function createPostScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  const me = people[0];
  let title = '';
  let body = '';
  let poll = null;
  let photo = null;
  let gifOpen = false;
  let formatOpen = false;
  let bold = false;
  let italic = false;
  const pollOptions = ['отлично 😄', 'нормально 😐', 'грустно 😭', 'раздражена 😟'];
  const gifs = [PHOTOS.coffee, PHOTOS.city, PHOTOS.palms, PHOTOS.event, PHOTOS.books, PHOTOS.malika].filter(Boolean);

  const render = () => {
    const canPost = title.trim().length > 0 || body.trim().length > 0 || poll || photo;
    view.innerHTML = `
      <div class="create-post-page">
        <header class="modal-head">
          <button data-action="group-posts" data-id="${group.id}" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <span></span>
          <button class="head-action coral ${canPost ? 'on' : ''}" id="publishPost" ${canPost ? '' : 'disabled'}>Опубликовать</button>
        </header>
        <div class="create-post-author">
          <img src="${esc(me.photo)}" alt="">
          <b>${esc(me.name)}</b>
        </div>
        <input class="create-post-title ${bold ? 'fmt-bold' : ''} ${italic ? 'fmt-italic' : ''}" id="postTitle" placeholder="Добавить заголовок" value="${esc(title)}">
        <textarea class="create-post-body ${bold ? 'fmt-bold' : ''} ${italic ? 'fmt-italic' : ''}" id="postBody" placeholder="О чём думаете?" rows="4">${esc(body)}</textarea>
        ${photo ? `
          <div class="post-media">
            <img src="${esc(photo)}" alt="">
            <button type="button" id="clearPhoto" aria-label="Убрать"><i class="ti ti-x"></i></button>
          </div>` : ''}
        ${poll ? `
          <div class="post-poll">
            <header>
              <span><i class="ti ti-chart-bar"></i> Анонимный опрос · до 18:00</span>
              <button type="button" id="clearPoll" aria-label="Убрать"><i class="ti ti-x"></i></button>
            </header>
            <h3>${esc(poll.question)}</h3>
            ${pollOptions.map(option => `
              <button type="button" class="poll-option"><span>${esc(option)}</span><b>0%</b></button>`).join('')}
            <footer>0 ответов</footer>
          </div>` : ''}
        ${formatOpen ? `
          <div class="format-bar">
            <button type="button" class="${bold ? 'on' : ''}" id="fmtBold"><b>B</b></button>
            <button type="button" class="${italic ? 'on' : ''}" id="fmtItalic"><i>I</i></button>
            <button type="button" id="fmtClose">Готово</button>
          </div>` : ''}
        ${gifOpen ? `
          <div class="post-gif-sheet">
            <header><b>GIF</b><button type="button" id="closeGif"><i class="ti ti-x"></i></button></header>
            <div class="post-gif-grid">
              ${gifs.map(src => `<button type="button" data-gif="${esc(src)}"><img src="${esc(src)}" alt=""></button>`).join('')}
            </div>
          </div>` : ''}
        <div class="create-post-tools">
          <button type="button" id="addPhoto" aria-label="Фото"><i class="ti ti-photo"></i></button>
          <button type="button" aria-label="Файл"><i class="ti ti-file"></i></button>
          <button type="button" id="openGif" aria-label="GIF">GIF</button>
          <button type="button" aria-label="Событие"><i class="ti ti-calendar-event"></i></button>
          <button type="button" id="addPoll" aria-label="Опрос"><i class="ti ti-chart-bar"></i></button>
          <button type="button" aria-label="Эмодзи"><i class="ti ti-mood-smile"></i></button>
          <button type="button" id="openFormat" aria-label="Формат">Aa</button>
        </div>
      </div>`;
    const sync = () => {
      const btn = view.querySelector('#publishPost');
      const ok = title.trim() || body.trim() || poll || photo;
      btn.disabled = !ok;
      btn.classList.toggle('on', Boolean(ok));
    };
    view.querySelector('#postTitle').oninput = event => { title = event.target.value; sync(); };
    view.querySelector('#postBody').oninput = event => { body = event.target.value; sync(); };
    view.querySelector('#addPhoto').onclick = () => {
      photo = PHOTOS.city;
      gifOpen = false;
      render();
    };
    view.querySelector('#openGif').onclick = () => {
      gifOpen = !gifOpen;
      formatOpen = false;
      render();
    };
    view.querySelector('#closeGif')?.addEventListener('click', () => {
      gifOpen = false;
      render();
    });
    view.querySelectorAll('[data-gif]').forEach(button => {
      button.onclick = () => {
        photo = button.dataset.gif;
        gifOpen = false;
        render();
      };
    });
    view.querySelector('#openFormat').onclick = () => {
      formatOpen = !formatOpen;
      gifOpen = false;
      render();
    };
    view.querySelector('#fmtBold')?.addEventListener('click', () => {
      bold = !bold;
      render();
    });
    view.querySelector('#fmtItalic')?.addEventListener('click', () => {
      italic = !italic;
      render();
    });
    view.querySelector('#fmtClose')?.addEventListener('click', () => {
      formatOpen = false;
      render();
    });
    view.querySelector('#addPoll').onclick = () => {
      poll = { question: 'ваше настроение сейчас' };
      if (!title) title = '🎶 еженедельный плейлист';
      if (!body) body = 'делитесь треками в комментариях и голосуйте за настроение';
      gifOpen = false;
      render();
    };
    view.querySelector('#clearPoll')?.addEventListener('click', () => {
      poll = null;
      render();
    });
    view.querySelector('#clearPhoto')?.addEventListener('click', () => {
      photo = null;
      render();
    });
    view.querySelector('#publishPost').onclick = () => {
      if (!title.trim() && !body.trim() && !poll && !photo) return;
      navigate('group-posts', group.id);
    };
  };
  render();
}

export function groupSearchScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let query = '';
  const corpus = [
    {
      room: 'Чат группы',
      name: people[0].name,
      photo: people[0].photo,
      when: '17 ноя · 5:41',
      text: 'Девочки!! зову всех на пилатес и матчу в воскресенье в Мирабаде — пакеты-подарки, снэки и кофе 💚',
      link: 'https://yaqin.uz/events',
      linkTitle: 'Пилатес + матча'
    },
    {
      room: 'События',
      name: people[1].name,
      photo: people[1].photo,
      when: 'вчера',
      text: 'Кто на кофейную прогулку? Можно совместить с книжным клубом.',
      link: '',
      linkTitle: ''
    },
    {
      room: 'Рекомендации',
      name: people[2]?.name || people[0].name,
      photo: people[2]?.photo || people[0].photo,
      when: '3 дн.',
      text: 'Нашла тихое место у Moon — идеально для разговора.',
      link: '',
      linkTitle: ''
    }
  ];

  const render = () => {
    const term = query.trim().toLowerCase();
    const hits = term
      ? corpus.filter(item =>
          item.text.toLowerCase().includes(term)
          || item.name.toLowerCase().includes(term)
          || item.room.toLowerCase().includes(term)
          || item.linkTitle.toLowerCase().includes(term)
        )
      : [];

    view.innerHTML = `
      <div class="group-search-page">
        <header class="modal-head">
          <button data-action="group-hub" data-id="${group.id}" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Поиск · ${esc(group.title)}</h1>
          <span></span>
        </header>
        <div class="search-box">
          <i class="ti ti-search"></i>
          <input id="groupSearch" placeholder="Поиск сообщений" value="${esc(query)}" autofocus>
          ${term ? `<button type="button" id="clearGroupSearch">×</button>` : ''}
        </div>
        ${term
          ? `<p class="search-count">${hits.length} результатов</p>
             <div class="search-results group-hits">${hits.map(item => `
              <article class="group-hit">
                <header>
                  <span>Сообщение в «${esc(item.room)}»</span>
                </header>
                <button type="button" data-action="group-chat" data-id="${group.id}">
                  <img src="${esc(item.photo)}" alt="">
                  <div>
                    <b>${esc(item.name)} <time>${esc(item.when)}</time></b>
                    <p>${esc(item.text)}</p>
                    ${item.link ? `<span class="hit-link"><i class="ti ti-link"></i>${esc(item.linkTitle || item.link)}</span>` : ''}
                  </div>
                </button>
              </article>`).join('') || '<p class="search-none">Ничего не найдено</p>'}</div>`
          : `<div class="group-search-empty">
              <div class="search-illus"><i class="ti ti-search"></i></div>
              <h2>Найдите сообщения в группе</h2>
              <p>Попробуйте «пилатес», «кофе» или «книга»</p>
            </div>`}
      </div>`;
    const input = view.querySelector('#groupSearch');
    input.focus();
    input.setSelectionRange(query.length, query.length);
    input.oninput = () => {
      query = input.value;
      render();
    };
    view.querySelector('#clearGroupSearch')?.addEventListener('click', () => {
      query = '';
      render();
    });
  };
  render();
}

export function leaveGroupConfirm(id) {
  const group = groups[Number(id) || 0] || groups[0];
  const overlay = document.createElement('div');
  overlay.className = 'safety-overlay';
  overlay.innerHTML = `
    <div class="leave-sheet">
      <h2>Покинуть «${esc(group.title)}»?</h2>
      <p>Вы перестанете получать сообщения и посты этой группы.</p>
      <button type="button" class="danger" id="confirmLeave">Покинуть группу</button>
      <button type="button" id="cancelLeave">Отмена</button>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('safety-open');
  const close = () => {
    overlay.remove();
    document.body.classList.remove('safety-open');
  };
  overlay.querySelector('#cancelLeave').onclick = close;
  overlay.querySelector('#confirmLeave').onclick = () => {
    group.joined = false;
    close();
    navigate('groups');
  };
  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });
}

export function groupSettingsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let privacyOpen = false;
  let privacy = 'open';

  const render = () => {
    view.innerHTML = `
      <div class="group-settings-page">
        <header class="modal-head">
          <button data-action="group-hub" data-id="${group.id}" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Настройки группы</h1>
          <span></span>
        </header>
        <div class="gset-hero">
          <img src="${esc(group.photo)}" alt="">
          <h2>${esc(group.title)}</h2>
          <p>${esc(group.about)}</p>
        </div>
        <h3 class="settings-label">Параметры группы</h3>
        <div class="settings-block">
          <button class="settings-row" type="button" data-action="group" data-id="${group.id}">
            <span class="settings-icon blue"><i class="ti ti-home"></i></span>
            <span>О группе</span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" id="openPrivacy">
            <span class="settings-icon pink"><i class="ti ti-lock"></i></span>
            <span>Конфиденциальность<br><small>${privacy === 'open' ? 'Открытая' : privacy === 'locked' ? 'По заявке' : 'Секретная'}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-action="group-notifications" data-id="${group.id}">
            <span class="settings-icon green"><i class="ti ti-bell"></i></span>
            <span>Уведомления</span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button">
            <span class="settings-icon purple"><i class="ti ti-mood-smile"></i></span>
            <span>Свои эмодзи</span>
            <i class="ti ti-chevron-right"></i>
          </button>
        </div>
        <h3 class="settings-label">Управление</h3>
        <div class="settings-block">
          <button class="settings-row" type="button">
            <span class="settings-icon orange"><i class="ti ti-crown"></i></span>
            <span>Роли и права</span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-action="report-flow" data-id="1">
            <span class="settings-icon red"><i class="ti ti-flag"></i></span>
            <span>Пожаловаться на группу</span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row danger" type="button" data-action="leave-group" data-id="${group.id}">
            <span class="settings-icon red"><i class="ti ti-logout"></i></span>
            <span>Покинуть группу</span>
            <i class="ti ti-chevron-right"></i>
          </button>
        </div>
        ${privacyOpen ? `
          <div class="edit-sheet">
            <header>
              <h2>Конфиденциальность</h2>
              <button type="button" id="closePrivacy">Готово</button>
            </header>
            <div class="edit-radio-list">
              ${[
                ['open', 'Открытая', 'Любая может вступить'],
                ['locked', 'По заявке', 'Вступление после ответа на вопросы'],
                ['secret', 'Секретная', 'Только по приглашению']
              ].map(([key, title, desc]) => `
                <button type="button" class="${privacy === key ? 'on' : ''}" data-privacy="${key}">
                  <span><b>${title}</b><small style="display:block;color:#8e8e93;font-weight:500">${desc}</small></span>
                  ${privacy === key ? '<i class="ti ti-check"></i>' : ''}
                </button>`).join('')}
            </div>
          </div>` : ''}
      </div>`;
    view.querySelector('#openPrivacy').onclick = () => {
      privacyOpen = true;
      render();
    };
    view.querySelector('#closePrivacy')?.addEventListener('click', () => {
      privacyOpen = false;
      render();
    });
    view.querySelectorAll('[data-privacy]').forEach(button => {
      button.onclick = () => {
        privacy = button.dataset.privacy;
        privacyOpen = false;
        render();
      };
    });
  };
  render();
}

export function postCommentsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let draft = '';
  const comments = [
    { name: people[0].name, photo: people[0].photo, text: 'Беру «отлично» и кидаю трек в тред', time: '1 ч' },
    { name: people[2].name, photo: people[2].photo, text: 'Можно собраться на кофе под этот плейлист?', time: '40 мин' }
  ];

  const render = () => {
    const has = draft.trim().length > 0;
    view.innerHTML = `
      <div class="post-comments-page">
        <header class="modal-head">
          <button data-action="group-posts" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Комментарии</h1>
          <span></span>
        </header>
        <article class="comment-post-preview">
          <b>${esc(people[1].name)}</b>
          <h2>🎶 Кофейный плейлист недели</h2>
          <p>Делитесь треками и голосуйте за настроение</p>
        </article>
        <div class="comments-list">
          ${comments.map(item => `
            <article class="comment-row">
              <img src="${esc(item.photo)}" alt="">
              <div>
                <header><b>${esc(item.name)}</b><time>${esc(item.time)}</time></header>
                <p>${esc(item.text)}</p>
              </div>
            </article>`).join('')}
        </div>
        <div class="message-bar comment-bar">
          <label class="msg-field">
            <input id="commentInput" placeholder="Написать комментарий" value="${esc(draft)}">
            <i class="ti ti-mood-smile"></i>
          </label>
          ${has ? `<button class="msg-send" id="sendComment" aria-label="Отправить"><i class="ti ti-arrow-up"></i></button>` : ''}
        </div>
      </div>`;
    const input = view.querySelector('#commentInput');
    input.oninput = () => {
      draft = input.value;
      const next = draft.trim().length > 0;
      if (next !== has) render();
    };
    view.querySelector('#sendComment')?.addEventListener('click', () => {
      if (!draft.trim()) return;
      comments.push({ name: people[0].name, photo: people[0].photo, text: draft.trim(), time: 'сейчас' });
      draft = '';
      render();
    });
    if (draft) {
      input.focus();
      input.setSelectionRange(draft.length, draft.length);
    }
  };
  render();
}

export function organizeRoomsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let rooms = [
    { title: 'Знакомства', icon: 'star', category: 'Без категории', privacy: 'open' },
    { title: 'Чат', icon: 'message-circle', category: 'Без категории', privacy: 'open' },
    { title: 'События', icon: 'calendar-event', category: 'Без категории', privacy: 'open' },
    { title: 'Рекомендации', icon: 'file-text', category: 'Без категории', privacy: 'open' }
  ];
  let categories = ['Без категории', 'музыка'];
  let editing = null;
  let step = 'list'; // list | form | privacy | category | new-category | members | welcome
  let draftName = '';
  let draftAbout = '';
  let draftPrivacy = 'open';
  let draftCategory = 'Без категории';
  let newCategory = '';
  let showAbout = false;

  const privacyLabel = {
    open: 'Открытая',
    locked: 'Закрытая',
    secret: 'Секретная'
  };

  const render = () => {
    if (step === 'welcome') {
      view.innerHTML = `
        <div class="new-room-welcome">
          <header class="gchat-top">
            <button class="gchat-back" data-action="group-hub" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
            <div class="gchat-peer">
              <h1>${esc(draftName)} <i class="ti ti-chevron-down"></i></h1>
            </div>
            <button data-action="invite-dm" data-id="${group.id}" aria-label="Пригласить"><i class="ti ti-user-plus"></i></button>
          </header>
          <div class="room-welcome-card">
            <h2>Добро пожаловать в ${esc(draftName)}</h2>
            ${draftAbout ? `<p>${esc(draftAbout)}</p>` : ''}
            <button type="button" id="editRoomName"><i class="ti ti-pencil"></i> Изменить название</button>
          </div>
          <article class="gchat-join">
            <img src="${esc(people[0].photo)}" alt="">
            <div>
              <div class="gchat-join-head">
                <b>${esc(people[0].name)}</b>
                <time>только что</time>
              </div>
              <p class="gchat-join-body">создала комнату</p>
            </div>
          </article>
          <div class="gchat-welcome">
            <span>👋</span>
            <p>Привет! Добро пожаловать в «${esc(draftName)}» — напишите первое сообщение</p>
          </div>
          <div class="message-bar">
            <button class="msg-add" aria-label="Вложение"><i class="ti ti-plus"></i></button>
            <label class="msg-field"><input placeholder="Написать сообщение"></label>
            <button aria-label="GIF">GIF</button>
            <button aria-label="Фото"><i class="ti ti-photo"></i></button>
          </div>
        </div>`;
      view.querySelector('#editRoomName').onclick = () => {
        step = 'form';
        render();
      };
      return;
    }

    if (step === 'members') {
      view.innerHTML = `
        <div class="organize-rooms-page">
          <header class="modal-head">
            <button id="backMembers" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
            <h1>${esc(draftName)}</h1>
            <button class="head-action" id="skipMembers">Пропустить</button>
          </header>
          <div class="members-choice">
            <h2>Как добавить участниц?</h2>
            <button type="button" class="choice-card" id="addAll">
              <b>Всю группу</b>
              <span>Автоматически всех, кто в группе</span>
            </button>
            <button type="button" class="choice-card" data-action="invite-dm" data-id="${group.id}">
              <b>Выбрать вручную</b>
              <span>Добавьте подруг сами — остальные смогут вступить</span>
            </button>
          </div>
        </div>`;
      const finish = () => {
        rooms.push({ title: draftName.trim(), icon: 'folder', category: draftCategory, privacy: draftPrivacy, about: draftAbout });
        step = 'welcome';
        render();
      };
      view.querySelector('#backMembers').onclick = () => {
        step = 'form';
        render();
      };
      view.querySelector('#skipMembers').onclick = finish;
      view.querySelector('#addAll').onclick = finish;
      return;
    }

    if (step === 'privacy') {
      view.innerHTML = `
        <div class="organize-rooms-page">
          <header class="modal-head">
            <button id="backPrivacy" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
            <h1>Приватность</h1>
            <span></span>
          </header>
          <div class="privacy-list">
            ${[
              ['open', 'Открытая', 'Любая участница группы может зайти'],
              ['locked', 'Закрытая', 'Комнату видят все, но зайти могут только добавленные'],
              ['secret', 'Секретная', 'Видят и заходят только добавленные']
            ].map(([key, title, desc]) => `
              <button type="button" class="privacy-row ${draftPrivacy === key ? 'on' : ''}" data-privacy="${key}">
                <div>
                  <b>${title}</b>
                  <span>${desc}</span>
                </div>
                ${draftPrivacy === key ? '<i class="ti ti-check"></i>' : ''}
              </button>`).join('')}
          </div>
        </div>`;
      view.querySelector('#backPrivacy').onclick = () => {
        step = 'form';
        render();
      };
      view.querySelectorAll('[data-privacy]').forEach(button => {
        button.onclick = () => {
          draftPrivacy = button.dataset.privacy;
          step = 'form';
          render();
        };
      });
      return;
    }

    if (step === 'category') {
      view.innerHTML = `
        <div class="organize-rooms-page">
          <header class="modal-head">
            <button id="backCategory" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
            <h1>Категория</h1>
            <button class="head-action on" id="pickCategory">Выбрать</button>
          </header>
          <button class="create-category-btn" type="button" id="newCategory">Создать категорию</button>
          <p class="loc-sub">Категории можно менять в «Комнатах» из меню группы.</p>
          <div class="privacy-list">
            ${categories.map(item => `
              <button type="button" class="privacy-row ${draftCategory === item ? 'on' : ''}" data-category="${esc(item)}">
                <div><b>${esc(item)}</b></div>
                ${draftCategory === item ? '<i class="ti ti-check"></i>' : ''}
              </button>`).join('')}
          </div>
        </div>`;
      view.querySelector('#backCategory').onclick = () => {
        step = 'form';
        render();
      };
      view.querySelector('#pickCategory').onclick = () => {
        step = 'form';
        render();
      };
      view.querySelector('#newCategory').onclick = () => {
        newCategory = '';
        step = 'new-category';
        render();
      };
      view.querySelectorAll('[data-category]').forEach(button => {
        button.onclick = () => {
          draftCategory = button.dataset.category;
          render();
        };
      });
      return;
    }

    if (step === 'new-category') {
      view.innerHTML = `
        <div class="organize-rooms-page">
          <header class="modal-head">
            <button id="backNewCat" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
            <h1>Новая категория</h1>
            <button class="head-action ${newCategory.trim() ? 'on' : ''}" id="saveCategory" ${newCategory.trim() ? '' : 'disabled'}>Создать</button>
          </header>
          <input class="create-name" id="categoryName" placeholder="Название категории" value="${esc(newCategory)}" autofocus>
        </div>`;
      view.querySelector('#categoryName').oninput = event => {
        newCategory = event.target.value;
        const btn = view.querySelector('#saveCategory');
        btn.disabled = !newCategory.trim();
        btn.classList.toggle('on', Boolean(newCategory.trim()));
      };
      view.querySelector('#backNewCat').onclick = () => {
        step = 'category';
        render();
      };
      view.querySelector('#saveCategory').onclick = () => {
        if (!newCategory.trim()) return;
        categories.push(newCategory.trim());
        draftCategory = newCategory.trim();
        step = 'category';
        render();
      };
      return;
    }

    if (step === 'form' || editing !== null) {
      const isEdit = editing !== null;
      const canDone = draftName.trim().length > 0;
      view.innerHTML = `
        <div class="organize-rooms-page add-chat-page">
          <header class="modal-head">
            <button id="cancelRoom" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
            <h1>${isEdit ? 'Переименовать' : 'Новая комната'}</h1>
            <button class="head-action coral ${canDone ? 'on' : ''}" id="saveRoom" ${canDone ? '' : 'disabled'}>Готово</button>
          </header>
          <input class="create-name big" id="roomName" placeholder="Название комнаты" value="${esc(draftName)}" autofocus>
          ${showAbout || draftAbout
            ? `<textarea class="create-about show" id="roomAbout" placeholder="Описание" rows="2">${esc(draftAbout)}</textarea>`
            : `<button type="button" class="add-about-link" id="showAbout">Нажмите, чтобы добавить описание</button>`}
          <div class="room-settings-list">
            <button type="button" class="room-setting-row" id="openPrivacy">
              <span class="settings-icon coral"><i class="ti ti-lock"></i></span>
              <div>
                <b>Приватность</b>
                <span>${privacyLabel[draftPrivacy]}</span>
              </div>
              <i class="ti ti-chevron-right"></i>
            </button>
            <button type="button" class="room-setting-row" id="openCategory">
              <span class="settings-icon coral"><i class="ti ti-folder"></i></span>
              <div>
                <b>Категория</b>
                <span>${esc(draftCategory)}</span>
              </div>
              <i class="ti ti-chevron-right"></i>
            </button>
          </div>
          ${isEdit ? `<button class="danger-text" type="button" id="deleteRoom">Удалить комнату</button>` : ''}
        </div>`;
      view.querySelector('#roomName').oninput = event => {
        draftName = event.target.value;
        const btn = view.querySelector('#saveRoom');
        btn.disabled = !draftName.trim();
        btn.classList.toggle('on', Boolean(draftName.trim()));
      };
      view.querySelector('#roomAbout')?.addEventListener('input', event => {
        draftAbout = event.target.value;
      });
      view.querySelector('#showAbout')?.addEventListener('click', () => {
        showAbout = true;
        render();
      });
      view.querySelector('#openPrivacy').onclick = () => {
        step = 'privacy';
        render();
      };
      view.querySelector('#openCategory').onclick = () => {
        step = 'category';
        render();
      };
      view.querySelector('#cancelRoom').onclick = () => {
        editing = null;
        step = 'list';
        draftName = '';
        draftAbout = '';
        showAbout = false;
        render();
      };
      view.querySelector('#saveRoom').onclick = () => {
        if (!draftName.trim()) return;
        if (isEdit) {
          rooms[editing].title = draftName.trim();
          rooms[editing].privacy = draftPrivacy;
          rooms[editing].category = draftCategory;
          rooms[editing].about = draftAbout;
          editing = null;
          step = 'list';
          render();
          return;
        }
        step = 'members';
        render();
      };
      view.querySelector('#deleteRoom')?.addEventListener('click', () => {
        rooms.splice(editing, 1);
        editing = null;
        step = 'list';
        render();
      });
      return;
    }

    view.innerHTML = `
      <div class="organize-rooms-page">
        <header class="modal-head">
          <button data-action="group-hub" data-id="${group.id}" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Комнаты</h1>
          <button class="head-action on" data-action="group-hub" data-id="${group.id}">Готово</button>
        </header>
        <p class="loc-sub">Изменения видят все участницы группы</p>
        <div class="organize-list">
          ${rooms.filter(room => room.category === 'Без категории' || !room.category).map((room, index) => {
            const realIndex = rooms.indexOf(room);
            return `
            <div class="organize-row">
              <span class="hub-room-icon"><i class="ti ti-${room.icon}"></i></span>
              <button type="button" class="organize-title" data-edit="${realIndex}">
                ${esc(room.title)}
                <small>${esc(privacyLabel[room.privacy] || 'Открытая')}</small>
              </button>
              <div class="organize-actions">
                <button type="button" data-up="${realIndex}" ${realIndex === 0 ? 'disabled' : ''} aria-label="Выше"><i class="ti ti-chevron-up"></i></button>
                <button type="button" data-down="${realIndex}" ${realIndex === rooms.length - 1 ? 'disabled' : ''} aria-label="Ниже"><i class="ti ti-chevron-down"></i></button>
              </div>
            </div>`;
          }).join('')}
        </div>
        <h3 class="hub-label">КАТЕГОРИИ</h3>
        <div class="organize-list">
          ${rooms.filter(room => room.category && room.category !== 'Без категории').map(room => {
            const realIndex = rooms.indexOf(room);
            return `
            <div class="organize-row">
              <span class="hub-room-icon"><i class="ti ti-${room.icon}"></i></span>
              <button type="button" class="organize-title" data-edit="${realIndex}">
                ${esc(room.title)}
                <small>${esc(room.category)}</small>
              </button>
            </div>`;
          }).join('') || '<p class="muted cat-empty">Пока нет категорий — создайте при добавлении комнаты</p>'}
        </div>
        <button class="add-room-btn" type="button" id="addRoom"><i class="ti ti-plus"></i> Добавить комнату</button>
        <button class="invite-room-btn" type="button" data-action="invite-sheet" data-id="${group.id}"><i class="ti ti-user-plus"></i> Пригласить в комнаты</button>
      </div>`;
    view.querySelectorAll('[data-up]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.up);
        if (index <= 0) return;
        [rooms[index - 1], rooms[index]] = [rooms[index], rooms[index - 1]];
        render();
      };
    });
    view.querySelectorAll('[data-down]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.down);
        if (index >= rooms.length - 1) return;
        [rooms[index + 1], rooms[index]] = [rooms[index], rooms[index + 1]];
        render();
      };
    });
    view.querySelectorAll('[data-edit]').forEach(button => {
      button.onclick = () => {
        editing = Number(button.dataset.edit);
        draftName = rooms[editing].title;
        draftAbout = rooms[editing].about || '';
        draftPrivacy = rooms[editing].privacy || 'open';
        draftCategory = rooms[editing].category || 'Без категории';
        showAbout = Boolean(draftAbout);
        step = 'form';
        render();
      };
    });
    view.querySelector('#addRoom').onclick = () => {
      editing = null;
      draftName = '';
      draftAbout = '';
      draftPrivacy = 'open';
      draftCategory = 'Без категории';
      showAbout = false;
      step = 'form';
      render();
    };
  };
  render();
}

export function inviteSheetScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  view.innerHTML = `
    <div class="invite-sheet-page">
      <header class="modal-head">
        <button data-action="organize-rooms" data-id="${group.id}" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Пригласить</h1>
        <span></span>
      </header>
      <p class="loc-sub">Пригласите подруг в «${esc(group.title)}»</p>
      <div class="invite-ways">
        <button type="button" id="shareLink"><i class="ti ti-link"></i><span>Ссылка</span></button>
        <button type="button" id="fromContacts"><i class="ti ti-address-book"></i><span>Контакты</span></button>
        <button type="button" data-action="invite-dm" data-id="${group.id}"><i class="ti ti-message-circle"></i><span>Через чат</span></button>
      </div>
      <p class="invite-toast" id="inviteToast" hidden></p>
    </div>`;
  const toast = view.querySelector('#inviteToast');
  const flash = text => {
    toast.hidden = false;
    toast.textContent = text;
    setTimeout(() => { toast.hidden = true; }, 1600);
  };
  view.querySelector('#shareLink').onclick = () => flash('Ссылка скопирована');
  view.querySelector('#fromContacts').onclick = () => flash('Откройте контакты на телефоне');
}

export function inviteDmScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  const friends = people.slice(0, 3);
  let sent = new Set();
  let query = '';

  const render = () => {
    const list = friends.filter(person => person.name.toLowerCase().includes(query.toLowerCase()));
    view.innerHTML = `
      <div class="invite-dm-page">
        <header class="modal-head">
          <button data-action="organize-rooms" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Через чат</h1>
          <button class="head-action on" data-action="organize-rooms" data-id="${group.id}">Готово</button>
        </header>
        <label class="plain-search-wrap">
          <i class="ti ti-search"></i>
          <input class="plain-search" id="dmSearch" placeholder="Поиск..." value="${esc(query)}">
        </label>
        <h3 class="settings-label">Подруги</h3>
        <div class="invite-dm-list">
          ${list.map(person => `
            <div class="invite-dm-row">
              <img src="${esc(person.photo)}" alt="">
              <b>${esc(person.name)}</b>
              <button type="button" class="${sent.has(person.id) ? 'sent' : ''}" data-add="${person.id}">
                ${sent.has(person.id) ? 'Отправлено' : 'Добавить'}
              </button>
            </div>`).join('') || '<p class="muted">Никого не нашли</p>'}
        </div>
      </div>`;
    view.querySelector('#dmSearch').oninput = event => {
      query = event.target.value;
      render();
    };
    view.querySelectorAll('[data-add]').forEach(button => {
      button.onclick = () => {
        const personId = Number(button.dataset.add);
        if (sent.has(personId)) sent.delete(personId);
        else sent.add(personId);
        render();
      };
    });
  };
  render();
}

export function inviteFriendsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let selected = new Set();
  const friends = people.slice(0, 3);

  const render = () => {
    view.innerHTML = `
      <div class="invite-friends-page">
        <header class="modal-head">
          <button data-action="group-hub" data-id="${group.id}" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Пригласить</h1>
          <button class="head-action ${selected.size ? 'on coral' : ''}" id="sendInvites" ${selected.size ? '' : 'disabled'}>Отправить</button>
        </header>
        <p class="loc-sub">Пригласите подруг в «${esc(group.title)}»</p>
        <input class="plain-search" id="inviteSearch" placeholder="Поиск...">
        <div class="invite-list">
          ${friends.map(person => `
            <button class="pick-row" type="button" data-pick="${person.id}">
              <img src="${esc(person.photo)}" alt="">
              <div>
                <strong>${esc(person.name)}</strong>
                <span>${esc(person.city)}</span>
              </div>
              <span class="pick-circle ${selected.has(person.id) ? 'on' : ''}"></span>
            </button>`).join('')}
        </div>
        <button class="share-link-btn" type="button" id="copyInvite"><i class="ti ti-link"></i> Скопировать ссылку-приглашение</button>
      </div>`;
    view.querySelectorAll('[data-pick]').forEach(button => {
      button.onclick = () => {
        const pid = Number(button.dataset.pick);
        if (selected.has(pid)) selected.delete(pid);
        else selected.add(pid);
        render();
      };
    });
    view.querySelector('#sendInvites').onclick = () => {
      if (!selected.size) return;
      navigate('group-hub', group.id);
    };
    view.querySelector('#copyInvite').onclick = () => {
      navigate('group-hub', group.id);
    };
  };
  render();
}

export function createGroupScreen() {
  clearHeader();
  let name = '';
  let about = '';
  let city = '';
  let isPublic = true;
  let cover = null;
  let tag = '';
  let tags = new Set();
  let theme = { name: 'Синий', color: '#3b6ef5' };
  let locOpen = false;
  let themeOpen = false;
  let tagsOpen = false;
  const tagChoices = ['кофе', 'прогулки', 'книги', 'йога', 'музыка', 'кино', 'спорт', 'еда', 'искусство', 'путешествия'];
  const themes = [
    { name: 'Синий', color: '#3b6ef5' },
    { name: 'Коралл', color: '#ff5a5f' },
    { name: 'Фиолетовый', color: '#8b5cf6' },
    { name: 'Зелёный', color: '#34c759' }
  ];

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
            ${themes.map(item => `
              <button type="button" class="theme-swatch ${theme.name === item.name ? 'on' : ''}" data-theme="${esc(item.name)}" style="--swatch:${item.color}">
                <i></i><span>${esc(item.name)}</span>
              </button>`).join('')}
          </div>
        </div>`;
      view.querySelector('#themeBack').onclick = () => { themeOpen = false; render(); };
      view.querySelectorAll('[data-theme]').forEach(button => {
        button.onclick = () => {
          theme = themes.find(item => item.name === button.dataset.theme) || theme;
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
            ${tagChoices.map(item => `
              <button type="button" class="tag-chip ${tags.has(item) ? 'on' : ''}" data-tag="${esc(item)}">${esc(item)}</button>`).join('')}
          </div>
        </div>`;
      view.querySelectorAll('[data-tag]').forEach(button => {
        button.onclick = () => {
          const value = button.dataset.tag;
          if (tags.has(value)) tags.delete(value);
          else if (tags.size < 5) tags.add(value);
          tag = [...tags].join(', ');
          render();
        };
      });
      view.querySelector('#tagsBack').onclick = () => { tagsOpen = false; render(); };
      view.querySelector('#tagsDone').onclick = () => { tagsOpen = false; render(); };
      return;
    }
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
        <button class="create-desc" type="button" id="groupAboutToggle">${about ? esc(about) : 'Добавить описание'}</button>
        <textarea class="create-about ${about ? 'show' : ''}" id="groupAbout" placeholder="О группе">${esc(about)}</textarea>

        <div class="create-chips">
          <button type="button" id="setCity"><i class="ti ti-map-pin"></i>${city ? esc(city) : 'Добавить локацию'}</button>
          <button type="button" id="setTag"><i class="ti ti-tag"></i>${tag ? esc(tag.split(', ')[0] + (tags.size > 1 ? ` +${tags.size - 1}` : '')) : 'Теги'}</button>
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
        <p class="create-legal">Нажимая «Создать», вы соглашаетесь с <a href="#">правилами сообществ Yaqin</a>.</p>
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
    view.querySelector('#groupAbout').oninput = event => {
      about = event.target.value;
    };
    view.querySelector('#groupPublic').onchange = event => {
      isPublic = event.target.checked;
    };
    view.querySelector('#setCover').onclick = () => {
      cover = PHOTOS.palms;
      render();
    };
    view.querySelector('#setCity').onclick = () => {
      locOpen = true;
      render();
    };
    view.querySelector('#openTheme').onclick = () => {
      themeOpen = true;
      render();
    };
    view.querySelector('#setTag').onclick = () => {
      tagsOpen = true;
      render();
    };
    view.querySelector('#createGroupBtn').onclick = () => {
      if (!name.trim()) return;
      navigate('invite-friends', 0);
    };
  };

  render();
}

export function joinGroupScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0];
  let step = 0;
  let answers = JOIN_QUESTIONS.map(() => '');

  const answered = () => {
    const question = JOIN_QUESTIONS[step];
    if (question.type === 'choice') return answers[step] !== '' && answers[step] !== null;
    return String(answers[step] || '').trim().length > 0;
  };

  const render = () => {
    const question = JOIN_QUESTIONS[step];
    const ready = answered();
    view.innerHTML = `
      <div class="join-page">
        <header class="modal-head">
          <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <span></span>
          <button class="head-action ${ready ? 'on' : ''}" id="joinNext" ${ready ? '' : 'disabled'}>${step === JOIN_QUESTIONS.length - 1 ? 'Отправить' : 'Далее'}</button>
        </header>
        <img class="join-cover" src="${esc(group.photo)}" alt="">
        <h1>${esc(group.title)}</h1>
        <p class="join-step">${step + 1}/${JOIN_QUESTIONS.length}</p>
        <h2>${esc(question.text)}</h2>
        ${question.type === 'choice' ? `
          <div class="join-options">
            ${question.options.map(option => `
              <button type="button" class="join-option ${answers[step] === option ? 'on' : ''}" data-option="${esc(option)}">
                ${esc(option)}
              </button>`).join('')}
          </div>` : `
          <textarea class="join-answer" id="joinAnswer" placeholder="${esc(question.placeholder || 'Ваш ответ')}" rows="4">${esc(answers[step] || '')}</textarea>`}
      </div>`;

    view.querySelectorAll('[data-option]').forEach(button => {
      button.onclick = () => {
        answers[step] = button.dataset.option;
        render();
      };
    });
    view.querySelector('#joinAnswer')?.addEventListener('input', event => {
      answers[step] = event.target.value;
      const btn = view.querySelector('#joinNext');
      const ok = event.target.value.trim().length > 0;
      btn.disabled = !ok;
      btn.classList.toggle('on', ok);
    });

    view.querySelector('#joinNext').onclick = () => {
      if (!answered()) return;
      if (step < JOIN_QUESTIONS.length - 1) {
        step += 1;
        render();
        return;
      }
      group.joined = true;
      navigate('group-hub', group.id);
    };
    if (question.type === 'text' && answers[step]) {
      const input = view.querySelector('#joinAnswer');
      input?.focus();
      input?.setSelectionRange(answers[step].length, answers[step].length);
    }
  };

  render();
}

export function createEventScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let title = '';
  let place = '';
  let when = 'Вс, 21 сен · 11:00';

  const render = () => {
    const ready = title.trim().length > 1 && place.trim().length > 1;
    view.innerHTML = `
      <div class="create-event-page">
        <header class="modal-head">
          <button data-action="events" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <h1>Новое событие</h1>
          <button class="head-action coral ${ready ? 'on' : ''}" id="createEventBtn" ${ready ? '' : 'disabled'}>Создать</button>
        </header>
        <p class="loc-sub">В группе «${esc(group.title)}»</p>
        <input class="create-name" id="eventTitle" placeholder="Название события" value="${esc(title)}">
        <input class="create-name smaller" id="eventPlace" placeholder="Место" value="${esc(place)}">
        <button class="settings-row" type="button" id="eventWhen">
          <span class="settings-icon blue"><i class="ti ti-calendar-event"></i></span>
          <span>Когда<br><small>${esc(when)}</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" type="button">
          <span class="settings-icon green"><i class="ti ti-map-pin"></i></span>
          <span>Адрес<br><small>Ташкент</small></span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </div>`;
    view.querySelector('#eventTitle').oninput = event => {
      title = event.target.value;
      const btn = view.querySelector('#createEventBtn');
      const ok = title.trim().length > 1 && place.trim().length > 1;
      btn.disabled = !ok;
      btn.classList.toggle('on', ok);
    };
    view.querySelector('#eventPlace').oninput = event => {
      place = event.target.value;
      const btn = view.querySelector('#createEventBtn');
      const ok = title.trim().length > 1 && place.trim().length > 1;
      btn.disabled = !ok;
      btn.classList.toggle('on', ok);
    };
    view.querySelector('#eventWhen').onclick = () => {
      when = when.includes('21') ? 'Сб, 20 сен · 10:00' : 'Вс, 21 сен · 11:00';
      render();
    };
    view.querySelector('#createEventBtn').onclick = () => {
      if (!ready && !(title.trim().length > 1 && place.trim().length > 1)) return;
      navigate('event', 0);
    };
  };
  render();
}

export function eventsScreen() {
  clearHeader();
  let month = 'Сентябрь 2026';
  const emptyMonths = ['Октябрь 2026', 'Ноябрь 2026', 'Декабрь 2026'];

  const render = () => {
    const empty = month !== 'Сентябрь 2026';
    view.innerHTML = `
      <div class="events-page">
        <header class="chats-head">
          <h1>События</h1>
          <button data-action="create-event" data-id="0" aria-label="Создать"><i class="ti ti-plus"></i></button>
        </header>

        <section class="events-calendar">
          <button class="events-month" type="button" id="cycleMonth">${esc(month)} <i class="ti ti-chevron-down"></i></button>
          ${empty ? `
            <div class="events-empty-month">
              <i class="ti ti-calendar-off"></i>
              <p>В этом месяце пока нет событий</p>
            </div>` : `
            <div class="cal-week">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(day => `<span>${day}</span>`).join('')}</div>
            <div class="cal-grid">
              ${Array.from({ length: 30 }, (_, index) => {
                const day = index + 1;
                const marked = events.some(event => Number(event.day) === day);
                const selected = day === 14;
                return `<button class="${selected ? 'on' : ''} ${marked ? 'dot' : ''}" type="button">${day}</button>`;
              }).join('')}
            </div>`}
        </section>

        ${empty ? '' : `
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
          </div>`}
      </div>`;
    view.querySelector('#cycleMonth').onclick = () => {
      const all = ['Сентябрь 2026', ...emptyMonths];
      const index = all.indexOf(month);
      month = all[(index + 1) % all.length];
      render();
    };
  };
  render();
}

export function eventScreen(id) {
  clearHeader();
  const event = events[Number(id) || 0];
  let rsvp = 'going';
  let rsvpOpen = false;
  let rsvpTab = 'going';

  const lists = {
    going: people.slice(0, 4),
    maybe: people.slice(1, 3),
    later: people.slice(2, 4)
  };

  const render = () => {
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
          <li><i class="ti ti-link"></i><a class="event-link" href="https://yaqin.uz" target="_blank" rel="noopener">yaqin.uz/events</a></li>
          <li><button type="button" id="openRsvp"><i class="ti ti-check"></i>${event.going} человек идут</button></li>
        </ul>
        <div class="event-avatars">
          ${[people[0].photo, people[1].photo, people[2].photo].map((src, index) => `<img src="${esc(src)}" alt="" style="--i:${index}">`).join('')}
        </div>
        <div class="event-rsvp">
          <button type="button" data-rsvp="later" class="${rsvp === 'later' ? 'on' : ''}">В другой раз 😢</button>
          <button type="button" data-rsvp="maybe" class="${rsvp === 'maybe' ? 'on' : ''}">Интересно 👋</button>
          <button type="button" data-rsvp="going" class="${rsvp === 'going' ? 'on' : ''}">Иду 👍</button>
        </div>
        <button class="event-chat-btn" type="button" data-action="group-chat" data-id="0"><i class="ti ti-message-circle"></i> Чат события</button>
        ${rsvp === 'going' ? `
          <div class="event-activity">
            <img src="${esc(people[0].photo)}" alt="">
            <div>
              <b>${esc(people[0].name)}</b>
              <span>идёт · только что</span>
            </div>
            <button type="button" data-action="group-chat" data-id="0">18 сообщ. <i class="ti ti-chevron-right"></i></button>
          </div>` : ''}
        ${rsvpOpen ? `
          <div class="rsvp-sheet">
            <header>
              <h2>RSVP</h2>
              <button type="button" id="closeRsvp"><i class="ti ti-x"></i></button>
            </header>
            <div class="rsvp-tabs">
              <button class="${rsvpTab === 'going' ? 'on' : ''}" data-rtab="going">Идут</button>
              <button class="${rsvpTab === 'maybe' ? 'on' : ''}" data-rtab="maybe">Интересно</button>
              <button class="${rsvpTab === 'later' ? 'on' : ''}" data-rtab="later">В другой раз</button>
            </div>
            <div class="rsvp-list">
              ${lists[rsvpTab].map(person => `
                <button type="button" data-action="person" data-id="${person.id}">
                  <img src="${esc(person.photo)}" alt="">
                  <b>${esc(person.name)}</b>
                  <span>${esc(person.city)}</span>
                </button>`).join('')}
            </div>
          </div>` : ''}
      </article>`;
    view.querySelectorAll('[data-rsvp]').forEach(button => {
      button.onclick = () => {
        rsvp = button.dataset.rsvp;
        render();
      };
    });
    view.querySelector('#openRsvp')?.addEventListener('click', () => {
      rsvpOpen = true;
      render();
    });
    view.querySelector('#closeRsvp')?.addEventListener('click', () => {
      rsvpOpen = false;
      render();
    });
    view.querySelectorAll('[data-rtab]').forEach(button => {
      button.onclick = () => {
        rsvpTab = button.dataset.rtab;
        render();
      };
    });
  };
  render();
}
