import { registerScreens, navigate, goBack, render } from './router.js';
import { view, header } from './dom.js';
import { decide } from './actions.js';
import { peopleScreen, personScreen, filtersScreen, connectedScreen } from './screens/discover.js';
import { groupsScreen, groupScreen, eventsScreen } from './screens/groups.js';
import { chatsScreen, chatScreen, searchChatsScreen, activityScreen } from './screens/chats.js';
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
  onboarding: onboardingScreen
});

function handleAction(target) {
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === 'like' || action === 'skip') return decide(action, id);
  if (action === 'back') return goBack();
  if (action === 'search') return searchChatsScreen();
  return navigate(action, id === undefined ? undefined : Number(id));
}

document.querySelectorAll('.nav button').forEach(button => {
  button.onclick = () => navigate(button.dataset.tab);
});

[view, header].forEach(root => {
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (target) handleAction(target);
  });
});

render();
