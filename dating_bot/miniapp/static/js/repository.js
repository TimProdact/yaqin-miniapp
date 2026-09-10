import { api, isLive } from './api.js';
import { people as demoPeople, defaultProfile } from './data.js';
import { getState, saveState } from './state.js';
import { interestsOf } from './profile-fields.js';

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
    purposeType: item.purpose_type ?? item.purposeType,
    interests: item.interests || [],
    height: item.height,
    worldView: item.world_view ?? item.worldView,
    zodiacSign: item.zodiac_sign ?? item.zodiacSign,
    education: item.education,
    hasChildren: item.has_children ?? item.hasChildren,
    alcoholAttitude: item.alcohol_attitude ?? item.alcoholAttitude,
    smokingAttitude: item.smoking_attitude ?? item.smokingAttitude,
    languages: item.languages || [],
    photo,
    photos: [photo]
  };
}

export async function loadPeople({ includeSkipped = false } = {}) {
  const { blocked, skipped, filters } = getState();
  const hidden = includeSkipped ? [...blocked] : [...blocked, ...skipped];
  const candidates = isLive ? (await api.discover()).items.map(toPerson) : demoPeople;
  return candidates.filter(person => {
    if (hidden.includes(person.id)) return false;
    if (person.age < filters.ageMin || person.age > filters.ageMax) return false;
    const km = person.distanceKm ?? 10;
    if (km > (filters.distance || 50)) return false;
    const interests = filters.interests || [];
    if (interests.length) {
      const bag = interestsOf(person).map(item => String(item).toLowerCase());
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
    return { status: verification?.status || 'pending', stage: verification?.stage || 'none' };
  }
  const { verification_status: status, verification_stage: stage } = await api.me();
  return { status, stage };
}

export async function saveProfile(payload) {
  if (!isLive) {
    const state = getState();
    const prev = state.profile || {};
    const next = {
      ...prev,
      ...payload,
      bio: payload.about ?? payload.bio ?? prev.bio
    };
    if (payload.about !== undefined) delete next.about;
    saveState({ ...state, profile: next });
    return;
  }
  await api.updateMe(payload);
}

export function saveDemoVerification(verification) {
  saveState({ ...getState(), verification });
}

export async function sendLike(id) {
  if (!isLive) return { mutual: true };
  return api.like(id);
}
