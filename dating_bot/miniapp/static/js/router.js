import { unreadChatCount } from './match.js';
import { esc } from './dom.js';
import { syncTelegramBackButton } from './telegram-ui.js';

const screens = new Map();

const FULL_SCREEN_ROUTES = new Set([
  'connected',
  'chat',
  'onboarding',
  'filters',
  'city',
  'verify',
  'settings',
  'my-tickets',
  'my-wanting',
  'my-events',
  'my-groups',
  'search',
  'new-dm',
  'blocked',
  'dark-mode',
  'language',
  'notifications',
  'account',
  'privacy',
  'help',
  'legal',
  'edit-photos',
  'edit',
  'checkout',
  'create-group',
  'edit-group',
  'create-event',
  'edit-event',
  'group-chat'
]);
const SHEET_ROUTES = new Set(['person', 'event', 'group', 'ticket']);
const PROFILE_OPEN_ROUTES = new Set(['me']);
const TAB_ROUTES = new Set(['people', 'events', 'chats', 'groups', 'me']);

/** Старые роуты → живые экраны. */
const LEGACY_REDIRECT = {
  activity: 'people',
  friends: 'me',
  'join-group': 'groups',
  'group-hub': 'groups',
  'group-posts': 'groups',
  'group-thread': 'groups',
  'create-post': 'groups',
  'profile-groups': 'me',
  prompts: 'me',
  'share-profile': 'me',
  announcements: 'settings'
};

let currentRoute = 'people';
let selectedId = null;
let history = [];
let renderToken = 0;

export function registerScreens(definitions) {
  Object.entries(definitions).forEach(([route, screen]) => screens.set(route, screen));
}

export function getRoute() {
  return currentRoute;
}

export function getSelectedId() {
  return selectedId;
}

export function canGoBack() {
  return history.length > 0;
}

export function navigate(route, id) {
  if (LEGACY_REDIRECT[route]) route = LEGACY_REDIRECT[route];
  if (route !== currentRoute) {
    history = TAB_ROUTES.has(route) ? [] : [...history, currentRoute];
  }
  currentRoute = route;
  if (id !== undefined) selectedId = id;
  render();
}

export function goBack() {
  const previous = history.pop() || 'people';
  currentRoute = LEGACY_REDIRECT[previous] || previous;
  render();
}

export function render() {
  try {
    document.body.dataset.route = currentRoute;
    document.body.classList.toggle('tab-shell', TAB_ROUTES.has(currentRoute));
    document.body.classList.toggle('full-screen', FULL_SCREEN_ROUTES.has(currentRoute));
    document.body.classList.toggle('profile-open', PROFILE_OPEN_ROUTES.has(currentRoute));
    document.body.classList.toggle('sheet-view', SHEET_ROUTES.has(currentRoute));
    if (currentRoute !== 'edit'
      && currentRoute !== 'create-event'
      && currentRoute !== 'edit-event'
      && currentRoute !== 'create-group'
      && currentRoute !== 'edit-group') {
      document.body.classList.remove('edit-sheet-open');
    }
    syncNav();
    const isTab = TAB_ROUTES.has(currentRoute);
    syncTelegramBackButton({
      route: currentRoute,
      isTab,
      canGoBack: !isTab
    });
    const screen = screens.get(currentRoute);
    if (screen) screen(selectedId, ++renderToken);
    else {
      currentRoute = 'people';
      screens.get('people')?.(selectedId, ++renderToken);
    }
  } catch (error) {
    console.error(error);
    const view = document.getElementById('view');
    if (view) {
      view.innerHTML = `<div class="yaqin-boot-error" style="position:static;padding:24px"><h1>Ошибка экрана</h1><pre>${esc(String(error?.stack || error))}</pre></div>`;
    }
  }
}

export function isCurrentRender(token) {
  return token === renderToken;
}

function syncNav() {
  document.querySelectorAll('.nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === currentRoute);
  });
  const badge = document.querySelector('.nav button[data-tab="chats"] .badge');
  if (!badge) return;
  const count = unreadChatCount();
  badge.hidden = count < 1;
  badge.textContent = String(count || '');
}
