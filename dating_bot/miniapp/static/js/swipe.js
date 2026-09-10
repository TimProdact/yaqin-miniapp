const SWIPE_THRESHOLD = 90;

export function enableSwipe(onDecision, { onTap } = {}) {
  const cards = document.querySelectorAll('.profile-card');
  if (!cards.length) return;

  cards.forEach(card => bindCard(card, onDecision, onTap));
}

function bindCard(card, onDecision, onTap) {
  let startX = null;
  let startY = null;
  let tracking = false;

  card.onpointerdown = event => {
    if (event.target.closest('[data-action]')) return;
    startX = event.clientX;
    startY = event.clientY;
    tracking = true;
  };

  card.onpointercancel = () => {
    startX = null;
    startY = null;
    tracking = false;
  };

  card.onpointerup = event => {
    if (!tracking || startX === null || startY === null) return;
    const distanceX = event.clientX - startX;
    const distanceY = event.clientY - startY;
    startX = null;
    startY = null;
    tracking = false;

    // Vertical scroll owns the gesture — don't treat it as like/skip
    if (Math.abs(distanceY) > Math.abs(distanceX)) {
      if (Math.abs(distanceX) < 12 && Math.abs(distanceY) < 12 && onTap) {
        onTap(card.dataset.id);
      }
      return;
    }

    if (Math.abs(distanceX) > SWIPE_THRESHOLD && Math.abs(distanceX) > Math.abs(distanceY) * 1.4) {
      onDecision(distanceX > 0 ? 'like' : 'skip', card.dataset.id);
      return;
    }

    if (Math.abs(distanceX) < 12 && Math.abs(distanceY) < 12 && onTap) {
      onTap(card.dataset.id);
    }
  };
}
