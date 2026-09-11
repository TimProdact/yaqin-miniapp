import { getState, saveState, addToList, removeFromList } from './state.js';
import { people, chats as seedChats } from './data.js';

const TEAM_SEED = [
  { from: 'them', name: 'Команда Yaqin', text: 'Добро пожаловать в Yaqin ✨', time: '2 д' }
];

const TEAM_CHAT_META = {
  personId: null,
  name: 'Команда Yaqin',
  preview: 'Добро пожаловать в Yaqin ✨',
  photo: null,
  unread: false,
  time: '2 д',
  team: true
};

function getTeamChat() {
  const messages = getState().teamMessages?.length ? getState().teamMessages : TEAM_SEED;
  const last = messages[messages.length - 1];
  return {
    ...TEAM_CHAT_META,
    preview: last?.text || (last?.image ? 'Фото' : TEAM_CHAT_META.preview),
    time: last?.time || TEAM_CHAT_META.time,
    messages: [...messages]
  };
}

export function hasIncomingWave(personId) {
  return (getState().incomingWaves || []).map(Number).includes(Number(personId));
}

export function hasOutgoingWave(personId) {
  return (getState().liked || []).map(Number).includes(Number(personId));
}

export function isMatched(personId) {
  return (getState().matches || []).map(Number).includes(Number(personId));
}

/** Взаимный привет: она уже помахала тебе. */
export function wouldMatch(personId) {
  return hasIncomingWave(personId);
}

export function listDmChats() {
  return [...(getState().userChats || [])];
}

export function listVisibleChats() {
  // Команда Yaqin всегда первой в списке индексов/экрана
  return [getTeamChat(), ...listDmChats()];
}

export function chatIndexForPerson(personId) {
  const list = listVisibleChats();
  const index = list.findIndex(chat => chat.personId === Number(personId));
  return index >= 0 ? index : -1;
}

export function getChatByIndex(index) {
  return listVisibleChats()[Number(index)] || null;
}

function seedMessagesFor(personId) {
  const seed = seedChats.find(chat => chat.personId === Number(personId));
  return seed?.messages ? [...seed.messages] : [];
}

/** Создать ЛС после мэтча (идемпотентно). */
export function ensureMatchChat(person) {
  if (!person?.id) return null;
  const state = getState();
  const chats = [...(state.userChats || [])];
  let chat = chats.find(item => item.personId === Number(person.id));
  if (!chat) {
    const messages = seedMessagesFor(person.id);
    chat = {
      personId: Number(person.id),
      name: person.name,
      preview: messages.length ? (messages[messages.length - 1].text || 'Вы познакомились') : 'Вы познакомились',
      photo: person.photo,
      unread: true,
      time: 'сейчас',
      messages
    };
    chats.unshift(chat);
  }
  const matches = [...new Set([...(state.matches || []).map(Number), Number(person.id)])];
  saveState({ ...state, userChats: chats, matches });
  return chat;
}

export function registerOutgoingWave(personId) {
  addToList('liked', personId);
}

export function clearOutgoingWave(personId) {
  removeFromList('liked', personId);
}

export function completeMatch(person) {
  registerOutgoingWave(person.id);
  ensureMatchChat(person);
  return true;
}

export function findPersonById(id) {
  return people.find(person => person.id === Number(id)) || null;
}

export function matchedPeople() {
  const ids = new Set((getState().matches || []).map(Number));
  return people.filter(person => ids.has(person.id));
}

export function unreadChatCount() {
  return listDmChats().filter(chat => chat.unread).length;
}

export function appendChatMessage(personId, message) {
  if (personId == null || personId === 'team') {
    return appendTeamMessage(message);
  }
  const state = getState();
  const chats = (state.userChats || []).map(chat => ({ ...chat, messages: [...(chat.messages || [])] }));
  const chat = chats.find(item => item.personId === Number(personId));
  if (!chat) return null;
  chat.messages.push(message);
  chat.preview = message.text || (message.image ? 'Фото' : 'Сообщение');
  chat.time = 'сейчас';
  chat.unread = false;
  saveState({ ...state, userChats: chats });
  return chat;
}

export function appendTeamMessage(message) {
  const state = getState();
  const messages = [...(state.teamMessages?.length ? state.teamMessages : TEAM_SEED), message];
  saveState({ ...state, teamMessages: messages });
  return getTeamChat();
}

export function markChatRead(personId) {
  const state = getState();
  const chats = (state.userChats || []).map(chat =>
    chat.personId === Number(personId) ? { ...chat, unread: false } : chat
  );
  saveState({ ...state, userChats: chats });
}

export function showWaveBanner(text) {
  document.getElementById('wave-banner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'wave-banner';
  banner.className = 'yaqin-toast';
  banner.textContent = text;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('on'));
  setTimeout(() => {
    banner.classList.remove('on');
    setTimeout(() => banner.remove(), 220);
  }, 2200);
}
