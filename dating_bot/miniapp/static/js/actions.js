import { addToList } from './state.js';
import { navigate } from './router.js';
import { sendLike } from './repository.js';
import { showError } from './dom.js';
import { api, isLive } from './api.js';
import {
  completeMatch,
  registerOutgoingWave,
  clearOutgoingWave,
  showWaveBanner,
  findPersonById,
  isMatched,
  hasOutgoingWave,
  chatIndexForPerson
} from './match.js';

export async function decide(action, id) {
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return;

  if (action !== 'like') {
    addToList('skipped', targetId);
    navigate('people');
    return;
  }

  if (isMatched(targetId)) {
    const index = chatIndexForPerson(targetId);
    if (index >= 0) navigate('chat', index);
    else navigate('chats');
    return;
  }

  try {
    const { mutual } = await sendLike(targetId);
    if (mutual) {
      const person = findPersonById(targetId);
      if (person) completeMatch(person);
      else registerOutgoingWave(targetId);
      navigate('connected', targetId);
      return;
    }
    registerOutgoingWave(targetId);
    showWaveBanner('Вы передали привет');
    navigate('people');
  } catch {
    showError('Привет не отправился. Попробуйте ещё раз.');
  }
}

/** Передать / снять привет, оставаясь на анкете. */
export async function togglePersonWave(id) {
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return { ok: false };

  if (isMatched(targetId)) {
    const index = chatIndexForPerson(targetId);
    if (index >= 0) navigate('chat', index);
    else navigate('chats');
    return { ok: true, matched: true };
  }

  if (hasOutgoingWave(targetId)) {
    clearOutgoingWave(targetId);
    showWaveBanner('Вы сняли привет');
    return { ok: true, sent: false };
  }

  try {
    const { mutual } = await sendLike(targetId);
    if (mutual) {
      const person = findPersonById(targetId);
      if (person) completeMatch(person);
      else registerOutgoingWave(targetId);
      navigate('connected', targetId);
      return { ok: true, matched: true };
    }
    registerOutgoingWave(targetId);
    showWaveBanner('Вы передали привет');
    return { ok: true, sent: true };
  } catch {
    showError('Привет не отправился. Попробуйте ещё раз.');
    return { ok: false };
  }
}

export async function blockPerson(id) {
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return;

  addToList('blocked', targetId);
  if (isLive) {
    try {
      await api.block(targetId);
    } catch {
      showError('Не удалось заблокировать. Попробуйте ещё раз.');
      return;
    }
  }
  closeSafetyOverlaySafe();
  showBlockBanner();
  navigate('people');
}

function closeSafetyOverlaySafe() {
  try {
    document.querySelector('.safety-overlay')?.remove();
    document.body.classList.remove('safety-open');
  } catch (_) { /* ignore */ }
}

function showBlockBanner() {
  document.getElementById('block-banner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'block-banner';
  banner.className = 'block-banner';
  banner.textContent = 'Пользователь заблокирован';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 2200);
}

export async function reportPerson(id) {
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return false;

  if (isLive) {
    try {
      await api.report(targetId);
    } catch {
      showError('Жалоба не отправилась. Попробуйте ещё раз.');
      return false;
    }
  }
  return true;
}
