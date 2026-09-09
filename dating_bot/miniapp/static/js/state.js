const STORAGE_KEY = 'yaqin-demo';

const initialState = {
  liked: [2],
  skipped: [],
  blocked: [],
  profile: null,
  onboarded: true,
  filters: { ageMin: 18, ageMax: 40, distance: 50 },
  theme: { dark: false, followSystem: true },
  email: '',
  notifications: { dm: true, reactions: true },
  announcements: true,
  shakeFeedback: true,
  onboardingStep: 'start',
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

export function addToList(key, id) {
  const state = getState();
  state[key] = [...new Set([...state[key], Number(id)])];
  saveState(state);
  return state;
}
