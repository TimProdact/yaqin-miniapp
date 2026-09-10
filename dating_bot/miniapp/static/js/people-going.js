/** Универсальный блок «Кто идёт» / «Хотят пойти»: превью → sheet по тапу. */
import { esc } from './dom.js';
import { navigate } from './router.js';

const PREVIEW_LIMIT = 8;

let closeSheet = null;

export function closePeopleGoingSheet() {
  closeSheet?.();
}

function personLabel(person) {
  const bits = [person.name];
  if (person.age) bits[0] = `${person.name}, ${person.age}`;
  if (person.id === 'me') bits.push('вы');
  if (person.demo) bits.push('демо');
  return bits.join(' · ');
}

function tileHtml(person) {
  return `
    <div class="people-going-tile">
      <img src="${esc(person.photo)}" alt="">
      <span>${esc(person.name || '')}</span>
    </div>`;
}

function rowHtml(person) {
  const isMe = person.id === 'me';
  const attrs = isMe ? '' : `data-action="person" data-id="${esc(String(person.id))}"`;
  return `
    <${isMe ? 'div' : 'button type="button"'} class="people-going-row ${isMe ? 'me' : ''}" ${attrs}>
      <img src="${esc(person.photo)}" alt="">
      <div class="people-going-row-copy">
        <strong>${esc(personLabel(person))}</strong>
        ${person.message ? `<small>${esc(person.message)}</small>` : ''}
      </div>
      ${isMe ? '' : '<i class="ti ti-chevron-right"></i>'}
    </${isMe ? 'div' : 'button'}>`;
}

/** Превью-карточка (горизонтальный ряд). `key` — для нескольких блоков на экране. */
export function peopleGoingBlockHtml(people = [], {
  title = 'Кто идёт',
  empty = 'Пока никого',
  previewLimit = PREVIEW_LIMIT,
  key = 'default'
} = {}) {
  const list = Array.isArray(people) ? people : [];
  const count = list.length;
  const preview = list.slice(0, previewLimit);
  const keyAttr = esc(String(key));

  if (!count) {
    return `
      <section class="people-going-block is-empty" aria-label="${esc(title)}" data-people-going-key="${keyAttr}">
        <div class="people-going-head">
          <h3>${esc(title)}</h3>
          <span>0</span>
        </div>
        <p class="people-going-empty">${esc(empty)}</p>
      </section>`;
  }

  return `
    <button type="button" class="people-going-block" data-people-going-open="${keyAttr}" aria-label="${esc(title)}, ${count}">
      <div class="people-going-head">
        <h3>${esc(title)}</h3>
        <span>${count} <i class="ti ti-chevron-right"></i></span>
      </div>
      <div class="people-going-rail" aria-hidden="true">
        ${preview.map(tileHtml).join('')}
        ${count > previewLimit ? `<div class="people-going-more">+${count - previewLimit}</div>` : ''}
      </div>
    </button>`;
}

export function showPeopleGoingSheet(people = [], { title = 'Кто идёт' } = {}) {
  closePeopleGoingSheet();
  const list = Array.isArray(people) ? people : [];
  const overlay = document.createElement('div');
  overlay.className = 'people-going-overlay';
  overlay.innerHTML = `
    <div class="people-going-sheet" role="dialog" aria-label="${esc(title)}">
      <div class="people-going-sheet-handle"></div>
      <header class="people-going-sheet-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="people-going-sheet-close" aria-label="Закрыть"><i class="ti ti-x"></i></button>
      </header>
      <div class="people-going-sheet-list">
        ${list.length
          ? list.map(rowHtml).join('')
          : '<p class="people-going-empty">Пока никого</p>'}
      </div>
    </div>`;

  const dismiss = () => {
    overlay.remove();
    document.body.classList.remove('people-going-open');
    closeSheet = null;
  };
  closeSheet = dismiss;

  overlay.addEventListener('click', event => {
    if (event.target === overlay) dismiss();
  });
  overlay.querySelector('.people-going-sheet-close')?.addEventListener('click', dismiss);
  overlay.querySelectorAll('[data-action="person"]').forEach(button => {
    button.addEventListener('click', () => {
      dismiss();
      navigate('person', button.dataset.id);
    });
  });

  document.body.appendChild(overlay);
  document.body.classList.add('people-going-open');
}

/** Навесить открытие sheet на блок с данным key (по умолчанию — первый / default). */
export function bindPeopleGoingBlock(root, people, options = {}) {
  const key = String(options.key || 'default');
  root?.querySelector(`[data-people-going-open="${key}"]`)?.addEventListener('click', () => {
    showPeopleGoingSheet(people, options);
  });
}
