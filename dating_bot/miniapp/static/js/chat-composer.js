import { esc } from './dom.js';
import { listAllGroups, allEvents } from './screens/community.js';

/** Есть ли что отправлять: текст, фото или карточка. */
export function hasComposerPayload(draft, attach = {}) {
  return Boolean(String(draft || '').trim() || attach.photo || attach.share);
}

export function groupsForShare(excludeId = null) {
  return listAllGroups()
    .filter(group => !excludeId || String(group.id) !== String(excludeId));
}

export function eventsForShare() {
  return allEvents();
}

export function shareFromGroup(group) {
  if (!group) return null;
  return {
    kind: 'group',
    id: group.id,
    title: group.title || 'Группа',
    subtitle: [
      group.members ? `${group.members} участниц` : '',
      group.city || ''
    ].filter(Boolean).join(' · ') || 'Группа в Yaqin',
    photo: group.photo || ''
  };
}

export function shareFromEvent(event) {
  if (!event) return null;
  return {
    kind: 'event',
    id: event.id,
    title: event.title || 'Событие',
    subtitle: [event.when, event.place].filter(Boolean).join(' · ') || 'Событие в Yaqin',
    photo: event.photo || ''
  };
}

export function attachMenuHtml() {
  return `
    <div class="attach-menu" role="menu">
      <button type="button" role="menuitem" data-attach-kind="photo">
        <span>Фото</span><i class="ti ti-photo"></i>
      </button>
      <button type="button" role="menuitem" data-attach-kind="group">
        <span>Группу</span><i class="ti ti-users"></i>
      </button>
      <button type="button" role="menuitem" data-attach-kind="event">
        <span>Событие</span><i class="ti ti-calendar-event"></i>
      </button>
    </div>`;
}

export function attachPickHtml(mode, excludeGroupId = null) {
  if (mode === 'group') {
    const groups = groupsForShare(excludeGroupId);
    return `
      <div class="attach-pick-sheet" data-pick="group">
        <header>
          <b>Выберите группу</b>
          <button type="button" data-attach-close-pick aria-label="Закрыть"><i class="ti ti-x"></i></button>
        </header>
        <div class="attach-pick-list">
          ${groups.length
            ? groups.map(group => `
              <button type="button" class="attach-pick-row" data-pick-group="${esc(group.id)}">
                <img src="${esc(group.photo || '')}" alt="">
                <span>
                  <strong>${esc(group.title || 'Группа')}</strong>
                  <small>${esc([group.members ? `${group.members} участниц` : '', group.city].filter(Boolean).join(' · ') || 'Группа')}</small>
                </span>
              </button>`).join('')
            : '<p class="attach-pick-empty">Нет групп для отправки</p>'}
        </div>
      </div>`;
  }
  if (mode === 'event') {
    const events = eventsForShare();
    return `
      <div class="attach-pick-sheet" data-pick="event">
        <header>
          <b>Выберите событие</b>
          <button type="button" data-attach-close-pick aria-label="Закрыть"><i class="ti ti-x"></i></button>
        </header>
        <div class="attach-pick-list">
          ${events.length
            ? events.map(event => `
              <button type="button" class="attach-pick-row" data-pick-event="${esc(event.id)}">
                <img src="${esc(event.photo || '')}" alt="">
                <span>
                  <strong>${esc(event.title || 'Событие')}</strong>
                  <small>${esc(event.when || event.place || 'Событие')}</small>
                </span>
              </button>`).join('')
            : '<p class="attach-pick-empty">Нет событий для отправки</p>'}
        </div>
      </div>`;
  }
  return '';
}

export function composerDraftHtml(attach = {}) {
  if (attach.photo) {
    return `
      <div class="composer-draft">
        <img class="composer-draft-thumb" src="${esc(attach.photo)}" alt="">
        <div class="composer-draft-copy">
          <b>Фото</b>
          <span>Вложение к сообщению</span>
        </div>
        <button type="button" class="composer-draft-clear" data-attach-clear aria-label="Убрать"><i class="ti ti-x"></i></button>
      </div>`;
  }
  if (attach.share) {
    const kindLabel = attach.share.kind === 'event' ? 'Событие' : 'Группа';
    return `
      <div class="composer-draft">
        ${attach.share.photo
          ? `<img class="composer-draft-thumb" src="${esc(attach.share.photo)}" alt="">`
          : `<span class="composer-draft-icon"><i class="ti ${attach.share.kind === 'event' ? 'ti-calendar-event' : 'ti-users'}"></i></span>`}
        <div class="composer-draft-copy">
          <b>${esc(kindLabel)}</b>
          <span>${esc(attach.share.title || '')}</span>
        </div>
        <button type="button" class="composer-draft-clear" data-attach-clear aria-label="Убрать"><i class="ti ti-x"></i></button>
      </div>`;
  }
  return '';
}

export function shareBubbleHtml(share) {
  if (!share?.kind || share.id == null) return '';
  const action = share.kind === 'event' ? 'event' : 'group';
  const kindLabel = share.kind === 'event' ? 'Событие' : 'Группа';
  return `
    <button type="button" class="share-card" data-action="${action}" data-id="${esc(share.id)}">
      ${share.photo ? `<img src="${esc(share.photo)}" alt="">` : ''}
      <div>
        <small>${esc(kindLabel)}</small>
        <strong>${esc(share.title || kindLabel)}</strong>
        ${share.subtitle ? `<span>${esc(share.subtitle)}</span>` : ''}
      </div>
    </button>`;
}

/** Привязка меню вложений к root композера. Возвращает true, если нужно перерисовать экран. */
export function bindComposerAttach(root, {
  getAttach,
  setAttach,
  onRerender,
  excludeGroupId = null,
  fileInputId = 'attachFile'
} = {}) {
  if (!root) return;

  root.querySelector('[data-attach-toggle]')?.addEventListener('click', () => {
    const attach = getAttach();
    const open = Boolean(attach.menuOpen || attach.pickMode);
    setAttach({
      ...attach,
      menuOpen: !open,
      pickMode: null
    });
    onRerender();
  });

  root.querySelectorAll('[data-attach-kind]').forEach(button => {
    button.addEventListener('click', () => {
      const kind = button.getAttribute('data-attach-kind');
      const attach = getAttach();
      if (kind === 'photo') {
        setAttach({ ...attach, menuOpen: false, pickMode: null, openFile: true });
        onRerender();
        return;
      }
      setAttach({ ...attach, menuOpen: false, pickMode: kind, openFile: false });
      onRerender();
    });
  });

  root.querySelector('[data-attach-close-pick]')?.addEventListener('click', () => {
    const attach = getAttach();
    setAttach({ ...attach, pickMode: null });
    onRerender();
  });

  root.querySelectorAll('[data-pick-group]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-pick-group');
      const group = groupsForShare(excludeGroupId).find(item => String(item.id) === String(id));
      const share = shareFromGroup(group);
      if (!share) return;
      const attach = getAttach();
      setAttach({ ...attach, photo: null, share, pickMode: null, menuOpen: false });
      onRerender();
    });
  });

  root.querySelectorAll('[data-pick-event]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-pick-event');
      const event = eventsForShare().find(item => String(item.id) === String(id));
      const share = shareFromEvent(event);
      if (!share) return;
      const attach = getAttach();
      setAttach({ ...attach, photo: null, share, pickMode: null, menuOpen: false });
      onRerender();
    });
  });

  root.querySelector('[data-attach-clear]')?.addEventListener('click', () => {
    const attach = getAttach();
    setAttach({ ...attach, photo: null, share: null });
    onRerender();
  });

  const fileInput = root.querySelector(`#${fileInputId}`);
  fileInput?.addEventListener('change', event => {
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
      const attach = getAttach();
      setAttach({
        ...attach,
        photo: String(reader.result || ''),
        share: null,
        menuOpen: false,
        pickMode: null,
        openFile: false
      });
      onRerender();
    };
    reader.readAsDataURL(file);
  });

  if (getAttach().openFile) {
    setAttach({ ...getAttach(), openFile: false });
    requestAnimationFrame(() => {
      root.querySelector(`#${fileInputId}`)?.click();
    });
  }
}

export function composerShellHtml({
  draft = '',
  attach = {},
  inputId = 'msgInput',
  sendId = 'sendMsg',
  fileInputId = 'attachFile',
  excludeGroupId = null,
  placeholder = 'Написать сообщение'
} = {}) {
  const ready = hasComposerPayload(draft, attach);
  return `
    <div class="chat-composer">
      ${attach.menuOpen ? attachMenuHtml() : ''}
      ${attach.pickMode ? attachPickHtml(attach.pickMode, excludeGroupId) : ''}
      ${composerDraftHtml(attach)}
      <div class="message-bar">
        <button type="button" class="msg-add ${attach.menuOpen || attach.pickMode ? 'open' : ''}" data-attach-toggle aria-label="Прикрепить" aria-expanded="${attach.menuOpen ? 'true' : 'false'}">
          <i class="ti ${attach.menuOpen || attach.pickMode ? 'ti-x' : 'ti-plus'}"></i>
        </button>
        <input type="file" id="${esc(fileInputId)}" accept="image/jpeg,image/png,image/webp" hidden>
        <label class="msg-field">
          <input id="${esc(inputId)}" placeholder="${esc(placeholder)}" value="${esc(draft)}" maxlength="500" autocomplete="off">
        </label>
        <button class="msg-send ${ready ? 'on' : ''}" id="${esc(sendId)}" type="button" aria-label="Отправить" ${ready ? '' : 'disabled'}>
          <i class="ti ti-arrow-up"></i>
        </button>
      </div>
    </div>`;
}
