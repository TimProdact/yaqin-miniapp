import { addToList } from './state.js';
import { navigate } from './router.js';
import { sendLike } from './repository.js';
import { showError } from './dom.js';

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
