const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const DEMO = window.YAQIN_DEMO_MODE === true;
const API_BASE = window.YAQIN_API_URL || "";
const initData = tg?.initData || "";
const headers = { "Content-Type": "application/json", "X-Telegram-Init-Data": initData };
const view = document.querySelector("#view");
let currentTab = "discover";
let demoIndex = 0;
const demoProfiles = [
  { user_id: 1, name: "Алина", age: 24, city: "Ташкент", about: "Люблю кофе, прогулки и живые концерты.", photo_id: true },
  { user_id: 2, name: "Малика", age: 26, city: "Самарканд", about: "Ищу приятное общение и интересные знакомства.", photo_id: true },
  { user_id: 3, name: "Диана", age: 23, city: "Ташкент", about: "Кино, путешествия и хороший юмор.", photo_id: false }
];

function demoState() { return JSON.parse(localStorage.getItem("yaqin-demo") || '{"profile":null,"liked":[],"blocked":[]}'); }
function saveDemoState(state) { localStorage.setItem("yaqin-demo", JSON.stringify(state)); }
function esc(value) { return String(value ?? "").replace(/[&<>\"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }
function nav() { document.querySelectorAll(".tabbar button").forEach(button => button.classList.toggle("active", button.dataset.tab === currentTab)); }

async function api(path, options = {}) {
  if (DEMO) throw new Error("Demo mode");
  const response = await fetch(`${API_BASE}${path}`, { headers, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Ошибка запроса");
  return response.json();
}

function profileCard(person) {
  return `<div class="card"><div class="hero ${person.photo_id ? "" : "no-photo"}"><div><div class="pill">${esc(person.city)}</div><h2>${esc(person.name)}, ${person.age}</h2></div></div><p class="muted">${esc(person.about)}</p><div class="actions"><button class="button secondary" data-action="skip" data-id="${person.user_id}">Пропустить</button><button class="button like" data-action="like" data-id="${person.user_id}">♡ Нравится</button></div><button class="button secondary" style="width:100%;margin-top:10px" data-action="report" data-id="${person.user_id}">Пожаловаться / заблокировать</button></div>`;
}

async function renderDiscover() {
  if (DEMO) {
    const state = demoState();
    const available = demoProfiles.filter(person => !state.blocked.includes(person.user_id));
    if (!available.length) { view.innerHTML = '<div class="empty"><h1>Пока тихо</h1><p class="muted">Вы посмотрели все демо-анкеты.</p></div>'; return; }
    const person = available[demoIndex % available.length];
    view.innerHTML = `<span class="pill">ДЕМО-РЕЖИМ</span>${profileCard(person)}`;
    return;
  }
  const me = await api("/api/me");
  if (!me.profile) { view.innerHTML = '<div class="empty"><h1>Создайте профиль</h1><p class="muted">Заполните анкету в разделе «Профиль».</p></div>'; return; }
  if (me.verification_status !== "approved") { view.innerHTML = '<div class="empty"><h1>Профиль на проверке</h1><p class="muted">После ручной проверки вы получите уведомление в Telegram.</p></div>'; return; }
  const data = await api("/api/discover");
  view.innerHTML = data.items.length ? profileCard(data.items[0]) : '<div class="empty"><h1>Пока тихо</h1><p class="muted">Новых анкет нет.</p></div>';
}

async function renderMatches() {
  const items = DEMO ? demoState().liked.map(id => demoProfiles.find(person => person.user_id === id)).filter(Boolean) : (await api("/api/matches")).items;
  view.innerHTML = `<h1>Мэтчи</h1><p class="muted">Люди, с которыми у вас взаимная симпатия.</p>${items.length ? items.map(person => `<div class="match"><div class="avatar">${esc(person.name[0])}</div><div><b>${esc(person.name)}, ${person.age}</b><div class="muted">${esc(person.city)}</div></div></div>`).join("") : '<div class="empty"><p class="muted">Взаимных симпатий пока нет.</p></div>'}`;
}

async function renderProfile() {
  const state = DEMO ? demoState() : await api("/api/me");
  const p = DEMO ? (state.profile || { name: "", age: 18, city: "", about: "" }) : (state.profile || { name: "", age: 18, city: "", about: "" });
  view.innerHTML = `<h1>Мой профиль</h1><p class="muted">Анкета видна только совершеннолетним пользователям.</p><div class="notice">Демо-режим: данные сохраняются только в этом браузере.</div><div class="card form"><input class="input" id="name" placeholder="Имя или псевдоним" value="${esc(p.name)}"><input class="input" id="age" type="number" min="18" max="100" placeholder="Возраст" value="${p.age}"><input class="input" id="city" placeholder="Город" value="${esc(p.city)}"><textarea class="textarea" id="about" maxlength="500" placeholder="О себе">${esc(p.about)}</textarea><button class="button like" id="save">Сохранить профиль</button></div>`;
  document.querySelector("#save").onclick = saveProfile;
}

async function saveProfile() {
  const payload = { name: document.querySelector("#name").value, age: Number(document.querySelector("#age").value), city: document.querySelector("#city").value, about: document.querySelector("#about").value };
  if (DEMO) { const state = demoState(); state.profile = payload; saveDemoState(state); renderProfile(); return; }
  await api("/api/me", { method: "PUT", body: JSON.stringify(payload) });
}

async function render() {
  nav();
  try { if (currentTab === "discover") await renderDiscover(); if (currentTab === "matches") await renderMatches(); if (currentTab === "profile") await renderProfile(); }
  catch (error) { view.innerHTML = `<div class="empty"><h2>Не удалось загрузить</h2><p class="muted">${esc(error.message)}</p><button class="button secondary" onclick="render()">Повторить</button></div>`; }
}

document.querySelectorAll(".tabbar button").forEach(button => button.onclick = () => { currentTab = button.dataset.tab; render(); });
view.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (DEMO) {
    const state = demoState();
    if (button.dataset.action === "like") state.liked = [...new Set([...state.liked, id])];
    if (button.dataset.action === "skip" || button.dataset.action === "report") state.blocked = [...new Set([...state.blocked, id])];
    saveDemoState(state); demoIndex += 1; renderDiscover(); return;
  }
  try { if (button.dataset.action === "like") await api(`/api/like/${id}`, { method: "POST" }); if (button.dataset.action === "report") await api(`/api/report/${id}`, { method: "POST" }); if (button.dataset.action === "skip") await api(`/api/block/${id}`, { method: "POST" }); await renderDiscover(); }
  catch (error) { tg?.showAlert?.(error.message); }
});
render();
