const SWIPE_THRESHOLD = 90;

export function enableSwipe(onDecision, { onTap } = {}) {
  const card = document.querySelector('.profile-card');
  if (!card) return;

  let startX = null;
  let startY = null;

  card.onpointerdown = event => {
    if (event.target.closest('[data-action]')) return;
    startX = event.clientX;
    startY = event.clientY;
    card.setPointerCapture(event.pointerId);
  };

  card.onpointercancel = () => {
    startX = null;
    startY = null;
  };

  card.onpointerup = event => {
    if (startX === null || startY === null) return;
    const distanceX = event.clientX - startX;
    const distanceY = event.clientY - startY;
    startX = null;
    startY = null;
    if (Math.abs(distanceX) > SWIPE_THRESHOLD) {
      onDecision(distanceX > 0 ? 'like' : 'skip', card.dataset.id);
      return;
    }
    if (Math.abs(distanceX) < 12 && Math.abs(distanceY) < 12 && onTap) {
      onTap(card.dataset.id);
    }
  };
}
