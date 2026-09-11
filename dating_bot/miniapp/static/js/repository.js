import { api, isLive } from './api.js';
import { people as demoPeople, defaultProfile } from './data.js';
import { getState, saveState } from './state.js';
import { interestsOf, lookingOf } from './profile-fields.js';
import { wouldMatch } from './match.js';

const PLACEHOLDER_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">' +
      '<rect width="600" height="800" fill="#ece7ef"/>' +
      '<text x="300" y="420" font-size="180" text-anchor="middle" fill="#b9aec4">✿</text></svg>'
  );

function toPerson(item) {
  const photo = item.photo_url ? api.absoluteUrl(item.photo_url) : PLACEHOLDER_PHOTO;
  return {
    id: item.user_id,
    name: item.name,
    age: item.age,
    city: item.city,
    bio: item.about,
    interests: item.interests || [],
    looking: item.looking || [],
    media: item.media || [],
    work: item.work || '',
    languages: item.languages || [],
    instagram: item.instagram || '',
    tiktok: item.tiktok || '',
    website: item.website || '',
    photo,
    photos: [photo]
  };
}

export async function loadPeople({ includeSkipped = false } = {}) {
  const { blocked, skipped, liked, matches, filters } = getState();
  const hidden = includeSkipped
    ? [...blocked]
    : [...blocked, ...skipped, ...(liked || []), ...(matches || [])];
  const candidates = isLive ? (await api.discover()).items.map(toPerson) : demoPeople;
  return candidates.filter(person => {
    if (hidden.map(Number).includes(Number(person.id))) return false;
    const selectedCity = filters.city || 'Ташкент';
    if (selectedCity !== 'Все') {
      const city = String(person.city || '').toLowerCase();
      if (!city.includes(String(selectedCity).toLowerCase())) return false;
    }
    const km = person.distanceKm ?? 10;
    if (km > (filters.distance || 50)) return false;
    const age = Number(person.age);
    const ageMin = Number(filters.ageMin) || 18;
    const ageMax = Number(filters.ageMax) || 100;
    if (Number.isFinite(age) && (age < ageMin || age > ageMax)) return false;
    const interests = filters.interests || [];
    if (interests.length) {
      const bag = [...interestsOf(person), ...lookingOf(person)].map(item => String(item).toLowerCase());
      const hit = interests.some(interest => bag.some(item => item.includes(String(interest).toLowerCase())));
      if (!hit) return false;
    }
    return true;
  });
}

export function clearSkipped() {
  saveState({ ...getState(), skipped: [] });
}

export function saveFilters(filters) {
  saveState({ ...getState(), filters: { ...getState().filters, ...filters } });
}

export async function loadMatches() {
  if (!isLive) return demoPeople.slice(1);
  const { items } = await api.matches();
  return items.map(toPerson);
}

export async function loadProfile() {
  if (!isLive) return { ...defaultProfile, ...(getState().profile || {}) };
  const { profile } = await api.me();
  if (!profile) return null;
  return { ...toPerson(profile), interests: profile.interests || [] };
}

export async function loadVerification() {
  if (!isLive) {
    const { verification } = getState();
    return { status: verification?.status || 'approved', stage: verification?.stage || 'reviewed' };
  }
  const { verification_status: status, verification_stage: stage } = await api.me();
  return { status, stage };
}

export async function saveProfile(payload) {
  if (!isLive) {
    const state = getState();
    const prev = { ...defaultProfile, ...(state.profile || {}) };
    const next = {
      ...prev,
      ...payload,
      bio: payload.about ?? payload.bio ?? prev.bio,
      age: Number(payload.age ?? prev.age) || prev.age
    };
    if (payload.about !== undefined) delete next.about;
    saveState({ ...state, profile: next });
    return next;
  }
  await api.updateMe(payload);
}

export function saveDemoVerification(verification) {
  saveState({ ...getState(), verification });
}

export async function sendLike(id) {
  if (!isLive) return { mutual: wouldMatch(id) };
  return api.like(id);
}
