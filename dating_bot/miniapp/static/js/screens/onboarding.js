import { defaultProfile, promptPhoto } from '../data.js';
import { getState, saveState } from '../state.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';

const QUESTIONS = [
  {
    title: 'Как выглядят твои идеальные выходные?',
    sub: 'Чем ты любишь заниматься?',
    placeholder: 'Мои идеальные выходные...',
    chips: ['кофе +', 'концерты +', 'еда +', 'путешествия +']
  },
  {
    title: 'Какая у тебя недавняя гиперфиксация?',
    sub: 'Расскажи коротко — это станет тегом.',
    placeholder: 'Сейчас я увлечена...',
    chips: ['йога +', 'книги +', 'сериалы +', 'бег +']
  },
  {
    title: 'С кем тебе комфортнее знакомиться?',
    sub: 'Это поможет подобрать подруг рядом.',
    placeholder: 'Мне близки люди, которые...',
    chips: ['спокойные +', 'активные +', 'творческие +', 'спортивные +']
  },
  {
    title: 'Что хочешь от Yaqin?',
    sub: 'Можно выбрать несколько идей.',
    placeholder: 'Я здесь, чтобы...',
    chips: ['прогулки +', 'кофе +', 'встречи +', 'поддержка +']
  }
];

function draft() {
  const state = getState();
  return {
    location: false,
    notifications: false,
    firstName: '',
    lastName: '',
    birthday: '',
    gender: 'woman',
    photos: [null, null, null, null, null, null],
    answers: ['', '', '', ''],
    ...(state.onboardingDraft || {})
  };
}

function saveDraft(next) {
  saveState({ ...getState(), onboardingDraft: next });
}

function go(step) {
  saveState({ ...getState(), onboardingStep: step });
  onboardingScreen();
}

function ageFromBirthday(value) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match.map(Number);
  const born = new Date(yyyy, mm - 1, dd);
  if (born.getFullYear() !== yyyy || born.getMonth() !== mm - 1 || born.getDate() !== dd) return null;
  const now = new Date();
  let age = now.getFullYear() - yyyy;
  if (now.getMonth() < mm - 1 || (now.getMonth() === mm - 1 && now.getDate() < dd)) age -= 1;
  return age;
}

function formatBirthdayInput(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function finishOnboarding(data) {
  const age = ageFromBirthday(data.birthday) || 25;
  const photos = data.photos.filter(Boolean);
  saveState({
    ...getState(),
    onboarded: true,
    onboardingStep: 'ready',
    profile: {
      ...defaultProfile,
      name: data.firstName.trim() || defaultProfile.name,
      age,
      photo: photos[0] || defaultProfile.photo,
      photos: photos.length ? photos : defaultProfile.photos,
      bio: data.answers.filter(Boolean).join(' · ') || defaultProfile.bio,
      tags: data.answers.flatMap((answer, index) => (answer ? [QUESTIONS[index].chips[0].replace(' +', '')] : [])).slice(0, 6)
    }
  });
}

export function onboardingScreen() {
  clearHeader();
  const step = getState().onboardingStep || 'start';
  const data = draft();

  if (step === 'start') return renderStart(data);
  if (step === 'privacy') return renderPrivacy();
  if (step === 'name') return renderName(data);
  if (step === 'birthday') return renderBirthday(data);
  if (step === 'gender') return renderGender(data);
  if (step === 'photos') return renderPhotos(data);
  if (step === 'tags') return renderTags(data);
  if (step.startsWith('q')) return renderQuestion(data, Number(step.slice(1)) - 1);
  if (step === 'camera-roll') return renderCameraRoll(data);
  if (step === 'prompts') return renderPrompts(data);
  if (step === 'prompt-picker') return renderPromptPicker(data);
  if (step === 'processing') return renderProcessing(data);
  return renderReady(data);
}

function renderStart(data) {
  const ready = data.location && data.notifications;
  view.innerHTML = `
    <div class="ob-start">
      <div class="ob-brand">
        <span class="ob-mark">✿</span>
        <b>Yaqin</b>
      </div>
      <section class="ob-card">
        <h1>Начнём</h1>
        <button class="ob-perm ${data.location ? 'on' : ''}" type="button" id="permLoc">
          <span class="ob-perm-icon"><i class="ti ti-map-pin"></i></span>
          <span><b>Геолокация</b><small>Чтобы видеть людей и группы рядом</small></span>
          <span class="ob-check ${data.location ? 'on' : ''}">${data.location ? '<i class="ti ti-check"></i>' : ''}</span>
        </button>
        <button class="ob-perm ${data.notifications ? 'on' : ''}" type="button" id="permNotif">
          <span class="ob-perm-icon"><i class="ti ti-bell"></i></span>
          <span><b>Уведомления</b><small>Чтобы ничего не пропустить</small></span>
          <span class="ob-check ${data.notifications ? 'on' : ''}">${data.notifications ? '<i class="ti ti-check"></i>' : ''}</span>
        </button>
        <button class="ob-next ${ready ? 'on' : ''}" id="startNext" ${ready ? '' : 'disabled'}>Далее</button>
        <button class="ob-link" type="button" data-action="people">Уже есть аккаунт?</button>
      </section>
    </div>`;

  view.querySelector('#permLoc').onclick = () => {
    saveDraft({ ...data, location: !data.location });
    go('start');
  };
  view.querySelector('#permNotif').onclick = () => {
    saveDraft({ ...data, notifications: !data.notifications });
    go('start');
  };
  view.querySelector('#startNext').onclick = () => {
    if (!ready) return;
    go('privacy');
  };
}

function renderPrivacy() {
  view.innerHTML = `
    <div class="ob-plain">
      <div class="ob-flower">✿</div>
      <h1>Мы ценим вашу<br>конфиденциальность</h1>
      <p>Мы храним и обрабатываем данные с устройства, чтобы показывать релевантные знакомства и улучшать Yaqin.</p>
      <p>Согласие можно отозвать в любое время. Подробнее в <u>политике конфиденциальности</u>.</p>
      <button class="ob-next on blue" data-step="name">Далее</button>
    </div>`;
  view.querySelector('[data-step]').onclick = () => go('name');
}

function renderName(data) {
  const ready = data.firstName.trim().length > 1;
  view.innerHTML = `
    <div class="ob-form">
      <button class="ob-back" type="button" data-back="privacy"><i class="ti ti-chevron-left"></i></button>
      <h1>Как тебя зовут?</h1>
      <p class="ob-sub">Будет видно только имя.</p>
      <input class="ob-input" id="firstName" placeholder="Имя" maxlength="40" value="${esc(data.firstName)}">
      <input class="ob-input" id="lastName" placeholder="Фамилия" maxlength="40" value="${esc(data.lastName)}">
      <button class="ob-next ${ready ? 'on' : ''}" id="nameNext" ${ready ? '' : 'disabled'}>Далее</button>
    </div>`;

  const sync = () => {
    const firstName = view.querySelector('#firstName').value;
    const lastName = view.querySelector('#lastName').value;
    const ok = firstName.trim().length > 1;
    saveDraft({ ...data, firstName, lastName });
    const btn = view.querySelector('#nameNext');
    btn.disabled = !ok;
    btn.classList.toggle('on', ok);
  };
  view.querySelector('#firstName').oninput = sync;
  view.querySelector('#lastName').oninput = sync;
  view.querySelector('#nameNext').onclick = () => {
    if (view.querySelector('#nameNext').disabled) return;
    go('birthday');
  };
  view.querySelector('[data-back]').onclick = () => go('privacy');
  view.querySelector('#firstName').focus();
}

function renderBirthday(data) {
  let birthday = data.birthday;
  let age = ageFromBirthday(birthday);
  let ready = age !== null && age >= 18 && age <= 100;

  const paint = () => {
    view.innerHTML = `
      <div class="ob-form">
        <button class="ob-back" type="button" data-back="name"><i class="ti ti-chevron-left"></i></button>
        <h1>Когда у тебя<br>день рождения?</h1>
        <p class="ob-sub">Потом это нельзя будет изменить.</p>
        <input class="ob-input" id="birthday" inputmode="numeric" placeholder="дд.мм.гггг" value="${esc(birthday)}">
        <p class="ob-age" id="ageLabel">${age !== null ? `Вам ${age}` : ''}</p>
        <button class="ob-next ${ready ? 'on' : ''}" id="bdayNext" ${ready ? '' : 'disabled'}>Далее</button>
      </div>`;

    const input = view.querySelector('#birthday');
    input.oninput = event => {
      birthday = formatBirthdayInput(event.target.value);
      event.target.value = birthday;
      age = ageFromBirthday(birthday);
      ready = age !== null && age >= 18 && age <= 100;
      saveDraft({ ...draft(), birthday });
      view.querySelector('#ageLabel').textContent = age !== null ? `Вам ${age}` : '';
      const btn = view.querySelector('#bdayNext');
      btn.disabled = !ready;
      btn.classList.toggle('on', ready);
    };
    view.querySelector('#bdayNext').onclick = () => {
      if (!ready) return;
      go('gender');
    };
    view.querySelector('[data-back]').onclick = () => go('name');
    input.focus();
    input.setSelectionRange(birthday.length, birthday.length);
  };

  paint();
}

function renderGender(data) {
  view.innerHTML = `
    <div class="ob-form">
      <button class="ob-back" type="button" data-back="birthday"><i class="ti ti-chevron-left"></i></button>
      <h1>Как вы опишете<br>свой гендер?</h1>
      <p class="ob-sub">Yaqin — сообщество для женщин. Можно изменить позже в анкете.</p>
      <div class="ob-choices">
        ${[
          ['woman', 'Женщина'],
          ['man', 'Мужчина'],
          ['nonbinary', 'Небинарный']
        ].map(([value, label]) => `
          <button type="button" class="ob-choice ${data.gender === value ? 'on' : ''}" data-gender="${value}">${label}</button>`).join('')}
      </div>
      <button class="ob-next ${data.gender === 'woman' ? 'on' : ''}" id="genderNext" ${data.gender === 'woman' ? '' : 'disabled'}>Далее</button>
    </div>`;

  view.querySelectorAll('[data-gender]').forEach(button => {
    button.onclick = () => {
      saveDraft({ ...data, gender: button.dataset.gender });
      go('gender');
    };
  });
  view.querySelector('#genderNext').onclick = () => {
    if (data.gender !== 'woman') return;
    go('photos');
  };
  view.querySelector('[data-back]').onclick = () => go('birthday');
}

function renderPhotos(data) {
  const filled = data.photos.filter(Boolean).length;
  const ready = filled >= 2;
  const demos = [defaultProfile.photo, promptPhoto, defaultProfile.photos?.[2], defaultProfile.photos?.[3]].filter(Boolean);

  view.innerHTML = `
    <div class="ob-form photos">
      <button class="ob-back" type="button" data-back="gender"><i class="ti ti-chevron-left"></i></button>
      <h1>Добавьте фото профиля</h1>
      <p class="ob-sub">Загрузите как минимум две фотографии, чтобы другие знали, как вы выглядите.</p>
      <div class="ob-photo-grid">
        ${data.photos.map((photo, index) => photo
          ? `<button type="button" class="ob-photo filled" data-clear="${index}">
              <img src="${esc(photo)}" alt="">
              ${index === 0 ? '<span class="ob-main"><i class="ti ti-shield-check"></i> Главное</span>' : ''}
            </button>`
          : `<button type="button" class="ob-photo empty ${index === 0 ? 'main' : ''}" data-add="${index}">
              ${index === 0 ? '<span class="ob-main"><i class="ti ti-shield-check"></i> Главное</span>' : ''}
              <i class="ti ti-plus"></i>
              ${index === 0 ? '<small>Главное фото должно чётко показывать лицо для проверки.</small>' : ''}
            </button>`
        ).join('')}
      </div>
      <button class="ob-next ${ready ? 'on' : ''}" id="photosNext" ${ready ? '' : 'disabled'}>Далее</button>
    </div>`;

  view.querySelectorAll('[data-add]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.add);
      const photos = [...data.photos];
      photos[index] = demos[index % demos.length];
      saveDraft({ ...data, photos });
      go('photos');
    };
  });
  view.querySelectorAll('[data-clear]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.clear);
      const photos = [...data.photos];
      photos[index] = null;
      saveDraft({ ...data, photos });
      go('photos');
    };
  });
  view.querySelector('#photosNext').onclick = () => {
    if (!ready) return;
    go('tags');
  };
  view.querySelector('[data-back]').onclick = () => go('gender');
}

function renderTags(data) {
  const name = data.firstName.trim() || 'Камила';
  const photo = data.photos.find(Boolean) || defaultProfile.photo;
  view.innerHTML = `
    <div class="ob-form tags">
      <button class="ob-back" type="button" data-back="photos"><i class="ti ti-chevron-left"></i></button>
      <div class="ob-polaroid-wrap">
        <span class="ob-bubble b1">Хобби? 🎨</span>
        <span class="ob-bubble b2">Увлечения? 🍿</span>
        <span class="ob-bubble b3">Спорт? ⚽</span>
        <span class="ob-bubble b4">Музыка? 🎵</span>
        <span class="ob-bubble b5">Привычки? 🚴</span>
        <div class="ob-polaroid">
          <img src="${esc(photo)}" alt="">
          <b>${esc(name)}</b>
        </div>
      </div>
      <h1>Давайте познакомимся</h1>
      <p class="ob-sub">Добавьте теги в профиль, ответив на несколько вопросов.</p>
      <button class="ob-next on" data-step="q1">Далее</button>
    </div>`;
  view.querySelector('[data-step]').onclick = () => go('q1');
  view.querySelector('[data-back]').onclick = () => go('photos');
}

function renderQuestion(data, index) {
  const question = QUESTIONS[index];
  const value = data.answers[index] || '';
  const ready = value.trim().length > 1;
  view.innerHTML = `
    <div class="ob-form question">
      <header class="ob-qhead">
        <button class="ob-back" type="button" data-back="${index === 0 ? 'tags' : `q${index}`}"><i class="ti ti-chevron-left"></i></button>
        <span>${index + 1}/4</span>
        <button class="ob-head-next ${ready ? 'on' : ''}" id="qNext" ${ready ? '' : 'disabled'}>Далее</button>
      </header>
      <h1>${esc(question.title)}</h1>
      <p class="ob-sub">${esc(question.sub)}</p>
      <label class="ob-line">
        <input id="qAnswer" placeholder="${esc(question.placeholder)}" maxlength="80" value="${esc(value)}">
        ${value ? '<button type="button" id="qClear">×</button>' : ''}
      </label>
      <div class="ob-suggest">
        ${question.chips.map(chip => `<button type="button" data-chip="${esc(chip.replace(' +', ''))}">${esc(chip)}</button>`).join('')}
      </div>
    </div>`;

  const saveAnswer = text => {
    const answers = [...data.answers];
    answers[index] = text;
    saveDraft({ ...data, answers });
  };

  view.querySelector('#qAnswer').oninput = event => {
    saveAnswer(event.target.value);
    const ok = event.target.value.trim().length > 1;
    const btn = view.querySelector('#qNext');
    btn.disabled = !ok;
    btn.classList.toggle('on', ok);
  };
  view.querySelector('#qClear')?.addEventListener('click', () => {
    saveAnswer('');
    go(`q${index + 1}`);
  });
  view.querySelectorAll('[data-chip]').forEach(button => {
    button.onclick = () => {
      const current = view.querySelector('#qAnswer').value;
      const next = current ? `${current}, ${button.dataset.chip}` : button.dataset.chip;
      saveAnswer(next);
      go(`q${index + 1}`);
    };
  });
  view.querySelector('#qNext').onclick = () => {
    if (view.querySelector('#qNext').disabled) return;
    go(index < 3 ? `q${index + 2}` : 'camera-roll');
  };
  view.querySelector('[data-back]').onclick = () => go(index === 0 ? 'tags' : `q${index}`);
  view.querySelector('#qAnswer').focus();
}

function renderCameraRoll(data) {
  const photo = data.photos.find(Boolean) || defaultProfile.photo;
  view.innerHTML = `
    <div class="camera-roll-page">
      <button class="ob-back" type="button" data-back="q4"><i class="ti ti-chevron-left"></i></button>
      <div class="roll-visual">
        <div class="roll-card back"><img src="${esc(promptPhoto)}" alt=""><span class="top">Моё любимое место</span></div>
        <div class="roll-card front"><img src="${esc(photo)}" alt=""><span>Прошлые выходные</span></div>
      </div>
      <h1>Поделитесь фото<br>из галереи</h1>
      <p>Несколько кадров, которые передают ваше настроение — селфи не нужны.</p>
      <button class="ob-next on" id="rollNext">Далее</button>
    </div>`;
  view.querySelector('#rollNext').onclick = () => go('prompts');
  view.querySelector('[data-back]').onclick = () => go('q4');
}

function renderPrompts(data) {
  const filled = Boolean(data.promptPhoto);
  const prompts = [
    { id: 'hyper', title: 'Недавняя гиперфиксация' },
    { id: 'food', title: 'Недавние фото еды<br>из вашей галереи' },
    { id: 'place', title: 'Любимое место в городе' }
  ];
  view.innerHTML = `
    <div class="prompts-page">
      <button class="ob-back" type="button" data-back="camera-roll"><i class="ti ti-chevron-left"></i></button>
      ${prompts.map((item, index) => {
        if (filled && index === 0) {
          return `
            <article class="prompt-filled-card">
              <img src="${esc(data.promptPhoto)}" alt="">
              <button class="prompt-edit" type="button" data-pick="${item.id}" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
            </article>`;
        }
        return `
          <article class="prompt-life-card">
            <button class="prompt-dismiss" type="button" aria-label="Скрыть"><i class="ti ti-x"></i></button>
            <h2>${item.title}</h2>
            <button class="prompt-add" type="button" data-pick="${item.id}"><i class="ti ti-camera"></i>Добавить фото</button>
          </article>`;
      }).join('')}
      <button class="ob-next on" id="promptsNext">Далее</button>
    </div>`;
  view.querySelectorAll('.prompt-dismiss').forEach(button => {
    button.onclick = () => button.closest('.prompt-life-card')?.remove();
  });
  view.querySelectorAll('[data-pick]').forEach(button => {
    button.onclick = () => {
      saveDraft({ ...data, promptPick: button.dataset.pick });
      go('prompt-picker');
    };
  });
  view.querySelector('#promptsNext').onclick = () => go('processing');
  view.querySelector('[data-back]').onclick = () => go('camera-roll');
}

function renderPromptPicker(data) {
  const titles = {
    hyper: 'Недавняя гиперфиксация',
    food: 'Недавние фото еды из вашей галереи',
    place: 'Любимое место в городе',
    concert: 'Мой последний концерт'
  };
  const title = titles[data.promptPick] || titles.food;
  const slots = data.promptSlots || [null, null, null, null, null, null];
  view.innerHTML = `
    <div class="prompt-picker-page">
      <header class="picker-head">
        <button type="button" data-back="prompts"><i class="ti ti-x"></i></button>
      </header>
      <div class="prompt-title-pill">
        <span>${esc(title)}</span>
        <i class="ti ti-pencil"></i>
      </div>
      <div class="prompt-pick-grid">
        ${slots.map((photo, index) => photo
          ? `<button type="button" class="pick-slot filled" data-clear="${index}">
              <img src="${esc(photo)}" alt="">
              ${index === 0 ? '<span class="pick-main">Главное</span>' : ''}
              <i class="ti ti-x clear"></i>
            </button>`
          : `<button type="button" class="pick-slot empty" data-add="${index}"><i class="ti ti-plus"></i></button>`
        ).join('')}
      </div>
      <button class="photos-save" id="pickerSave">Сохранить</button>
    </div>`;

  view.querySelectorAll('[data-add]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.add);
      const next = [...slots];
      next[index] = promptPhoto;
      saveDraft({ ...data, promptSlots: next, promptPhoto: next.find(Boolean) || null });
      go('prompt-picker');
    };
  });
  view.querySelectorAll('[data-clear]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.clear);
      const next = [...slots];
      next[index] = null;
      saveDraft({ ...data, promptSlots: next, promptPhoto: next.find(Boolean) || null });
      go('prompt-picker');
    };
  });
  view.querySelector('#pickerSave').onclick = () => go('prompts');
  view.querySelector('[data-back]').onclick = () => go('prompts');
}

function renderProcessing(data) {
  view.innerHTML = `
    <div class="ob-processing">
      <div class="ob-flower">✿</div>
      <h1>Пожалуйста, подождите...</h1>
      <p>Нам нужно совсем немного времени, чтобы всё настроить.</p>
      <div class="ob-spinner" aria-hidden="true"></div>
    </div>`;
  setTimeout(() => {
    finishOnboarding(data);
    go('ready');
  }, 1400);
}

function renderReady(data) {
  const name = data.firstName.trim() || getState().profile?.name || 'Камила';
  const photo = data.photos.find(Boolean) || getState().profile?.photo || defaultProfile.photo;
  const tags = (getState().profile?.tags || ['кофе', 'прогулки', 'книги']).slice(0, 3);
  view.innerHTML = `
    <div class="ob-form ready">
      <button class="ob-back" type="button" data-back="processing"><i class="ti ti-chevron-left"></i></button>
      <div class="ob-ready-visual">
        ${tags.map((tag, index) => `<span class="ob-ready-tag t${index + 1}">${esc(tag)}</span>`).join('')}
        <div class="ob-polaroid">
          <img src="${esc(photo)}" alt="">
          <b>${esc(name)}</b>
        </div>
        <span class="ob-loc"><i class="ti ti-map-pin"></i> Ташкент, Мирабад</span>
      </div>
      <h1>Всё готово — посмотрим,<br>кто рядом.</h1>
      <p class="ob-sub">Теперь можно знакомиться с новыми подругами.</p>
      <button class="ob-next on" id="enterApp">Далее</button>
    </div>`;
  view.querySelector('#enterApp').onclick = () => navigate('people');
  view.querySelector('[data-back]').onclick = () => go('prompts');
}

export function startOnboardingFlow() {
  saveState({
    ...getState(),
    onboarded: false,
    onboardingStep: 'start',
    onboardingDraft: {
      location: false,
      notifications: false,
      firstName: '',
      lastName: '',
      birthday: '',
      gender: 'woman',
      photos: [null, null, null, null, null, null],
      answers: ['', '', '', '']
    }
  });
  navigate('onboarding');
}
