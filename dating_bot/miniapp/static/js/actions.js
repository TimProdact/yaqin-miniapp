import { addToList } from './state.js';
import { navigate } from './router.js';
import { sendLike } from './repository.js';
import { showError } from './dom.js';
import { api, isLive } from './api.js';

export async function decide(action, id) {
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return;

  if (action !== 'like') {
    addToList('skipped', targetId);
    navigate('people');
    return;
  }

  try {
    const { mutual } = await sendLike(targetId);
    addToList('liked', targetId);
    navigate(mutual ? 'connected' : 'people', targetId);
  } catch {
    showError('Симпатия не отправилась. Попробуйте ещё раз.');
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
