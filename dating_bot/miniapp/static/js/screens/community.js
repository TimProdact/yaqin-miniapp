import { events as taneeshEvents, PHOTOS, defaultProfile, demoGroups, people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';
import { getState, saveState } from '../state.js';
import { showCelebrate } from '../celebrate.js';
import { INTEREST_OPTIONS, filterOptions } from '../profile-fields.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { peopleGoingBlockHtml, bindPeopleGoingBlock, closePeopleGoingSheet } from '../people-going.js';
import {
  TASHKENT,
  coordsForPlace,
  formatCoordLabel,
  mountPlaceMap,
  reverseGeocode
} from '../place-map.js';

const COVER_POOL = [PHOTOS.palms, PHOTOS.coffee, PHOTOS.city, PHOTOS.books, PHOTOS.event, PHOTOS.mila].filter(Boolean);

export function getUserGroups() {
  return getState().userGroups || [];
}

export function isGroupOwner(group) {
  if (!group) return false;
  return group.ownerId === 'me' || String(group.id).startsWith('g-');
}

/** Группы, где пользователь — организатор. */
export function getOwnedGroups() {
  return getUserGroups().filter(isGroupOwner);
}

/** Каталог + созданные пользователем (без дублей по id). */
export function listAllGroups() {
  const mine = getUserGroups();
  const mineIds = new Set(mine.map(group => String(group.id)));
  const catalog = demoGroups
    .filter(group => !mineIds.has(String(group.id)))
    .map(group => ({ ...group }));
  return [...mine, ...catalog];
}

export function findUserGroup(id) {
  return getUserGroups().find(group => String(group.id) === String(id))
    || demoGroups.find(group => String(group.id) === String(id))
    || null;
}

/** Просмотр группы без вступления. */
export function peekGroup(id) {
  const mine = getUserGroups().find(group => String(group.id) === String(id));
  if (mine) return mine;
  const catalog = demoGroups.find(group => String(group.id) === String(id));
  if (!catalog) return null;
  return { ...catalog, membership: 'none' };
}

/** @deprecated используйте peekGroup — раньше silent auto-join. */
export function openGroup(id) {
  return peekGroup(id);
}

export function isGroupPublic(group) {
  return group?.isPublic !== false;
}

export function isGroupMember(group) {
  if (!group) return false;
  if (group.membership === 'none' || group.membership === 'pending') return false;
  return getUserGroups().some(item => String(item.id) === String(group.id));
}

export function isGroupPending(group) {
  return group?.membership === 'pending'
    || getUserGroups().some(item => String(item.id) === String(group?.id) && item.membership === 'pending');
}

/** Вступление в открытую группу — только по явной CTA. */
export function joinOpenGroup(id) {
  const existing = getUserGroups().find(group => String(group.id) === String(id));
  if (existing) {
    if (existing.membership === 'pending' || existing.membership === 'none') {
      const joined = {
        ...existing,
        membership: 'member',
        joinedAt: new Date().toISOString()
      };
      const state = getState();
      saveState({
        ...state,
        userGroups: (state.userGroups || []).map(item =>
          String(item.id) === String(id) ? joined : item
        )
      });
      return joined;
    }
    return existing;
  }
  const catalog = demoGroups.find(group => String(group.id) === String(id));
  if (!catalog || catalog.isPublic === false) return null;
  const joined = {
    ...catalog,
    catalog: false,
    membership: 'member',
    joinedAt: new Date().toISOString(),
    messages: [...(catalog.messages || [])]
  };
  const state = getState();
  saveState({ ...state, userGroups: [joined, ...(state.userGroups || [])] });
  return joined;
}

/** Заявка в закрытую группу — короткое сообщение обязательно, статус pending до принятия. */
export function requestJoinGroup(id, message = '') {
  const existing = getUserGroups().find(group => String(group.id) === String(id));
  if (existing) return existing;
  const catalog = demoGroups.find(group => String(group.id) === String(id));
  if (!catalog) return null;
  if (catalog.isPublic !== false) return joinOpenGroup(id);
  const text = String(message || '').trim();
  if (text.length < 3) return null;
  const pending = {
    ...catalog,
    catalog: false,
    membership: 'pending',
    requestMessage: text.slice(0, 200),
    requestedAt: new Date().toISOString(),
    messages: [...(catalog.messages || [])]
  };
  const state = getState();
  saveState({ ...state, userGroups: [pending, ...(state.userGroups || [])] });
  return pending;
}

export function acceptJoinRequest(groupId, userId) {
  const state = getState();
  const list = (state.userGroups || []).map(group => {
    if (String(group.id) !== String(groupId)) return group;
    const requests = (group.joinRequests || []).filter(item => String(item.id) !== String(userId));
    return {
      ...group,
      joinRequests: requests,
      members: Math.max(1, Number(group.members || 1) + 1)
    };
  });
  saveState({ ...state, userGroups: list });
  return list.find(group => String(group.id) === String(groupId)) || null;
}

export function rejectJoinRequest(groupId, userId) {
  const state = getState();
  const list = (state.userGroups || []).map(group => {
    if (String(group.id) !== String(groupId)) return group;
    return {
      ...group,
      joinRequests: (group.joinRequests || []).filter(item => String(item.id) !== String(userId))
    };
  });
  saveState({ ...state, userGroups: list });
  return list.find(group => String(group.id) === String(groupId)) || null;
}

export function getUserEvents() {
  return getState().userEvents || [];
}

/** Taneesh-афиша + события, созданные в Yaqin. */
export function allEvents() {
  const catalog = taneeshEvents.map(event => ({ ...event, source: 'taneesh' }));
  const mine = getUserEvents().map(event => ({ ...event, source: event.source || 'yaqin' }));
  return [...mine, ...catalog];
}

export function findEvent(id) {
  if (id === undefined || id === null || id === '') return null;
  return allEvents().find(event => String(event.id) === String(id)) || null;
}

function nextCover(index = 0) {
  return COVER_POOL[index % COVER_POOL.length] || PHOTOS.city;
}

function groupMatchesQuery(group, term) {
  if (!term) return true;
  const hay = `${group.title || ''} ${group.about || ''} ${group.city || ''}`.toLowerCase();
  return hay.includes(term);
}

function groupMatchesFilter(group, filter) {
  if (filter === 'open') return isGroupPublic(group);
  if (filter === 'closed') return !isGroupPublic(group);
  return true;
}

/** Вкладка «Группы» — список + поиск + фильтр открытые/закрытые. */
export function groupsScreen() {
  clearHeader();
  let query = '';
  let filter = 'all'; // all | open | closed
  let searchOpen = false;

  const render = () => {
    const term = query.trim().toLowerCase();
    const groups = listAllGroups()
      .filter(group => groupMatchesFilter(group, filter))
      .filter(group => groupMatchesQuery(group, term));
    const pills = [
      ['all', 'Все'],
      ['open', 'Открытые'],
      ['closed', 'Закрытые']
    ];
    const filterActive = filter !== 'all' || Boolean(term);

    view.innerHTML = `
      <div class="groups-tab-page">
        <div class="list-sticky-pill ${searchOpen ? 'is-search-open' : ''}">
          <header class="chats-head">
            <h1>Группы</h1>
            <div class="list-head-actions">
              <button type="button" id="toggleGroupSearch" aria-label="${searchOpen ? 'Закрыть поиск' : 'Поиск'}" aria-expanded="${searchOpen ? 'true' : 'false'}" class="${searchOpen || filterActive ? 'on' : ''}">
                <i class="ti ${searchOpen ? 'ti-x' : 'ti-search'}"></i>
              </button>
            </div>
          </header>

          ${searchOpen ? `
            <div class="list-search-panel">
              <div class="search-box groups-search">
                <i class="ti ti-search"></i>
                <input id="groupSearch" type="search" placeholder="Поиск групп" value="${esc(query)}" enterkeyhint="search">
                ${term ? '<button type="button" id="clearGroupSearch" aria-label="Очистить">×</button>' : ''}
              </div>
              <div class="chats-pills groups-pills" role="tablist">
                ${pills.map(([id, label]) => `
                  <button type="button" class="${filter === id ? 'on' : ''}" data-filter="${id}">${label}</button>
                `).join('')}
              </div>
            </div>` : ''}
        </div>

        ${groups.length
          ? `<div class="groups-tab-list">${groups.map(group => {
              const open = isGroupPublic(group);
              const last = group.messages?.[group.messages.length - 1];
              const meta = last?.text
                || (group.members ? `${group.members} участниц` : group.about)
                || 'Группа';
              return `
                <button class="group-tab-row" type="button" data-open-group="${esc(group.id)}">
                  <div class="group-tab-avatar">
                    <img src="${esc(group.photo)}" alt="">
                    ${open ? '' : '<i class="ti ti-lock group-tab-lock" aria-hidden="true"></i>'}
                  </div>
                  <div>
                    <strong>${esc(group.title)}${open ? '' : ' <em class="group-privacy">закрытая</em>'}</strong>
                    <span>${esc(meta)}${last?.time ? ` · ${esc(last.time)}` : ''}</span>
                  </div>
                </button>`;
            }).join('')}</div>`
          : term || filter !== 'all'
            ? `<p class="search-none">${term ? 'Ничего не найдено' : filter === 'closed' ? 'Пока нет закрытых групп' : 'Пока нет открытых групп'}</p>`
            : `<div class="groups-tab-empty">
                <div class="empty-badge yellow"><i class="ti ti-users"></i></div>
                <h2>Пока нет групп</h2>
                <p>Создать группу можно в профиле.</p>
              </div>`}

      </div>`;

    view.querySelector('#toggleGroupSearch')?.addEventListener('click', () => {
      searchOpen = !searchOpen;
      render();
      if (searchOpen) view.querySelector('#groupSearch')?.focus();
    });
    const input = view.querySelector('#groupSearch');
    input?.addEventListener('input', () => {
      query = input.value;
      render();
      const next = view.querySelector('#groupSearch');
      if (next) {
        next.focus();
        const pos = query.length;
        next.setSelectionRange(pos, pos);
      }
    });
    view.querySelector('#clearGroupSearch')?.addEventListener('click', () => {
      query = '';
      render();
      view.querySelector('#groupSearch')?.focus();
    });
    view.querySelectorAll('[data-filter]').forEach(button => {
      button.onclick = () => {
        filter = button.dataset.filter;
        searchOpen = true;
        render();
      };
    });
    view.querySelectorAll('[data-open-group]').forEach(button => {
      button.onclick = () => {
        const group = peekGroup(button.dataset.openGroup);
        if (group) navigate('group', group.id);
      };
    });
  };

  render();
}

/** Создание / редактирование группы — название, фото, открытая/закрытая. */
export function createGroupScreen(editId = null) {
  clearHeader();
  const existing = editId != null && editId !== '' ? peekGroup(editId) : null;
  const isEdit = Boolean(existing && isGroupOwner(existing));
  if (editId && !isEdit) {
    navigate('me');
    return;
  }

  let name = isEdit ? (existing.title || '') : '';
  let cover = isEdit ? (existing.photo || null) : null;
  let coverIndex = 0;
  let isPublic = isEdit ? isGroupPublic(existing) : true;

  const render = () => {
    const canCreate = name.trim().length > 1;
    view.innerHTML = `
      <div class="create-group-page">
        <header class="filters-head">
          ${isEdit ? backControlHtml('back') : backControlHtml('me')}
          <h1>${isEdit ? 'Редактировать' : 'Создать группу'}</h1>
        </header>

        <div class="create-identity-panel">
          <div class="create-cover ${cover ? 'has-photo' : ''}">
            ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ФОТО</span>`}
            <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
          </div>
          <input class="create-name" id="groupName" placeholder="Название группы..." value="${esc(name)}" maxlength="60" autocomplete="off">
        </div>

        <div class="create-entry-panel">
          <h3 class="settings-label">Тип группы</h3>
          <div class="create-chips" id="groupPrivacyChips">
            <button type="button" class="${isPublic ? 'on' : ''}" data-privacy="open">
              <i class="ti ti-world"></i> Открытая
            </button>
            <button type="button" class="${!isPublic ? 'on' : ''}" data-privacy="closed">
              <i class="ti ti-lock"></i> Закрытая
            </button>
          </div>
        </div>

        <div class="create-sticky-cta">
          <button type="button" class="create-submit ${canCreate ? 'on' : ''}" id="createGroupBtn" ${canCreate ? '' : 'disabled'}>${isEdit ? 'Сохранить' : 'Создать'}</button>
        </div>
      </div>`;

    view.querySelector('#groupName').oninput = event => {
      name = event.target.value;
      const btn = view.querySelector('#createGroupBtn');
      const ready = name.trim().length > 1;
      btn.disabled = !ready;
      btn.classList.toggle('on', ready);
    };
    view.querySelector('#setCover').onclick = () => {
      cover = nextCover(coverIndex++);
      render();
    };
    view.querySelectorAll('[data-privacy]').forEach(button => {
      button.onclick = () => {
        isPublic = button.dataset.privacy === 'open';
        render();
      };
    });
    view.querySelector('#createGroupBtn').onclick = () => {
      if (!name.trim()) return;
      const profile = getState().profile || defaultProfile;
      const state = getState();

      if (isEdit) {
        const updated = {
          ...existing,
          title: name.trim(),
          about: isPublic ? 'Открытая группа в Yaqin' : 'Закрытая группа в Yaqin',
          photo: cover || existing.photo || nextCover(0),
          isPublic,
          updatedAt: new Date().toISOString()
        };
        saveState({
          ...state,
          userGroups: (state.userGroups || []).map(item =>
            String(item.id) === String(existing.id) ? updated : item
          )
        });
        navigate('group', existing.id);
        return;
      }

      const group = {
        id: `g-${Date.now()}`,
        title: name.trim(),
        about: isPublic ? 'Открытая группа в Yaqin' : 'Закрытая группа в Yaqin',
        city: 'Ташкент',
        photo: cover || nextCover(0),
        isPublic,
        members: 1,
        online: 1,
        membership: 'member',
        ownerId: 'me',
        createdAt: new Date().toISOString(),
        ownerName: profile.name || 'Вы',
        joinRequests: isPublic ? [] : people.slice(1, 3).map((person, index) => ({
          id: person.id,
          name: person.name,
          photo: person.photo,
          age: person.age,
          message: index === 0
            ? 'Люблю такие клубы, можно с вами?'
            : 'Читаю нон-фикшн, хочу вступить'
        })),
        messages: [
          {
            from: 'me',
            name: profile.name || 'Вы',
            text: 'Группа создана. Можно писать здесь.',
            time: 'сейчас'
          }
        ]
      };
      saveState({ ...state, userGroups: [group, ...(state.userGroups || [])] });
      showCelebrate({
        title: 'Группа создана!',
        subtitle: `${group.title} · ${isPublic ? 'открытая' : 'закрытая'}`,
        primaryLabel: 'Открыть группу',
        secondaryLabel: 'Пригласить подруг',
        shareText: `Присоединяйся к группе «${group.title}» в Yaqin`,
        onPrimary: () => navigate('group', group.id),
        onClose: () => navigate('group', group.id)
      });
      navigate('group', group.id);
    };
  };

  render();
}

/** Превью участниц группы (компактный блок, не весь каталог). */
function groupMembersPreview(group) {
  const count = Math.min(8, Math.max(3, Number(group.members) || 4));
  const demo = people.slice(0, count).map(person => ({
    id: person.id,
    name: person.name,
    age: person.age,
    photo: person.photo,
    demo: true
  }));
  if (!isGroupMember(group)) return demo;
  const profile = getState().profile || defaultProfile;
  const mine = {
    id: 'me',
    name: profile.name || defaultProfile.name,
    age: profile.age || defaultProfile.age,
    photo: profile.photo || defaultProfile.photo,
    message: 'вы'
  };
  return [mine, ...demo.filter(person => person.id !== 'me')];
}

/** Хаб группы: обложка, участницы, чат / заявка / пригласить. */
export function groupHubScreen(id) {
  clearHeader();
  closePeopleGoingSheet();
  const group = peekGroup(id);
  if (!group) {
    navigate('groups');
    return;
  }
  const memberCount = group.members || 1;
  const member = isGroupMember(group);
  const pending = isGroupPending(group);
  const open = isGroupPublic(group);
  const isOwner = isGroupOwner(group) && member;
  const joinRequests = isOwner ? (group.joinRequests || []) : [];
  const members = groupMembersPreview(group);
  let tab = 'overview'; // overview | members | requests
  let joinSheet = false;
  let joinDraft = '';

  const share = () => {
    const text = `Присоединяйся к группе «${group.title}» в Yaqin`;
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/yaqin_bot')}&text=${encodeURIComponent(text)}`);
        return;
      }
    } catch (_) { /* ignore */ }
    navigator.share?.({ text }).catch(() => {});
  };

  const render = () => {
    closePeopleGoingSheet();
    const tabs = [
      ['overview', 'Обзор'],
      ['members', 'Участницы'],
      ...(isOwner && !open ? [['requests', `Заявки${joinRequests.length ? ` · ${joinRequests.length}` : ''}`]] : [])
    ];

    if (isOwner) {
      view.innerHTML = `
        <article class="person-view host-group-page">
          <div class="person-hero event-detail-hero group-hub-cover">
            <img class="person-hero-photo" src="${esc(group.photo)}" alt="">
            ${hasTelegramBack() ? '' : `<button class="hero-icon back" data-action="me" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>`}
          </div>

          <section class="person-head">
            <div class="person-head-row">
              <div class="person-head-copy">
                <em class="taneesh-source yaqin">Ваша группа</em>
                <h1>${esc(group.title)}${open ? '' : ' <i class="ti ti-lock"></i>'}</h1>
                <p class="person-meta">${esc(group.city || 'Ташкент')} · ${open ? 'открытая' : 'закрытая'} · ${memberCount} участниц</p>
              </div>
              <button class="hero-wave" type="button" data-action="edit-group" data-id="${esc(group.id)}" aria-label="Настройки">
                <i class="ti ti-settings"></i>
              </button>
            </div>
            ${group.about ? `<p class="person-bio">${esc(group.about)}</p>` : ''}
          </section>

          <div class="host-event-tabs" role="tablist">
            ${tabs.map(([tid, label]) => `
              <button type="button" class="${tab === tid ? 'on' : ''}" data-host-tab="${tid}" role="tab" aria-selected="${tab === tid}">
                ${label}
              </button>`).join('')}
          </div>

          <div class="host-event-body">
            ${tab === 'overview' ? `
              <section class="me-panel event-detail-panel">
                <div class="me-section-head"><div><h3>Действия</h3></div></div>
                <div class="me-mini-list">
                  <button type="button" class="me-mini-row" data-action="group-chat" data-id="${esc(group.id)}">
                    <span class="host-action-icon"><i class="ti ti-message"></i></span>
                    <div>
                      <strong>Чат группы</strong>
                      <span>Переписка участниц</span>
                    </div>
                    <i class="ti ti-chevron-right"></i>
                  </button>
                  <button type="button" class="me-mini-row" id="inviteGroup">
                    <span class="host-action-icon blue"><i class="ti ti-share"></i></span>
                    <div>
                      <strong>Пригласить</strong>
                      <span>Ссылка на группу в Yaqin</span>
                    </div>
                    <i class="ti ti-chevron-right"></i>
                  </button>
                  <button type="button" class="me-mini-row" data-action="edit-group" data-id="${esc(group.id)}">
                    <span class="host-action-icon yellow"><i class="ti ti-settings"></i></span>
                    <div>
                      <strong>Настройки</strong>
                      <span>Название, фото, тип группы</span>
                    </div>
                    <i class="ti ti-chevron-right"></i>
                  </button>
                  ${!open ? `
                    <button type="button" class="me-mini-row" data-host-tab="requests">
                      <span class="host-action-icon green"><i class="ti ti-user-plus"></i></span>
                      <div>
                        <strong>Заявки</strong>
                        <span>${joinRequests.length ? `${joinRequests.length} ожидают` : 'Пока пусто'}</span>
                      </div>
                      <i class="ti ti-chevron-right"></i>
                    </button>` : ''}
                </div>
              </section>
            ` : ''}

            ${tab === 'members' ? `
              <div class="people-going-wrap">
                ${peopleGoingBlockHtml(members, {
                  key: 'group-members',
                  title: 'Участницы',
                  empty: 'Пока никого нет'
                })}
              </div>` : ''}

            ${tab === 'requests' ? `
              <section class="me-panel event-detail-panel">
                <div class="me-section-head">
                  <div><h3>Заявки</h3></div>
                  <span class="host-count">${joinRequests.length}</span>
                </div>
                ${joinRequests.length ? `
                  <div class="group-join-requests">
                    ${joinRequests.map(person => `
                      <div class="group-join-row">
                        <img src="${esc(person.photo)}" alt="">
                        <div>
                          <strong>${esc(person.name)}${person.age ? `, ${person.age}` : ''}</strong>
                          <span>${esc(person.message || 'Хочет вступить')}</span>
                        </div>
                        <button type="button" class="group-join-accept" data-accept="${esc(String(person.id))}">Принять</button>
                        <button type="button" class="group-join-reject" data-reject="${esc(String(person.id))}" aria-label="Отклонить"><i class="ti ti-x"></i></button>
                      </div>`).join('')}
                  </div>` : `<p class="host-empty">Пока нет заявок</p>`}
              </section>` : ''}
          </div>
        </article>`;
    } else {
      view.innerHTML = `
        <div class="group-hub-page">
          <header class="group-hub-top">
            ${backControlHtml('groups')}
          </header>

          <div class="group-hub-cover event-photo">
            <img src="${esc(group.photo)}" alt="">
          </div>

          <section class="group-hub-body">
            <em class="group-hub-city">${esc(group.city || 'Ташкент')} · ${open ? 'открытая' : 'закрытая'}</em>
            <h1>${esc(group.title)}${open ? '' : ' <i class="ti ti-lock"></i>'}</h1>
            <p class="group-hub-about">${esc(group.about || 'Группа в Yaqin')}</p>
            <p class="group-hub-meta">${memberCount} участниц${group.online ? ` · ${group.online} онлайн` : ''}</p>

            <div class="people-going-wrap">
              ${peopleGoingBlockHtml(members, {
                key: 'group-members',
                title: 'Участницы',
                empty: 'Пока никого нет'
              })}
            </div>
          </section>

          <div class="sticky-page-cta group-hub-cta ${member ? 'two' : 'one'}">
            ${member
              ? `
                <button type="button" class="taneesh-buy-block" data-action="group-chat" data-id="${esc(group.id)}">Чат</button>
                <button type="button" class="taneesh-buy-block ghost" id="inviteGroup">Пригласить</button>`
              : pending
                ? `<button type="button" class="taneesh-buy-block" disabled>Заявка отправлена</button>`
                : open
                  ? `<button type="button" class="taneesh-buy-block" id="joinOpenGroup">Вступить</button>`
                  : `<button type="button" class="taneesh-buy-block" id="requestJoin">Подать заявку</button>`}
          </div>
          ${joinSheet ? `
            <div class="edit-sheet-scrim" id="joinSheetScrim"></div>
            <div class="edit-sheet edit-sheet--text create-when-sheet join-request-sheet" role="dialog" aria-modal="true" aria-labelledby="joinSheetTitle">
              <header class="edit-sheet-head">
                <button type="button" class="edit-sheet-close" id="closeJoinSheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
                <div class="edit-sheet-titles">
                  <h2 id="joinSheetTitle">Заявка</h2>
                  <p>Коротко напишите, почему хотите вступить</p>
                </div>
                <span class="edit-sheet-spacer"></span>
              </header>
              <textarea class="create-sheet-textarea" id="joinMessage" maxlength="200" rows="4" placeholder="Например: читаю нон-фикшн и ищу компанию для обсуждений">${esc(joinDraft)}</textarea>
              <p class="edit-sheet-hint">От 3 до 200 символов</p>
              <div class="edit-sheet-foot">
                <button type="button" class="edit-sheet-clear-field" id="clearJoinMessage" ${joinDraft.trim() ? '' : 'hidden'}>Очистить</button>
                <button type="button" class="edit-sheet-done" id="sendJoinRequest" ${joinDraft.trim().length >= 3 ? '' : 'disabled'}>Отправить</button>
              </div>
            </div>` : ''}
        </div>`;
    }

    document.body.classList.toggle('edit-sheet-open', joinSheet);

    if (tab === 'members' || !isOwner) {
      bindPeopleGoingBlock(view, members, { key: 'group-members', title: 'Участницы' });
    }

    view.querySelectorAll('[data-host-tab]').forEach(button => {
      button.addEventListener('click', () => {
        tab = button.dataset.hostTab;
        render();
      });
    });
    view.querySelector('#inviteGroup')?.addEventListener('click', share);
    view.querySelector('#requestJoin')?.addEventListener('click', () => {
      joinSheet = true;
      joinDraft = '';
      render();
      queueMicrotask(() => view.querySelector('#joinMessage')?.focus());
    });
    const closeJoinSheet = () => {
      joinSheet = false;
      joinDraft = '';
      document.body.classList.remove('edit-sheet-open');
      render();
    };
    view.querySelector('#joinSheetScrim')?.addEventListener('click', closeJoinSheet);
    view.querySelector('#closeJoinSheet')?.addEventListener('click', closeJoinSheet);
    const joinInput = view.querySelector('#joinMessage');
    joinInput?.addEventListener('input', () => {
      joinDraft = joinInput.value;
      const send = view.querySelector('#sendJoinRequest');
      if (send) send.disabled = joinDraft.trim().length < 3;
      const clear = view.querySelector('#clearJoinMessage');
      if (clear) clear.hidden = !joinDraft.trim();
    });
    view.querySelector('#clearJoinMessage')?.addEventListener('click', () => {
      joinDraft = '';
      if (joinInput) joinInput.value = '';
      const send = view.querySelector('#sendJoinRequest');
      if (send) send.disabled = true;
      const clear = view.querySelector('#clearJoinMessage');
      if (clear) clear.hidden = true;
      joinInput?.focus();
    });
    view.querySelector('#sendJoinRequest')?.addEventListener('click', () => {
      const result = requestJoinGroup(group.id, joinDraft);
      if (!result) return;
      joinSheet = false;
      joinDraft = '';
      document.body.classList.remove('edit-sheet-open');
      showCelebrate({
        title: 'Заявка отправлена',
        subtitle: 'Организатор прочитает сообщение и ответит.',
        primaryLabel: 'К группам',
        onPrimary: () => navigate('groups')
      });
      navigate('group', result.id);
    });
    view.querySelector('#joinOpenGroup')?.addEventListener('click', () => {
      const joined = joinOpenGroup(group.id);
      if (joined) navigate('group-chat', joined.id);
    });
    view.querySelectorAll('[data-accept]').forEach(button => {
      button.onclick = () => {
        acceptJoinRequest(group.id, button.dataset.accept);
        groupHubScreen(group.id);
      };
    });
    view.querySelectorAll('[data-reject]').forEach(button => {
      button.onclick = () => {
        rejectJoinRequest(group.id, button.dataset.reject);
        groupHubScreen(group.id);
      };
    });
  };

  render();
}

/** Простой чат группы (без комнат/постов). */
export function groupChatScreen(id) {
  clearHeader();
  const group = peekGroup(id);
  if (!group) {
    navigate('groups');
    return;
  }
  if (!isGroupMember(group)) {
    navigate('group', id);
    return;
  }

  let draft = '';
  let attachPhoto = null;
  let menuOpen = false;
  const messages = [...(group.messages || [])];

  const persist = () => {
    const state = getState();
    const list = (state.userGroups || []).map(item =>
      String(item.id) === String(group.id) ? { ...item, messages: [...messages] } : item
    );
    saveState({ ...state, userGroups: list });
  };

  const render = () => {
    const hasDraft = Boolean(draft.trim() || attachPhoto);
    view.innerHTML = `
      <div class="chat-page group-chat-lite">
        <header class="chat-top">
          ${hasTelegramBack()
            ? ''
            : `<button type="button" class="chat-back" data-action="group" data-id="${esc(group.id)}" aria-label="Назад"><i class="ti ti-chevron-left"></i></button>`}
          <button type="button" class="chat-peer chat-peer-btn" data-action="group" data-id="${esc(group.id)}">
            <img class="chat-peer-photo" src="${esc(group.photo)}" alt="">
            <span class="chat-peer-copy">
              <h1>${esc(group.title)}</h1>
              <p>${group.members || 1} участниц · ${esc(group.city || '')}</p>
            </span>
          </button>
          <button type="button" id="groupChatMenu" aria-label="Ещё"><i class="ti ti-dots"></i></button>
        </header>

        ${menuOpen ? `
          <div class="chat-menu-pop">
            <button type="button" data-action="group" data-id="${esc(group.id)}">О группе</button>
            <button type="button" id="groupChatShare">Пригласить</button>
          </div>` : ''}

        <div class="chat-thread">
          ${messages.map(message => `
            <div class="chat-bubble ${message.from === 'me' ? 'mine' : ''}">
              <div class="bubble-body">
                <div class="bubble-head">
                  <b>${esc(message.from === 'me' ? 'Вы' : (message.name || 'Участница'))}</b>
                  <time>${esc(message.time || '')}</time>
                </div>
                ${message.text ? `<p>${esc(message.text)}</p>` : ''}
                ${message.image ? `<img class="bubble-image" src="${esc(message.image)}" alt="">` : ''}
              </div>
            </div>`).join('')}
        </div>

        ${attachPhoto ? `
          <div class="draft-attach">
            <img src="${esc(attachPhoto)}" alt="">
            <button type="button" id="clearGroupAttach" aria-label="Убрать"><i class="ti ti-x"></i></button>
          </div>` : ''}
        <div class="message-bar">
          <button class="msg-add" id="groupAttachPhoto" type="button" aria-label="Фото"><i class="ti ti-photo"></i></button>
          <input type="file" id="groupAttachFile" accept="image/jpeg,image/png,image/webp" hidden>
          <label class="msg-field">
            <input id="groupDraft" placeholder="Написать сообщение" value="${esc(draft)}" maxlength="500" autocomplete="off">
          </label>
          <button class="msg-send ${hasDraft ? 'on' : ''}" id="groupSendBtn" type="button" aria-label="Отправить" ${hasDraft ? '' : 'disabled'}>
            <i class="ti ti-arrow-up"></i>
          </button>
        </div>
      </div>`;

    const input = view.querySelector('#groupDraft');
    input?.addEventListener('input', () => {
      draft = input.value;
      const send = view.querySelector('#groupSendBtn');
      const has = Boolean(draft.trim() || attachPhoto);
      if (send) {
        send.disabled = !has;
        send.classList.toggle('on', has);
      }
    });
    view.querySelector('#groupChatMenu')?.addEventListener('click', () => {
      menuOpen = !menuOpen;
      render();
    });
    view.querySelector('#groupChatShare')?.addEventListener('click', () => {
      const text = `Присоединяйся к группе «${group.title}» в Yaqin`;
      try {
        const tg = window.Telegram?.WebApp;
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/yaqin_bot')}&text=${encodeURIComponent(text)}`);
          return;
        }
      } catch (_) { /* ignore */ }
      navigator.share?.({ text }).catch(() => {});
    });
    view.querySelector('#groupAttachPhoto')?.addEventListener('click', () => {
      view.querySelector('#groupAttachFile')?.click();
    });
    view.querySelector('#groupAttachFile')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const okType = /^(image\/jpeg|image\/png|image\/webp)$/i.test(file.type)
        || /\.(jpe?g|png|webp)$/i.test(file.name || '');
      if (!okType) {
        window.Telegram?.WebApp?.showAlert?.('Можно только фото: JPG, PNG или WebP')
          || window.alert('Можно только фото: JPG, PNG или WebP');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        attachPhoto = String(reader.result || '');
        render();
      };
      reader.readAsDataURL(file);
    });
    view.querySelector('#clearGroupAttach')?.addEventListener('click', () => {
      attachPhoto = null;
      render();
    });
    view.querySelector('#groupSendBtn')?.addEventListener('click', () => {
      if (!draft.trim() && !attachPhoto) return;
      const profile = getState().profile || defaultProfile;
      messages.push({
        from: 'me',
        name: profile.name || 'Вы',
        text: draft.trim(),
        image: attachPhoto || undefined,
        time: 'сейчас'
      });
      draft = '';
      attachPhoto = null;
      persist();
      render();
    });
  };

  render();
}

/** Создание / редактирование события — поля как в Taneesh: ряды → модалки. */
export function createEventScreen(editId = null) {
  clearHeader();
  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const pad2 = value => String(value).padStart(2, '0');
  const toIsoDate = date => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const todayIso = () => toIsoDate(new Date());
  const labelForDate = date => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startSlot = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startSlot - startToday) / 86400000);
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  };
  const whenSlot = (date, timeLabel) => {
    const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const time = String(timeLabel || '19:00');
    return {
      when: `${labelForDate(slot)} · ${time}`,
      day: String(slot.getDate()),
      month: MONTHS_SHORT[slot.getMonth()],
      iso: toIsoDate(slot),
      time
    };
  };
  const slotFromParts = (iso, time) => {
    const [year, month, day] = String(iso || '').split('-').map(Number);
    const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month - 1, day)
      : new Date();
    if (Number.isNaN(date.getTime())) return whenSlot(new Date(), time || '19:00');
    return whenSlot(date, time || '19:00');
  };
  const partsFromSlot = slot => {
    if (slot?.iso && slot?.time) return { iso: slot.iso, time: slot.time };
    const whenText = String(slot?.when || '');
    const timeMatch = whenText.match(/(\d{1,2}):(\d{2})/);
    const time = timeMatch ? `${pad2(Number(timeMatch[1]))}:${timeMatch[2]}` : '19:00';
    const monthKey = String(slot?.month || '').toLowerCase();
    const dayNum = Number(slot?.day);
    const monthIdx = MONTHS_SHORT.indexOf(monthKey);
    if (Number.isFinite(dayNum) && monthIdx >= 0) {
      return { iso: toIsoDate(new Date(new Date().getFullYear(), monthIdx, dayNum)), time };
    }
    const dateMatch = whenText.match(/(\d{1,2})\s+([а-яё]{3})/i);
    if (dateMatch) {
      const idx = MONTHS_SHORT.indexOf(dateMatch[2].toLowerCase());
      if (idx >= 0) {
        return { iso: toIsoDate(new Date(new Date().getFullYear(), idx, Number(dateMatch[1]))), time };
      }
    }
    if (/сегодня/i.test(whenText)) return { iso: todayIso(), time };
    if (/завтра/i.test(whenText)) {
      const next = new Date();
      next.setDate(next.getDate() + 1);
      return { iso: toIsoDate(next), time };
    }
    return { iso: todayIso(), time };
  };
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const inDays = n => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };
  const WHEN_OPTIONS = [
    whenSlot(today, '19:00'),
    whenSlot(tomorrow, '11:00'),
    whenSlot(inDays(3), '10:00'),
    whenSlot(inDays(4), '11:00'),
    whenSlot(inDays(7), '19:30'),
    whenSlot(inDays(8), '16:00')
  ];
  const PLACE_OPTIONS = [
    'Кофейня в центре',
    'Парк Ашхабад',
    'Мирабад',
    'Юнусабад',
    'Чиланзар',
    'Next',
    'Magic City',
    'Бродвей',
    'Самарканд · Регистан',
    'Онлайн'
  ];
  const INTEREST_MAX = 5;

  const existing = editId != null && editId !== '' ? findEvent(editId) : null;
  const isEdit = Boolean(existing && existing.hostId === 'me');
  if (editId && !isEdit) {
    navigate('events');
    return;
  }

  let title = isEdit ? (existing.title || '') : '';
  let place = isEdit ? (existing.place || '') : '';
  let address = isEdit ? (existing.address || '') : '';
  let placeCoords = (() => {
    if (isEdit && Number.isFinite(Number(existing.lat)) && Number.isFinite(Number(existing.lng))) {
      return { lat: Number(existing.lat), lng: Number(existing.lng) };
    }
    return coordsForPlace(place) || { ...TASHKENT };
  })();
  let description = isEdit ? (existing.description || '') : '';
  let interests = isEdit ? [...(existing.interests || [])] : [];
  let whenIdx = 3;
  let selectedSlot = WHEN_OPTIONS[whenIdx];
  if (isEdit && existing.when) {
    const found = WHEN_OPTIONS.findIndex(option => option.when === existing.when);
    if (found >= 0) {
      whenIdx = found;
      selectedSlot = WHEN_OPTIONS[found];
    } else {
      const parts = partsFromSlot({
        when: existing.when,
        day: existing.day,
        month: existing.month
      });
      selectedSlot = {
        ...slotFromParts(parts.iso, parts.time),
        when: existing.when,
        day: existing.day || parts.iso.split('-')[2]?.replace(/^0/, '') || '',
        month: existing.month || ''
      };
      if (!selectedSlot.day || !selectedSlot.month) {
        selectedSlot = slotFromParts(parts.iso, parts.time);
      }
      whenIdx = -1;
    }
  }
  let cover = isEdit ? (existing.photo || null) : null;
  let coverIndex = 0;
  let ticketMode = isEdit
    ? (existing.ticketMode || (existing.isFree === false
      ? (existing.paymentMode === 'at_door' || existing.paymentMode === 'door' ? 'door' : 'paid')
      : 'free'))
    : 'free';
  let freeEntryMode = isEdit
    ? (existing.freeEntryMode === 'register' ? 'register' : 'open')
    : 'open';
  let doorPrice = isEdit && ticketMode === 'door'
    ? String(existing.price || '50000')
    : '50000';
  let paidPrice = isEdit && ticketMode === 'paid'
    ? String(existing.price || '45000')
    : '45000';
  let capacity = isEdit ? String(existing.capacity || '30') : '30';
  let sheet = null;
  let sheetQuery = '';
  let draftText = '';
  let restoreFocus = false;
  let whenDraft = partsFromSlot(selectedSlot);
  let placeMapApi = null;
  let placeGeoBusy = false;

  const whenOf = () => selectedSlot || WHEN_OPTIONS[0];
  const preview = (text, empty) => {
    const value = String(text || '').trim();
    if (!value) return empty;
    return value.length > 42 ? `${value.slice(0, 42)}…` : value;
  };

  const destroyPlaceMap = () => {
    placeMapApi?.destroy?.();
    placeMapApi = null;
  };

  const closeSheet = () => {
    destroyPlaceMap();
    sheet = null;
    sheetQuery = '';
    draftText = '';
    restoreFocus = false;
    render();
  };

  const sheetHead = (heading, sub) => `
    <header class="edit-sheet-head">
      <button type="button" class="edit-sheet-close" id="closeSheet" aria-label="Закрыть"><i class="ti ti-x"></i></button>
      <div class="edit-sheet-titles"><h2>${esc(heading)}</h2><p>${esc(sub)}</p></div>
      <span class="edit-sheet-spacer"></span>
    </header>`;

  const renderSheet = () => {
    if (sheet === 'when') {
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--picker create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Когда', 'Дата и время события')}
          <div class="create-when-custom">
            <label>
              Дата
              <input id="whenDate" type="date" min="${esc(todayIso())}" value="${esc(whenDraft.iso)}" required>
            </label>
            <label>
              Время
              <input id="whenTime" type="time" value="${esc(whenDraft.time)}" required>
            </label>
          </div>
          <p class="create-when-quick">Быстрый выбор</p>
          <div class="create-when-list">
            ${WHEN_OPTIONS.map((option, index) => `
              <button type="button" class="create-when-row ${index === whenIdx ? 'on' : ''}" data-when="${index}">
                <span>${esc(option.when)}</span>
                ${index === whenIdx ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
          <div class="edit-sheet-foot">
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'place') {
      const filtered = filterOptions(PLACE_OPTIONS, sheetQuery);
      const customValue = PLACE_OPTIONS.includes(place) ? '' : place;
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--picker create-when-sheet create-place-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Место', 'Карта или быстрый список')}
          <div class="create-place-map-wrap">
            <div id="placeMap" class="create-place-map" role="application" aria-label="Карта места"></div>
            <p class="create-place-map-hint" id="placeMapHint">Нажмите на карту или перетащите метку</p>
            <button type="button" class="create-place-locate" id="placeLocate">
              <i class="ti ti-current-location"></i> Моё местоположение
            </button>
          </div>
          <label class="edit-sheet-search">
            <i class="ti ti-search"></i>
            <input id="sheetSearch" type="search" placeholder="Поиск в списке" value="${esc(sheetQuery)}" autocomplete="off">
          </label>
          <div class="create-when-list" id="placeList">
            ${filtered.map(item => `
              <button type="button" class="create-when-row ${place === item ? 'on' : ''}" data-place="${esc(item)}">
                <span>${esc(item)}</span>
                ${place === item ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
          <div class="edit-work-custom">
            <span>Своё место</span>
            <input id="placeCustom" type="text" maxlength="80" value="${esc(customValue)}" placeholder="Название или адрес" autocomplete="off">
          </div>
          <div class="edit-sheet-foot">
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'address') {
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--text create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Адрес', 'Уточните локацию')}
          <textarea class="create-sheet-textarea" id="addressInput" maxlength="120" rows="3" placeholder="Улица, ориентир или «онлайн»">${esc(draftText)}</textarea>
          <div class="edit-sheet-foot">
            ${draftText ? '<button type="button" class="edit-sheet-clear-field" id="clearAddress">Очистить</button>' : ''}
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'description') {
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--text create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Описание', 'Расскажите, что будет')}
          <textarea class="create-sheet-textarea" id="descInput" maxlength="400" rows="6" placeholder="Коротко о встрече, дресс-код, что взять с собой…">${esc(draftText)}</textarea>
          <div class="edit-sheet-foot">
            ${draftText ? '<button type="button" class="edit-sheet-clear-field" id="clearDesc">Очистить</button>' : ''}
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'interests') {
      const filtered = filterOptions(INTEREST_OPTIONS, sheetQuery);
      const ordered = [
        ...interests.filter(item => filtered.includes(item)),
        ...filtered.filter(item => !interests.includes(item))
      ];
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--picker create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Интересы', interests.length ? `выбрано ${interests.length} из ${INTEREST_MAX}` : 'Выберите темы события')}
          <label class="edit-sheet-search">
            <i class="ti ti-search"></i>
            <input id="sheetSearch" type="search" placeholder="Поиск" value="${esc(sheetQuery)}" autocomplete="off">
          </label>
          <div class="edit-chip-picker">
            ${ordered.map(item => `
              <button type="button" class="pick-chip ${interests.includes(item) ? 'on' : ''}" data-interest="${esc(item)}">${esc(item)}</button>
            `).join('') || '<p class="edit-sheet-empty">Ничего не найдено</p>'}
          </div>
          <div class="edit-sheet-foot">
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    if (sheet === 'capacity') {
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--text create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Места', 'Сколько гостей ждёте')}
          <div class="create-when-list">
            ${['10', '20', '30', '50', '100'].map(item => `
              <button type="button" class="create-when-row ${capacity === item ? 'on' : ''}" data-capacity="${item}">
                <span>до ${item}</span>
                ${capacity === item ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
          <div class="edit-work-custom">
            <span>Своё число</span>
            <input id="capacityCustom" type="text" inputmode="numeric" maxlength="4" value="${esc(['10', '20', '30', '50', '100'].includes(capacity) ? '' : capacity)}" placeholder="например 25" autocomplete="off">
          </div>
          <div class="edit-sheet-foot">
            <button type="button" class="edit-sheet-done" id="doneSheet">Готово</button>
          </div>
        </div>`;
    }

    return '';
  };

  const render = () => {
    const doorSum = Number(String(doorPrice).replace(/\D/g, '')) || 0;
    const paidSum = Number(String(paidPrice).replace(/\D/g, '')) || 0;
    const ready = title.trim().length > 1 && place.trim().length > 1
      && (ticketMode === 'free'
        || (ticketMode === 'door' && doorSum > 0)
        || (ticketMode === 'paid' && paidSum > 0));
    const when = whenOf();
    document.body.classList.toggle('edit-sheet-open', Boolean(sheet));
    destroyPlaceMap();

    view.innerHTML = `
      <div class="create-event-page">
        <header class="filters-head">
          ${isEdit ? backControlHtml('back') : backControlHtml('me')}
          <h1>${isEdit ? 'Редактировать' : 'Новое событие'}</h1>
        </header>

        <div class="create-identity-panel">
          <div class="create-cover create-event-cover ${cover ? 'has-photo' : ''}">
            ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ОБЛОЖКА</span>`}
            <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
            <input type="file" id="coverFile" accept="image/jpeg,image/png,image/webp" hidden>
          </div>
          <input class="create-name" id="eventTitle" placeholder="Название события" value="${esc(title)}" maxlength="80" autocomplete="off">
        </div>

        <div class="create-field-rows">
          <button class="settings-row" type="button" data-sheet="place">
            <span class="settings-icon orange square"><i class="ti ti-map-pin"></i></span>
            <span>Место<br><small>${esc(preview(place, 'Добавить'))}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="address">
            <span class="settings-icon blue square"><i class="ti ti-building"></i></span>
            <span>Адрес<br><small>${esc(preview(address, 'Добавить'))}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="when">
            <span class="settings-icon blue square"><i class="ti ti-calendar-event"></i></span>
            <span>Когда<br><small>${esc(when.when)}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="description">
            <span class="settings-icon purple square"><i class="ti ti-align-left"></i></span>
            <span>Описание<br><small>${esc(preview(description, 'Добавить'))}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="interests">
            <span class="settings-icon pink square"><i class="ti ti-sparkles"></i></span>
            <span>Интересы<br><small>${esc(interests.length ? interests.join(', ') : 'Добавить')}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
          <button class="settings-row" type="button" data-sheet="capacity">
            <span class="settings-icon green square"><i class="ti ti-users"></i></span>
            <span>Места<br><small>до ${esc(capacity || '30')}</small></span>
            <i class="ti ti-chevron-right"></i>
          </button>
        </div>

        <div class="create-entry-panel">
        <h3 class="settings-label">Вход</h3>
        <div class="create-chips" id="ticketModeChips">
          <button type="button" class="${ticketMode === 'free' ? 'on' : ''}" data-mode="free">
            <i class="ti ti-ticket"></i> Бесплатно
          </button>
          <button type="button" class="${ticketMode === 'door' ? 'on' : ''}" data-mode="door">
            <i class="ti ti-cash"></i> На входе
          </button>
          <button type="button" class="${ticketMode === 'paid' ? 'on' : ''}" data-mode="paid">
            <i class="ti ti-credit-card"></i> Онлайн
          </button>
        </div>

        ${ticketMode === 'free' ? `
          <div class="create-chips" id="freeEntryChips">
            <button type="button" class="${freeEntryMode === 'open' ? 'on' : ''}" data-free-entry="open">
              Свободный вход
            </button>
            <button type="button" class="${freeEntryMode === 'register' ? 'on' : ''}" data-free-entry="register">
              С регистрацией
            </button>
          </div>
        ` : ''}

        ${ticketMode === 'door' ? `
          <label class="create-price-field">
            <span>Сумма на входе</span>
            <div class="create-price-input">
              <input id="doorPrice" type="text" inputmode="numeric" value="${esc(doorPrice)}" placeholder="50000" maxlength="10" autocomplete="off">
              <em>сум</em>
            </div>
          </label>
        ` : ''}
        ${ticketMode === 'paid' ? `
          <label class="create-price-field">
            <span>Цена билета</span>
            <div class="create-price-input">
              <input id="paidPrice" type="text" inputmode="numeric" value="${esc(paidPrice)}" placeholder="45000" maxlength="10" autocomplete="off">
              <em>сум</em>
            </div>
          </label>
        ` : ''}

        <p class="create-legal">
          ${ticketMode === 'free'
            ? (freeEntryMode === 'register'
              ? 'Гость записывается и получает QR.'
              : 'Свободный вход без записи и QR.')
            : ticketMode === 'paid'
              ? `Гость оплачивает ${paidSum ? paidSum.toLocaleString('ru-RU') + ' сум' : 'билет'} в Mini App.`
              : `Бронь в Mini App, на входе — ${doorSum ? doorSum.toLocaleString('ru-RU') + ' сум' : 'оплата'}.`}
        </p>
        </div>

        <div class="create-sticky-cta">
          <button type="button" class="create-submit ${ready ? 'on' : ''}" id="createEventBtn" ${ready ? '' : 'disabled'}>${isEdit ? 'Сохранить' : 'Создать'}</button>
        </div>
      </div>

      ${renderSheet()}`;

    const syncReady = () => {
      const btn = view.querySelector('#createEventBtn');
      if (!btn) return;
      const doorOk = Number(String(doorPrice).replace(/\D/g, '')) > 0;
      const paidOk = Number(String(paidPrice).replace(/\D/g, '')) > 0;
      const priceOk = ticketMode === 'free' || (ticketMode === 'door' && doorOk) || (ticketMode === 'paid' && paidOk);
      const ok = title.trim().length > 1 && place.trim().length > 1 && priceOk;
      btn.disabled = !ok;
      btn.classList.toggle('on', ok);
    };

    view.querySelector('#eventTitle').oninput = event => { title = event.target.value; syncReady(); };
    view.querySelector('#setCover').onclick = () => {
      view.querySelector('#coverFile')?.click();
    };
    view.querySelector('#coverFile')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        cover = nextCover(coverIndex++);
        render();
        return;
      }
      const okType = /^(image\/jpeg|image\/png|image\/webp)$/i.test(file.type)
        || /\.(jpe?g|png|webp)$/i.test(file.name || '');
      if (!okType) {
        window.Telegram?.WebApp?.showAlert?.('Можно только фото: JPG, PNG или WebP')
          || window.alert('Можно только фото: JPG, PNG или WebP');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cover = String(reader.result || '') || nextCover(coverIndex++);
        render();
      };
      reader.onerror = () => {
        cover = nextCover(coverIndex++);
        render();
      };
      reader.readAsDataURL(file);
    });
    view.querySelectorAll('[data-sheet]').forEach(button => {
      button.onclick = () => {
        sheet = button.dataset.sheet;
        sheetQuery = '';
        if (sheet === 'description') draftText = description;
        if (sheet === 'address') draftText = address;
        if (sheet === 'when') whenDraft = partsFromSlot(whenOf());
        render();
      };
    });
    view.querySelectorAll('[data-mode]').forEach(button => {
      button.onclick = () => {
        const mode = button.dataset.mode;
        ticketMode = mode === 'door' || mode === 'paid' ? mode : 'free';
        render();
      };
    });
    view.querySelectorAll('[data-free-entry]').forEach(button => {
      button.onclick = () => {
        freeEntryMode = button.dataset.freeEntry === 'register' ? 'register' : 'open';
        render();
      };
    });
    const priceInput = view.querySelector('#doorPrice');
    if (priceInput) {
      priceInput.oninput = event => {
        doorPrice = event.target.value.replace(/[^\d]/g, '');
        event.target.value = doorPrice;
        syncReady();
      };
    }
    const paidInput = view.querySelector('#paidPrice');
    if (paidInput) {
      paidInput.oninput = event => {
        paidPrice = event.target.value.replace(/[^\d]/g, '');
        event.target.value = paidPrice;
        syncReady();
      };
    }

    view.querySelector('#sheetScrim')?.addEventListener('click', closeSheet);
    view.querySelector('#closeSheet')?.addEventListener('click', closeSheet);
    view.querySelector('#doneSheet')?.addEventListener('click', () => {
      if (sheet === 'when') {
        const iso = view.querySelector('#whenDate')?.value || whenDraft.iso || todayIso();
        const time = view.querySelector('#whenTime')?.value || whenDraft.time || '19:00';
        selectedSlot = slotFromParts(iso, time);
        whenDraft = { iso: selectedSlot.iso, time: selectedSlot.time };
        whenIdx = WHEN_OPTIONS.findIndex(option => option.iso === selectedSlot.iso && option.time === selectedSlot.time);
        closeSheet();
        return;
      }
      if (sheet === 'place') {
        const custom = view.querySelector('#placeCustom')?.value?.trim() || '';
        if (custom) place = custom;
        const live = placeMapApi?.getCoords?.();
        if (live) placeCoords = live;
      }
      if (sheet === 'address') {
        address = (view.querySelector('#addressInput')?.value || draftText || '').trim();
      }
      if (sheet === 'description') {
        description = (view.querySelector('#descInput')?.value || draftText || '').trim();
      }
      if (sheet === 'capacity') {
        const custom = view.querySelector('#capacityCustom')?.value?.replace(/\D/g, '') || '';
        if (custom) capacity = custom;
      }
      closeSheet();
    });

    const whenDateInput = view.querySelector('#whenDate');
    const whenTimeInput = view.querySelector('#whenTime');
    if (whenDateInput) {
      whenDateInput.oninput = () => {
        whenDraft = {
          iso: whenDateInput.value || whenDraft.iso,
          time: whenTimeInput?.value || whenDraft.time
        };
        whenIdx = -1;
      };
    }
    if (whenTimeInput) {
      whenTimeInput.oninput = () => {
        whenDraft = {
          iso: whenDateInput?.value || whenDraft.iso,
          time: whenTimeInput.value || whenDraft.time
        };
        whenIdx = -1;
      };
    }

    view.querySelectorAll('[data-when]').forEach(button => {
      button.onclick = () => {
        whenIdx = Number(button.dataset.when);
        selectedSlot = WHEN_OPTIONS[whenIdx] || WHEN_OPTIONS[0];
        whenDraft = partsFromSlot(selectedSlot);
        closeSheet();
      };
    });
    view.querySelectorAll('[data-place]').forEach(button => {
      button.onclick = () => {
        place = button.dataset.place;
        const known = coordsForPlace(place);
        if (known) {
          placeCoords = { ...known };
          placeMapApi?.setView(placeCoords);
        }
        const custom = view.querySelector('#placeCustom');
        if (custom) custom.value = '';
        view.querySelectorAll('#placeList [data-place]').forEach(row => {
          const on = row.dataset.place === place;
          row.classList.toggle('on', on);
          row.querySelector('i.ti-check')?.remove();
          if (on) row.insertAdjacentHTML('beforeend', '<i class="ti ti-check"></i>');
        });
        const hint = view.querySelector('#placeMapHint');
        if (hint) hint.textContent = place === 'Онлайн' ? 'Для онлайн-встречи карта не нужна' : place;
      };
    });
    view.querySelectorAll('[data-capacity]').forEach(button => {
      button.onclick = () => {
        capacity = button.dataset.capacity;
        render();
      };
    });
    view.querySelectorAll('[data-interest]').forEach(button => {
      button.onclick = () => {
        const value = button.dataset.interest;
        const index = interests.indexOf(value);
        if (index >= 0) interests.splice(index, 1);
        else if (interests.length < INTEREST_MAX) interests.push(value);
        restoreFocus = Boolean(sheetQuery);
        render();
      };
    });

    const refreshPlaceList = () => {
      const list = view.querySelector('#placeList');
      if (!list) return;
      const filtered = filterOptions(PLACE_OPTIONS, sheetQuery);
      list.innerHTML = filtered.map(item => `
        <button type="button" class="create-when-row ${place === item ? 'on' : ''}" data-place="${esc(item)}">
          <span>${esc(item)}</span>
          ${place === item ? '<i class="ti ti-check"></i>' : ''}
        </button>
      `).join('') || '<p class="edit-sheet-empty">Ничего не найдено</p>';
      list.querySelectorAll('[data-place]').forEach(button => {
        button.onclick = () => {
          place = button.dataset.place;
          const known = coordsForPlace(place);
          if (known) {
            placeCoords = { ...known };
            placeMapApi?.setView(placeCoords);
          }
          const custom = view.querySelector('#placeCustom');
          if (custom) custom.value = '';
          refreshPlaceList();
        };
      });
    };

    const search = view.querySelector('#sheetSearch');
    if (search) {
      if (restoreFocus) {
        search.focus();
        const len = search.value.length;
        search.setSelectionRange(len, len);
        restoreFocus = false;
      }
      search.oninput = () => {
        sheetQuery = search.value;
        if (sheet === 'place') {
          refreshPlaceList();
          return;
        }
        restoreFocus = true;
        render();
      };
    }

    const applyMapPick = async (coords, source = 'map') => {
      placeCoords = { lat: coords.lat, lng: coords.lng };
      const hint = view.querySelector('#placeMapHint');
      if (hint) hint.textContent = source === 'geo' ? 'Определяем адрес…' : 'Ищем название…';
      placeGeoBusy = true;
      const geo = await reverseGeocode(coords.lat, coords.lng);
      placeGeoBusy = false;
      place = geo.place || formatCoordLabel(coords.lat, coords.lng);
      if (geo.address) address = geo.address;
      const custom = view.querySelector('#placeCustom');
      if (custom) custom.value = place;
      refreshPlaceList();
      if (hint) hint.textContent = place;
    };

    if (sheet === 'place') {
      const mapEl = view.querySelector('#placeMap');
      mountPlaceMap(mapEl, {
        lat: placeCoords.lat,
        lng: placeCoords.lng,
        onPick: applyMapPick
      }).then(api => {
        if (sheet !== 'place') {
          api?.destroy?.();
          return;
        }
        placeMapApi = api;
      }).catch(() => {
        const hint = view.querySelector('#placeMapHint');
        if (hint) hint.textContent = 'Карта недоступна — выберите из списка или введите своё место';
      });

      view.querySelector('#placeLocate')?.addEventListener('click', () => {
        if (placeGeoBusy) return;
        const hint = view.querySelector('#placeMapHint');
        if (hint) hint.textContent = 'Определяем геолокацию…';
        const fail = () => {
          if (hint) hint.textContent = 'Не удалось получить геолокацию';
        };
        if (!navigator.geolocation) {
          fail();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          pos => {
            const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            placeMapApi?.setView(next, 16);
            applyMapPick(next, 'geo');
          },
          fail,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });

      const customInput = view.querySelector('#placeCustom');
      if (customInput) {
        customInput.oninput = () => {
          const value = customInput.value.trim();
          if (value) place = value;
        };
      }
    }

    const descInput = view.querySelector('#descInput');
    if (descInput) {
      descInput.focus();
      descInput.oninput = () => { draftText = descInput.value; };
    }
    view.querySelector('#clearDesc')?.addEventListener('click', () => {
      draftText = '';
      description = '';
      render();
    });
    const addressInput = view.querySelector('#addressInput');
    if (addressInput) {
      addressInput.focus();
      addressInput.oninput = () => { draftText = addressInput.value; };
    }
    view.querySelector('#clearAddress')?.addEventListener('click', () => {
      draftText = '';
      address = '';
      render();
    });

    view.querySelector('#createEventBtn').onclick = () => {
      if (!(title.trim().length > 1 && place.trim().length > 1)) return;
      const profile = getState().profile || defaultProfile;
      const slot = whenOf();
      const price = ticketMode === 'door'
        ? Number(String(doorPrice).replace(/\D/g, '')) || 0
        : ticketMode === 'paid'
          ? Number(String(paidPrice).replace(/\D/g, '')) || 0
          : 0;
      if ((ticketMode === 'door' || ticketMode === 'paid') && price < 1) return;

      const eventId = isEdit ? existing.id : `e-${Date.now()}`;
      const event = {
        ...(isEdit ? existing : {}),
        id: eventId,
        title: title.trim(),
        when: slot.when,
        day: slot.day,
        month: slot.month,
        place: place.trim(),
        address: address.trim() || 'Ташкент',
        lat: placeCoords?.lat,
        lng: placeCoords?.lng,
        description: description.trim(),
        interests: [...interests],
        capacity: Number(capacity) || 30,
        group: isEdit ? (existing.group || 'Yaqin') : 'Yaqin',
        host: profile.name || existing?.host || 'Вы',
        hostId: 'me',
        going: isEdit ? (existing.going || 1) : 1,
        photo: cover || existing?.photo || nextCover(1),
        isFree: ticketMode === 'free',
        freeEntryMode: ticketMode === 'free' ? freeEntryMode : undefined,
        ticketMode,
        paymentMode: ticketMode === 'door' ? 'at_door' : ticketMode === 'paid' ? 'online' : undefined,
        price,
        fee: ticketMode === 'paid' ? Math.round(price * 0.1) : 0,
        currency: 'UZS',
        source: isEdit ? (existing.source || 'yaqin') : 'yaqin',
        createdAt: isEdit ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const state = getState();

      if (isEdit) {
        const tickets = (state.tickets || []).map(ticket => {
          if (String(ticket.eventId) !== String(eventId)) return ticket;
          return {
            ...ticket,
            title: event.title,
            when: event.when,
            place: event.place,
            photo: event.photo,
            mode: ticket.role === 'host' ? ticketMode : ticket.mode,
            doorPay: ticket.role === 'host' && ticketMode === 'door' ? price : ticket.doorPay
          };
        });
        saveState({
          ...state,
          userEvents: (state.userEvents || []).map(item =>
            String(item.id) === String(eventId) ? event : item
          ),
          tickets
        });
        navigate('event', eventId);
        return;
      }

      const hostTicket = {
        id: `t-${eventId}-host`,
        eventId,
        title: event.title,
        when: event.when,
        place: event.place,
        photo: event.photo,
        mode: ticketMode,
        role: 'host',
        price: 0,
        fee: 0,
        total: 0,
        doorPay: ticketMode === 'door' ? price : 0,
        code: `YQHOST-${eventId.slice(-8).toUpperCase()}`,
        createdAt: new Date().toISOString()
      };

      saveState({
        ...state,
        userEvents: [event, ...(state.userEvents || [])],
        tickets: [hostTicket, ...(state.tickets || [])],
        eventGoing: {
          ...(state.eventGoing || {}),
          [eventId]: {
            id: 'me',
            name: profile.name || defaultProfile.name,
            age: profile.age || defaultProfile.age,
            photo: profile.photo || defaultProfile.photo,
            message: 'Организатор'
          }
        },
        eventInterest: { ...(state.eventInterest || {}), [eventId]: true }
      });

      showCelebrate({
        title: 'Событие создано',
        subtitle: ticketMode === 'free'
          ? (freeEntryMode === 'register'
            ? 'Гости записываются и получают QR.'
            : 'Свободный вход без QR.')
          : ticketMode === 'paid'
            ? 'Гости оплатят онлайн и получат QR.'
            : 'Гости бронируют место и платят на входе.',
        primaryLabel: 'Открыть QR',
        secondaryLabel: 'К событию',
        shareText: `Иду на «${event.title}» — присоединяйся в Yaqin`,
        onPrimary: () => navigate('ticket', hostTicket.id),
        onSecondary: () => navigate('event', eventId)
      });
      navigate('event', eventId);
    };
  };

  render();
}
