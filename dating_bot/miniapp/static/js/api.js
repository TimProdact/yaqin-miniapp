const BASE = (window.YAQIN_API_URL || '').replace(/\/+$/, '');
const telegram = window.Telegram?.WebApp;

/** Demo mode keeps the GitHub Pages build usable without a backend. */
export const isLive = Boolean(BASE) && window.YAQIN_DEMO_MODE !== true;

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': telegram?.initData || ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}`);
  return response.json();
}

export const api = {
  me: () => request('/api/me'),
  updateMe: profile => request('/api/me', { method: 'PUT', body: profile }),
  discover: () => request('/api/discover'),
  matches: () => request('/api/matches'),
  like: id => request(`/api/like/${id}`, { method: 'POST' }),
  block: id => request(`/api/block/${id}`, { method: 'POST' }),
  report: id => request(`/api/report/${id}`, { method: 'POST' }),
  absoluteUrl: path => `${BASE}${path}`
};
