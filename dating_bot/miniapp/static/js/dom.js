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
