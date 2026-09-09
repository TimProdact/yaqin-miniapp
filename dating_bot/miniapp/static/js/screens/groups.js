import { groups, events, people, PHOTOS } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';

const JOIN_QUESTIONS = [
  {
    text: 'Вы живёте в Ташкенте или планируете переезд?',
    options: ['Да', 'Нет']
  },
  {
    text: 'Зачем хотите вступить в группу?',
    options: ['Найти подруг', 'Ходить на встречи', 'Просто посмотреть']
  },
  {
    text: 'Готовы приходить на офлайн-встречи?',
    options: ['Да', 'Иногда', 'Пока онлайн']
  },
  {
    text: 'Согласны с правилами сообщества?',
    options: ['Да, согласна', 'Нужно почитать']
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

  const render = () => {
    const has = draft.trim().length > 0;
    view.innerHTML = `
      <div class="group-chat-page">
        <header class="gchat-top">
          <button class="gchat-back" data-action="group-hub" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <img class="gchat-avatar" src="${esc(group.photo)}" alt="">
          <div class="gchat-peer">
            <h1>Чат группы <i class="ti ti-chevron-down"></i></h1>
            <p><i class="online"></i> ${group.online || 3} онлайн</p>
          </div>
          <button data-action="group" data-id="${group.id}" aria-label="Участницы"><i class="ti ti-users"></i></button>
        </header>

        ${welcome ? `
          <div class="gchat-newbar">
            <span>1 новое сообщение</span>
            <button type="button" id="closeNew" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          </div>` : ''}
        <div class="gchat-pinned">
          <i class="ti ti-pin"></i>
          <div>
            <b>Закреплено</b>
            <span>Правила: уважение, без спама, только девушки</span>
          </div>
          <button type="button" id="closePin" aria-label="Скрыть"><i class="ti ti-x"></i></button>
        </div>

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

    view.querySelector('#closeWelcome')?.addEventListener('click', () => {
      welcome = false;
      render();
    });
    view.querySelector('#closeNew')?.addEventListener('click', () => {
      view.querySelector('.gchat-newbar')?.remove();
    });
    view.querySelector('#closePin')?.addEventListener('click', () => {
      view.querySelector('.gchat-pinned')?.remove();
    });
    view.querySelector('#jumpLatest')?.addEventListener('click', () => {
      view.querySelector('.gchat-thread')?.scrollTo({ top: 9999, behavior: 'smooth' });
    });
    view.querySelector('#gAttach')?.addEventListener('click', () => {
      attachOpen = !attachOpen;
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
  const rooms = [
    { id: 'intros', icon: 'star', title: 'Знакомства' },
    { id: 'chat', icon: 'message-circle', title: 'Чат', action: 'group-chat' },
    { id: 'events', icon: 'calendar-event', title: 'События', action: 'group-posts' },
    { id: 'recs', icon: 'file-text', title: 'Рекомендации' }
  ];
  const members = [people[0], people[1], people[2]];

  const render = () => {
    view.innerHTML = `
      <div class="group-hub-page">
        <header class="hub-top">
          <button data-action="groups" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <div class="hub-actions">
            <button aria-label="Фото"><i class="ti ti-photo"></i></button>
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
          <button class="${tab === 'events' ? 'on' : ''}" data-action="events">События</button>
          <button class="${tab === 'members' ? 'on' : ''}" data-tab="members">Участницы</button>
          <button data-action="group" data-id="${group.id}">О группе</button>
        </div>
        ${tab === 'members' ? `
          <h3 class="hub-label">УЧАСТНИЦЫ</h3>
          <div class="hub-members">
            ${members.map((person, index) => `
              <button class="hub-member" type="button" data-action="person" data-id="${person.id}">
                <img src="${esc(person.photo)}" alt="">
                <div>
                  <strong>${esc(person.name)}</strong>
                  <span>${index === 0 ? 'Организатор' : 'Участница'}</span>
                </div>
              </button>`).join('')}
          </div>` : `
          <h3 class="hub-label">КОМНАТЫ</h3>
          <div class="hub-rooms">
            ${rooms.map(room => `
              <button class="hub-room" type="button" ${room.action ? `data-action="${room.action}" data-id="${group.id}"` : ''}>
                <span class="hub-room-icon"><i class="ti ti-${room.icon}"></i></span>
                <b>${esc(room.title)}</b>
              </button>`).join('')}
          </div>
          <h3 class="hub-label">МУЗЫКА <i class="ti ti-chevron-down"></i></h3>
          <button class="hub-room" type="button">
            <span class="hub-room-icon"><i class="ti ti-music"></i></span>
            <div class="hub-room-copy">
              <b>Топ треков недели</b>
              <span>Кидайте самый частый трек сюда</span>
            </div>
          </button>`}
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
    view.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => {
        tab = button.dataset.tab;
        render();
      };
    });
  };
  render();
}

export function groupPostsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  let roomOpen = false;
  let room = 'События';
  let postMenu = null;
  const rooms = ['Знакомства', 'Чат', 'События', 'Рекомендации'];

  const render = () => {
    view.innerHTML = `
      <div class="group-posts-page">
        <header class="gchat-top">
          <button class="gchat-back" data-action="group-hub" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <img class="gchat-avatar" src="${esc(group.photo)}" alt="">
          <button class="gchat-peer room-switch" type="button" id="toggleRooms">
            <h1>${esc(room)} <i class="ti ti-chevron-down"></i></h1>
          </button>
          <button data-action="group" data-id="${group.id}" aria-label="Участницы"><i class="ti ti-users"></i></button>
        </header>
        ${roomOpen ? `
          <div class="room-switch-pop">
            ${rooms.map(item => `
              <button type="button" class="${item === room ? 'on' : ''}" data-room="${esc(item)}">${esc(item)}</button>`).join('')}
          </div>` : ''}
        ${postMenu !== null ? `
          <div class="post-menu-pop">
            <button type="button" data-action="post-comments" data-id="${group.id}">Комментарии</button>
            <button type="button">Закрепить</button>
            <button type="button">Скопировать ссылку</button>
            <button type="button" class="danger">Удалить пост</button>
          </div>` : ''}
        <div class="posts-toolbar">
          <button type="button">Недавнее <i class="ti ti-chevron-down"></i></button>
          <div class="posts-view-toggle">
            <button class="on" aria-label="Лента"><i class="ti ti-list"></i></button>
            <button aria-label="Сетка"><i class="ti ti-layout-grid"></i></button>
          </div>
        </div>
        <article class="post-card">
          <header>
            <img src="${esc(people[0].photo)}" alt="">
            <div>
              <b>${esc(people[0].name)} <span class="owner-badge">Организатор</span></b>
              <time>Вчера в 17:58</time>
            </div>
            <button class="post-menu-btn" type="button" data-post-menu="0" aria-label="Ещё"><i class="ti ti-dots"></i></button>
          </header>
          <h2>Создала комнату «${esc(room)}»</h2>
          <div class="post-reacts">
            <button type="button">👏 0</button>
            <button type="button"><i class="ti ti-mood-plus"></i></button>
          </div>
          <footer>
            <span>0 комментариев</span>
            <span class="ago">Создано 1 д назад</span>
          </footer>
        </article>
        <article class="post-card">
          <header>
            <img src="${esc(people[1].photo)}" alt="">
            <div>
              <b>${esc(people[1].name)}</b>
              <time>сегодня</time>
            </div>
            <button aria-label="Ещё"><i class="ti ti-dots"></i></button>
          </header>
          <h2>🎶 Кофейный плейлист недели</h2>
          <p class="post-body">Делитесь треками и голосуйте за настроение</p>
          <img class="post-image" src="${esc(PHOTOS.coffee)}" alt="">
          <div class="post-poll compact">
            <h3>ваше настроение сейчас</h3>
            <button type="button" class="poll-option"><span>отлично 😄</span><b>42%</b></button>
            <button type="button" class="poll-option"><span>нормально 😐</span><b>33%</b></button>
            <button type="button" class="poll-option"><span>грустно 😭</span><b>25%</b></button>
            <footer>12 ответов</footer>
          </div>
          <div class="post-reacts">
            <button type="button">❤️ 3</button>
            <button type="button"><i class="ti ti-mood-plus"></i></button>
          </div>
          <footer>
            <span>2 комментария</span>
            <span class="ago">2 ч назад</span>
          </footer>
          <button class="post-open-comments" type="button" data-action="post-comments" data-id="${group.id}">Смотреть комментарии</button>
        </article>
        <section class="posts-welcome">
          <span class="welcome-mark">✿</span>
          <h2>Добро пожаловать в ${esc(room)}</h2>
          <button type="button"><i class="ti ti-pencil"></i> Изменить название</button>
        </section>
        <button class="create-post-bar" type="button" data-action="create-post" data-id="${group.id}"><i class="ti ti-pencil"></i> Создать пост</button>
      </div>`;
    view.querySelector('#toggleRooms').onclick = () => {
      roomOpen = !roomOpen;
      postMenu = null;
      render();
    };
    view.querySelectorAll('[data-post-menu]').forEach(button => {
      button.onclick = () => {
        const id = Number(button.dataset.postMenu);
        postMenu = postMenu === id ? null : id;
        roomOpen = false;
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
  const render = () => {
    const term = query.trim().toLowerCase();
    const hits = term
      ? (group.arrivals || []).filter(item =>
          item.name.toLowerCase().includes(term) || item.answer.toLowerCase().includes(term)
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
        </div>
        ${term
          ? `<div class="search-results">${hits.map(item => `
              <button class="chat-row" type="button" data-action="group-chat" data-id="${group.id}">
                <img class="gchat-avatar" src="${esc(item.photo)}" alt="">
                <div class="chat-copy"><strong>${esc(item.name)}</strong><span>${esc(item.answer)}</span></div>
              </button>`).join('') || '<p class="search-none">Ничего не найдено</p>'}</div>`
          : `<div class="group-search-empty">
              <div class="search-illus"><i class="ti ti-search"></i></div>
              <h2>Найдите сообщения в группе</h2>
              <p>Попробуйте «кофе», «встреча» или «книга»</p>
            </div>`}
      </div>`;
    const input = view.querySelector('#groupSearch');
    input.focus();
    input.oninput = () => {
      query = input.value;
      render();
    };
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
        <button class="settings-row" type="button">
          <span class="settings-icon pink"><i class="ti ti-lock"></i></span>
          <span>Конфиденциальность</span>
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
        <button class="settings-row danger" type="button" id="leaveFromSettings">
          <span class="settings-icon red"><i class="ti ti-logout"></i></span>
          <span>Покинуть группу</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </div>
    </div>`;
  view.querySelector('#leaveFromSettings').onclick = () => leaveGroupConfirm(group.id);
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
    { title: 'Знакомства', icon: 'star' },
    { title: 'Чат', icon: 'message-circle' },
    { title: 'События', icon: 'calendar-event' },
    { title: 'Рекомендации', icon: 'file-text' }
  ];
  let editing = null;
  let creating = false;
  let draftName = '';

  const render = () => {
    if (creating || editing !== null) {
      const isEdit = editing !== null;
      view.innerHTML = `
        <div class="organize-rooms-page">
          <header class="modal-head">
            <button id="cancelRoom" aria-label="Закрыть"><i class="ti ti-x"></i></button>
            <h1>${isEdit ? 'Переименовать' : 'Новая комната'}</h1>
            <button class="head-action on" id="saveRoom" ${draftName.trim() ? '' : 'disabled'}>Сохранить</button>
          </header>
          <input class="create-name" id="roomName" placeholder="Название комнаты" value="${esc(draftName)}">
          ${isEdit ? `<button class="danger-text" type="button" id="deleteRoom">Удалить комнату</button>` : ''}
        </div>`;
      view.querySelector('#roomName').oninput = event => {
        draftName = event.target.value;
        const btn = view.querySelector('#saveRoom');
        btn.disabled = !draftName.trim();
        btn.classList.toggle('on', Boolean(draftName.trim()));
      };
      view.querySelector('#cancelRoom').onclick = () => {
        creating = false;
        editing = null;
        draftName = '';
        render();
      };
      view.querySelector('#saveRoom').onclick = () => {
        if (!draftName.trim()) return;
        if (isEdit) rooms[editing].title = draftName.trim();
        else rooms.push({ title: draftName.trim(), icon: 'folder' });
        creating = false;
        editing = null;
        draftName = '';
        render();
      };
      view.querySelector('#deleteRoom')?.addEventListener('click', () => {
        rooms.splice(editing, 1);
        editing = null;
        draftName = '';
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
        <p class="loc-sub">Перетащите, чтобы изменить порядок</p>
        <div class="organize-list">
          ${rooms.map((room, index) => `
            <div class="organize-row">
              <span class="hub-room-icon"><i class="ti ti-${room.icon}"></i></span>
              <button type="button" class="organize-title" data-edit="${index}">${esc(room.title)}</button>
              <div class="organize-actions">
                <button type="button" data-up="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Выше"><i class="ti ti-chevron-up"></i></button>
                <button type="button" data-down="${index}" ${index === rooms.length - 1 ? 'disabled' : ''} aria-label="Ниже"><i class="ti ti-chevron-down"></i></button>
              </div>
            </div>`).join('')}
        </div>
        <button class="add-room-btn" type="button" id="addRoom"><i class="ti ti-plus"></i> Добавить комнату</button>
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
        render();
      };
    });
    view.querySelector('#addRoom').onclick = () => {
      creating = true;
      draftName = '';
      render();
    };
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
  let answers = JOIN_QUESTIONS.map(() => null);

  const render = () => {
    const question = JOIN_QUESTIONS[step];
    view.innerHTML = `
      <div class="join-page">
        <header class="modal-head">
          <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <span></span>
          <button class="head-action ${answers[step] !== null ? 'on' : ''}" id="joinNext" ${answers[step] === null ? 'disabled' : ''}>${step === JOIN_QUESTIONS.length - 1 ? 'Готово' : 'Далее'}</button>
        </header>
        <img class="join-cover" src="${esc(group.photo)}" alt="">
        <h1>${esc(group.title)}</h1>
        <p class="join-step">${step + 1}/${JOIN_QUESTIONS.length}</p>
        <h2>${esc(question.text)}</h2>
        <div class="join-options">
          ${question.options.map((option, index) => `
            <button type="button" class="join-option ${answers[step] === index ? 'on' : ''}" data-option="${index}">
              ${esc(option)}
            </button>`).join('')}
        </div>
      </div>`;

    view.querySelectorAll('[data-option]').forEach(button => {
      button.onclick = () => {
        answers[step] = Number(button.dataset.option);
        render();
      };
    });

    view.querySelector('#joinNext').onclick = () => {
      if (answers[step] === null) return;
      if (step < JOIN_QUESTIONS.length - 1) {
        step += 1;
        render();
        return;
      }
      group.joined = true;
      navigate('group-hub', group.id);
    };
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
  view.innerHTML = `
    <div class="events-page">
      <header class="chats-head">
        <h1>События</h1>
        <button data-action="create-event" data-id="0" aria-label="Создать"><i class="ti ti-plus"></i></button>
      </header>

      <section class="events-calendar">
        <h2>Сентябрь 2026</h2>
        <div class="cal-week">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(day => `<span>${day}</span>`).join('')}</div>
        <div class="cal-grid">
          ${Array.from({ length: 30 }, (_, index) => {
            const day = index + 1;
            const marked = events.some(event => Number(event.day) === day);
            const selected = day === 14;
            return `<button class="${selected ? 'on' : ''} ${marked ? 'dot' : ''}" type="button">${day}</button>`;
          }).join('')}
        </div>
      </section>

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
      </div>
    </div>`;
}

export function eventScreen(id) {
  clearHeader();
  const event = events[Number(id) || 0];
  let rsvp = 'going';

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
          <li><i class="ti ti-check"></i>${event.going + (rsvp === 'going' ? 0 : 0)} человек идут</li>
        </ul>
        <div class="event-avatars">
          ${[people[0].photo, people[1].photo, people[2].photo].map((src, index) => `<img src="${esc(src)}" alt="" style="--i:${index}">`).join('')}
        </div>
        <div class="event-rsvp">
          <button type="button" data-rsvp="later" class="${rsvp === 'later' ? 'on' : ''}">В другой раз 😢</button>
          <button type="button" data-rsvp="maybe" class="${rsvp === 'maybe' ? 'on' : ''}">Интересно 👋</button>
          <button type="button" data-rsvp="going" class="${rsvp === 'going' ? 'on' : ''}">Иду 👍</button>
        </div>
      </article>`;
    view.querySelectorAll('[data-rsvp]').forEach(button => {
      button.onclick = () => {
        rsvp = button.dataset.rsvp;
        render();
      };
    });
  };
  render();
}
