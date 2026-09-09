import { groups, events } from '../data.js';
import { view, esc, setTitle, setBackTitle } from '../dom.js';

export function groupsScreen() {
  setTitle('Groups');
  view.innerHTML = `
    <div class="screen-content">
      <div class="section-head">
        <h2>Find your people</h2>
        <button data-action="filters">Filters</button>
      </div>
      <div class="group-grid">
        ${groups.map((group, index) => `
          <div class="group-card" data-action="group" data-id="${index}">
            <img src="${esc(group.photo)}">
            <b>${esc(group.title)}</b>
            <span>${esc(group.subtitle)}</span>
            <button>Join</button>
          </div>`).join('')}
      </div>
    </div>`;
}

export function groupScreen(id) {
  const group = groups[Number(id) || 0];
  setBackTitle(group.title);
  view.innerHTML = `
    <div class="detail-page">
      <img src="${esc(group.photo)}">
      <h1>${esc(group.title)}</h1>
      <p>${esc(group.subtitle)}</p>
      <button class="button">Join group</button>
      <h2>About this group</h2>
      <p>Meet people, share interests and find new friends.</p>
    </div>`;
}

export function eventsScreen() {
  setBackTitle('My events');
  view.innerHTML = `
    <div class="screen-content">
      <h1>My Events</h1>
      ${events.map(event => `
        <div class="event-row">
          <b>${esc(event.title)}</b>
          <span>${esc(event.when)} · ${esc(event.friends)}</span>
        </div>`).join('')}
    </div>`;
}
