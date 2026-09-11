const STORAGE_KEY = 'yaqin-demo-v2';

const initialState = {
  liked: [],
  /** Кто уже передал вам привет (демо-сид). */
  incomingWaves: [1, 3, 7],
  matches: [],
  userChats: [],
  teamMessages: [],
  skipped: [],
  blocked: [],
  profile: null,
  onboarded: false,
  filters: { ageMin: 18, ageMax: 40, distance: 50, interests: [], city: 'Ташкент' },
  theme: { dark: false, followSystem: true },
  /** UI locale: ru | uz | en */
  locale: 'ru',
  email: '',
  notifications: { dm: true, reactions: true },
  announcements: true,
  shakeFeedback: true,
  onboardingStep: 'welcome',
  onboardingDraft: null
};

export function getState() {
  try {
    return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...initialState };
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Сброс демо-хранилища (текущий + legacy ключ). */
export function clearPersistedState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('yaqin-demo');
}

export function addToList(key, id) {
  const state = getState();
  state[key] = [...new Set([...state[key], Number(id)])];
  saveState(state);
  return state;
}

export function removeFromList(key, id) {
  const state = getState();
  const target = Number(id);
  state[key] = (state[key] || []).filter(item => Number(item) !== target);
  saveState(state);
  return state;
}
