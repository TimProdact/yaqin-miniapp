import { esc, view } from '../dom.js';

let closeOverlay = null;

export function closeSafetyOverlay() {
  closeOverlay?.();
}

function mountOverlay(markup) {
  closeSafetyOverlay();
  const overlay = document.createElement('div');
  overlay.className = 'safety-overlay';
  overlay.innerHTML = markup;
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeSafetyOverlay();
  });
  document.body.appendChild(overlay);
  document.body.classList.add('safety-open');
  closeOverlay = () => {
    overlay.remove();
    document.body.classList.remove('safety-open');
    closeOverlay = null;
  };
}

export function showPersonMenu(person) {
  const firstName = esc(person.name.split(' ')[0]);
  mountOverlay(`
    <div class="safety-stack">
      <div class="action-sheet-group">
        <button data-action="report-user" data-id="${person.id}">Пожаловаться · ${firstName}</button>
        <button data-action="block-confirm" data-id="${person.id}">Заблокировать · ${firstName}</button>
      </div>
      <button class="action-sheet-cancel" data-action="close-sheet">Отмена</button>
    </div>`);
}

export function showBlockConfirm(person) {
  const firstName = esc(person.name.split(' ')[0]);
  mountOverlay(`
    <div class="confirm-sheet">
      <div class="confirm-handle"></div>
      <div class="confirm-icon"><i class="ti ti-alert-circle"></i></div>
      <h2>Заблокировать ${firstName}?</h2>
      <button class="confirm-link" type="button">Что это значит?</button>
      <button class="confirm-danger" data-action="block-user" data-id="${person.id}">Да, заблокировать</button>
      <button class="confirm-outline" data-action="close-sheet">Не надо</button>
    </div>`);
}

export function showReportSent(person) {
  mountOverlay(`
    <div class="report-sheet">
      <button class="report-close" data-action="close-sheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
      <div class="report-icon"><i class="ti ti-check"></i></div>
      <h2>Жалоба принята</h2>
      <p><strong>Что дальше?</strong> Мы проверим жалобу и при необходимости примем меры. Правила сообщества можно посмотреть в настройках.</p>
      <h3>Дополнительно</h3>
      <button class="confirm-danger" data-action="block-confirm" data-id="${person.id}">Заблокировать</button>
      <button class="confirm-outline" data-action="close-sheet">Пока всё</button>
    </div>`);
}
