# Библиотека экранов Bumble BFF (iOS, январь 2026)

232 скриншота, разложены по флоу. Имя файла = `<что за экран>--<номер в исходном архиве>.png`.
Сами PNG в git не коммитятся (`.gitignore`), лежат только локально.

Порядок работы с библиотекой описан в правиле `.cursor/rules/yaqin-screen-workflow.mdc`.

## Приоритет для Yaqin

| Очередь | Флоу | Почему |
|---|---|---|
| 1 | `04-discover`, `05-profile-view` | ядро продукта: лента, карточка, анкета целиком |
| 2 | `03-verification` | ручная проверка — обязательная часть Yaqin |
| 3 | `06-match-chat` | мэтч и переписка |
| 4 | `09-me-profile`, `10-settings` | свой профиль и настройки |
| 5 | `01-onboarding`, `02-profile-setup` | в Telegram часть шагов делает бот |
| 6 | `07-groups`, `08-events`, `11-activity`, `12-safety` | расширение после ядра |

## Флоу

### 01-onboarding (15)
Вход и регистрация: `get-started` (разрешения на геолокацию и уведомления), `phone-number`, `sms-code`, `name`, `birthday` (с подсчётом возраста), `gender` (Woman / Man / Nonbinary + расширенный список), `privacy-consent`.
В Yaqin большую часть заменяет Telegram, но состояния полей и кнопок отсюда.

### 02-profile-setup (19)
Заполнение анкеты: `add-photos` (сетка 2×3, «Main», перетаскивание), `tags-intro`, `question-weekend` и `question-story` (шаги 1/4…4/4 с подсказками и счётчиком символов), `camera-roll-intro`, `photo-prompts` (жёлтые карточки «My recent hyperfixation»), `processing`, `ready`.

### 03-verification (4)
`verify-intro` — зачем нужна проверка, `verify-identity` — что попросят, `verify-capture` — съёмка, `verify-submitted` — «данные отправлены». В BFF это селфи через Veriff, в Yaqin — видеокружок с кодом, но структура и тон экранов подходят один в один.

### 04-discover (12)
`card` — карточка человека в ленте (фото на весь экран, имя, возраст, город, бейдж «Says hi!», чипы интересов, круглая кнопка привета), `card-dark`, `filters` (возраст и расстояние), `location-permission` (карта), `loading` (скелетон), `empty-state` («вы посмотрели всех»).

### 05-profile-view (5)
Полная анкета другого человека: `photos` (карусель с точками), `about` (What I'm into / Looking to), `groups-and-basic` (группы, работа, гендер, статус).

### 06-match-chat (27)
`connected` — экран мэтча, `chat-start` — начало переписки, `chats-list` и `chats-empty`, `new-dm`, `conversation` (реакции, вложения, аудио, действия с сообщением), `chats-search`, `chat-notifications`.

### 07-groups (86)
Самый большой блок: `group-page`, `join-questions` (анкета при вступлении), `my-groups`, `create-group`, `group-rooms`, `group-posts` (посты, опросы, форматирование), `group-chat` (треды), `group-search`, `group-manage`, `group-settings`. Для Yaqin сейчас нужны только `group-page`, `my-groups` и, возможно, `create-group`.

### 08-events (7)
`events-calendar` (месяцы, календарь), `event-details` (описание, участники, RSVP «Going / Interested / Next time»), `event-in-group`.

### 09-me-profile (25)
Свой профиль: `me-tabs` (My Profile / My Events / My Friends), `edit-profile` (инлайн-редактирование полей, Basic info, ссылки), `edit-photos`, `groups-on-profile`, `my-events`, `my-friends` (заявки в друзья), `me-dark`.

### 10-settings (23)
`settings`, `account` (email, удаление аккаунта), `notifications`, `blocked-users`, `announcements`, `dark-mode`, `share-profile` (QR), `feedback`, `import-bumble` (в Yaqin не нужен).

### 11-activity (3)
Лента активности: подтверждение фото, новые события, заявки в друзья. Светлая и тёмная темы.

### 12-safety (8)
`profile-actions` (Report / Block в шите), `block-confirm`, `report-message` (причины жалобы, текстовое поле), `report-sent`.
