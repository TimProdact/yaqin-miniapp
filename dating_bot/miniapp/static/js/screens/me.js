import { defaultProfile, groups, people, promptPhoto } from '../data.js';
import { getState } from '../state.js';
import { view, esc, setBackTitle, clearHeader, chipList } from '../dom.js';

export function meScreen() {
  const state = getState();
  const profile = { ...defaultProfile, ...(state.profile || {}) };

  clearHeader();
  view.innerHTML = `
    <div class="me-page">
      <div class="me-top">
        <h1>Me</h1>
        <div><button>↗</button><button data-action="settings">⚙</button></div>
      </div>
      <div class="me-tabs">
        <button class="active">My Profile</button>
        <button data-action="events">My Events</button>
        <button data-action="friends">My Friends</button>
      </div>
      <div class="me-hero">
        <img src="${esc(profile.photo)}">
        <button class="edit-profile" data-action="edit">Edit profile</button>
      </div>
      <section class="me-info">
        <h2>${esc(profile.name)}</h2>
        <p>${profile.age} • ${esc(profile.city)}</p>
        <p class="me-bio">${esc(profile.bio)}</p>
      </section>
      <section class="me-section">
        <h3>About me</h3>
        <div class="me-box">
          <h4>What I'm into</h4>
          <div class="big-chips">${chipList(profile.tags)}</div>
          <h4>Looking to</h4>
          <div class="big-chips">${chipList(profile.looking)}</div>
        </div>
      </section>
      <section class="me-section">
        <h3>Photo prompts</h3>
        <div class="prompt-card" data-action="prompts">
          <img src="${esc(promptPhoto)}">
          <p>Your camera roll's recent food highlights</p>
        </div>
      </section>
      <section class="me-section">
        <h3>My groups</h3>
        <div class="groups-row">
          ${groups.slice(0, 2).map(group => `
            <div><img src="${esc(group.photo)}"><span>${esc(group.title)}</span></div>`).join('')}
        </div>
      </section>
      <section class="me-section">
        <h3>Basic info</h3>
        <div class="me-box"><h4>Gender</h4><div class="big-chips"><span>Woman</span></div></div>
      </section>
    </div>`;
}

export function settingsScreen() {
  setBackTitle('Settings');
  view.innerHTML = `
    <div class="settings-list">
      <button>Account <span>›</span></button>
      <button>Notifications <span>›</span></button>
      <button>Privacy and safety <span>›</span></button>
      <button>About Yaqin <span>›</span></button>
      <button class="danger">Log out</button>
    </div>`;
}

export function editScreen() {
  const profile = { ...defaultProfile, ...(getState().profile || {}) };
  setBackTitle('Edit profile');
  view.innerHTML = `
    <div class="screen-content form">
      <input class="input" placeholder="Name" value="${esc(profile.name)}">
      <input class="input" placeholder="City" value="${esc(profile.city)}">
      <textarea class="textarea">${esc(profile.bio)}</textarea>
      <button class="button" data-action="me">Save changes</button>
    </div>`;
}

export function friendsScreen() {
  setBackTitle('My friends');
  view.innerHTML = `
    <div class="screen-content">
      <h1>My Friends</h1>
      ${people.slice(1).map(person => `
        <div class="match-row">
          <img class="match-photo" src="${esc(person.photo)}">
          <div class="match-info"><b>${esc(person.name)}</b><span>${esc(person.city)}</span></div>
        </div>`).join('')}
    </div>`;
}

export function promptsScreen() {
  setBackTitle('Photo prompts');
  view.innerHTML = `
    <div class="screen-content">
      <h1>Photo prompts</h1>
      <div class="prompt-card">
        <img src="${esc(promptPhoto)}">
        <p>Your camera roll's recent food highlights</p>
      </div>
    </div>`;
}

export function basicInfoScreen() {
  setBackTitle('Basic info');
  view.innerHTML = `
    <div class="screen-content me-box">
      <h4>Work</h4><div class="big-chips"><span>Lab Scientist</span></div>
      <h4>Pronouns</h4><div class="big-chips"><span>she/her</span></div>
      <h4>Gender</h4><div class="big-chips"><span>Woman</span></div>
      <h4>Relationship</h4><div class="big-chips"><span>Single</span></div>
    </div>`;
}

export function onboardingScreen() {
  clearHeader();
  view.innerHTML = `
    <div class="onboarding">
      <div class="onboarding-mark">✿</div>
      <h1>Welcome to Yaqin</h1>
      <p>Meet people, find friends and make your city feel closer.</p>
      <button class="button" data-action="people">Create profile</button>
      <small>Only for users 18+</small>
    </div>`;
}
