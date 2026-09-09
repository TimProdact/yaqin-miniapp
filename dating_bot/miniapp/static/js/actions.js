import { addToList } from './state.js';
import { navigate } from './router.js';

export function decide(action, id) {
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return;
  if (action === 'like') {
    addToList('liked', targetId);
    navigate('connected', targetId);
    return;
  }
  addToList('skipped', targetId);
  navigate('people');
}
