import { view, esc, setDiscoverHeader, setBackTitle, chipList, showLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender } from '../router.js';
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

  enableSwipe(decide);
}

export function personScreen(id) {
  const person = findPerson(id);
  if (!person) return showPlaceholder('✿', 'Анкета недоступна');

  setBackTitle(person.name);
  view.innerHTML = `
    <div class="full-person">
      <img src="${esc(person.photo)}">
      <div>
        <h1>${esc(person.name)}, ${person.age}</h1>
        <p>${esc(person.city)}</p>
        <p>${esc(person.bio)}</p>
        <div class="big-chips">${chipList(person.tags)}</div>
      </div>
      <button class="button" data-action="like" data-id="${person.id}">Передать привет</button>
    </div>`;
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
