import { people } from '../data.js';
import { getState } from '../state.js';
import { view, esc, setTitle, setBackTitle, chipList } from '../dom.js';
import { enableSwipe } from '../swipe.js';
import { decide } from '../actions.js';

function findPerson(id) {
  return people.find(person => person.id === Number(id)) || people[0];
}

export function peopleScreen() {
  const state = getState();
  const hidden = [...state.blocked, ...state.skipped];
  const person = people.find(candidate => !hidden.includes(candidate.id)) || people[0];

  setTitle('Los Angeles, CA');
  view.innerHTML = `
    <div class="swipe-stage">
      <div class="next-edge"></div>
      <div class="profile-card" data-id="${person.id}">
        <img src="${esc(person.photo)}">
        <div class="scrim"></div>
        <div class="caption">
          <h2>${esc(person.name)}</h2>
          <p>${person.age} • ${esc(person.city)}</p>
          <span class="say-hi">👋 Says hi!</span>
          <p>${esc(person.bio)}</p>
          <div class="chips">${person.tags.map(tag => `<span class="chip">${esc(tag)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="decision-row">
        <button class="decision like" data-action="like" data-id="${person.id}">👋</button>
      </div>
    </div>`;

  enableSwipe(decide);
}

export function personScreen(id) {
  const person = findPerson(id);
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
      <button class="button" data-action="like" data-id="${person.id}">Send a hi</button>
    </div>`;
}

export function filtersScreen() {
  setBackTitle('Filters');
  view.innerHTML = `
    <div class="screen-content filter-screen">
      <h2>Location</h2>
      <button class="filter-select">Los Angeles, CA <i class="ti ti-chevron-down"></i></button>
      <h2>Age range</h2>
      <div class="range-values"><b>18</b><b>45</b></div>
      <input type="range" min="18" max="45" value="32">
      <h2>Interests</h2>
      <div class="big-chips">${chipList(['Coffee', 'Running', 'Yoga', 'Writing', 'Travel'])}</div>
      <button class="button" data-action="people">Apply filters</button>
    </div>`;
}

export function connectedScreen(id) {
  const person = findPerson(id);
  view.innerHTML = `
    <div class="connected-page">
      <button class="connected-back" data-action="people">←</button>
      <h1>You're connected<br>with ${esc(person.name.split(' ')[0])}</h1>
      <div class="connected-photo" data-action="chat" data-id="0">
        <img src="${esc(person.photo)}">
        <div class="connected-wave">👋</div>
      </div>
    </div>`;
}
