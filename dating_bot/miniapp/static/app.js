const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();
const initData = tg?.initData || "";
const headers = {"Content-Type":"application/json","X-Telegram-Init-Data":initData};
const API_BASE = window.YAQIN_API_URL || "";
const view = document.querySelector("#view");
let currentTab = "discover";

async function api(path, options={}) {
  const response = await fetch(`${API_BASE}${path}`, {headers, ...options});
  if (!response.ok) throw new Error((await response.json().catch(()=>({}))).detail || "Ошибка запроса");
  return response.json();
}

function nav() { document.querySelectorAll(".tabbar button").forEach(button => button.classList.toggle("active", button.dataset.tab === currentTab)); }
function esc(value) { return String(value ?? "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }

async function renderDiscover() {
  const me = await api("/api/me");
  if (!me.profile) { view.innerHTML = '<div class="empty"><h1>Создайте профиль</h1><p class="muted">Заполните анкету в разделе «Профиль».</p></div>'; return; }
  if (me.verification_status !== "approved") { view.innerHTML = '<div class="empty"><h1>Профиль на проверке</h1><p class="muted">После ручной проверки вы получите уведомление в Telegram и сможете смотреть анкеты.</p><button class="button like" onclick="currentTab=\'profile\';render()">Открыть профиль</button></div>'; return; }
  const data = await api("/api/discover");
  if (!data.items.length) { view.innerHTML = '<div class="empty"><h1>Пока тихо</h1><p class="muted">Новых анкет нет. Загляните позже.</p></div>'; return; }
  const person = data.items[0];
  view.innerHTML = `<div class="card"><div class="hero ${person.photo_id ? "" : "no-photo"}"><div><div class="pill">${esc(person.city)}</div><h2>${esc(person.name)}, ${person.age}</h2></div></div><p class="muted">${esc(person.about)}</p><div class="actions"><button class="button secondary" data-action="skip" data-id="${person.user_id}">Пропустить</button><button class="button like" data-action="like" data-id="${person.user_id}">♡ Нравится</button></div><button class="button secondary" style="width:100%;margin-top:10px" data-action="report" data-id="${person.user_id}">Пожаловаться / заблокировать</button></div>`;
}

async function renderMatches() { const data = await api("/api/matches"); view.innerHTML = `<h1>Мэтчи</h1><p class="muted">Люди, с которыми у вас взаимная симпатия.</p>${data.items.length ? data.items.map(p=>`<div class="match"><div class="avatar">${esc(p.name[0])}</div><div><b>${esc(p.name)}, ${p.age}</b><div class="muted">${esc(p.city)}</div></div></div>`).join("") : '<div class="empty"><p class="muted">Взаимных симпатий пока нет.</p></div>'}`; }

async function renderProfile() { const data = await api("/api/me"); const p = data.profile || {name:"",age:18,city:"",about:""}; view.innerHTML = `<h1>Мой профиль</h1><p class="muted">Анкета видна только совершеннолетним пользователям.</p><div class="notice">Не публикуйте адрес, документы и интимные материалы.</div><div class="card form"><input class="input" id="name" placeholder="Имя или псевдоним" value="${esc(p.name)}"><input class="input" id="age" type="number" min="18" max="100" placeholder="Возраст" value="${p.age}"><input class="input" id="city" placeholder="Город" value="${esc(p.city)}"><textarea class="textarea" id="about" maxlength="500" placeholder="О себе">${esc(p.about)}</textarea><button class="button like" id="save">Сохранить профиль</button></div>`; document.querySelector("#save").onclick = saveProfile; }

async function saveProfile() { const payload={name:document.querySelector("#name").value,age:Number(document.querySelector("#age").value),city:document.querySelector("#city").value,about:document.querySelector("#about").value}; await api("/api/me",{method:"PUT",body:JSON.stringify(payload)}); tg?.showPopup?.({title:"Готово",message:"Профиль сохранён",buttons:[{type:"ok"}]}); }
async function render() { nav(); try { if(!initData) { view.innerHTML='<div class="empty"><h1>Откройте Yaqin через Telegram</h1><p class="muted">Запустите Mini App кнопкой «Открыть Yaqin» в боте.</p></div>'; return; } if(currentTab==="discover") await renderDiscover(); if(currentTab==="matches") await renderMatches(); if(currentTab==="profile") await renderProfile(); } catch(error) { view.innerHTML=`<div class="empty"><h2>Не удалось загрузить</h2><p class="muted">${esc(error.message)}</p><button class="button secondary" onclick="render()">Повторить</button></div>`; } }

document.querySelectorAll(".tabbar button").forEach(button => button.onclick=()=>{currentTab=button.dataset.tab;render();});
view.addEventListener("click", async event => { const button=event.target.closest("[data-action]"); if(!button)return; const id=button.dataset.id; try { if(button.dataset.action==="like") await api(`/api/like/${id}`,{method:"POST"}); if(button.dataset.action==="report") await api(`/api/report/${id}`,{method:"POST"}); if(button.dataset.action==="skip") await api(`/api/block/${id}`,{method:"POST"}); await renderDiscover(); } catch(error) { tg?.showAlert?.(error.message); } });
render();
