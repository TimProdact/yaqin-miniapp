import { events as taneeshEvents, PHOTOS, defaultProfile, demoGroups, people } from '../data.js';
import { view, esc, clearHeader } from '../dom.js';
import { navigate } from '../router.js';
import { getState, saveState } from '../state.js';
import { showCelebrate } from '../celebrate.js';
import { INTEREST_OPTIONS, filterOptions } from '../profile-fields.js';
import { backControlHtml, hasTelegramBack } from '../telegram-ui.js';
import { peopleGoingBlockHtml, bindPeopleGoingBlock, closePeopleGoingSheet } from '../people-going.js';

const COVER_POOL = [PHOTOS.palms, PHOTOS.coffee, PHOTOS.city, PHOTOS.books, PHOTOS.event, PHOTOS.mila].filter(Boolean);

export function getUserGroups() {
  return getState().userGroups || [];
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

/** Заявка в закрытую группу — статус pending до принятия. */
export function requestJoinGroup(id) {
  const existing = getUserGroups().find(group => String(group.id) === String(id));
  if (existing) return existing;
  const catalog = demoGroups.find(group => String(group.id) === String(id));
  if (!catalog) return null;
  if (catalog.isPublic !== false) return joinOpenGroup(id);
  const pending = {
    ...catalog,
    catalog: false,
    membership: 'pending',
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

  const render = () => {
    const term = query.trim().toLowerCase();
    const groups = listAllGroups()
      .filter(group => groupMatchesFilter(group, filter))
      .filter(group => groupMatchesQuery(group, term));
    const mineCount = getUserGroups().length;
    const pills = [
      ['all', 'Все'],
      ['open', 'Открытые'],
      ['closed', 'Закрытые']
    ];

    view.innerHTML = `
      <div class="groups-tab-page">
        <header class="chats-head">
          <h1>Группы</h1>
          <div class="events-head-actions">
            <button data-action="create-group" aria-label="Создать группу"><i class="ti ti-plus"></i></button>
          </div>
        </header>

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
                <h2>Создайте группу</h2>
                <p>Соберите людей по интересам — открытую или закрытую.</p>
                <button class="empty-primary" type="button" data-action="create-group">Создать группу</button>
              </div>`}

        ${!term && filter === 'all' && groups.length && !mineCount ? `
          <p class="groups-tab-hint">Открытые — вход сразу. Закрытые — по заявке.</p>
        ` : ''}
      </div>`;

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

/** Создание группы — название, фото, открытая/закрытая. */
export function createGroupScreen() {
  clearHeader();
  let name = '';
  let cover = null;
  let coverIndex = 0;
  let isPublic = true;

  const render = () => {
    const canCreate = name.trim().length > 1;
    view.innerHTML = `
      <div class="create-group-page">
        <header class="modal-head">
          ${backControlHtml('groups')}
          <h1>Создать группу</h1>
          <span></span>
        </header>

        <div class="create-cover ${cover ? 'has-photo' : ''}">
          ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ФОТО</span>`}
          <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
        </div>

        <input class="create-name" id="groupName" placeholder="Название группы..." value="${esc(name)}" maxlength="60" autocomplete="off">

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
          <p class="create-legal">
            ${isPublic
              ? 'Любая может вступить сразу и писать в чат.'
              : 'Вход только по заявке. Вы принимаете участниц вручную.'}
          </p>
        </div>

        <div class="create-sticky-cta">
          <button type="button" class="create-submit ${canCreate ? 'on' : ''}" id="createGroupBtn" ${canCreate ? '' : 'disabled'}>Создать</button>
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
        joinRequests: isPublic ? [] : people.slice(1, 3).map(person => ({
          id: person.id,
          name: person.name,
          photo: person.photo,
          age: person.age
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
      const state = getState();
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
  const isOwner = member && (group.ownerId === 'me' || String(group.id).startsWith('g-'));
  const joinRequests = isOwner ? (group.joinRequests || []) : [];
  const members = groupMembersPreview(group);

  view.innerHTML = `
    <div class="group-hub-page">
      <header class="group-hub-top">
        ${backControlHtml('groups')}
        <button type="button" id="shareGroup" aria-label="Поделиться"><i class="ti ti-share"></i></button>
      </header>

      <div class="group-hub-cover event-photo">
        <img src="${esc(group.photo)}" alt="">
      </div>

      <section class="group-hub-body">
        <em class="group-hub-city">${esc(group.city || 'Ташкент')} · ${open ? 'открытая' : 'закрытая'}</em>
        <h1>${esc(group.title)}${open ? '' : ' <i class="ti ti-lock"></i>'}</h1>
        <p class="group-hub-about">${esc(group.about || 'Группа в Yaqin')}</p>
        <p class="group-hub-meta">${memberCount} участниц${group.online ? ` · ${group.online} онлайн` : ''}</p>

        ${joinRequests.length ? `
          <section class="me-panel group-hub-panel">
            <div class="me-section-head">
              <div><h3>Заявки</h3></div>
              <span class="host-count">${joinRequests.length}</span>
            </div>
            <div class="group-join-requests">
              ${joinRequests.map(person => `
                <div class="group-join-row">
                  <img src="${esc(person.photo)}" alt="">
                  <div>
                    <strong>${esc(person.name)}${person.age ? `, ${person.age}` : ''}</strong>
                    <span>Хочет вступить</span>
                  </div>
                  <button type="button" class="group-join-accept" data-accept="${esc(String(person.id))}">Принять</button>
                  <button type="button" class="group-join-reject" data-reject="${esc(String(person.id))}" aria-label="Отклонить"><i class="ti ti-x"></i></button>
                </div>`).join('')}
            </div>
          </section>` : ''}

        <div class="people-going-wrap">
          ${peopleGoingBlockHtml(members, {
            key: 'group-members',
            title: 'Участницы',
            empty: 'Пока никого нет'
          })}
        </div>
      </section>

      <div class="group-hub-cta ${member ? 'two' : 'one'}">
        ${member
          ? `
            <button type="button" class="group-hub-chat" data-action="group-chat" data-id="${esc(group.id)}">Чат</button>
            <button type="button" class="group-hub-invite" id="inviteGroup">Пригласить</button>`
          : pending
            ? `<button type="button" class="group-hub-chat" disabled>Заявка отправлена</button>`
            : open
              ? `<button type="button" class="group-hub-chat" id="joinOpenGroup">Вступить</button>`
              : `<button type="button" class="group-hub-chat" id="requestJoin">Подать заявку</button>`}
      </div>
    </div>`;

  bindPeopleGoingBlock(view, members, { key: 'group-members', title: 'Участницы' });

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
  view.querySelector('#shareGroup').onclick = share;
  view.querySelector('#inviteGroup')?.addEventListener('click', share);
  view.querySelector('#requestJoin')?.addEventListener('click', () => {
    const result = requestJoinGroup(group.id);
    if (!result) return;
    showCelebrate({
      title: 'Заявка отправлена',
      subtitle: 'Организатор рассмотрит её. Пока статус — ожидает.',
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

/** Создание события — поля как в Taneesh: ряды → модалки. */
export function createEventScreen() {
  clearHeader();
  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const whenSlot = (date, timeLabel, label) => {
    const slot = new Date(date.getTime());
    return {
      when: `${label || `${WEEKDAYS[slot.getDay()]}, ${slot.getDate()} ${MONTHS_SHORT[slot.getMonth()]}`} · ${timeLabel}`,
      day: String(slot.getDate()),
      month: MONTHS_SHORT[slot.getMonth()]
    };
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
    whenSlot(today, '19:00', 'Сегодня'),
    whenSlot(tomorrow, '11:00', 'Завтра'),
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

  let title = '';
  let place = '';
  let address = '';
  let description = '';
  let interests = [];
  let whenIdx = 3;
  let cover = null;
  let coverIndex = 0;
  let ticketMode = 'free';
  let freeEntryMode = 'open'; // open = свободный вход · register = с записью + QR
  let doorPrice = '50000';
  let paidPrice = '45000';
  let capacity = '30';
  let sheet = null;
  let sheetQuery = '';
  let draftText = '';
  let restoreFocus = false;

  const whenOf = () => WHEN_OPTIONS[whenIdx] || WHEN_OPTIONS[0];
  const preview = (text, empty) => {
    const value = String(text || '').trim();
    if (!value) return empty;
    return value.length > 42 ? `${value.slice(0, 42)}…` : value;
  };

  const closeSheet = () => {
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
          ${sheetHead('Когда', 'Выберите дату и время')}
          <div class="create-when-list">
            ${WHEN_OPTIONS.map((option, index) => `
              <button type="button" class="create-when-row ${index === whenIdx ? 'on' : ''}" data-when="${index}">
                <span>${esc(option.when)}</span>
                ${index === whenIdx ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
        </div>`;
    }

    if (sheet === 'place') {
      const filtered = filterOptions(PLACE_OPTIONS, sheetQuery);
      return `
        <div class="edit-sheet-scrim" id="sheetScrim"></div>
        <div class="edit-sheet edit-sheet--picker create-when-sheet" role="dialog" aria-modal="true">
          ${sheetHead('Место', 'Где пройдёт встреча')}
          <label class="edit-sheet-search">
            <i class="ti ti-search"></i>
            <input id="sheetSearch" type="search" placeholder="Поиск или своё место" value="${esc(sheetQuery)}" autocomplete="off">
          </label>
          <div class="create-when-list">
            ${filtered.map(item => `
              <button type="button" class="create-when-row ${place === item ? 'on' : ''}" data-place="${esc(item)}">
                <span>${esc(item)}</span>
                ${place === item ? '<i class="ti ti-check"></i>' : ''}
              </button>
            `).join('')}
          </div>
          <div class="edit-work-custom">
            <span>Своё место</span>
            <input id="placeCustom" type="text" maxlength="80" value="${esc(PLACE_OPTIONS.includes(place) ? '' : place)}" placeholder="Адрес или название" autocomplete="off">
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

    view.innerHTML = `
      <div class="create-event-page">
        <header class="modal-head">
          ${backControlHtml('events')}
          <h1>Новое событие</h1>
          <span></span>
        </header>

        <div class="create-cover create-event-cover ${cover ? 'has-photo' : ''}">
          ${cover ? `<img src="${esc(cover)}" alt="">` : `<i class="ti ti-camera"></i><span>ОБЛОЖКА</span>`}
          <button type="button" class="cover-edit" id="setCover" aria-label="Изменить"><i class="ti ti-pencil"></i></button>
          <input type="file" id="coverFile" accept="image/jpeg,image/png,image/webp" hidden>
        </div>

        <input class="create-name" id="eventTitle" placeholder="Название события" value="${esc(title)}" maxlength="80" autocomplete="off">

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
              ? 'Гость записывается бесплатно и получает QR. «Хочу пойти» — отдельно, без QR.'
              : 'Свободный вход: без записи и QR. Гость может только отметить «Хочу пойти».')
            : ticketMode === 'paid'
              ? `Гость оплачивает ${paidSum ? paidSum.toLocaleString('ru-RU') + ' сум' : 'билет'} в Mini App и получает QR. Интерес — отдельно.`
              : `Гость бронирует место бесплатно, на входе платит ${doorSum ? doorSum.toLocaleString('ru-RU') + ' сум' : 'указанную сумму'} и показывает QR.`}
        </p>
        </div>

        <div class="create-sticky-cta">
          <button type="button" class="create-submit ${ready ? 'on' : ''}" id="createEventBtn" ${ready ? '' : 'disabled'}>Создать</button>
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
      if (sheet === 'place') {
        const custom = view.querySelector('#placeCustom')?.value?.trim() || '';
        if (custom) place = custom;
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

    view.querySelectorAll('[data-when]').forEach(button => {
      button.onclick = () => {
        whenIdx = Number(button.dataset.when);
        closeSheet();
      };
    });
    view.querySelectorAll('[data-place]').forEach(button => {
      button.onclick = () => {
        place = button.dataset.place;
        const custom = view.querySelector('#placeCustom');
        if (custom) custom.value = '';
        render();
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
        restoreFocus = true;
        render();
      };
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

      const eventId = `e-${Date.now()}`;
      const event = {
        id: eventId,
        title: title.trim(),
        when: slot.when,
        day: slot.day,
        month: slot.month,
        place: place.trim(),
        address: address.trim() || 'Ташкент',
        description: description.trim(),
        interests: [...interests],
        capacity: Number(capacity) || 30,
        group: 'Yaqin',
        host: profile.name || 'Вы',
        hostId: 'me',
        going: 1,
        photo: cover || nextCover(1),
        isFree: ticketMode === 'free',
        freeEntryMode: ticketMode === 'free' ? freeEntryMode : undefined,
        ticketMode,
        paymentMode: ticketMode === 'door' ? 'at_door' : ticketMode === 'paid' ? 'online' : undefined,
        price,
        fee: ticketMode === 'paid' ? Math.round(price * 0.1) : 0,
        currency: 'UZS',
        source: 'yaqin',
        createdAt: new Date().toISOString()
      };

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

      const state = getState();
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
            ? 'Гости запишутся и получат QR. Интерес — отдельно.'
            : 'Свободный вход: гости отмечают интерес без QR.')
          : ticketMode === 'paid'
            ? 'Гости оплатят онлайн и получат QR. Интерес — отдельно.'
            : 'Гости бронируют место, платят на входе и показывают QR.',
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
