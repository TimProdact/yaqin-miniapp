import { registerScreens, navigate, goBack, render } from './router.js';
import { view, header, showError } from './dom.js';
import { decide, blockPerson, reportPerson } from './actions.js';
import { saveProfile } from './repository.js';
import { getChatByIndex } from './match.js';
import { peopleScreen, personScreen, filtersScreen, cityScreen, connectedScreen, getPersonById, showSkippedPeople } from './screens/discover.js';
import {
  showPersonMenu,
  showBlockConfirm,
  showReportSent,
  showReportFlow,
  closeSafetyOverlay
} from './screens/safety.js';
import { taneeshEventsScreen, taneeshEventDetailScreen, ticketCheckoutScreen, ticketScreen, eventInviteScreen } from './screens/taneesh-events.js';
import { chatsScreen, chatScreen, searchChatsScreen, newDmScreen, showMessageMenu, closeMessageMenu } from './screens/chats.js';
import { createGroupScreen, createEventScreen, groupChatScreen, groupHubScreen, groupsScreen } from './screens/community.js';
import { verifyScreen } from './screens/verify.js';
import {
  meScreen,
  settingsScreen,
  profileHubScreen,
  editScreen,
  editPhotosScreen,
  basicInfoScreen,
  blockedScreen,
  darkModeScreen,
  languageScreen,
  notificationsScreen,
  accountScreen,
  showFeedbackSheet,
  showAddEmailSheet,
  showDeleteAccountDialog,
  closeSettingsOverlay,
  consumeSettingsOverlayBack,
  applyStoredTheme,
  applyStoredLocale,
  privacyScreen,
  helpScreen,
  legalScreen
} from './screens/me.js';
import { onboardingScreen } from './screens/onboarding.js';
import { getState } from './state.js';
import {
  applyPendingDeepLink,
  readLaunchDeepLink,
  stashPendingDeepLink
} from './deep-link.js';

const telegram = window.Telegram?.WebApp;

function applyTelegramSafeArea() {
  try {
    const root = document.documentElement;
    const safeTop = Number(telegram?.safeAreaInset?.top || 0);
    const contentTop = Number(telegram?.contentSafeAreaInset?.top || 0);
    const safeBottom = Number(telegram?.safeAreaInset?.bottom || 0);
    const contentBottom = Number(telegram?.contentSafeAreaInset?.bottom || 0);

    const cappedSafe = Math.min(Math.max(safeTop, 0), 59);
    const cappedContent = Math.min(Math.max(contentTop, 0), 72);
    let top = cappedSafe + cappedContent;

    const inTelegram = Boolean(telegram?.initDataUnsafe || telegram?.initData || telegram?.platform);
    // В Telegram без insets всё равно нужен небольшой верхний отступ под шапку WebView
    if (inTelegram && top < 8) top = 12;
    if (!inTelegram && top === 0) top = 0;
    if (top > 100) top = 100;

    const bottom = Math.min(
      Math.max(safeBottom, 0) + Math.min(Math.max(contentBottom, 0), 34),
      64
    );

    root.style.setProperty('--tg-safe-area-inset-top', `${cappedSafe}px`);
    root.style.setProperty('--tg-content-safe-area-inset-top', `${cappedContent}px`);
    root.style.setProperty('--yaqin-safe-top', `${top}px`);
    root.style.setProperty('--yaqin-safe-bottom', `${Math.max(bottom, 0)}px`);
  } catch (_) {
    /* ignore Telegram bridge errors */
  }
}

try {
  telegram?.ready();
  telegram?.expand();
  applyTelegramSafeArea();
  telegram?.onEvent?.('safeAreaChanged', applyTelegramSafeArea);
  telegram?.onEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);
  telegram?.onEvent?.('viewportChanged', applyTelegramSafeArea);
  telegram?.onEvent?.('fullscreenChanged', applyTelegramSafeArea);
} catch (_) {
  /* ignore */
}
applyStoredTheme();
applyStoredLocale();

window.addEventListener('yaqin:tg-back', () => {
  if (consumeSettingsOverlayBack()) return;
  goBack();
});

registerScreens({
  people: peopleScreen,
  person: personScreen,
  filters: filtersScreen,
  city: cityScreen,
  connected: connectedScreen,
  events: taneeshEventsScreen,
  event: taneeshEventDetailScreen,
  checkout: ticketCheckoutScreen,
  ticket: ticketScreen,
  'create-event': () => createEventScreen(null),
  'edit-event': createEventScreen,
  chats: chatsScreen,
  chat: chatScreen,
  search: searchChatsScreen,
  'new-dm': newDmScreen,
  'create-group': () => createGroupScreen(null),
  'edit-group': createGroupScreen,
  'group-chat': groupChatScreen,
  group: groupHubScreen,
  groups: groupsScreen,
  me: meScreen,
  settings: settingsScreen,
  'my-tickets': () => profileHubScreen('tickets'),
  'my-wanting': () => profileHubScreen('wanting'),
  'my-events': () => profileHubScreen('events'),
  'my-groups': () => profileHubScreen('groups'),
  blocked: blockedScreen,
  'dark-mode': darkModeScreen,
  language: languageScreen,
  notifications: notificationsScreen,
  account: accountScreen,
  privacy: privacyScreen,
  help: helpScreen,
  legal: legalScreen,
  'edit-photos': editPhotosScreen,
  edit: editScreen,
  basic: basicInfoScreen,
  onboarding: onboardingScreen,
  verify: verifyScreen,
  'event-invite': eventInviteScreen
});

function parseRouteId(id) {
  if (id === undefined || id === '') return undefined;
  if (/^-?\d+$/.test(String(id))) return Number(id);
  return id;
}

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
  if (action === 'save-profile') return submitProfile();
  if (action === 'close-sheet') {
    closeSafetyOverlay();
    closeSettingsOverlay();
    closeMessageMenu();
    return;
  }
  if (action === 'message-menu') {
    const chatId = Number(target.dataset.chat || 0);
    const chat = getChatByIndex(chatId);
    const message = chat?.messages?.[Number(target.dataset.msg || 0)];
    return showMessageMenu(person || { id: Number(id), name: message?.name, photo: chat?.photo }, message, chatId);
  }
  if (action === 'person-menu' && person) return showPersonMenu(person);
  if (action === 'block-confirm' && person) return showBlockConfirm(person);
  if (action === 'block-user') return blockPerson(id);
  if (action === 'report-flow' && person) return showReportFlow(person);
  if (action === 'report-user' && person) {
    const sent = await reportPerson(id);
    if (sent) showReportSent(person);
    return;
  }
  if (action === 'show-skipped') return showSkippedPeople();
  if (action === 'verify' || action === 'verify-start') {
    return navigate('me');
  }
  if (action === 'feedback') return showFeedbackSheet();
  if (action === 'add-email') return showAddEmailSheet();
  if (action === 'delete-account') return showDeleteAccountDialog();
  if (action === 'checkout' || action === 'ticket') {
    closeSettingsOverlay();
    closeSafetyOverlay();
    closeMessageMenu();
    return navigate(action, parseRouteId(id));
  }
  closeSettingsOverlay();
  closeSafetyOverlay();
  closeMessageMenu();
  return navigate(action, parseRouteId(id));
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

const launchLink = readLaunchDeepLink();
if (launchLink) stashPendingDeepLink(launchLink);

if (!getState().onboarded) {
  navigate('onboarding');
} else {
  applyPendingDeepLink(navigate);
}
