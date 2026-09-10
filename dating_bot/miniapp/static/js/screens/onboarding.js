import { defaultProfile, promptPhoto } from '../data.js';
import { getState, saveState } from '../state.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';

/** Короткий онбординг воронки: имя → возраст → женщина → 2 фото → готово. */

function draft() {
  const state = getState();
  return {
    firstName: '',
    birthday: '',
    confirmedWoman: false,
    photos: [null, null],
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
      bio: defaultProfile.bio,
      interests: defaultProfile.interests,
      purposeType: defaultProfile.purposeType || 3
    }
  });
}

export function onboardingScreen() {
  clearHeader();
  const step = getState().onboardingStep || 'welcome';
  const data = draft();

  if (step === 'welcome') return renderWelcome();
  if (step === 'name') return renderName(data);
  if (step === 'birthday') return renderBirthday(data);
  if (step === 'gender') return renderGender(data);
  if (step === 'photos') return renderPhotos(data);
  return renderReady(data);
}

function renderWelcome() {
  view.innerHTML = `
    <div class="ob-start">
      <div class="ob-brand">
        <span class="ob-mark">✿</span>
        <b>Yaqin</b>
      </div>
      <section class="ob-card">
        <h1>Знакомства и события для женщин</h1>
        <p class="ob-sub" style="margin:0 0 18px">Короткий профиль — и можно смотреть людей рядом.</p>
        <button class="ob-next on" id="startNext">Начать</button>
        <button class="ob-link" type="button" id="skipAccount">Уже есть аккаунт?</button>
      </section>
    </div>`;

  view.querySelector('#startNext').onclick = () => go('name');
  view.querySelector('#skipAccount').onclick = () => {
    saveState({
      ...getState(),
      onboarded: true,
      profile: { ...defaultProfile, ...(getState().profile || {}) }
    });
    navigate('people');
  };
}

function renderName(data) {
  const ready = data.firstName.trim().length > 1;
  view.innerHTML = `
    <div class="ob-form">
      <button class="ob-back" type="button" data-back="welcome"><i class="ti ti-chevron-left"></i></button>
      <h1>Как тебя зовут?</h1>
      <p class="ob-sub">В анкете будет видно только имя.</p>
      <input class="ob-input" id="firstName" placeholder="Имя" maxlength="40" value="${esc(data.firstName)}">
      <button class="ob-next ${ready ? 'on' : ''}" id="nameNext" ${ready ? '' : 'disabled'}>Далее</button>
    </div>`;

  const sync = () => {
    const firstName = view.querySelector('#firstName').value;
    const ok = firstName.trim().length > 1;
    saveDraft({ ...data, firstName });
    const btn = view.querySelector('#nameNext');
    btn.disabled = !ok;
    btn.classList.toggle('on', ok);
  };
  view.querySelector('#firstName').oninput = sync;
  view.querySelector('#nameNext').onclick = () => {
    if (view.querySelector('#nameNext').disabled) return;
    go('birthday');
  };
  view.querySelector('[data-back]').onclick = () => go('welcome');
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
        <h1>Сколько тебе лет?</h1>
        <p class="ob-sub">Укажи дату рождения — возраст появится сам.</p>
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
  const ready = data.confirmedWoman;
  view.innerHTML = `
    <div class="ob-form">
      <button class="ob-back" type="button" data-back="birthday"><i class="ti ti-chevron-left"></i></button>
      <h1>Yaqin — для женщин</h1>
      <p class="ob-sub">Подтвердите, что вы женщина. Это сообщество только для женщин.</p>
      <div class="ob-choices">
        <button type="button" class="ob-choice stacked ${data.confirmedWoman ? 'on' : ''}" id="confirmWoman">
          <b>Да, я женщина</b>
          <small>Можно продолжить</small>
        </button>
      </div>
      <button class="ob-next ${ready ? 'on' : ''}" id="genderNext" ${ready ? '' : 'disabled'}>Далее</button>
    </div>`;

  view.querySelector('#confirmWoman').onclick = () => {
    saveDraft({ ...data, confirmedWoman: true });
    go('gender');
  };
  view.querySelector('#genderNext').onclick = () => {
    if (!data.confirmedWoman) return;
    go('photos');
  };
  view.querySelector('[data-back]').onclick = () => go('birthday');
}

function renderPhotos(data) {
  const filled = data.photos.filter(Boolean).length;
  const ready = filled >= 2;
  const demos = [defaultProfile.photo, promptPhoto, defaultProfile.photos?.[2], defaultProfile.photos?.[3]].filter(Boolean);
  const slots = [...data.photos];
  while (slots.length < 2) slots.push(null);

  view.innerHTML = `
    <div class="ob-form photos">
      <button class="ob-back" type="button" data-back="gender"><i class="ti ti-chevron-left"></i></button>
      <h1>Два фото профиля</h1>
      <p class="ob-sub">Хватит двух — главное, чтобы было видно лицо.</p>
      <div class="ob-photo-grid" style="grid-template-columns:1fr 1fr">
        ${slots.map((photo, index) => photo
          ? `<button type="button" class="ob-photo filled" data-clear="${index}">
              <img src="${esc(photo)}" alt="">
              ${index === 0 ? '<span class="ob-main"><i class="ti ti-shield-check"></i> Главное</span>' : ''}
            </button>`
          : `<button type="button" class="ob-photo empty ${index === 0 ? 'main' : ''}" data-add="${index}">
              ${index === 0 ? '<span class="ob-main"><i class="ti ti-shield-check"></i> Главное</span>' : ''}
              <i class="ti ti-plus"></i>
            </button>`
        ).join('')}
      </div>
      <button class="ob-next ${ready ? 'on' : ''}" id="photosNext" ${ready ? '' : 'disabled'}>Готово</button>
    </div>`;

  view.querySelectorAll('[data-add]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.add);
      const photos = [...slots];
      photos[index] = demos[index % demos.length];
      saveDraft({ ...data, photos });
      go('photos');
    };
  });
  view.querySelectorAll('[data-clear]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.clear);
      const photos = [...slots];
      photos[index] = null;
      saveDraft({ ...data, photos });
      go('photos');
    };
  });
  view.querySelector('#photosNext').onclick = () => {
    if (!ready) return;
    finishOnboarding({ ...data, photos: slots });
    go('ready');
  };
  view.querySelector('[data-back]').onclick = () => go('gender');
}

function renderReady(data) {
  const name = data.firstName.trim() || getState().profile?.name || 'Камила';
  const photo = data.photos.find(Boolean) || getState().profile?.photo || defaultProfile.photo;
  view.innerHTML = `
    <div class="ob-form ready">
      <div class="ob-ready-visual">
        <div class="ob-polaroid">
          <img src="${esc(photo)}" alt="">
          <b>${esc(name)}</b>
        </div>
      </div>
      <h1>Готово — посмотрим,<br>кто рядом.</h1>
      <p class="ob-sub">Можно знакомиться и ходить на события.</p>
      <button class="ob-next on" id="enterApp">Смотреть людей</button>
    </div>`;
  view.querySelector('#enterApp').onclick = () => navigate('people');
}

export function startOnboardingFlow() {
  saveState({
    ...getState(),
    onboarded: false,
    onboardingStep: 'welcome',
    onboardingDraft: {
      firstName: '',
      birthday: '',
      confirmedWoman: false,
      photos: [null, null]
    }
  });
  navigate('onboarding');
}
