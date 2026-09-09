import { registerScreens, navigate, goBack, render } from './router.js';
import { view, header, showError } from './dom.js';
import { decide, blockPerson, reportPerson } from './actions.js';
import { saveProfile } from './repository.js';
import { chats } from './data.js';
import { peopleScreen, personScreen, filtersScreen, connectedScreen, getPersonById, showSkippedPeople } from './screens/discover.js';
import {
  showPersonMenu,
  showBlockConfirm,
  showReportSent,
  showReportFlow,
  closeSafetyOverlay
} from './screens/safety.js';
import {
  groupsScreen,
  groupScreen,
  eventsScreen,
  eventScreen,
  createGroupScreen,
  joinGroupScreen,
  groupChatScreen,
  groupThreadScreen,
  groupHubScreen,
  groupPostsScreen,
  createPostScreen,
  groupSearchScreen,
  groupSettingsScreen,
  organizeRoomsScreen,
  postCommentsScreen,
  inviteFriendsScreen,
  inviteSheetScreen,
  inviteDmScreen,
  groupPinsScreen,
  createEventScreen,
  leaveGroupConfirm
} from './screens/groups.js';
import { chatsScreen, chatScreen, searchChatsScreen, newDmScreen, activityScreen, showMessageMenu, closeMessageMenu, groupNotificationsScreen } from './screens/chats.js';
import { verifyScreen, startVerification } from './screens/verify.js';
import {
  meScreen,
  settingsScreen,
  editScreen,
  editPhotosScreen,
  friendsScreen,
  promptsScreen,
  promptPickerScreen,
  cameraRollScreen,
  basicInfoScreen,
  blockedScreen,
  darkModeScreen,
  notificationsScreen,
  accountScreen,
  announcementsScreen,
  shareProfileScreen,
  showFeedbackSheet,
  showAddEmailSheet,
  showDeleteAccountDialog,
  showAnnouncementLatest,
  closeSettingsOverlay,
  applyStoredTheme
} from './screens/me.js';
import { onboardingScreen, startOnboardingFlow } from './screens/onboarding.js';

const telegram = window.Telegram?.WebApp;
try {
  telegram?.ready();
  telegram?.expand();
  // Подстраховка: не даём content-safe-area раздуть padding до пустого экрана.
  const top = Number(telegram?.safeAreaInset?.top || 0);
  if (top > 0 && top < 120) {
    document.documentElement.style.setProperty('--tg-safe-area-inset-top', `${top}px`);
  }
} catch (_) {
  /* ignore Telegram bridge errors */
}
applyStoredTheme();

registerScreens({
  people: peopleScreen,
  person: personScreen,
  filters: filtersScreen,
  connected: connectedScreen,
  groups: groupsScreen,
  group: groupScreen,
  events: eventsScreen,
  event: eventScreen,
  chats: chatsScreen,
  chat: chatScreen,
  search: searchChatsScreen,
  'new-dm': newDmScreen,
  'create-group': createGroupScreen,
  'join-group': joinGroupScreen,
  'group-chat': groupChatScreen,
  'group-thread': groupThreadScreen,
  'group-hub': groupHubScreen,
  'group-posts': groupPostsScreen,
  'create-post': createPostScreen,
  'group-search': groupSearchScreen,
  'group-settings': groupSettingsScreen,
  'organize-rooms': organizeRoomsScreen,
  'post-comments': postCommentsScreen,
  'invite-friends': inviteFriendsScreen,
  'invite-sheet': inviteSheetScreen,
  'invite-dm': inviteDmScreen,
  'group-pins': groupPinsScreen,
  'create-event': createEventScreen,
  activity: activityScreen,
  me: meScreen,
  settings: settingsScreen,
  blocked: blockedScreen,
  'dark-mode': darkModeScreen,
  notifications: notificationsScreen,
  account: accountScreen,
  announcements: announcementsScreen,
  'share-profile': shareProfileScreen,
  'edit-photos': editPhotosScreen,
  'group-notifications': groupNotificationsScreen,
  edit: editScreen,
  friends: friendsScreen,
  prompts: promptsScreen,
  'prompt-picker': promptPickerScreen,
  'camera-roll': cameraRollScreen,
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
  if (action === 'save-profile') return submitProfile();
  if (action === 'close-sheet') {
    closeSafetyOverlay();
    closeSettingsOverlay();
    closeMessageMenu();
    return;
  }
  if (action === 'message-menu') {
    const chatId = Number(target.dataset.chat || 0);
    const chat = chats[chatId] || chats.find(item => item.personId === Number(id)) || chats[0];
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
  if (action === 'verify-start') {
    startVerification();
    return;
  }
  if (action === 'feedback') return showFeedbackSheet();
  if (action === 'add-email') return showAddEmailSheet();
  if (action === 'delete-account') return showDeleteAccountDialog();
  if (action === 'leave-group') return leaveGroupConfirm(id);
  if (action === 'announcement-latest') return showAnnouncementLatest();
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
