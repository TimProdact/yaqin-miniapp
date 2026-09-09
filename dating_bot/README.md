# Telegram-бот знакомств 18+

MVP: подтверждение возраста, анкета, поиск, лайки, взаимные симпатии, жалобы и блокировка.

## Запуск

```bash
cd dating_bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

В `.env` укажите токен, полученный у `@BotFather`, затем:

```bash
python -m dating_bot.bot
```

## Команды

- `/start` — запуск и подтверждение 18+
- `/profile` — создать или обновить анкету
- `/skip_photo` — сохранить анкету без фото
- `/search` — посмотреть следующую анкету

Перед публичным запуском добавьте ручную модерацию, лимиты, согласие на обработку данных и проверку правил Telegram и законодательства Узбекистана.

## Mini App

Запустите backend на HTTPS-домене:

```bash
uvicorn miniapp.server:app --host 0.0.0.0 --port 8000
```

В `.env` укажите публичный HTTPS-адрес Mini App:

```env
WEBAPP_URL=https://your-domain.example
```

Перезапустите бота. В Telegram появится кнопка «Открыть Yaqin».

## Ручная проверка

Пользователь создаёт профиль и запускает `/verify`. Бот выдаёт одноразовый код, принимает видеосообщение-кружок с произнесённым кодом и жестами, затем отправляет заявку модераторам.

Из Mini App проверку можно начать на экране «Проверка анкеты» — кнопка открывает бота по ссылке `https://t.me/<bot>?start=verify`, что равнозначно команде `/verify`. Статус заявки Mini App берёт из `/api/me`: поле `verification_status` (`pending`, `approved`, `rejected`) и `verification_stage` (`none`, `awaiting_video`, `in_review`, `reviewed`).

Узнайте свой Telegram ID командой `/myid`, добавьте его в `.env`:

```env
MODERATOR_IDS=123456789
```

После перезапуска модератор получает заявку с кнопками одобрения и отклонения. Пользователь получает уведомление, а в Mini App показываются только одобренные анкеты.
