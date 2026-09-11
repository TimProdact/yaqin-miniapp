from __future__ import annotations

import asyncio
import logging
import os
import secrets
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import aiosqlite
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.environ["BOT_TOKEN"]
DB_PATH = os.getenv("DB_PATH", "dating_bot.sqlite3")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")
if WEBAPP_URL and not WEBAPP_URL.rstrip("/").endswith((".html", ".htm")):
    WEBAPP_URL = WEBAPP_URL.rstrip("/") + "/"

MODERATOR_IDS = {int(value) for value in os.getenv("MODERATOR_IDS", "").split(",") if value.strip().isdigit()}
VERIFY_IMAGE_PATH = Path(__file__).resolve().parent / "assets" / "verify_intro.png"
router = Router()


class ProfileForm(StatesGroup):
    name = State()
    age = State()
    city = State()
    about = State()
    photo = State()


class VerificationForm(StatesGroup):
    video = State()


@dataclass
class Profile:
    user_id: int
    name: str
    age: int
    city: str
    about: str
    photo_id: str | None


async def db_init() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(
            """
            PRAGMA foreign_keys = ON;
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                is_adult INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                verification_status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS profiles (
                user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                age INTEGER NOT NULL CHECK(age >= 18 AND age <= 100),
                city TEXT NOT NULL,
                about TEXT NOT NULL,
                photo_id TEXT
            );
            CREATE TABLE IF NOT EXISTS likes (
                from_user INTEGER NOT NULL,
                to_user INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(from_user, to_user)
            );
            CREATE TABLE IF NOT EXISTS blocks (
                user_id INTEGER NOT NULL,
                blocked_user INTEGER NOT NULL,
                PRIMARY KEY(user_id, blocked_user)
            );
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter INTEGER NOT NULL,
                reported INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS verification_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                photo_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TEXT
            );
            """
        )
        columns = {row[1] for row in await db.execute_fetchall("PRAGMA table_info(users)")}
        if "verification_status" not in columns:
            await db.execute("ALTER TABLE users ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'pending'")
        await db.commit()


async def ensure_user(user_id: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR IGNORE INTO users(user_id) VALUES (?)", (user_id,))
        await db.commit()


async def is_adult(user_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT is_adult FROM users WHERE user_id=?", (user_id,))
        row = await cursor.fetchone()
        return bool(row and row[0])


async def verification_status(user_id: int) -> str:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT verification_status FROM users WHERE user_id=?", (user_id,))
        row = await cursor.fetchone()
        return str(row[0]) if row else "pending"


async def is_verified(user_id: int) -> bool:
    return await verification_status(user_id) == "approved"


async def latest_pending_request(user_id: int) -> tuple[int, str, str] | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            SELECT id, code, photo_id FROM verification_requests
            WHERE user_id=? AND status='pending'
            ORDER BY id DESC LIMIT 1
            """,
            (user_id,),
        )
        row = await cursor.fetchone()
        return (int(row[0]), str(row[1]), str(row[2])) if row else None


async def save_profile(profile: Profile) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO profiles(user_id,name,age,city,about,photo_id) VALUES(?,?,?,?,?,?)",
            (profile.user_id, profile.name, profile.age, profile.city, profile.about, profile.photo_id),
        )
        await db.commit()


async def get_profile(user_id: int) -> Profile | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT user_id,name,age,city,about,photo_id FROM profiles WHERE user_id=?",
            (user_id,),
        )
        row = await cursor.fetchone()
        return Profile(*row) if row else None


async def next_candidate(user_id: int) -> Profile | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            SELECT p.user_id,p.name,p.age,p.city,p.about,p.photo_id
            FROM profiles p JOIN users u ON u.user_id=p.user_id
            WHERE p.user_id != ? AND u.is_adult=1 AND u.is_active=1
              AND p.user_id NOT IN (SELECT to_user FROM likes WHERE from_user=?)
              AND p.user_id NOT IN (SELECT blocked_user FROM blocks WHERE user_id=?)
              AND p.user_id NOT IN (SELECT user_id FROM blocks WHERE blocked_user=?)
              AND u.verification_status='approved'
            ORDER BY p.user_id DESC LIMIT 1
            """,
            (user_id, user_id, user_id, user_id),
        )
        row = await cursor.fetchone()
        return Profile(*row) if row else None


def adult_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="Мне 18+", callback_data="adult:yes")]])


def card_keyboard(user_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❤️ Нравится", callback_data=f"like:{user_id}")],
            [
                InlineKeyboardButton(text="Пропустить", callback_data="skip"),
                InlineKeyboardButton(text="Пожаловаться", callback_data=f"report:{user_id}"),
            ],
        ]
    )


def app_keyboard() -> ReplyKeyboardMarkup | None:
    if not WEBAPP_URL:
        return None
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="Открыть Yaqin", web_app=WebAppInfo(url=WEBAPP_URL))]],
        resize_keyboard=True,
    )


def moderation_keyboard(request_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Одобрить", callback_data=f"verify:approve:{request_id}"),
                InlineKeyboardButton(text="❌ Отклонить", callback_data=f"verify:reject:{request_id}"),
            ]
        ]
    )


def make_verify_code() -> str:
    return str(secrets.randbelow(900000) + 100000)


def build_verify_image(code: str) -> BufferedInputFile:
    """Картинка-интро с уникальным кодом. Pillow опционален."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        width, height = 1080, 1350
        img = Image.new("RGB", (width, height), "#111114")
        draw = ImageDraw.Draw(img)
        try:
            title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 64)
            body_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 40)
            code_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 96)
        except OSError:
            title_font = ImageFont.load_default()
            body_font = title_font
            code_font = title_font

        draw.rounded_rectangle((60, 80, width - 60, height - 80), radius=48, fill="#1c1c1e")
        draw.text((100, 140), "Yaqin · проверка", fill="#fff292", font=title_font)
        lines = [
            "Мы принимаем только",
            "проверенные женские анкеты.",
            "",
            "Запишите кружочек: лицо в кадре",
            "и этот код на бумажке.",
        ]
        y = 260
        for line in lines:
            draw.text((100, y), line, fill="#f2f2f7", font=body_font)
            y += 56
        draw.rounded_rectangle((100, 720, width - 100, 920), radius=28, fill="#000000")
        draw.text((140, 780), code, fill="#fff292", font=code_font)
        draw.text((100, 980), "Код только ваш — никому не пересылайте.", fill="#98989f", font=body_font)

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        return BufferedInputFile(buffer.getvalue(), filename="yaqin-verify.png")
    except Exception:
        if VERIFY_IMAGE_PATH.exists():
            return BufferedInputFile(VERIFY_IMAGE_PATH.read_bytes(), filename="yaqin-verify.png")
        # Минимальный валидный 1×1 PNG, если нет Pillow и файла
        tiny = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
            b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        return BufferedInputFile(tiny, filename="yaqin-verify.png")


def verify_caption(code: str) -> str:
    return (
        "<b>Добро пожаловать в Yaqin</b>\n\n"
        "Мы принимаем только проверенные женские анкеты.\n\n"
        "Чтобы получить доступ:\n"
        "1. Напишите на бумажке код ниже.\n"
        "2. Запишите <b>видеокружок</b>: лицо в кадре и бумажка с кодом.\n"
        "3. Отправьте кружочек сюда.\n\n"
        f"Ваш код: <code>{code}</code>\n\n"
        "После проверки модератором откроется бот и онбординг в Mini App."
    )


async def issue_verification(message: Message, state: FSMContext) -> str:
    """Создаёт/обновляет заявку с уникальным кодом и ставит FSM на ожидание кружка."""
    user_id = message.from_user.id
    pending = await latest_pending_request(user_id)
    if pending and pending[2] == "pending":
        code = pending[1]
    else:
        code = make_verify_code()
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("UPDATE users SET verification_status='pending' WHERE user_id=?", (user_id,))
            await db.execute(
                "INSERT INTO verification_requests(user_id,code,photo_id) VALUES(?,?,?)",
                (user_id, code, "pending"),
            )
            await db.commit()
    await state.update_data(verification_code=code)
    await state.set_state(VerificationForm.video)
    return code


async def send_verification_gate(message: Message, state: FSMContext) -> None:
    code = await issue_verification(message, state)
    photo = build_verify_image(code)
    await message.answer_photo(photo, caption=verify_caption(code), parse_mode="HTML")


async def send_profile(message: Message, profile: Profile) -> None:
    text = f"<b>{profile.name}, {profile.age}</b>\n📍 {profile.city}\n\n{profile.about}"
    if profile.photo_id:
        await message.answer_photo(profile.photo_id, caption=text, reply_markup=card_keyboard(profile.user_id), parse_mode="HTML")
    else:
        await message.answer(text, reply_markup=card_keyboard(profile.user_id), parse_mode="HTML")


async def require_verified(message: Message, state: FSMContext) -> bool:
    if not await is_adult(message.from_user.id):
        await message.answer("Бот предназначен только для пользователей 18+. Подтвердите возраст.", reply_markup=adult_keyboard())
        return False
    status = await verification_status(message.from_user.id)
    if status == "approved":
        return True
    pending = await latest_pending_request(message.from_user.id)
    if pending and pending[2] != "pending":
        await message.answer("Заявка на проверке. Мы напишем, когда модератор примет решение.")
        return False
    await send_verification_gate(message, state)
    return False


def event_open_keyboard(bot_username: str, start_param: str) -> InlineKeyboardMarkup:
    """Кнопка сразу в Mini App с startapp (карточка события)."""
    user = (bot_username or "").lstrip("@")
    short = os.getenv("MINIAPP_SHORT_NAME", "").strip()
    if short:
        url = f"https://t.me/{user}/{short}?startapp={start_param}"
    else:
        url = f"https://t.me/{user}?startapp={start_param}"
    rows = [[InlineKeyboardButton(text="Открыть событие", url=url)]]
    if WEBAPP_URL:
        rows.append([InlineKeyboardButton(text="Открыть Yaqin", web_app=WebAppInfo(url=WEBAPP_URL))])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def parse_start_payload(raw: str | None) -> tuple[str, str] | None:
    """Вернёт (kind, value). kind: event | verify."""
    payload = (raw or "").strip()
    if not payload:
        return None
    lower = payload.lower()
    if lower in {"verify", "verification"}:
        return ("verify", payload)
    if lower.startswith("e_") or lower.startswith("event_"):
        return ("event", payload)
    return None


@router.message(CommandStart())
async def start(message: Message, state: FSMContext, command: CommandObject) -> None:
    await ensure_user(message.from_user.id)
    if not await is_adult(message.from_user.id):
        await message.answer("Бот предназначен только для пользователей 18+. Подтвердите возраст.", reply_markup=adult_keyboard())
        return

    parsed = parse_start_payload(command.args if command else None)
    status = await verification_status(message.from_user.id)

    if status == "approved":
        await state.clear()
        if parsed and parsed[0] == "event":
            me = await message.bot.get_me()
            await message.answer(
                "Откройте событие в Yaqin — ссылка ведёт сразу на карточку.",
                reply_markup=event_open_keyboard(me.username or "", parsed[1]),
            )
            return
        await message.answer(
            "Снова рады вас видеть. Откройте Yaqin и пройдите онбординг, если ещё не закончили.",
            reply_markup=app_keyboard(),
        )
        return

    pending = await latest_pending_request(message.from_user.id)
    if pending and pending[2] != "pending":
        await message.answer("Ваш кружочек уже у модератора. Доступ откроем после проверки.")
        return

    # /start и /start verify — одна точка входа: проверка до онбординга
    # Deep link на событие сохранится у клиента в Mini App после апрува (startapp).
    if parsed and parsed[0] == "event":
        await message.answer(
            "Сначала пройдите проверку — после доступа откроем событие по ссылке из QR."
        )
    await send_verification_gate(message, state)


@router.message(Command("myid"))
async def my_id(message: Message) -> None:
    await message.answer(f"Ваш Telegram ID: {message.from_user.id}")


@router.callback_query(F.data == "adult:yes")
async def confirm_adult(callback: CallbackQuery, state: FSMContext) -> None:
    await ensure_user(callback.from_user.id)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET is_adult=1 WHERE user_id=?", (callback.from_user.id,))
        await db.commit()
    await callback.message.edit_text("Возраст подтверждён. Дальше — проверка анкеты.")
    await send_verification_gate(callback.message, state)
    await callback.answer()


@router.message(Command("verify"))
async def verify_command(message: Message, state: FSMContext) -> None:
    await ensure_user(message.from_user.id)
    if not await is_adult(message.from_user.id):
        await message.answer("Сначала подтвердите, что вам 18+.", reply_markup=adult_keyboard())
        return
    if await is_verified(message.from_user.id):
        await message.answer("Вы уже прошли проверку.", reply_markup=app_keyboard())
        return
    pending = await latest_pending_request(message.from_user.id)
    if pending and pending[2] != "pending":
        await message.answer("Заявка уже на проверке. Ожидайте ответа модератора.")
        return
    await send_verification_gate(message, state)


@router.message(VerificationForm.video, F.video_note)
async def verify_video_note(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    code = data.get("verification_code")
    if not code:
        pending = await latest_pending_request(message.from_user.id)
        code = pending[1] if pending else None
    if not code:
        await send_verification_gate(message, state)
        return

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE verification_requests SET photo_id=? WHERE user_id=? AND code=? AND status='pending'",
            (message.video_note.file_id, message.from_user.id, code),
        )
        cursor = await db.execute(
            "SELECT id FROM verification_requests WHERE user_id=? AND code=? AND status='pending' ORDER BY id DESC LIMIT 1",
            (message.from_user.id, code),
        )
        request = await cursor.fetchone()
        await db.commit()
    await state.clear()
    await message.answer("Кружочек получен. Модератор проверит лицо и код на бумажке — напишем, когда откроем доступ.")

    if request:
        username = f"@{message.from_user.username}" if message.from_user.username else "без username"
        for moderator_id in MODERATOR_IDS:
            await message.bot.send_video_note(moderator_id, message.video_note.file_id)
            await message.bot.send_message(
                moderator_id,
                f"Заявка #{request[0]}\nuser_id={message.from_user.id} · {username}\nКод на бумажке: <code>{code}</code>\n"
                "Проверьте, что в кружке женское лицо и этот код.",
                reply_markup=moderation_keyboard(request[0]),
                parse_mode="HTML",
            )


@router.message(VerificationForm.video)
async def verify_wrong_media(message: Message) -> None:
    await message.answer("Нужен именно видеокружок: лицо в кадре и бумажка с вашим кодом.")


@router.callback_query(F.data.startswith("verify:"))
async def review_verification(callback: CallbackQuery) -> None:
    if callback.from_user.id not in MODERATOR_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    _, action, request_id = callback.data.split(":")
    status = "approved" if action == "approve" else "rejected"
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT user_id FROM verification_requests WHERE id=? AND status='pending'", (request_id,))
        row = await cursor.fetchone()
        if not row:
            await callback.answer("Заявка уже обработана", show_alert=True)
            return
        user_id = row[0]
        await db.execute(
            "UPDATE verification_requests SET status=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?",
            (status, request_id),
        )
        await db.execute(
            "UPDATE users SET verification_status=?, is_active=? WHERE user_id=?",
            (status, 1 if status == "approved" else 0, user_id),
        )
        await db.commit()
    await callback.message.edit_reply_markup(reply_markup=None)
    if status == "approved":
        await callback.bot.send_message(
            user_id,
            "✅ Проверка пройдена. Доступ к Yaqin открыт — можно пройти онбординг в приложении.",
            reply_markup=app_keyboard(),
        )
    else:
        await callback.bot.send_message(
            user_id,
            "Заявка отклонена. Нажмите /start и отправьте новый кружочек с актуальным кодом.",
        )
    await callback.answer("Готово")


@router.message(Command("profile"))
async def profile_start(message: Message, state: FSMContext) -> None:
    if not await require_verified(message, state):
        return
    await state.set_state(ProfileForm.name)
    await message.answer("Как вас представить? Напишите имя или псевдоним.")


@router.message(ProfileForm.name, F.text)
async def profile_name(message: Message, state: FSMContext) -> None:
    await state.update_data(name=message.text.strip()[:40])
    await state.set_state(ProfileForm.age)
    await message.answer("Сколько вам лет? Введите число от 18 до 100.")


@router.message(ProfileForm.age, F.text)
async def profile_age(message: Message, state: FSMContext) -> None:
    try:
        age = int(message.text)
    except ValueError:
        await message.answer("Введите возраст числом.")
        return
    if not 18 <= age <= 100:
        await message.answer("Бот доступен только с 18 лет.")
        return
    await state.update_data(age=age)
    await state.set_state(ProfileForm.city)
    await message.answer("В каком вы городе?")


@router.message(ProfileForm.city, F.text)
async def profile_city(message: Message, state: FSMContext) -> None:
    await state.update_data(city=message.text.strip()[:60])
    await state.set_state(ProfileForm.about)
    await message.answer("Коротко расскажите о себе. Не отправляйте интимные материалы.")


@router.message(ProfileForm.about, F.text)
async def profile_about(message: Message, state: FSMContext) -> None:
    await state.update_data(about=message.text.strip()[:500])
    await state.set_state(ProfileForm.photo)
    await message.answer("Отправьте обычное фото или нажмите /skip_photo.")


@router.message(ProfileForm.photo, F.photo)
async def profile_photo(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await save_profile(
        Profile(message.from_user.id, data["name"], data["age"], data["city"], data["about"], message.photo[-1].file_id)
    )
    await state.clear()
    await message.answer("Анкета сохранена. Откройте Yaqin, чтобы продолжить.", reply_markup=app_keyboard())


@router.message(ProfileForm.photo, Command("skip_photo"))
async def profile_skip_photo(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await save_profile(Profile(message.from_user.id, data["name"], data["age"], data["city"], data["about"], None))
    await state.clear()
    await message.answer("Анкета сохранена без фото. Откройте Yaqin, чтобы продолжить.", reply_markup=app_keyboard())


@router.message(Command("search"))
async def search(message: Message, state: FSMContext) -> None:
    if not await require_verified(message, state):
        return
    if not await get_profile(message.from_user.id):
        await message.answer("Сначала создайте анкету: /profile")
        return
    candidate = await next_candidate(message.from_user.id)
    await send_profile(message, candidate) if candidate else await message.answer("Новых анкет пока нет.")


@router.callback_query(F.data == "skip")
async def skip(callback: CallbackQuery) -> None:
    await callback.message.delete()
    candidate = await next_candidate(callback.from_user.id)
    await send_profile(callback.message, candidate) if candidate else await callback.message.answer("Новых анкет пока нет.")
    await callback.answer()


@router.callback_query(F.data.startswith("like:"))
async def like(callback: CallbackQuery) -> None:
    target = int(callback.data.split(":")[1])
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR IGNORE INTO likes(from_user,to_user) VALUES(?,?)", (callback.from_user.id, target))
        cursor = await db.execute("SELECT 1 FROM likes WHERE from_user=? AND to_user=?", (target, callback.from_user.id))
        mutual = await cursor.fetchone()
        await db.commit()
    await callback.message.edit_reply_markup(reply_markup=None)
    if mutual:
        await callback.message.answer("У вас взаимная симпатия! Можно начать общение через Telegram.")
        await callback.bot.send_message(target, "У вас взаимная симпатия! Откройте /search, чтобы продолжить.")
    else:
        await callback.message.answer("Лайк отправлен.")
    await callback.answer()


@router.callback_query(F.data.startswith("report:"))
async def report(callback: CallbackQuery) -> None:
    target = int(callback.data.split(":")[1])
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO reports(reporter,reported,reason) VALUES(?,?,?)",
            (callback.from_user.id, target, "report from card"),
        )
        await db.execute("INSERT OR IGNORE INTO blocks(user_id,blocked_user) VALUES(?,?)", (callback.from_user.id, target))
        await db.commit()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer("Пользователь заблокирован, жалоба отправлена модераторам.")
    await callback.answer()


async def main() -> None:
    await db_init()
    bot = Bot(BOT_TOKEN)
    if WEBAPP_URL:
        await bot.set_chat_menu_button(menu_button={"type": "web_app", "text": "Yaqin", "web_app": {"url": WEBAPP_URL}})
    dispatcher = Dispatcher()
    dispatcher.include_router(router)
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
