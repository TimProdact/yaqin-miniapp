# Yaqin Design System

Источник правды: локальная библиотека `design/bff-ios-jan-2026/` (Bumble BFF iOS, янв. 2026, ~232 PNG).  
Скриншоты ≈ **3×** logical pt (ширина ~1179px → **393pt**).

Yaqin **не копирует бренд Bumble**, но берёт геометрию, ритм, иерархию и палитру нейтралей/акцентов. Тексты и имена — русские / Ташкент.

CSS-токены: `dating_bot/miniapp/static/tokens.css`.

---

## 1. Принципы

1. **Светлая тема — основная.** Белый холст, почти чёрный текст, один жёлтый акцент.
2. **Тёмная тема — инверсия оболочки**, не «чёрный текст на белых карточках». Surface `#1C1C1E`, текст `#F2F2F7`.
3. **Один gutter.** Горизонтальный отступ контента **20pt** (допустимо 16–20).
4. **Одна семья шрифтов.** В BFF — SF Pro; в Yaqin — **Onest** (уже подключена) с теми же весами/кеглями.
5. **Pill / circle first.** Кнопки и табы — `border-radius: 999px`; карточки — 16–20pt; аватары — круг.
6. **Safe area.** Отступ сверху = device safe + Telegram `contentSafeArea` (сумма, с clamp). Фон отступа = цвет оболочки, не «белая рамка».
7. **Без letterbox на телефоне.** `.app` на 100% ширины WebView; max-width 442 только для широкого превью.

---

## 2. Цвета (light)

| Токен | Hex | Роль | Где в BFF |
|---|---|---|---|
| `--yaqin-bg` | `#FFFFFF` | Фон экрана | chats, settings, activity |
| `--yaqin-bg-subtle` | `#F2F2F7` | Секции, inactive pills, empty | empty-state, filters, settings bands |
| `--yaqin-bg-muted` | `#F8F8FA` | Карточки discover / soft rows | my-groups discover card |
| `--yaqin-text` | `#171719` | Primary text (BFF ≈ `#181818`) | заголовки, имена |
| `--yaqin-text-secondary` | `#55555C` | Secondary | превью сообщений |
| `--yaqin-text-tertiary` | `#8E8E93` | Tertiary / labels | section headers, timestamps |
| `--yaqin-sep` | `#E5E5EA` | Hairline | list dividers |
| `--yaqin-sep-soft` | `#F0F0F2` | Soft hairline | chat header border |
| `--yaqin-yellow` | `#FFF292` | Brand accent (BFF ≈ `#FCF090` / `#F9E97A`) | NEW badge, wave CTA, onboarding |
| `--yaqin-yellow-ink` | `#171719` | Текст на жёлтом | |
| `--yaqin-ink` | `#171719` | Primary fill button / active tab | DMs pill, FAB, Join |
| `--yaqin-ink-inverse` | `#FFFFFF` | Текст на ink | |
| `--yaqin-danger` | `#E21E4F` | Destructive (BFF ≈ `#E21E4F` / `#FC0018`) | block, delete, badges |
| `--yaqin-danger-soft` | `#FFECEF` | Danger surface | block icon bg |
| `--yaqin-blue` | `#007AFF` | Unread / iOS link / toggle on | unread dots, switches |
| `--yaqin-link` | `#3B6EF5` | In-app links | group chat actions |
| `--yaqin-green` | `#34C759` | Success / online icon tile | settings |
| `--yaqin-orange` | `#FF9500` | Account / feedback tile | settings |
| `--yaqin-pink` | `#FF2D55` | Privacy / legal tile | settings |
| `--yaqin-purple` | `#AF52DE` | Help tile | settings |
| `--yaqin-overlay` | `rgba(0,0,0,.45)` | Scrim sheets | block confirm |

### Dark

| Токен | Hex |
|---|---|
| `--yaqin-bg` | `#000000` |
| `--yaqin-surface` | `#000000` |
| `--yaqin-surface-raised` | `#1C1C1E` |
| `--yaqin-text` | `#F2F2F7` |
| `--yaqin-text-secondary` | `#98989F` |
| `--yaqin-sep` | `#2C2C2E` |
| `--yaqin-yellow` | `#FFF292` (без изменения) |
| `--yaqin-ink` | `#F2F2F7` (кнопки на dark) |
| `--yaqin-ink-inverse` | `#000000` |

Запрещено в dark: белые карточки с унаследованным светлым текстом; белый `.app` вокруг чёрных страниц.

---

## 3. Типографика

Font: **Onest**, fallback `system-ui, -apple-system, sans-serif`.

| Токен | Size | Weight | Line | Использование |
|---|---|---|---|---|
| `--yaqin-fs-display` | 34px | 700 | 1.15 | Connected / onboarding hero |
| `--yaqin-fs-title` | 28px | 700 | 1.2 | Page titles («Мои чаты», «Лента») |
| `--yaqin-fs-title-sm` | 22px | 700 | 1.25 | Empty states, sheet titles |
| `--yaqin-fs-modal` | 17px | 700 | 1.25 | Modal/settings header |
| `--yaqin-fs-body` | 16px | 600–700 | 1.35 | Имена в списках, row labels |
| `--yaqin-fs-body-rg` | 15px | 400–500 | 1.4 | Body copy, inputs |
| `--yaqin-fs-secondary` | 14px | 400–500 | 1.35 | Preview, meta |
| `--yaqin-fs-caption` | 13px | 400–500 | 1.35 | Subtitles, hints |
| `--yaqin-fs-micro` | 12px | 500–600 | 1.3 | Nav labels, section caps |
| `--yaqin-fs-badge` | 11px | 700 | 1 | Tab badges |

Измерения BFF (×3 screenshots): page title glyph ≈ **15–16pt** высоты → визуально **~28pt** display; horizontal title inset ≈ **18pt**.

---

## 4. Сетка и отступы

| Токен | Value | Правило |
|---|---|---|
| `--yaqin-space-1` | 4px | micro |
| `--yaqin-space-2` | 8px | tight |
| `--yaqin-space-3` | 12px | default gap icon→text |
| `--yaqin-space-4` | 16px | card padding |
| `--yaqin-space-5` | 20px | **page gutter** |
| `--yaqin-space-6` | 24px | section gap |
| `--yaqin-space-7` | 32px | large section |
| `--yaqin-space-8` | 40px | hero breathing |

### Ритм страницы (list screens)

```
[safe-area]
title row          height 52
section label      margin-top 20–22
stories / filters  gap 14–16
list               row ~72 (avatar 48–56 + padding)
[nav ~76 + home indicator]
```

FAB: **16–20px** над навбаром, **20–24px** от правого края.

---

## 5. Радиусы

| Токен | Value | Использование |
|---|---|---|
| `--yaqin-radius-xs` | 8px | inputs in dialogs |
| `--yaqin-radius-sm` | 12px | small tiles |
| `--yaqin-radius-md` | 16px | cards, search hits |
| `--yaqin-radius-lg` | 20px | group/discover cards |
| `--yaqin-radius-xl` | 28px | sheets / large cards |
| `--yaqin-radius-pill` | 999px | buttons, tabs, toggles |
| `--yaqin-radius-avatar` | 50% | avatars |

---

## 6. Компоненты (контракт)

### Page header
- Title left, actions right.
- Height **52**. Sticky, фон = `--yaqin-bg`.
- Title: `--yaqin-fs-title` / 700.

### Segmented pills (chat tabs)
- Inactive: bg `--yaqin-bg-subtle`, text `--yaqin-text`.
- Active: bg `--yaqin-ink`, text inverse.
- Badge: `--yaqin-danger`, white text.

### List row (chat / friend / group)
- Avatar 48–56, gap 12–14.
- Title 16/700, subtitle 14–15 / tertiary.
- Divider inset after avatar.

### Settings row
- Leading color icon tile ~28–32.
- Label 16 medium.
- Trailing chevron or switch (`--yaqin-blue` when on).
- Section band: `--yaqin-bg-subtle` + caps label 12–13 tertiary.

### Primary button
- Fill `--yaqin-ink`, text inverse, pill, height ~48–52, font 17/600.

### Yellow CTA / wave
- Fill `--yaqin-yellow`, ink `--yaqin-yellow-ink`, circle or pill.

### FAB
- 56–58 circle, `--yaqin-ink`, shadow soft.

### Bottom sheet
- Radius top 20–28, handle 36×4 muted.
- Scrim `--yaqin-overlay`.

### Nav
- 5 tabs, icon 22–24, label 12.
- Active = filled / `--yaqin-text`; inactive tertiary.
- Badge on Chats when unread.

---

## 7. Иконки

BFF: system line icons.  
Yaqin: **Tabler Icons** (`ti ti-*`), stroke-friendly, size 22–24 в хедерах/nav.

Цветные settings tiles — только палитра из §2 (green/orange/pink/red/blue/purple).

---

## 8. Safe area (Telegram)

```
--yaqin-safe-top = clamp(safeAreaInset.top + contentSafeAreaInset.top)
--yaqin-safe-bottom = clamp(safe + content bottom)
```

- Не форсить 54px «на всякий случай» — это создаёт пустую полосу.
- Фон padding = `--yaqin-bg` (в dark — чёрный).
- Слушать `safeAreaChanged` / `contentSafeAreaChanged`.

---

## 9. Как работать дальше

1. Новый экран → сначала PNG в `design/bff-ios-jan-2026/<flow>/`.
2. Разметка только токенами из `tokens.css` (не сырые `#fff` / `15px`, кроме разовых иллюстраций).
3. Dark: проверять карточки — raised surface + readable text.
4. После UI-батча: Pages 200 + ручной проход light/dark.

---

## 10. Аудит текущего UI (2026-09-10)

Сводка по `dating_bot/miniapp/static/*.css` vs эта DS.

### Критично

| # | Проблема | Факт | Цель DS |
|---|---|---|---|
| C1 | Dark shell | Страницы `#000`, `.app`/body/`padding-top` белые → «чёрное в белой рамке» | Оболочка = `--yaqin-bg` |
| C2 | Dark cards | `color: #f2f2f7` наследуется на белые `.group-row.active` / `.discover-group` / `.activity-card` | Raised `#1C1C1E` + светлый текст **или** светлая карточка + тёмный текст |
| C3 | Safe-area fallback | Ранее force 54px + белый padding | Сумма API + clamp; фон оболочки |
| C4 | Letterbox | `max-width: 442` + светлый body | 100% ширины на мобиле |

*Частично закрыто в `4c61ed9` / layout tokens — нужна полная миграция на `tokens.css`.*

### Высокий приоритет

| # | Проблема | Факт | Цель |
|---|---|---|---|
| H1 | Цветовой зоопарк | 40+ hex: `#171719`, `#fff18a`, `#fff292`, `#ff5a5f`, `#e01e43`, `#ff3b30`, `#3b6ef5`, `#007aff`, `#887994`… | 1 ink, 1 yellow, 1 danger, 1 blue |
| H2 | Title sizes | title встречается как 28 / 29 / 30 / 32 / 34 / 36 | Page title = **28** |
| H3 | Gutter | padding 16 / 18 / 20 / 24 / 26 / 36 / 52 в me.css legacy | **20** page gutter |
| H4 | Sticky headers | `background: #fff` hardcoded | `var(--yaqin-bg)` |
| H5 | Nav padding | `max(32px, safe)` раздут | ~12 + safe-bottom |
| H6 | Legacy me.css | desktop-scale 36–52px paddings + mobile overrides | Удалить legacy или свести к DS |

### Средний

| # | Проблема | Факт | Цель |
|---|---|---|---|
| M1 | Font-size noise | 11…48px, 25+ уникальных | шкала §3 |
| M2 | Radius noise | 8 / 12 / 14 / 16 / 18 / 20 / 22 / 28 / 30 / 38 | шкала §5 |
| M3 | Secondary text | `#55555c` / `#6b6b73` / `#89898d` / `#8e8e93` / `#98989f` | tertiary + secondary только |
| M4 | style.css monolith | старые 2× размеры discover (52px caption) | не использовать вне discover card или сжать |
| M5 | Inactive pills | где-то white, где-то `#f2f2f7` | всегда `--yaqin-bg-subtle` |
| M6 | Chat-tabs active | dark: white pill — ок; light: проверить ink | ink fill |

### Низкий / долг

| # | Проблема |
|---|---|
| L1 | `demo.css` leftover purple `#887994` |
| L2 | QR / share pages без dark surfaces |
| L3 | Onboarding yellow full-bleed vs list screens — ок по BFF, но документировать отдельно |
| L4 | Нет Storybook; контракт только этот файл + PNG |

### Соответствует DS (оставить)

- Onest + Tabler  
- Yellow NEW badge / wave (`#fff292`)  
- Page titles ~28 на list screens  
- Pill tabs в чатах  
- Settings icon tiles (цветные)  
- Danger block confirm pattern  

### План выравнивания (очередь)

1. Подключить `tokens.css` как единственный root.  
2. Заменить shell (`layout`, `nav`, sticky headers) на токены.  
3. Унифицировать danger/yellow/ink.  
4. Сжать `me.css` legacy.  
5. Пройти list screens: chats → groups → activity → settings → events.  
6. Dark regression на тех же экранах.  
7. Pixel-diff выборочно с PNG BFF (не 1:1 бренд, а ритм).

---

## 11. Карта BFF → Yaqin

| BFF flow | Yaqin routes |
|---|---|
| 04-discover | `people`, `person`, `filters` |
| 05-profile-view | `person` |
| 06-match-chat | `chats`, `chat`, `connected`, `new-dm`, `search` |
| 09-me-profile | `me`, `edit`, `friends`, `my-events` |
| 10-settings | `settings`, `account`, `privacy`, `help`, `legal`, … |
| 11-activity | `activity` |
| 07-groups | `groups`, `group-*` |
| 08-events | `events`, `event` |
| 12-safety | sheets в `safety.js` |
| 01–03 | `onboarding`, `verify` |
