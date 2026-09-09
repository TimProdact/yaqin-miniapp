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

  view.innerHTML = `
    <article class="group-sheet">
      <div class="sheet-handle"></div>
      <header class="sheet-head">
        <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <button aria-label="Ещё"><i class="ti ti-dots"></i></button>
      </header>
      <img class="group-cover" src="${esc(group.photo)}" alt="">
      <h1>${esc(group.title)}</h1>
      <p class="group-about">${esc(group.about)}</p>
      <span class="group-city"><i class="ti ti-map-pin"></i>${esc(group.city)}</span>
      <p class="group-members">${group.members.toLocaleString('ru-RU')} участниц</p>
      <button class="group-join" data-action="${group.joined ? 'group-hub' : 'join-group'}" data-id="${group.id}">
        ${group.joined ? 'Открыть группу' : 'Вступить в группу'}
      </button>
    </article>`;
}

export function groupChatScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  const arrivals = group.arrivals || [];
  const question = group.joinQuestion || 'Расскажите немного о себе';
  let welcome = true;

  const render = () => {
    view.innerHTML = `
      <div class="group-chat-page">
        <header class="gchat-top">
          <button class="gchat-back" data-action="groups" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
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
        </main>

        ${welcome ? `
          <div class="gchat-welcome">
            <span>👋</span>
            <p>Привет! Добро пожаловать в «${esc(group.title)}» 🌟 Напишите первое сообщение</p>
            <button type="button" id="closeWelcome" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          </div>` : ''}

        <div class="message-bar">
          <button class="msg-add" aria-label="Вложение"><i class="ti ti-plus"></i></button>
          <label class="msg-field">
            <input placeholder="Написать сообщение">
            <i class="ti ti-mood-smile"></i>
          </label>
          <button aria-label="GIF">GIF</button>
          <button aria-label="Фото"><i class="ti ti-photo"></i></button>
          <button aria-label="Голос"><i class="ti ti-microphone"></i></button>
        </div>
      </div>`;

    view.querySelector('#closeWelcome')?.addEventListener('click', () => {
      welcome = false;
      render();
    });
    view.querySelector('#closeNew')?.addEventListener('click', () => {
      view.querySelector('.gchat-newbar')?.remove();
    });
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
  const rooms = [
    { id: 'intros', icon: 'star', title: 'Знакомства' },
    { id: 'chat', icon: 'message-circle', title: 'Чат', action: 'group-chat' },
    { id: 'events', icon: 'calendar-event', title: 'События', action: 'group-posts' },
    { id: 'recs', icon: 'file-text', title: 'Рекомендации' }
  ];
  view.innerHTML = `
    <div class="group-hub-page">
      <header class="hub-top">
        <button data-action="groups" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <div class="hub-actions">
          <button aria-label="Фото"><i class="ti ti-photo"></i></button>
          <button aria-label="Поиск"><i class="ti ti-search"></i></button>
          <button aria-label="Ещё"><i class="ti ti-dots"></i></button>
        </div>
      </header>
      <div class="hub-identity">
        <img src="${esc(group.photo)}" alt="">
        <div>
          <h1>${esc(group.title)}</h1>
          <p>${group.members.toLocaleString('ru-RU')} участниц</p>
          <p class="hub-online"><i></i> ${group.online || 3} в сети</p>
        </div>
        <button class="hub-invite" type="button"><i class="ti ti-user-plus"></i> Пригласить</button>
      </div>
      <div class="hub-tabs">
        <button class="on">Комнаты</button>
        <button data-action="events">События</button>
        <button>Участницы</button>
        <button data-action="group" data-id="${group.id}">О группе</button>
      </div>
      <h3 class="hub-label">КОМНАТЫ</h3>
      <div class="hub-rooms">
        ${rooms.map(room => `
          <button class="hub-room" type="button" ${room.action ? `data-action="${room.action}" data-id="${group.id}"` : ''}>
            <span class="hub-room-icon"><i class="ti ti-${room.icon}"></i></span>
            <b>${esc(room.title)}</b>
          </button>`).join('')}
      </div>
      <button class="compose coral" data-action="group-posts" data-id="${group.id}" aria-label="Создать"><i class="ti ti-plus"></i></button>
    </div>`;
}

export function groupPostsScreen(id) {
  clearHeader();
  const group = groups[Number(id) || 0] || groups[0];
  view.innerHTML = `
    <div class="group-posts-page">
      <header class="gchat-top">
        <button class="gchat-back" data-action="group-hub" data-id="${group.id}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <img class="gchat-avatar" src="${esc(group.photo)}" alt="">
        <div class="gchat-peer">
          <h1>События <i class="ti ti-chevron-down"></i></h1>
        </div>
        <button data-action="group" data-id="${group.id}" aria-label="Участницы"><i class="ti ti-users"></i></button>
      </header>
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
          <button aria-label="Ещё"><i class="ti ti-dots"></i></button>
        </header>
        <h2>Создала комнату «События»</h2>
        <div class="post-reacts">
          <button type="button">👏 0</button>
          <button type="button"><i class="ti ti-mood-plus"></i></button>
        </div>
        <footer>
          <span>0 комментариев</span>
          <span class="ago">Создано 1 д назад</span>
        </footer>
      </article>
      <section class="posts-welcome">
        <span class="welcome-mark">✿</span>
        <h2>Добро пожаловать в События</h2>
        <button type="button"><i class="ti ti-pencil"></i> Изменить название</button>
      </section>
      <button class="create-post-bar" type="button"><i class="ti ti-pencil"></i> Создать пост</button>
    </div>`;
}

export function createGroupScreen() {
  clearHeader();
  let name = '';
  let about = '';
  let city = '';
  let isPublic = true;
  let cover = null;
  let tag = '';

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
        <button class="create-desc" type="button" id="groupAboutToggle">${about ? esc(about) : 'Добавить описание'}</button>
        <textarea class="create-about ${about ? 'show' : ''}" id="groupAbout" placeholder="О группе">${esc(about)}</textarea>

        <div class="create-chips">
          <button type="button" id="setCity"><i class="ti ti-map-pin"></i>${city ? esc(city) : 'Добавить локацию'}</button>
          <button type="button" id="setTag"><i class="ti ti-tag"></i>${tag ? esc(tag) : 'Теги'}</button>
        </div>

        <h3 class="settings-label">Параметры</h3>
        <div class="settings-block">
          <button class="settings-row" type="button">
            <span class="settings-icon blue"><i class="ti ti-palette"></i></span>
            <span>Цвет темы<br><small>Синий</small></span>
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
      city = !city ? 'Ташкент' : city === 'Ташкент' ? 'Везде' : '';
      render();
    };
    view.querySelector('#setTag').onclick = () => {
      tag = tag ? '' : 'кофе';
      render();
    };
    view.querySelector('#createGroupBtn').onclick = () => {
      if (!name.trim()) return;
      navigate('groups');
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
      navigate('group-chat', group.id);
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
        <button data-action="me" aria-label="Профиль"><i class="ti ti-user"></i></button>
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
        <li><i class="ti ti-check"></i>${event.going} человек идут</li>
      </ul>
      <div class="event-avatars">
        ${Array.from({ length: 6 }, (_, index) => `<span style="--i:${index}"></span>`).join('')}
      </div>
      <div class="event-rsvp">
        <button type="button">В другой раз 😢</button>
        <button type="button">Интересно 👋</button>
        <button type="button" class="on">Иду 👍</button>
      </div>
    </article>`;
}
