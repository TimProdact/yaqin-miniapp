import { view, esc, setDiscoverHeader, clearHeader, showDiscoverLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { loadPeople, clearSkipped, saveFilters } from '../repository.js';
import { enableSwipe } from '../swipe.js';
import { decide } from '../actions.js';
import { people as demoPeople } from '../data.js';
import { getState } from '../state.js';
import { closeSafetyOverlay } from './safety.js';
import { chatIndexForPerson, hasIncomingWave, isMatched } from '../match.js';
import {
  INTEREST_OPTIONS,
  interestsOf,
  lookingOf,
  basicRowsFromProfile
} from '../profile-fields.js';

let lastShown = [];

export function getPersonById(id) {
  const numericId = Number(id);
  return lastShown.find(person => person.id === numericId) || demoPeople.find(person => person.id === numericId);
}

function findPerson(id) {
  return getPersonById(id) || lastShown[0];
}

function renderEmptyState(kind = 'exhausted') {
  const isFilters = kind === 'filters';
  view.innerHTML = `
    <div class="discover-empty">
      <div class="empty-card">
        <div class="empty-badge"><i class="ti ti-users"></i></div>
        <h2>${isFilters ? 'Никого не нашлось' : 'Вы посмотрели всех новых'}</h2>
        <p>${isFilters
          ? 'Расширьте возраст, расстояние или интересы.'
          : 'Посмотрите пропущенных или измените фильтры.'}</p>
        <button class="empty-primary" data-action="${isFilters ? 'filters' : 'show-skipped'}">
          ${isFilters ? 'Изменить фильтры' : 'Показать пропущенных'}
        </button>
      </div>
    </div>`;
}

function cardMarkup(person) {
  const waved = hasIncomingWave(person.id);
  return `
    <div class="profile-card" data-id="${person.id}">
      <img src="${esc(person.photo)}" alt="">
      <div class="scrim-top"></div>
      <div class="scrim-bottom"></div>
      <div class="card-top">
        <h2>${esc(person.name)}</h2>
        <p>${person.age} • ${esc(person.city)}</p>
        ${waved ? '<span class="say-hi"><i class="ti ti-hand-stop"></i>Передаёт привет!</span>' : ''}
      </div>
      <div class="card-bottom">
        <div class="card-bottom-copy">
          <p class="card-bio">${esc(person.bio)}</p>
          <div class="chips">${interestsOf(person).map(tag => `<span class="chip">${esc(tag)}</span>`).join('')}</div>
        </div>
        <button class="decision like" data-action="like" data-id="${person.id}" aria-label="${waved ? 'Ответить приветом' : 'Передать привет'}">
          <i class="ti ti-hand-stop"></i>
        </button>
      </div>
    </div>`;
}

function fitCardChips(root = view) {
  root.querySelectorAll('.profile-card .chips').forEach(row => {
    const chips = [...row.querySelectorAll('.chip')];
    chips.forEach(chip => {
      chip.hidden = false;
      chip.style.display = '';
    });
    const max = row.clientWidth;
    if (!max) return;
    let used = 0;
    const gap = 9;
    chips.forEach(chip => {
      const need = chip.offsetWidth + (used > 0 ? gap : 0);
      if (used + need > max) {
        chip.style.display = 'none';
        return;
      }
      used += need;
    });
  });
}

export async function peopleScreen(_id, token) {
  setDiscoverHeader(getState().filters?.city || 'Ташкент');
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
    const { filters } = getState();
    const tight =
      filters.ageMin > 18 ||
      filters.ageMax < 40 ||
      (filters.distance || 50) < 50 ||
      (filters.interests || []).length > 0 ||
      (filters.city && filters.city !== 'Ташкент' && filters.city !== 'Все');
    renderEmptyState(tight ? 'filters' : 'exhausted');
    return;
  }

  view.innerHTML = `
    <div class="swipe-stage" role="feed" aria-label="Анкеты">
      ${candidates.map((person, index) => `
        <article class="profile-card-slot ${index < candidates.length - 1 ? 'has-peek' : ''}" data-index="${index}">
          ${cardMarkup(person)}
        </article>
      `).join('')}
      <article class="profile-card-slot discover-end-slot" data-end="1">
        <div class="discover-empty inline">
          <div class="empty-card">
            <div class="empty-badge"><i class="ti ti-mood-empty"></i></div>
            <h2>Анкеты закончились</h2>
            <p>Вы долистали до конца. Посмотрите пропущенных или измените фильтры.</p>
            <button class="empty-primary" data-action="show-skipped">Показать пропущенных</button>
          </div>
        </div>
      </article>
    </div>`;

  enableSwipe(decide, { onTap: id => navigate('person', Number(id)) });
  requestAnimationFrame(() => fitCardChips());
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
  const interests = interestsOf(person);
  const looking = lookingOf(person);
  const about =
    chipGroup('Интересы', interests) +
    chipGroup('Хочет', looking);
  const basic = basicRowsFromProfile(person);

  const waved = hasIncomingWave(person.id);
  const matched = isMatched(person.id);

  view.innerHTML = `
    <article class="person-view">
      <div class="person-hero" data-photos="${photos.length}">
        <img class="person-hero-photo" src="${esc(photos[0])}">
        ${hasTelegramBack() ? '' : '<button class="hero-icon back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>'}
        ${waved && !matched ? '<span class="person-say-hi"><i class="ti ti-hand-stop"></i>Передаёт привет</span>' : ''}
        <div class="hero-dots">${photos.map((_, index) => `<span class="${index ? '' : 'on'}" data-index="${index}"></span>`).join('')}</div>
      </div>

      <section class="person-head">
        <div class="person-head-row">
          <div class="person-head-copy">
            <h1>${esc(person.name)}</h1>
            <p class="person-meta">${person.age} • ${esc(person.city)}</p>
          </div>
          <button class="hero-wave" type="button" id="personWave" aria-label="${matched ? 'Открыть чат' : waved ? 'Ответить приветом' : 'Передать привет'}">
            <i class="ti ti-hand-stop"></i>
          </button>
        </div>
        <p class="person-bio">${esc(person.bio)}</p>
      </section>

      ${about ? `
        <section class="person-card">
          <h3 class="person-card-title">Обо мне</h3>
          ${about}
        </section>` : ''}

      ${basic.length ? `
        <section class="person-card info-list">
          <h3 class="person-card-title">Основное</h3>
          ${basic.map(item => `
            <div class="info-row">
              <h4>${esc(item.label)}</h4>
              <span class="chip">${esc(item.value)}</span>
            </div>`).join('')}
        </section>` : ''}

      <div class="person-actions">
        <button class="person-safety" type="button" data-action="report-flow" data-id="${person.id}">Пожаловаться · ${esc(person.name.split(' ')[0])}</button>
        <button class="person-safety" type="button" data-action="block-confirm" data-id="${person.id}">Заблокировать · ${esc(person.name.split(' ')[0])}</button>
      </div>
    </article>`;

  bindPersonHero(photos);
  view.querySelector('#personWave')?.addEventListener('click', () => decide('like', person.id));
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

function distanceValueHtml(km) {
  const max = Number(km) >= 50 ? '50+' : String(km);
  return `от <b>1</b> до <b>${esc(max)}</b> км`;
}

const FILTER_INTERESTS = INTEREST_OPTIONS;

export function filtersScreen() {
  clearHeader();
  const { filters } = getState();
  let ageMin = filters.ageMin;
  let ageMax = filters.ageMax;
  let distance = filters.distance;
  let interests = new Set(filters.interests || []);

  const render = () => {
    view.innerHTML = `
      <div class="filters-page">
        <header class="filters-head">
          ${backControlHtml('back')}
          <h1>Фильтры</h1>
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
          <p class="filter-value" id="distanceLabel">${distanceValueHtml(distance)}</p>
          <div class="range-slider" id="distanceRange">
            <div class="range-track"><div class="range-fill" id="distFill"></div></div>
            <input type="range" id="distance" min="1" max="50" value="${distance}">
          </div>
        </section>

        <section class="filter-block">
          <h2>Интересы</h2>
          ${interests.size ? `<p class="filter-value">выбрано <b>${interests.size}</b></p>` : ''}
          <div class="filter-interests">
            ${FILTER_INTERESTS.map(item => `
              <button type="button" class="filter-chip ${interests.has(item) ? 'on' : ''}" data-interest="${esc(item)}">${esc(item)}</button>`).join('')}
          </div>
        </section>

        <button class="filters-save" type="button" id="saveFilters">Сохранить</button>
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
      const label = view.querySelector('#distanceLabel');
      if (label) label.innerHTML = distanceValueHtml(distance);
      const distFill = view.querySelector('#distFill');
      if (distFill) {
        const pct = ((distance - 1) / (50 - 1)) * 100;
        distFill.style.left = '0';
        distFill.style.width = `${pct}%`;
      }
    };

    minInput.oninput = syncAge;
    maxInput.oninput = syncAge;
    distInput.oninput = syncDistance;
    syncAge();
    syncDistance();

    view.querySelectorAll('[data-interest]').forEach(button => {
      button.onclick = () => {
        const value = button.dataset.interest;
        if (interests.has(value)) interests.delete(value);
        else interests.add(value);
        render();
      };
    });

    view.querySelector('#saveFilters').onclick = () => {
      saveFilters({ ageMin, ageMax, distance, interests: [...interests] });
      navigate('people');
    };
  };

  render();
}

const CITIES = ['Ташкент', 'Самарканд', 'Бухара', 'Наманган', 'Андижан', 'Все'];

export function cityScreen() {
  clearHeader();
  const current = getState().filters?.city || 'Ташкент';

  view.innerHTML = `
    <div class="filters-page city-page">
      <header class="filters-head">
        ${backControlHtml('back')}
        <h1>Город</h1>
        <span></span>
      </header>
      <p class="city-lead">Показывать анкеты из города</p>
      <div class="city-list">
        ${CITIES.map(city => `
          <button type="button" class="city-row ${current === city ? 'on' : ''}" data-city="${esc(city)}">
            <span>${esc(city === 'Все' ? 'Все города' : city)}</span>
            ${current === city ? '<i class="ti ti-check"></i>' : ''}
          </button>`).join('')}
      </div>
    </div>`;

  view.querySelectorAll('[data-city]').forEach(button => {
    button.onclick = () => {
      saveFilters({ city: button.dataset.city });
      navigate('people');
    };
  });
}

export function connectedScreen(id) {
  clearHeader();
  const person = findPerson(id);
  if (!person) return showPlaceholder('✿', 'Анкета недоступна');

  const firstName = person.name.split(' ')[0];
  const withName = firstName.replace(/а$/i, 'ой').replace(/я$/i, 'ей');
  const chatIndex = chatIndexForPerson(person.id);

  view.innerHTML = `
    <div class="connected-page">
      ${hasTelegramBack() ? '' : '<button class="connected-back" data-action="people" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>'}
      <div class="connected-burst" aria-hidden="true"></div>
      <h1>Вы познакомились<br>с ${esc(withName)}</h1>
      <div class="connected-photo" data-action="chat" data-id="${chatIndex}">
        <img src="${esc(person.photo)}">
        <div class="connected-wave"><i class="ti ti-hand-stop"></i></div>
      </div>
      <button class="connected-cta" type="button" data-action="chat" data-id="${chatIndex}">Написать ${esc(firstName)}</button>
      <button class="connected-share" type="button" id="shareMatch">Пригласить подруг в Yaqin</button>
    </div>`;

  view.querySelector('#shareMatch')?.addEventListener('click', () => {
    const text = 'Присоединяйся в Yaqin — сообщество девушек в Ташкенте ✨';
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/yaqin_bot')}&text=${encodeURIComponent(text)}`);
        return;
      }
    } catch (_) { /* ignore */ }
    navigator.share?.({ text }).catch(() => {});
  });
}

export function showSkippedPeople() {
  clearSkipped();
  navigate('people');
}
