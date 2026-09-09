const screens = new Map();

const FULL_SCREEN_ROUTES = new Set([
  'connected',
  'chat',
  'onboarding',
  'filters',
  'verify',
  'settings',
  'search',
  'new-dm',
  'create-group',
  'join-group',
  'group-chat',
  'group-thread',
  'group-hub',
  'group-posts',
  'create-post',
  'group-search',
  'group-settings',
  'organize-rooms',
  'post-comments',
  'invite-friends',
  'create-event',
  'blocked',
  'dark-mode',
  'notifications',
  'account',
  'announcements',
  'share-profile',
  'edit-photos',
  'group-notifications',
  'edit',
  'prompts',
  'prompt-picker',
  'camera-roll'
]);
const SHEET_ROUTES = new Set(['person', 'group', 'event']);
const PROFILE_OPEN_ROUTES = new Set(['me', 'events', 'friends']);

const TAB_ROUTES = new Set(['people', 'groups', 'chats', 'activity', 'me']);

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

export function navigate(route, id) {
  if (route !== currentRoute) {
    history = TAB_ROUTES.has(route) ? [] : [...history, currentRoute];
  }
  currentRoute = route;
  if (id !== undefined) selectedId = id;
  render();
}

export function goBack() {
  const previous = history.pop() || 'people';
  currentRoute = previous;
  render();
}

export function render() {
  try {
    document.body.dataset.route = currentRoute;
    document.body.classList.toggle('full-screen', FULL_SCREEN_ROUTES.has(currentRoute));
    document.body.classList.toggle('profile-open', PROFILE_OPEN_ROUTES.has(currentRoute));
    document.body.classList.toggle('sheet-view', SHEET_ROUTES.has(currentRoute));
    syncNav();
    const screen = screens.get(currentRoute);
    if (screen) screen(selectedId, ++renderToken);
  } catch (error) {
    console.error(error);
    const view = document.getElementById('view');
    if (view) {
      view.innerHTML = `<div class="yaqin-boot-error" style="position:static;padding:24px"><h1>Ошибка экрана</h1><pre>${String(error?.stack || error)}</pre></div>`;
    }
  }
}

/** Async screens use this to drop results that arrived after the user moved on. */
export function isCurrentRender(token) {
  return token === renderToken;
}

function syncNav() {
  document.querySelectorAll('.nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === currentRoute);
  });
}
