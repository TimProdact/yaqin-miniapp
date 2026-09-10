import { esc } from '../dom.js';
import { reportPerson } from '../actions.js';

let closeOverlay = null;
let reportDraft = { person: null, reason: null, details: '' };

export function closeSafetyOverlay() {
  closeOverlay?.();
}

function mountOverlay(markup, className = 'safety-overlay') {
  closeSafetyOverlay();
  const overlay = document.createElement('div');
  overlay.className = className;
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
  return overlay;
}

export function showPersonMenu(person) {
  const firstName = esc(person.name.split(' ')[0]);
  mountOverlay(`
    <div class="safety-stack">
      <div class="action-sheet-group">
        <button data-action="report-flow" data-id="${person.id}">Пожаловаться · ${firstName}</button>
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
      <p class="confirm-copy">${firstName} не увидит ваш профиль и не сможет писать. Разблок — в настройках.</p>
      <button class="confirm-danger" data-action="block-user" data-id="${person.id}">Да, заблокировать</button>
      <button class="confirm-outline" data-action="close-sheet">Не надо</button>
    </div>`);
}

export function showBlockMeaning(person) {
  showBlockConfirm(person);
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

const REPORT_REASONS = [
  {
    id: 'fake',
    title: 'Фейк или чужие фото',
    text: 'Профиль выглядит поддельным'
  },
  {
    id: 'scam',
    title: 'Спам или деньги',
    text: 'Реклама, просьбы денег, ссылки'
  },
  {
    id: 'hate',
    title: 'Оскорбления / NSFW',
    text: 'Травля, ненависть или непристойный контент'
  }
];

export function showReportFlow(person) {
  reportDraft = { person, reason: null, details: '' };
  renderReportReasons();
}

function renderReportReasons() {
  const overlay = mountOverlay(`
    <div class="report-flow">
      <header class="modal-head">
        <button data-action="close-sheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Жалоба</h1>
        <span></span>
      </header>
      <h2>Что случилось?</h2>
      <div class="report-reasons">
        ${REPORT_REASONS.map(reason => `
          <button type="button" class="report-reason ${reportDraft.reason === reason.id ? 'on' : ''}" data-reason="${reason.id}">
            <strong>${esc(reason.title)}</strong>
            <span>${esc(reason.text)}</span>
          </button>`).join('')}
      </div>
      <textarea id="reportDetails" maxlength="200" placeholder="Коротко опишите (необязательно)">${esc(reportDraft.details)}</textarea>
      <button class="report-next ${reportDraft.reason ? 'on' : ''}" id="reportSubmit" ${reportDraft.reason ? '' : 'disabled'}>Отправить</button>
    </div>`, 'safety-overlay report-overlay');

  overlay.querySelectorAll('[data-reason]').forEach(button => {
    button.onclick = () => {
      reportDraft.reason = button.dataset.reason;
      renderReportReasons();
    };
  });
  overlay.querySelector('#reportDetails').oninput = event => {
    reportDraft.details = event.target.value;
  };
  overlay.querySelector('#reportSubmit').onclick = async () => {
    if (!reportDraft.reason) return;
    const sent = await reportPerson(reportDraft.person.id);
    if (sent) showReportSent(reportDraft.person);
  };
}
