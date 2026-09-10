/** Telegram WebApp chrome: BackButton вместо наших ✕ Закрыть. */

const tg = () => window.Telegram?.WebApp;

export function hasTelegramBack() {
  return Boolean(tg()?.BackButton);
}

/** В браузере без TG — оставляем кнопку «назад» в UI. */
export function backControlHtml(action = 'back', label = 'Назад') {
  if (hasTelegramBack()) {
    return '<span class="head-spacer" aria-hidden="true"></span>';
  }
  return `<button type="button" data-action="${action}" aria-label="${label}"><i class="ti ti-chevron-left"></i></button>`;
}

let bound = false;

export function syncTelegramBackButton({ route, isTab, canGoBack }) {
  const button = tg()?.BackButton;
  if (!button) return;

  if (!bound) {
    bound = true;
    button.onClick(() => {
      window.dispatchEvent(new CustomEvent('yaqin:tg-back'));
    });
  }

  const show = !isTab && canGoBack;
  if (show) button.show();
  else button.hide();
}
