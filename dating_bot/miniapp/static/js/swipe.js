const SWIPE_THRESHOLD = 90;

export function enableSwipe(onDecision) {
  const card = document.querySelector('.profile-card');
  if (!card) return;

  let startX = null;

  card.onpointerdown = event => {
    startX = event.clientX;
    card.setPointerCapture(event.pointerId);
  };

  card.onpointercancel = () => {
    startX = null;
  };

  card.onpointerup = event => {
    if (startX === null) return;
    const distance = event.clientX - startX;
    startX = null;
    if (Math.abs(distance) > SWIPE_THRESHOLD) {
      onDecision(distance > 0 ? 'like' : 'skip', card.dataset.id);
    }
  };
}
