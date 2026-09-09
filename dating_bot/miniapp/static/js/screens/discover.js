import { view, esc, setDiscoverHeader, clearHeader, showDiscoverLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { loadPeople, clearSkipped, saveFilters } from '../repository.js';
import { enableSwipe } from '../swipe.js';
import { decide } from '../actions.js';
import { people as demoPeople } from '../data.js';
import { getState } from '../state.js';
import { closeSafetyOverlay } from './safety.js';

let lastShown = [];

export function getPersonById(id) {
  const numericId = Number(id);
  return lastShown.find(person => person.id === numericId) || demoPeople.find(person => person.id === numericId);
}

function findPerson(id) {
  return getPersonById(id) || lastShown[0];
}

function renderEmptyState() {
  view.innerHTML = `
    <div class="discover-empty">
      <div class="empty-card">
        <div class="empty-badge"><i class="ti ti-users"></i></div>
        <h2>Вы посмотрели всех новых</h2>
        <p>Посмотрите анкеты, которые пропустили в прошлый раз!</p>
        <button class="empty-primary" data-action="show-skipped">Показать</button>
        <button class="empty-outline" data-action="filters">Изменить фильтры</button>
      </div>
    </div>`;
}

export async function peopleScreen(_id, token) {
  setDiscoverHeader('Ташкент');
  showDiscoverLoading();

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
    renderEmptyState();
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
  closeSafetyOverlay();
  const person = findPerson(id);
  if (!person) return showPlaceholder('✿', 'Анкета недоступна');

  const photos = person.photos?.length ? person.photos : [person.photo];
  const about = chipGroup('Чем увлекается', person.tags) + chipGroup('Хочет', person.looking);

  view.innerHTML = `
    <article class="person-view">
      <div class="person-hero" data-photos="${photos.length}">
        <img class="person-hero-photo" src="${esc(photos[0])}">
        <button class="hero-icon back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <button class="hero-icon more" data-action="person-menu" data-id="${person.id}" aria-label="Ещё"><i class="ti ti-dots"></i></button>
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

  dots.forEach((dot, dotIndex) => {
    dot.onclick = () => show(dotIndex);
  });
}

function distanceLabel(km) {
  if (km <= 5) return 'Рядом';
  if (km >= 45) return 'Далеко';
  return 'В городе';
}

export function filtersScreen() {
  clearHeader();
  const { filters } = getState();
  let ageMin = filters.ageMin;
  let ageMax = filters.ageMax;
  let distance = filters.distance;

  view.innerHTML = `
    <div class="filters-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Фильтры</h1>
        <span></span>
      </header>

      <section class="filter-block">
        <h2>Сколько им лет?</h2>
        <p class="filter-value">от <b id="ageMinLabel">${ageMin}</b> до <b id="ageMaxLabel">${ageMax}</b></p>
        <div class="dual-range" id="ageRange">
          <div class="range-track"><div class="range-fill" id="ageFill"></div></div>
          <input type="range" id="ageMin" min="18" max="55" value="${ageMin}">
          <input type="range" id="ageMax" min="18" max="55" value="${ageMax}">
        </div>
      </section>

      <section class="filter-block">
        <h2>Как далеко?</h2>
        <p class="filter-value" id="distanceLabel">${distanceLabel(distance)}</p>
        <div class="single-range">
          <input type="range" id="distance" min="1" max="50" value="${distance}">
          <div class="range-ends"><span>1 км</span><span>50+ км</span></div>
        </div>
      </section>

      <button class="filters-save" data-action="save-filters">Сохранить</button>
    </div>`;

  const minInput = view.querySelector('#ageMin');
  const maxInput = view.querySelector('#ageMax');
  const fill = view.querySelector('#ageFill');
  const distInput = view.querySelector('#distance');

  const syncAge = () => {
    ageMin = Math.min(Number(minInput.value), Number(maxInput.value) - 1);
    ageMax = Math.max(Number(maxInput.value), ageMin + 1);
    minInput.value = ageMin;
    maxInput.value = ageMax;
    view.querySelector('#ageMinLabel').textContent = ageMin;
    view.querySelector('#ageMaxLabel').textContent = ageMax;
    const left = ((ageMin - 18) / (55 - 18)) * 100;
    const right = ((ageMax - 18) / (55 - 18)) * 100;
    fill.style.left = `${left}%`;
    fill.style.width = `${right - left}%`;
  };

  const syncDistance = () => {
    distance = Number(distInput.value);
    view.querySelector('#distanceLabel').textContent = distanceLabel(distance);
  };

  minInput.oninput = syncAge;
  maxInput.oninput = syncAge;
  distInput.oninput = syncDistance;
  syncAge();
  syncDistance();

  view.querySelector('[data-action="save-filters"]').onclick = () => {
    saveFilters({ ageMin, ageMax, distance });
    navigate('people');
  };
}

export function connectedScreen(id) {
  clearHeader();
  const person = findPerson(id);
  if (!person) return showPlaceholder('✿', 'Анкета недоступна');

  const firstName = person.name.split(' ')[0];
  const withName = firstName.replace(/а$/i, 'ой').replace(/я$/i, 'ей');

  view.innerHTML = `
    <div class="connected-page">
      <button class="connected-back" data-action="people" aria-label="Закрыть"><i class="ti ti-refresh"></i></button>
      <h1>Вы познакомились<br>с ${esc(withName)}</h1>
      <div class="connected-photo" data-action="chat" data-id="0">
        <img src="${esc(person.photo)}">
        <div class="connected-wave"><i class="ti ti-hand-stop"></i></div>
      </div>
    </div>`;
}

export function showSkippedPeople() {
  clearSkipped();
  navigate('people');
}
