import { defaultProfile, promptPhoto, people, PHOTOS } from '../data.js';
import { getState, saveState } from '../state.js';
import { view, esc, clearHeader, chipList, showLoading, showError, showPlaceholder } from '../dom.js';
import { isCurrentRender, navigate } from '../router.js';
import { loadProfile, loadVerification, saveProfile } from '../repository.js';
import { resolveView } from './verify.js';
import {
  PURPOSE_TYPES,
  WORLD_VIEWS,
  ZODIAC_SIGNS,
  EDUCATION_LEVELS,
  CHILDREN_STATUS,
  ATTITUDES,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  interestsOf,
  purposeLabel,
  basicRowsFromProfile
} from '../profile-fields.js';

let closeOverlay = null;

export function closeSettingsOverlay() {
  closeOverlay?.();
}

function mountSheet(markup, className = 'settings-overlay') {
  closeSettingsOverlay();
  const overlay = document.createElement('div');
  overlay.className = className;
  overlay.innerHTML = markup;
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeSettingsOverlay();
  });
  document.body.appendChild(overlay);
  document.body.classList.add('settings-sheet-open');
  closeOverlay = () => {
    overlay.remove();
    document.body.classList.remove('settings-sheet-open');
    closeOverlay = null;
  };
  return overlay;
}

function verificationRow(verification) {
  const state = resolveView(verification);
  return `
    <button class="verify-row verify-${state.tone}" data-action="verify">
      <span class="verify-dot"></span>
      <span>Проверка анкеты</span>
      <span>${esc(state.short)}</span>
    </button>`;
}

function openTaneeshStore(reason) {
  const url = 'https://apps.apple.com/search?term=Taneesh';
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
  } catch (_) {
    /* ignore */
  }
  window.open(url, '_blank', 'noopener');
  console.info('[yaqin] open Taneesh', reason);
}

export async function meScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем профиль...');

  let profile;
  let verification;
  try {
    [profile, verification] = await Promise.all([loadProfile(), loadVerification()]);
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить профиль.');
    return;
  }
  if (!isCurrentRender(token)) return;

  if (!profile) {
    showPlaceholder('✿', 'Анкета не создана', 'Создайте анкету в боте командой /profile.');
    return;
  }

  view.innerHTML = `
    <div class="me-page">
      <div class="me-top">
        <h1>Профиль</h1>
        <div>
          <button data-action="settings" aria-label="Настройки"><i class="ti ti-settings"></i></button>
        </div>
      </div>
      <div class="me-tabs">
        <button class="active">Анкета</button>
        <button data-action="my-tickets">Билеты</button>
      </div>
      <button type="button" class="taneesh-activate-banner me-taneesh-banner" data-open-taneesh="activate">
        <div>
          <b>Черновик в Taneesh</b>
          <span>Билеты можно купить здесь. Активируйте профиль в приложении, чтобы анкета была видима.</span>
        </div>
        <i class="ti ti-chevron-right"></i>
      </button>
      <div class="me-hero">
        <img src="${esc(profile.photo)}">
        <button class="edit-profile" data-action="edit">Редактировать</button>
        <button class="edit-photos-btn" data-action="edit-photos" aria-label="Фото"><i class="ti ti-pencil"></i></button>
        <div class="me-dots"><span class="on"></span><span></span></div>
      </div>
      <section class="me-info">
        <h2>${esc(profile.name)}</h2>
        <p>${profile.age} • ${esc(profile.city)}</p>
        <p class="me-bio">${esc(profile.bio)}</p>
      </section>
      <section class="me-section">${verificationRow(verification)}</section>
      ${interestsOf(profile).length || purposeLabel(profile.purposeType) ? `
      <section class="me-section">
        <h3>О себе</h3>
        <div class="me-box">
          ${purposeLabel(profile.purposeType) ? `<h4>Я ищу</h4><div class="big-chips"><span>${esc(purposeLabel(profile.purposeType))}</span></div>` : ''}
          ${interestsOf(profile).length ? `<h4>Интересы</h4><div class="big-chips">${chipList(interestsOf(profile))}</div>` : ''}
        </div>
      </section>` : ''}
      <section class="me-section">
        <h3>Основное</h3>
        <div class="me-box" data-action="basic">
          ${basicRowsFromProfile(profile).map(row => `
            <h4>${esc(row.label)}</h4><div class="big-chips"><span>${esc(row.value)}</span></div>
          `).join('') || '<p class="muted">Добавьте данные в редактировании</p>'}
        </div>
      </section>
    </div>`;

  view.querySelectorAll('[data-open-taneesh]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openTaneeshStore(button.dataset.openTaneesh);
    };
  });
}

export function settingsScreen() {
  clearHeader();
  const privacy = getState().privacy || { showOnline: true };
  const profileId = (getState().profileId || 'yaqin-demo-local').slice(0, 36);

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Настройки</h1>
        <span></span>
      </header>

      <section class="settings-block">
        <label class="settings-row toggle">
          <span class="settings-icon green"><i class="ti ti-circle-filled"></i></span>
          <span>Показывать онлайн</span>
          <input type="checkbox" id="showOnline" ${privacy.showOnline !== false ? 'checked' : ''}>
        </label>
        <button class="settings-row" data-action="account" type="button">
          <span class="settings-icon orange"><i class="ti ti-info-circle"></i></span>
          <span>Мой аккаунт</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="verify" type="button">
          <span class="settings-icon yellow"><i class="ti ti-shield-check"></i></span>
          <span>Проверка анкеты</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <h3 class="settings-label">Параметры</h3>
      <section class="settings-block">
        <button class="settings-row" data-action="notifications" type="button">
          <span class="settings-icon green"><i class="ti ti-bell"></i></span>
          <span>Уведомления</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row" data-action="blocked" type="button">
          <span class="settings-icon red"><i class="ti ti-eye-off"></i></span>
          <span>Заблокированные</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <h3 class="settings-label">Аккаунт</h3>
      <section class="settings-block">
        <button class="settings-row" data-action="legal" type="button">
          <span class="settings-icon pink"><i class="ti ti-file-text"></i></span>
          <span>Правовая информация</span>
          <i class="ti ti-chevron-right"></i>
        </button>
        <button class="settings-row danger" type="button" id="logoutBtn">
          <span class="settings-icon red"><i class="ti ti-logout"></i></span>
          <span>Выйти</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>

      <footer class="settings-footer">
        <span class="settings-brand"><i class="ti ti-flower"></i></span>
        <p>Версия 1.0.0 · демо</p>
        <p>Profile ID: ${esc(profileId)}</p>
      </footer>
    </div>`;

  view.querySelector('#showOnline').onchange = event => {
    saveState({
      ...getState(),
      privacy: { ...(getState().privacy || {}), showOnline: event.target.checked }
    });
  };
  view.querySelector('#logoutBtn').onclick = () => {
    saveState({ ...getState(), onboarded: false, onboardingStep: 'welcome' });
    navigate('onboarding');
  };
}

export function blockedScreen() {
  clearHeader();
  const { blocked } = getState();
  const rows = people.filter(person => blocked.includes(person.id));

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Заблокированные</h1>
        <span></span>
      </header>
      ${rows.length
        ? `<div class="blocked-list">${rows.map(person => `
            <div class="blocked-row">
              <img src="${esc(person.photo)}" alt="">
              <div>
                <strong>${esc(person.name)}</strong>
                <span>${esc(person.city)}</span>
              </div>
              <button type="button" data-unblock="${person.id}">Разблок.</button>
            </div>`).join('')}</div>`
        : `<div class="blocked-empty">
            <div class="empty-badge"><i class="ti ti-ban"></i></div>
            <h2>Пока никого нет<br>в блоке</h2>
            <p>Если кого-то заблокируете, имя появится здесь.</p>
          </div>`}
    </div>`;

  view.querySelectorAll('[data-unblock]').forEach(button => {
    button.onclick = () => {
      const id = Number(button.dataset.unblock);
      const state = getState();
      saveState({ ...state, blocked: state.blocked.filter(item => item !== id) });
      blockedScreen();
    };
  });
}

export function privacyScreen() {
  clearHeader();
  const privacy = {
    showOnline: true,
    showInDiscover: true,
    readReceipts: true,
    ...(getState().privacy || {})
  };

  const render = () => {
    view.innerHTML = `
      <div class="settings-page">
        <header class="filters-head">
          <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <h1>Приватность</h1>
          <span></span>
        </header>
        <h3 class="settings-label">Видимость</h3>
        <section class="settings-block">
          <label class="settings-row toggle stacked">
            <span>Показывать онлайн<br><small>Другие увидят, когда вы в сети</small></span>
            <input type="checkbox" data-key="showOnline" ${privacy.showOnline ? 'checked' : ''}>
          </label>
          <label class="settings-row toggle stacked">
            <span>Показывать в ленте<br><small>Анкета появляется во вкладке «Люди»</small></span>
            <input type="checkbox" data-key="showInDiscover" ${privacy.showInDiscover ? 'checked' : ''}>
          </label>
        </section>
        <h3 class="settings-label">Общение</h3>
        <section class="settings-block">
          <label class="settings-row toggle stacked">
            <span>Отчёты о прочтении<br><small>Показывать, когда вы прочитали сообщение</small></span>
            <input type="checkbox" data-key="readReceipts" ${privacy.readReceipts ? 'checked' : ''}>
          </label>
        </section>
      </div>`;

    view.querySelectorAll('[data-key]').forEach(input => {
      input.onchange = () => {
        privacy[input.dataset.key] = input.checked;
        saveState({ ...getState(), privacy: { ...privacy } });
      };
    });
  };
  render();
}

export function helpScreen() {
  clearHeader();
  const topics = [
    ['verify', 'Как пройти проверку анкеты', 'Запишите короткое видео с кодом — команда проверит вручную.'],
    ['events', 'События и билеты', 'Смотрите афишу, отмечайте «хочу пойти» и покупайте билет с QR прямо в Mini App.'],
    ['safety', 'Безопасность и жалобы', 'Можно пожаловаться или заблокировать прямо из профиля или чата.'],
    ['account', 'Почта и доступ', 'Добавьте email в аккаунте, чтобы не потерять доступ.']
  ];

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Справка</h1>
        <span></span>
      </header>
      <section class="settings-block">
        ${topics.map(([id, title, text]) => `
          <button class="settings-row stacked-btn" type="button" data-help="${id}">
            <span>${esc(title)}<br><small>${esc(text)}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>`).join('')}
      </section>
      <section class="settings-block">
        <button class="settings-row" data-action="feedback" type="button">
          <span class="settings-icon orange"><i class="ti ti-message"></i></span>
          <span>Написать в поддержку</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>
    </div>`;

  view.querySelectorAll('[data-help]').forEach(button => {
    button.onclick = () => {
      const topic = topics.find(item => item[0] === button.dataset.help);
      if (!topic) return;
      mountSheet(`
        <div class="help-sheet">
          <div class="confirm-handle"></div>
          <h2>${esc(topic[1])}</h2>
          <p>${esc(topic[2])}</p>
          <button class="announce-cta" data-action="close-sheet">Понятно</button>
        </div>`);
    };
  });
}

export function legalScreen() {
  clearHeader();
  const docs = [
    ['terms', 'Условия использования', 'Демо-текст: пользуясь Yaqin, вы соглашаетесь общаться уважительно и не нарушать законы Узбекистана.'],
    ['privacy', 'Политика конфиденциальности', 'Демо-текст: мы обрабатываем данные профиля и чатов только для работы сервиса. В Telegram Mini App часть данных приходит из Telegram.'],
    ['community', 'Правила общения', 'Демо-текст: без травли, спама, фейков и непристойного контента. Жалобы рассматривает модерация.']
  ];

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Правовая информация</h1>
        <span></span>
      </header>
      <section class="settings-block">
        ${docs.map(([id, title]) => `
          <button class="settings-row" type="button" data-legal="${id}">
            <span class="settings-icon pink"><i class="ti ti-file-text"></i></span>
            <span>${esc(title)}</span>
            <i class="ti ti-chevron-right"></i>
          </button>`).join('')}
      </section>
    </div>`;

  view.querySelectorAll('[data-legal]').forEach(button => {
    button.onclick = () => {
      const doc = docs.find(item => item[0] === button.dataset.legal);
      if (!doc) return;
      mountSheet(`
        <div class="help-sheet legal-sheet">
          <div class="confirm-handle"></div>
          <h2>${esc(doc[1])}</h2>
          <p>${esc(doc[2])}</p>
          <button class="announce-cta" data-action="close-sheet">Закрыть</button>
        </div>`);
    };
  });
}

export function darkModeScreen() {
  clearHeader();
  const theme = getState().theme || { dark: false, followSystem: true };

  const apply = next => {
    saveState({ ...getState(), theme: next });
    document.documentElement.dataset.theme = next.followSystem ? 'system' : next.dark ? 'dark' : 'light';
    darkModeScreen();
  };

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Тёмная тема</h1>
        <span></span>
      </header>
      <section class="settings-block">
        <label class="settings-row toggle">
          <span>Тёмная тема</span>
          <input type="checkbox" id="darkToggle" ${theme.dark && !theme.followSystem ? 'checked' : ''} ${theme.followSystem ? 'disabled' : ''}>
        </label>
        <label class="settings-row toggle stacked">
          <span>Как в системе<br><small>Yaqin подстроится под светлую или тёмную тему устройства</small></span>
          <input type="checkbox" id="systemToggle" ${theme.followSystem ? 'checked' : ''}>
        </label>
      </section>
    </div>`;

  view.querySelector('#darkToggle').onchange = event => {
    apply({ dark: event.target.checked, followSystem: false });
  };
  view.querySelector('#systemToggle').onchange = event => {
    apply({ dark: theme.dark, followSystem: event.target.checked });
  };
}

export async function editScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем анкету...');

  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить анкету.');
    return;
  }
  if (!isCurrentRender(token)) return;

  const draft = {
    name: profile.name || '',
    age: profile.age || 25,
    city: profile.city || '',
    bio: profile.bio || '',
    purposeType: Number(profile.purposeType) || 3,
    interests: [...interestsOf(profile)],
    height: profile.height || '',
    worldView: profile.worldView || '',
    zodiacSign: profile.zodiacSign || '',
    education: profile.education || '',
    hasChildren: profile.hasChildren || '',
    alcoholAttitude: profile.alcoholAttitude || '',
    smokingAttitude: profile.smokingAttitude || '',
    languages: [...(profile.languages || [])]
  };
  let sheet = null; // interests | purpose | worldView | zodiacSign | education | hasChildren | alcoholAttitude | smokingAttitude | languages

  const enumLabel = (list, id, fallback = 'Добавить') =>
    list.find(item => item.id === Number(id))?.label || fallback;

  const render = () => {
    const purposeText = PURPOSE_TYPES.find(item => item.id === draft.purposeType);
    const purposeDisplay = purposeText
      ? `${purposeText.emoji} ${purposeText.label}`
      : 'Добавить';

    view.innerHTML = `
      <div class="edit-profile-page">
        <div class="edit-hero">
          <img src="${esc(profile.photo || profile.photos?.[0] || promptPhoto)}" alt="">
          <button class="edit-back" data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
          <button class="edit-done" id="saveEdit">Готово</button>
          <div class="me-dots"><span class="on"></span><span></span></div>
          <button class="edit-photos-fab" data-action="edit-photos" aria-label="Фото"><i class="ti ti-pencil"></i></button>
        </div>
        <section class="edit-card">
          <div class="edit-identity">
            <input class="edit-name" id="profileName" maxlength="40" value="${esc(draft.name)}">
            <p>
              <input class="edit-age" id="profileAge" type="number" min="18" max="100" value="${draft.age}">
              ·
              <input class="edit-city" id="profileCity" maxlength="60" value="${esc(draft.city)}">
              <i class="ti ti-pencil"></i>
            </p>
          </div>
          <textarea class="edit-motto" id="profileAbout" maxlength="120" placeholder="короткий девиз">${esc(draft.bio)}</textarea>

          <h3 class="settings-label">О себе</h3>
          <div class="me-box">
            <button type="button" class="edit-block-head" data-sheet="purpose">
              <h4>Я ищу</h4><i class="ti ti-pencil"></i>
            </button>
            <div class="big-chips"><span>${esc(purposeDisplay)}</span></div>
            <button type="button" class="edit-block-head" data-sheet="interests">
              <h4>Интересы</h4><i class="ti ti-pencil"></i>
            </button>
            <div class="big-chips">${chipList(draft.interests)}</div>
          </div>

          <h3 class="settings-label">Основное</h3>
          <div class="edit-basic-list">
            ${[
              ['height', 'Рост', draft.height ? `${draft.height} см` : 'Добавить'],
              ['worldView', 'Мировоззрение', enumLabel(WORLD_VIEWS, draft.worldView)],
              ['zodiacSign', 'Знак зодиака', enumLabel(ZODIAC_SIGNS, draft.zodiacSign)],
              ['education', 'Образование', enumLabel(EDUCATION_LEVELS, draft.education)],
              ['hasChildren', 'Дети', enumLabel(CHILDREN_STATUS, draft.hasChildren)],
              ['alcoholAttitude', 'Алкоголь', enumLabel(ATTITUDES, draft.alcoholAttitude)],
              ['smokingAttitude', 'Курение', enumLabel(ATTITUDES, draft.smokingAttitude)],
              ['languages', 'Языки', draft.languages.length ? draft.languages.join(', ') : 'Добавить']
            ].map(([key, label, value]) => `
              <button type="button" class="edit-basic-row" data-field="${key}">
                <span>${label}</span>
                <b class="${value === 'Добавить' ? 'muted' : ''}">${esc(value)} <i class="ti ti-plus"></i></b>
              </button>`).join('')}
          </div>
        </section>

        ${sheet === 'interests' ? `
          <div class="edit-sheet">
            <header>
              <h2>Интересы</h2>
              <button type="button" id="closeSheet">Готово</button>
            </header>
            <div class="edit-chip-picker">
              ${INTEREST_OPTIONS.map(item => {
                const on = draft.interests.includes(item);
                return `<button type="button" class="${on ? 'on' : ''}" data-chip="${esc(item)}">${esc(item)}</button>`;
              }).join('')}
            </div>
          </div>` : ''}

        ${sheet === 'languages' ? `
          <div class="edit-sheet">
            <header>
              <h2>Языки</h2>
              <button type="button" id="closeSheet">Готово</button>
            </header>
            <div class="edit-chip-picker">
              ${LANGUAGE_OPTIONS.map(item => {
                const on = draft.languages.includes(item);
                return `<button type="button" class="${on ? 'on' : ''}" data-lang="${esc(item)}">${esc(item)}</button>`;
              }).join('')}
            </div>
          </div>` : ''}

        ${sheet === 'purpose' ? `
          <div class="edit-sheet">
            <header>
              <h2>Я ищу</h2>
              <button type="button" id="closeSheet">Сохранить</button>
            </header>
            <div class="edit-radio-list">
              ${PURPOSE_TYPES.map(item => `
                <button type="button" class="${draft.purposeType === item.id ? 'on' : ''}" data-purpose="${item.id}">
                  <span>${item.emoji} ${esc(item.label)}</span>
                  ${draft.purposeType === item.id ? '<i class="ti ti-check"></i>' : ''}
                </button>`).join('')}
            </div>
          </div>` : ''}

        ${['worldView', 'zodiacSign', 'education', 'hasChildren', 'alcoholAttitude', 'smokingAttitude'].includes(sheet) ? `
          <div class="edit-sheet">
            <header>
              <h2>${{
                worldView: 'Мировоззрение',
                zodiacSign: 'Знак зодиака',
                education: 'Образование',
                hasChildren: 'Дети',
                alcoholAttitude: 'Алкоголь',
                smokingAttitude: 'Курение'
              }[sheet]}</h2>
              <button type="button" id="closeSheet">Сохранить</button>
            </header>
            <div class="edit-radio-list">
              ${(
                sheet === 'worldView' ? WORLD_VIEWS
                : sheet === 'zodiacSign' ? ZODIAC_SIGNS
                : sheet === 'education' ? EDUCATION_LEVELS
                : sheet === 'hasChildren' ? CHILDREN_STATUS
                : ATTITUDES
              ).map(item => `
                <button type="button" class="${Number(draft[sheet]) === item.id ? 'on' : ''}" data-enum="${item.id}">
                  <span>${esc(item.label)}</span>
                  ${Number(draft[sheet]) === item.id ? '<i class="ti ti-check"></i>' : ''}
                </button>`).join('')}
            </div>
          </div>` : ''}
      </div>`;

    const syncDraft = () => {
      draft.name = view.querySelector('#profileName')?.value || '';
      draft.age = Number(view.querySelector('#profileAge')?.value) || draft.age;
      draft.city = view.querySelector('#profileCity')?.value || '';
      draft.bio = view.querySelector('#profileAbout')?.value || '';
    };

    view.querySelectorAll('[data-sheet]').forEach(button => {
      button.onclick = () => {
        syncDraft();
        sheet = button.dataset.sheet;
        render();
      };
    });
    view.querySelector('#closeSheet')?.addEventListener('click', () => {
      sheet = null;
      render();
    });
    view.querySelectorAll('[data-chip]').forEach(button => {
      button.onclick = () => {
        const value = button.dataset.chip;
        const index = draft.interests.indexOf(value);
        if (index >= 0) draft.interests.splice(index, 1);
        else draft.interests.push(value);
        render();
      };
    });
    view.querySelectorAll('[data-lang]').forEach(button => {
      button.onclick = () => {
        const value = button.dataset.lang;
        const index = draft.languages.indexOf(value);
        if (index >= 0) draft.languages.splice(index, 1);
        else draft.languages.push(value);
        render();
      };
    });
    view.querySelectorAll('[data-purpose]').forEach(button => {
      button.onclick = () => {
        draft.purposeType = Number(button.dataset.purpose);
        render();
      };
    });
    view.querySelectorAll('[data-enum]').forEach(button => {
      button.onclick = () => {
        draft[sheet] = Number(button.dataset.enum);
        render();
      };
    });
    view.querySelectorAll('[data-field]').forEach(button => {
      button.onclick = () => {
        syncDraft();
        const key = button.dataset.field;
        if (key === 'height') {
          const next = window.prompt('Рост (см)', draft.height || '');
          if (next !== null) {
            const num = Number(String(next).replace(/\D/g, ''));
            draft.height = num || '';
            render();
          }
          return;
        }
        if (key === 'languages') {
          sheet = 'languages';
          render();
          return;
        }
        sheet = key;
        render();
      };
    });
    view.querySelector('#saveEdit').onclick = async () => {
      syncDraft();
      if (!draft.name.trim() || !Number.isInteger(draft.age) || draft.age < 18 || draft.age > 100) {
        showError('Проверьте имя и возраст: возраст должен быть от 18 до 100.');
        return;
      }
      try {
        await saveProfile({
          name: draft.name.trim(),
          age: draft.age,
          city: draft.city.trim(),
          about: draft.bio.trim(),
          purposeType: draft.purposeType,
          interests: draft.interests,
          height: draft.height || null,
          worldView: draft.worldView || null,
          zodiacSign: draft.zodiacSign || null,
          education: draft.education || null,
          hasChildren: draft.hasChildren || null,
          alcoholAttitude: draft.alcoholAttitude || null,
          smokingAttitude: draft.smokingAttitude || null,
          languages: draft.languages
        });
        navigate('me');
      } catch {
        showError('Анкета не сохранилась. Попробуйте ещё раз.');
      }
    };
  };

  render();
}

export async function editPhotosScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем фото...');
  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить фото.');
    return;
  }
  if (!isCurrentRender(token)) return;

  let photos = [...(profile.photos || [profile.photo, promptPhoto].filter(Boolean))];
  while (photos.length < 6) photos.push(null);
  const pool = [PHOTOS.city, PHOTOS.coffee, PHOTOS.books, PHOTOS.palms, PHOTOS.event, people[0].photo].filter(Boolean);

  const render = () => {
    const filled = photos.filter(Boolean).length;
    view.innerHTML = `
      <div class="edit-photos-page">
        <header class="filters-head">
          <button data-action="edit" aria-label="Закрыть"><i class="ti ti-x"></i></button>
          <span></span>
          <button class="head-action ${filled >= 2 ? 'on' : ''}" id="savePhotos" ${filled >= 2 ? '' : 'disabled'}>Сохранить</button>
        </header>
        <h1>Ваши фото</h1>
        <p class="photos-lead">Загрузите хотя бы два фото, чтобы другие видели, как вы выглядите.</p>
        <div class="photos-grid">
          ${photos.map((photo, index) => photo
            ? `<div class="photo-slot filled">
                <img src="${esc(photo)}" alt="">
                <span class="photo-badge">${index === 0 ? '<i class="ti ti-check"></i> Главное' : index + 1}</span>
                ${index ? `<button type="button" class="photo-make-main" data-main="${index}">Главное</button>` : ''}
                ${index ? `<button type="button" class="photo-remove" data-remove="${index}" aria-label="Удалить"><i class="ti ti-x"></i></button>` : ''}
              </div>`
            : `<button type="button" class="photo-slot empty" data-add="${index}" aria-label="Добавить"><i class="ti ti-plus"></i></button>`
          ).join('')}
        </div>
      </div>`;

    view.querySelectorAll('[data-add]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.add);
        const next = pool.find(src => !photos.includes(src)) || pool[index % pool.length];
        photos[index] = next;
        render();
      };
    });
    view.querySelectorAll('[data-remove]').forEach(button => {
      button.onclick = () => {
        photos[Number(button.dataset.remove)] = null;
        render();
      };
    });
    view.querySelectorAll('[data-main]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.main);
        const [main] = photos.splice(index, 1);
        photos.unshift(main);
        while (photos.length < 6) photos.push(null);
        photos = photos.slice(0, 6);
        render();
      };
    });
    view.querySelector('#savePhotos').onclick = async () => {
      const clean = photos.filter(Boolean);
      if (clean.length < 2) return;
      try {
        await saveProfile({
          name: profile.name,
          age: profile.age,
          city: profile.city,
          about: profile.bio,
          photo: clean[0],
          photos: clean
        });
        navigate('edit');
      } catch {
        showError('Фото не сохранились. Попробуйте ещё раз.');
      }
    };
  };
  render();
}

export function basicInfoScreen() {
  clearHeader();
  const profile = { ...defaultProfile, ...(getState().profile || {}) };
  const rows = basicRowsFromProfile(profile);
  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="me" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Основное</h1>
        <button class="head-action on" data-action="edit">Изменить</button>
      </header>
      <div class="edit-basic-list padded">
        ${(rows.length ? rows : [{ label: 'Пока пусто', value: 'Заполните в редактировании' }]).map(row => `
          <div class="edit-basic-row static">
            <span>${esc(row.label)}</span>
            <b>${esc(row.value)}</b>
          </div>`).join('')}
      </div>
    </div>`;
}

export function notificationsScreen() {
  clearHeader();
  const prefs = getState().notifications || { dm: true, reactions: true, events: true, tickets: true };

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Уведомления</h1>
        <span></span>
      </header>

      <h3 class="settings-label">Знакомства</h3>
      <section class="settings-block">
        <label class="settings-row toggle stacked">
          <span>Личные сообщения<br><small>Новые сообщения после взаимного привета</small></span>
          <input type="checkbox" id="notifDm" ${prefs.dm !== false ? 'checked' : ''}>
        </label>
        <label class="settings-row toggle stacked">
          <span>Реакции в ЛС<br><small>Реакции на ваши сообщения</small></span>
          <input type="checkbox" id="notifReactions" ${prefs.reactions !== false ? 'checked' : ''}>
        </label>
      </section>

      <h3 class="settings-label">События</h3>
      <section class="settings-block">
        <label class="settings-row toggle stacked">
          <span>Интересные события<br><small>«Хочу пойти» и ответы в «Кто идёт»</small></span>
          <input type="checkbox" id="notifEvents" ${prefs.events !== false ? 'checked' : ''}>
        </label>
        <label class="settings-row toggle stacked">
          <span>Билеты<br><small>Напоминания о купленных билетах и QR</small></span>
          <input type="checkbox" id="notifTickets" ${prefs.tickets !== false ? 'checked' : ''}>
        </label>
      </section>
    </div>`;

  const save = () => {
    saveState({
      ...getState(),
      notifications: {
        dm: view.querySelector('#notifDm').checked,
        reactions: view.querySelector('#notifReactions').checked,
        events: view.querySelector('#notifEvents').checked,
        tickets: view.querySelector('#notifTickets').checked
      }
    });
  };
  view.querySelector('#notifDm').onchange = save;
  view.querySelector('#notifReactions').onchange = save;
  view.querySelector('#notifEvents').onchange = save;
  view.querySelector('#notifTickets').onchange = save;
}

export async function accountScreen(_id, token) {
  clearHeader();
  showLoading('Загружаем аккаунт...');
  let profile;
  try {
    profile = (await loadProfile()) || { ...defaultProfile, ...(getState().profile || {}) };
  } catch {
    if (isCurrentRender(token)) showError('Не удалось загрузить аккаунт.');
    return;
  }
  if (!isCurrentRender(token)) return;

  const email = getState().email || '';
  const savedUser = getState().username || getState().profile?.username;
  const slug = savedUser || String(profile.name || 'yaqin')
    .toLowerCase()
    .replace(/[а-яё]/gi, char => ({
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
      к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
      х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
    }[char.toLowerCase()] || ''))
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'yaqin';
  const username = `@${slug}`;

  view.innerHTML = `
    <div class="settings-page">
      <header class="filters-head">
        <button data-action="back" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>
        <h1>Мой аккаунт</h1>
        <span></span>
      </header>

      <h3 class="settings-label">Данные аккаунта</h3>
      <section class="settings-block">
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-user"></i></span>
          <div><b>Имя</b><span>${esc(profile.name)}</span></div>
          <button type="button" data-edit="name" aria-label="Изменить"><i class="ti ti-dots"></i></button>
        </div>
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-at"></i></span>
          <div><b>Имя пользователя</b><span>${esc(username)}</span></div>
          <button type="button" data-edit="username" aria-label="Изменить"><i class="ti ti-dots"></i></button>
        </div>
        <div class="account-row">
          <span class="settings-icon blue"><i class="ti ti-phone"></i></span>
          <div><b>Телефон</b><span>через Telegram</span></div>
          <button type="button" data-edit="phone" aria-label="Подробнее"><i class="ti ti-dots"></i></button>
        </div>
        <button class="account-row" type="button" data-action="add-email">
          <span class="settings-icon blue square"><i class="ti ti-mail"></i></span>
          <div><b>Почта</b><span class="${email ? '' : 'link'}">${email ? esc(email) : 'Добавить почту +'}</span></div>
        </button>
      </section>

      <section class="settings-block danger-block">
        <button class="settings-row" type="button" data-action="delete-account">
          <span class="settings-icon red"><i class="ti ti-trash"></i></span>
          <span>Удалить аккаунт</span>
          <i class="ti ti-chevron-right"></i>
        </button>
      </section>
    </div>`;

  view.querySelectorAll('[data-edit]').forEach(button => {
    button.onclick = () => showAccountFieldSheet(button.dataset.edit, profile, username);
  });
}

export function showFeedbackSheet() {
  const shake = getState().shakeFeedback !== false;
  const overlay = mountSheet(`
    <div class="feedback-sheet">
      <div class="confirm-handle"></div>
      <h2>Как мы можем сделать Yaqin лучше?</h2>
      <textarea id="feedbackText" maxlength="500" placeholder="Напишите отзыв здесь"></textarea>
      <label class="feedback-shake">
        <span>Встряхнуть телефон, чтобы оставить отзыв</span>
        <input type="checkbox" id="shakeToggle" ${shake ? 'checked' : ''}>
      </label>
      <button class="feedback-submit" id="feedbackSubmit" disabled>Отправить</button>
      <button class="feedback-skip" data-action="close-sheet" type="button">Пропустить</button>
    </div>`);

  const area = overlay.querySelector('#feedbackText');
  const submit = overlay.querySelector('#feedbackSubmit');
  area.oninput = () => {
    const ready = area.value.trim().length > 2;
    submit.disabled = !ready;
    submit.classList.toggle('on', ready);
  };
  overlay.querySelector('#shakeToggle').onchange = event => {
    saveState({ ...getState(), shakeFeedback: event.target.checked });
  };
  submit.onclick = () => {
    if (submit.disabled) return;
    closeSettingsOverlay();
    const banner = document.createElement('div');
    banner.id = 'block-banner';
    banner.className = 'block-banner';
    banner.textContent = 'Спасибо за отзыв';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2200);
  };
}

export function showAddEmailSheet() {
  const current = getState().email || '';
  const overlay = mountSheet(`
    <div class="email-sheet">
      <div class="confirm-handle"></div>
      <header class="modal-head">
        <button data-action="close-sheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>Добавить почту</h1>
        <button class="head-action" id="emailAdd" disabled>Добавить</button>
      </header>
      <input class="email-input" id="emailField" type="email" placeholder="Введите адрес почты" value="${esc(current)}">
      <p class="email-note">Добавляя почту, вы соглашаетесь получать письма от нас. Отписаться можно внизу любого письма.</p>
    </div>`);

  const field = overlay.querySelector('#emailField');
  const add = overlay.querySelector('#emailAdd');
  const sync = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
    add.disabled = !valid;
    add.classList.toggle('on', valid);
  };
  field.oninput = sync;
  sync();
  field.focus();
  add.onclick = () => {
    if (add.disabled) return;
    saveState({ ...getState(), email: field.value.trim() });
    closeSettingsOverlay();
    showEmailSentSheet();
  };
}

function showEmailSentSheet() {
  mountSheet(`
    <div class="help-sheet email-sent-sheet">
      <div class="confirm-handle"></div>
      <div class="email-sent-badge"><i class="ti ti-mail"></i><span>SENT</span></div>
      <h2>Письмо отправлено 🎉</h2>
      <p>Перейдите по ссылке в письме. После подтверждения почта появится в аккаунте.</p>
      <button class="announce-cta" id="emailGotIt">Понятно</button>
    </div>`);
  document.getElementById('emailGotIt').onclick = () => {
    closeSettingsOverlay();
    accountScreen();
  };
}

function showAccountFieldSheet(field, profile, username) {
  if (field === 'phone') {
    mountSheet(`
      <div class="help-sheet">
        <div class="confirm-handle"></div>
        <h2>Телефон</h2>
        <p>Номер приходит из Telegram Mini App и не редактируется здесь. Чтобы сменить номер, обновите его в Telegram.</p>
        <button class="announce-cta" data-action="close-sheet">Понятно</button>
      </div>`);
    return;
  }

  const isName = field === 'name';
  const title = isName ? 'Имя' : 'Имя пользователя';
  const value = isName ? (profile.name || '') : username.replace(/^@/, '');
  const overlay = mountSheet(`
    <div class="email-sheet">
      <div class="confirm-handle"></div>
      <header class="modal-head">
        <button data-action="close-sheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
        <h1>${title}</h1>
        <button class="head-action on" id="fieldSave">Сохранить</button>
      </header>
      <input class="email-input" id="fieldValue" maxlength="${isName ? 40 : 24}" value="${esc(value)}" ${isName ? '' : 'spellcheck="false"'}>
      <p class="email-note">${isName ? 'Имя видно в профиле и чатах.' : 'Только латиница, цифры и _.'}</p>
    </div>`);

  const input = overlay.querySelector('#fieldValue');
  input.focus();
  input.setSelectionRange(value.length, value.length);
  overlay.querySelector('#fieldSave').onclick = async () => {
    const next = input.value.trim();
    if (!next) return;
    if (isName) {
      await saveProfile({ name: next });
    } else {
      const slug = next.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'yaqin';
      saveState({ ...getState(), username: slug, profile: { ...(getState().profile || {}), username: slug } });
    }
    closeSettingsOverlay();
    accountScreen();
  };
}

export function showDeleteAccountDialog() {
  const overlay = mountSheet(`
    <div class="delete-dialog">
      <h2>Удалить аккаунт</h2>
      <p>Анкета, чаты и билеты в демо будут удалены. Действие нельзя отменить. Чтобы подтвердить, введите «Удалить» ниже.</p>
      <input id="deleteConfirm" placeholder="Удалить" autocomplete="off">
      <div class="delete-actions">
        <button type="button" data-action="close-sheet">Отмена</button>
        <button type="button" id="deleteConfirmBtn" disabled>Удалить</button>
      </div>
    </div>`, 'settings-overlay dialog-overlay');

  const input = overlay.querySelector('#deleteConfirm');
  const button = overlay.querySelector('#deleteConfirmBtn');
  input.oninput = () => {
    const ok = input.value.trim().toLowerCase() === 'удалить';
    button.disabled = !ok;
  };
  input.focus();
  button.onclick = () => {
    if (button.disabled) return;
    closeSettingsOverlay();
    localStorage.removeItem('yaqin-demo');
    navigate('onboarding');
  };
}

export function applyStoredTheme() {
  const theme = getState().theme || { dark: false, followSystem: true };
  document.documentElement.dataset.theme = theme.followSystem ? 'system' : theme.dark ? 'dark' : 'light';
}
