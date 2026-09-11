import { getState, saveState } from './state.js';

/** prefs: { muted: { [key]: true }, archived: {}, pinned: {} } */
function prefs() {
  return {
    muted: {},
    archived: {},
    pinned: {},
    ...(getState().chatPrefs || {})
  };
}

function writePrefs(next) {
  saveState({ ...getState(), chatPrefs: next });
}

export function chatPrefKey(row) {
  if (row.kind === 'team' || row.team) return 'team';
  if (row.kind === 'dm') return `dm:${row.personId ?? row.id}`;
  if (row.kind === 'group') return `group:${row.id}`;
  if (row.kind === 'event') return `event:${row.id}`;
  return `x:${row.key || row.id}`;
}

export function isChatMuted(key) {
  return Boolean(prefs().muted[key]);
}

export function isChatArchived(key) {
  return Boolean(prefs().archived[key]);
}

export function isChatPinned(key) {
  return Boolean(prefs().pinned[key]);
}

export function toggleChatMute(key) {
  const next = prefs();
  if (next.muted[key]) delete next.muted[key];
  else next.muted[key] = true;
  writePrefs(next);
  return Boolean(next.muted[key]);
}

export function toggleChatArchive(key) {
  const next = prefs();
  if (next.archived[key]) delete next.archived[key];
  else next.archived[key] = true;
  writePrefs(next);
  return Boolean(next.archived[key]);
}

export function toggleChatPin(key) {
  const next = prefs();
  if (next.pinned[key]) delete next.pinned[key];
  else next.pinned[key] = true;
  writePrefs(next);
  return Boolean(next.pinned[key]);
}
