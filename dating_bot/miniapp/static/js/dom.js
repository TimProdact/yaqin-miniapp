const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export const view = document.querySelector('#view');
export const header = document.querySelector('#header');

export function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, char => escapeMap[char]);
}

export function setTitle(text, sub = '') {
  header.innerHTML = `
    <div class="app-header">
      <div><h1>${esc(text)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
      <button class="theme-button"><i class="ti ti-adjustments-horizontal"></i></button>
    </div>`;
}

export function setDiscoverHeader(city) {
  header.innerHTML = `
    <div class="app-header discover-header">
      <span class="brand"><i class="ti ti-flower"></i></span>
      <button class="city" data-action="filters">${esc(city)} <i class="ti ti-chevron-down"></i></button>
      <button class="filters" data-action="filters"><i class="ti ti-adjustments-horizontal"></i></button>
    </div>`;
}

export function setBackTitle(text) {
  header.innerHTML = `
    <div class="screen-head">
      <button data-action="back"><i class="ti ti-chevron-left"></i></button>
      <h1>${esc(text)}</h1>
      <button>⋯</button>
    </div>`;
}

export function clearHeader() {
  header.innerHTML = '';
}

export function chipList(items) {
  return items.map(item => `<span>${esc(item)}</span>`).join('');
}

export function showPlaceholder(icon, title, text = '') {
  view.innerHTML = `
    <div class="empty">
      <div class="empty-icon">${icon}</div>
      <h1>${esc(title)}</h1>
      ${text ? `<p>${esc(text)}</p>` : ''}
    </div>`;
}

export function showDiscoverLoading() {
  view.innerHTML = `
    <div class="swipe-stage discover-loading">
      <div class="profile-card skeleton-card">
        <div class="skeleton-top">
          <span class="sk sk-name"></span>
          <span class="sk sk-meta"></span>
        </div>
        <div class="skeleton-spinner"></div>
        <div class="skeleton-bottom">
          <div class="skeleton-bottom-copy">
            <span class="sk sk-line"></span>
            <span class="sk sk-line short"></span>
            <div class="skeleton-chips">
              <span class="sk sk-chip"></span>
              <span class="sk sk-chip wide"></span>
              <span class="sk sk-chip"></span>
              <span class="sk sk-chip mid"></span>
            </div>
          </div>
          <span class="skeleton-wave" aria-hidden="true"></span>
        </div>
      </div>
    </div>`;
}

export function showLoading(title = 'Загружаем...') {
  showPlaceholder('✿', title);
}

export function showError(text = 'Проверьте соединение и попробуйте ещё раз.') {
  showPlaceholder('!', 'Что-то пошло не так', text);
}
