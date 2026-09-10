/** Celebrate overlay в стиле Locals — confetti + CTA. */

import { esc } from './dom.js';

function shareText(text) {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/yaqin_bot')}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(url);
      return;
    }
  } catch (_) {
    /* ignore */
  }
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
    return;
  }
  try {
    navigator.clipboard?.writeText(text);
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   primaryLabel?: string,
 *   onPrimary?: () => void,
 *   secondaryLabel?: string,
 *   shareText?: string,
 *   onSecondary?: () => void,
 *   onClose?: () => void
 * }} opts
 */
export function showCelebrate(opts) {
  document.getElementById('yaqin-celebrate')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'yaqin-celebrate';
  overlay.className = 'celebrate-overlay';
  const dots = Array.from({ length: 18 }, (_, i) => {
    const colors = ['#fff292', '#f2f2f7', '#ff2d55', '#34c759', '#3b6ef5'];
    return `<i class="celebrate-dot" style="--i:${i};--c:${colors[i % colors.length]}"></i>`;
  }).join('');

  overlay.innerHTML = `
    <div class="celebrate-card">
      <div class="celebrate-burst" aria-hidden="true">${dots}</div>
      <div class="celebrate-check"><i class="ti ti-check"></i></div>
      <h2>${esc(opts.title)}</h2>
      ${opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ''}
      <button type="button" class="celebrate-primary" id="celebratePrimary">
        ${esc(opts.primaryLabel || 'Продолжить')}
      </button>
      ${opts.shareText || opts.secondaryLabel || opts.onSecondary ? `
        <button type="button" class="celebrate-secondary" id="celebrateSecondary">
          ${esc(opts.secondaryLabel || 'Пригласить подруг')}
        </button>` : ''}
      <button type="button" class="celebrate-skip" id="celebrateSkip">Закрыть</button>
    </div>`;

  const close = () => {
    overlay.remove();
    opts.onClose?.();
  };

  overlay.querySelector('#celebratePrimary').onclick = () => {
    close();
    opts.onPrimary?.();
  };
  overlay.querySelector('#celebrateSecondary')?.addEventListener('click', () => {
    if (opts.onSecondary) {
      close();
      opts.onSecondary();
      return;
    }
    if (opts.shareText) shareText(opts.shareText);
  });
  overlay.querySelector('#celebrateSkip').onclick = close;
  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });

  document.body.appendChild(overlay);
}
