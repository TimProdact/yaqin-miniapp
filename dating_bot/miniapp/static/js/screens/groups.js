import { groups, events } from '../data.js';
import { view, esc, setTitle, setBackTitle } from '../dom.js';

export function groupsScreen() {
  setTitle('Группы');
  view.innerHTML = `
    <div class="screen-content">
      <div class="section-head">
        <h2>Найдите своих</h2>
        <button data-action="filters">Фильтры</button>
      </div>
      <div class="group-grid">
        ${groups.map((group, index) => `
          <div class="group-card" data-action="group" data-id="${index}">
            <img src="${esc(group.photo)}">
            <b>${esc(group.title)}</b>
            <span>${esc(group.subtitle)}</span>
            <button>Вступить</button>
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
      <button class="button">Вступить в группу</button>
      <h2>О группе</h2>
      <p>Знакомьтесь, делитесь интересами и находите новых подруг.</p>
    </div>`;
}

export function eventsScreen() {
  setBackTitle('Мои события');
  view.innerHTML = `
    <div class="screen-content">
      <h1>Мои события</h1>
      ${events.map(event => `
        <div class="event-row">
          <b>${esc(event.title)}</b>
          <span>${esc(event.when)} · ${esc(event.friends)}</span>
        </div>`).join('')}
    </div>`;
}
