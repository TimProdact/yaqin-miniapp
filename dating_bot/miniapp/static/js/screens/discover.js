import { view, esc, setDiscoverHeader, setBackTitle, chipList, showLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { loadPeople } from '../repository.js';
import { enableSwipe } from '../swipe.js';
import { decide } from '../actions.js';

let lastShown = [];

function findPerson(id) {
  return lastShown.find(person => person.id === Number(id)) || lastShown[0];
}

export async function peopleScreen(_id, token) {
  setDiscoverHeader('Ташкент');
  showLoading('Ищем людей рядом...');

  let candidates;
  try {
    candidates = await loadPeople();
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить анкеты.');
    return;
  }
  if (!isCurrentRender(token)) return;

  lastShown = candidates;
  if (!candidates.length) {
    showPlaceholder('✿', 'Пока никого рядом', 'Новые анкеты появятся после проверки модератором.');
    return;
  }

  const person = candidates[0];
  view.innerHTML = `
    <div class="swipe-stage">
      <div class="next-edge"></div>
      <div class="profile-card" data-id="${person.id}">
        <img src="${esc(person.photo)}">
        <div class="scrim-top"></div>
        <div class="scrim-bottom"></div>
        <div class="card-top">
          <h2>${esc(person.name)}</h2>
          <p>${person.age} • ${esc(person.city)}</p>
          <span class="say-hi"><i class="ti ti-hand-stop"></i>Передаёт привет!</span>
        </div>
        <button class="decision like" data-action="like" data-id="${person.id}" aria-label="Передать привет">
          <i class="ti ti-hand-stop"></i>
        </button>
        <div class="card-bottom">
          <p class="card-bio">${esc(person.bio)}</p>
          <div class="chips">${person.tags.map(tag => `<span class="chip">${esc(tag)}</span>`).join('')}</div>
        </div>
      </div>
    </div>`;

  enableSwipe(decide, { onTap: id => navigate('person', Number(id)) });
}

function chipGroup(label, items) {
  if (!items?.length) return '';
  return `
    <div class="chip-group">
      <h4>${esc(label)}</h4>
      <div class="chips-wrap">${items.map(item => `<span class="chip">${esc(item)}</span>`).join('')}</div>
    </div>`;
}

export function personScreen(id) {
  const person = findPerson(id);
  if (!person) return showPlaceholder('✿', 'Анкета недоступна');

  const photos = person.photos?.length ? person.photos : [person.photo];
  const about = chipGroup('Чем увлекается', person.tags) + chipGroup('Хочет', person.looking);

  view.innerHTML = `
    <article class="person-view">
      <div class="person-hero" data-photos="${photos.length}">
        <img class="person-hero-photo" src="${esc(photos[0])}">
        <button class="hero-icon back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <button class="hero-icon more" data-action="report" data-id="${person.id}" aria-label="Ещё"><i class="ti ti-dots"></i></button>
        <div class="hero-dots">${photos.map((_, index) => `<span class="${index ? '' : 'on'}" data-index="${index}"></span>`).join('')}</div>
      </div>

      <section class="person-head">
        <h1>${esc(person.name)}</h1>
        <p class="person-meta">${person.age} • ${esc(person.city)}</p>
        <p class="person-bio">${esc(person.bio)}</p>
        <button class="hero-wave" data-action="like" data-id="${person.id}" aria-label="Передать привет">
          <i class="ti ti-hand-stop"></i>
        </button>
      </section>

      ${about ? `<h3 class="person-section">Обо мне</h3><section class="person-card">${about}</section>` : ''}

      ${person.groups?.length ? `
        <h3 class="person-section">Группы</h3>
        <div class="group-rail">
          ${person.groups.map(group => `
            <div class="group-tile">
              <img src="${esc(group.photo)}">
              <span>${esc(group.title)}</span>
            </div>`).join('')}
        </div>` : ''}

      ${person.basic?.length ? `
        <h3 class="person-section">Основное</h3>
        <section class="person-card info-list">
          ${person.basic.map(item => `
            <div class="info-row">
              <h4>${esc(item.label)}</h4>
              <span class="chip">${esc(item.value)}</span>
            </div>`).join('')}
        </section>` : ''}
    </article>`;

  bindPersonHero(photos);
}

function bindPersonHero(photos) {
  const hero = view.querySelector('.person-hero');
  const image = view.querySelector('.person-hero-photo');
  const dots = [...view.querySelectorAll('.hero-dots span')];
  if (!hero || !image || photos.length < 2) return;

  let index = 0;
  let startX = null;

  const show = next => {
    index = (next + photos.length) % photos.length;
    image.src = photos[index];
    dots.forEach((dot, dotIndex) => dot.classList.toggle('on', dotIndex === index));
  };

  hero.onpointerdown = event => {
    if (event.target.closest('[data-action]')) return;
    startX = event.clientX;
    hero.setPointerCapture(event.pointerId);
  };
  hero.onpointerup = event => {
    if (startX === null) return;
    const delta = event.clientX - startX;
    startX = null;
    if (Math.abs(delta) < 40) return;
    show(index + (delta < 0 ? 1 : -1));
  };
  hero.onpointercancel = () => {
    startX = null;
  };
}

export function filtersScreen() {
  setBackTitle('Фильтры');
  view.innerHTML = `
    <div class="screen-content filter-screen">
      <h2>Город</h2>
      <button class="filter-select">Ташкент <i class="ti ti-chevron-down"></i></button>
      <h2>Возраст</h2>
      <div class="range-values"><b>18</b><b>45</b></div>
      <input type="range" min="18" max="45" value="32">
      <h2>Интересы</h2>
      <div class="big-chips">${chipList(['кофе', 'бег', 'йога', 'книги', 'путешествия'])}</div>
      <button class="button" data-action="people">Применить</button>
    </div>`;
}

export function connectedScreen(id) {
  const person = findPerson(id);
  if (!person) return showPlaceholder('✿', 'Анкета недоступна');

  view.innerHTML = `
    <div class="connected-page">
      <button class="connected-back" data-action="people">←</button>
      <h1>Вы познакомились<br>с ${esc(person.name.split(' ')[0])}</h1>
      <div class="connected-photo" data-action="chat" data-id="0">
        <img src="${esc(person.photo)}">
        <div class="connected-wave">👋</div>
      </div>
    </div>`;
}
