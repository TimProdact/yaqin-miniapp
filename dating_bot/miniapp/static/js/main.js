import { registerScreens, navigate, goBack, render } from './router.js';
import { view, header, showError } from './dom.js';
import { decide, blockPerson, reportPerson } from './actions.js';
import { saveProfile } from './repository.js';
import { peopleScreen, personScreen, filtersScreen, connectedScreen, getPersonById, showSkippedPeople } from './screens/discover.js';
import {
  showPersonMenu,
  showBlockConfirm,
  showReportSent,
  closeSafetyOverlay
} from './screens/safety.js';
import { groupsScreen, groupScreen, eventsScreen } from './screens/groups.js';
import { chatsScreen, chatScreen, searchChatsScreen, activityScreen } from './screens/chats.js';
import { verifyScreen, startVerification } from './screens/verify.js';
import {
  meScreen,
  settingsScreen,
  editScreen,
  friendsScreen,
  promptsScreen,
  basicInfoScreen,
  onboardingScreen
} from './screens/me.js';

const telegram = window.Telegram?.WebApp;
telegram?.ready();
telegram?.expand();

registerScreens({
  people: peopleScreen,
  person: personScreen,
  filters: filtersScreen,
  connected: connectedScreen,
  groups: groupsScreen,
  group: groupScreen,
  events: eventsScreen,
  chats: chatsScreen,
  chat: chatScreen,
  activity: activityScreen,
  me: meScreen,
  settings: settingsScreen,
  edit: editScreen,
  friends: friendsScreen,
  prompts: promptsScreen,
  basic: basicInfoScreen,
  onboarding: onboardingScreen,
  verify: verifyScreen
});

async function submitProfile() {
  const value = id => view.querySelector(`#${id}`)?.value.trim() ?? '';
  const age = Number(view.querySelector('#profileAge')?.value);
  if (!value('profileName') || !Number.isInteger(age) || age < 18 || age > 100) {
    showError('Проверьте имя и возраст: возраст должен быть от 18 до 100.');
    return;
  }
  try {
    await saveProfile({ name: value('profileName'), age, city: value('profileCity'), about: value('profileAbout') });
    navigate('me');
  } catch {
    showError('Анкета не сохранилась. Попробуйте ещё раз.');
  }
}

async function handleAction(target) {
  const action = target.dataset.action;
  const id = target.dataset.id;
  const person = id !== undefined ? getPersonById(id) : null;

  if (action === 'like' || action === 'skip') return decide(action, id);
  if (action === 'back') return goBack();
  if (action === 'search') return searchChatsScreen();
  if (action === 'save-profile') return submitProfile();
  if (action === 'close-sheet') return closeSafetyOverlay();
  if (action === 'person-menu' && person) return showPersonMenu(person);
  if (action === 'block-confirm' && person) return showBlockConfirm(person);
  if (action === 'block-user') return blockPerson(id);
  if (action === 'report-user' && person) {
    const sent = await reportPerson(id);
    if (sent) showReportSent(person);
    return;
  }
  if (action === 'show-skipped') return showSkippedPeople();
  if (action === 'verify-start') {
    startVerification();
    return;
  }
  return navigate(action, id === undefined ? undefined : Number(id));
}

document.querySelectorAll('.nav button').forEach(button => {
  button.onclick = () => navigate(button.dataset.tab);
});

[view, header, document.body].forEach(root => {
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (target) handleAction(target);
  });
});

render();
