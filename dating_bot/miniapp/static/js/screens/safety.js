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
  const overlay = mountOverlay(`
    <div class="confirm-sheet">
      <div class="confirm-handle"></div>
      <div class="confirm-icon"><i class="ti ti-alert-circle"></i></div>
      <h2>Заблокировать ${firstName}?</h2>
      <button class="confirm-link" type="button" id="blockMeaning">Что это значит?</button>
      <button class="confirm-danger" data-action="block-user" data-id="${person.id}">Да, заблокировать</button>
      <button class="confirm-outline" data-action="close-sheet">Не надо</button>
    </div>`);
  overlay.querySelector('#blockMeaning').onclick = () => showBlockMeaning(person);
}

export function showBlockMeaning(person) {
  const firstName = esc(person.name.split(' ')[0]);
  mountOverlay(`
    <div class="confirm-sheet">
      <div class="confirm-handle"></div>
      <div class="confirm-icon soft"><i class="ti ti-eye-off"></i></div>
      <h2>Что значит блок</h2>
      <p class="confirm-copy">${firstName} не увидит ваш профиль и не сможет писать вам. Вы тоже перестанете видеть её анкету. Разблокировать можно в настройках.</p>
      <button class="confirm-danger" data-action="block-user" data-id="${person.id}">Да, заблокировать</button>
      <button class="confirm-outline" data-action="block-confirm" data-id="${person.id}">Назад</button>
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

const REPORT_REASONS = [
  {
    id: 'fake',
    title: 'Это не тот человек',
    text: 'Фейковый профиль, чужие фото, сильная обработка или генерация ИИ'
  },
  {
    id: 'illegal',
    title: 'Продают что-то недопустимое',
    text: 'Предлагают незаконные или опасные товары и услуги'
  },
  {
    id: 'scam',
    title: 'Просят деньги или рекламируют',
    text: 'Пытаются получить деньги или что-то ценное'
  },
  {
    id: 'hate',
    title: 'Оскорбления или ненависть',
    text: 'Фото, видео или текст, которые травят человека или группу'
  },
  {
    id: 'nsfw',
    title: 'Непристойный контент',
    text: 'Откровенные фото, видео или сообщения'
  },
  {
    id: 'violence',
    title: 'Насилие или жестокость',
    text: 'Жестокие или пугающие материалы'
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
      <h2>Почему вы жалуетесь?</h2>
      <p class="report-section">ПОВЕДЕНИЕ В YAQIN</p>
      <div class="report-reasons">
        ${REPORT_REASONS.map(reason => `
          <button type="button" class="report-reason ${reportDraft.reason === reason.id ? 'on' : ''}" data-reason="${reason.id}">
            <strong>${esc(reason.title)}</strong>
            <span>${esc(reason.text)}</span>
          </button>`).join('')}
      </div>
      <button class="report-next ${reportDraft.reason ? 'on' : ''}" id="reportNext" ${reportDraft.reason ? '' : 'disabled'}>Далее</button>
    </div>`, 'safety-overlay report-overlay');

  overlay.querySelectorAll('[data-reason]').forEach(button => {
    button.onclick = () => {
      reportDraft.reason = button.dataset.reason;
      renderReportReasons();
    };
  });
  overlay.querySelector('#reportNext').onclick = () => {
    if (!reportDraft.reason) return;
    renderReportDetails();
  };
}

function renderReportDetails() {
  const reason = REPORT_REASONS.find(item => item.id === reportDraft.reason);
  const overlay = mountOverlay(`
    <div class="report-flow">
      <header class="modal-head">
        <button type="button" id="reportBack" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Жалоба</h1>
        <span></span>
      </header>
      <h2>Почему вы жалуетесь?</h2>
      <div class="report-reason on static">
        <strong>${esc(reason.title)}</strong>
        <span>${esc(reason.text)}</span>
      </div>
      <textarea id="reportDetails" maxlength="300" placeholder="Опишите причину. Это увидит только команда Yaqin.">${esc(reportDraft.details)}</textarea>
      <p class="report-count"><span id="reportCount">${reportDraft.details.length}</span>/300</p>
      <button class="report-next" id="reportSubmit" disabled>Отправить жалобу</button>
    </div>`, 'safety-overlay report-overlay');

  const area = overlay.querySelector('#reportDetails');
  const submit = overlay.querySelector('#reportSubmit');
  const count = overlay.querySelector('#reportCount');
  const sync = () => {
    reportDraft.details = area.value;
    count.textContent = area.value.length;
    submit.disabled = area.value.trim().length < 3;
    submit.classList.toggle('on', !submit.disabled);
  };
  area.oninput = sync;
  sync();
  area.focus();

  overlay.querySelector('#reportBack').onclick = () => renderReportReasons();
  submit.onclick = async () => {
    if (submit.disabled) return;
    const sent = await reportPerson(reportDraft.person.id);
    if (sent) showReportSent(reportDraft.person);
  };
}
