from __future__ import annotations

import asyncio
import logging
import os
import secrets
from dataclasses import dataclass

import aiosqlite
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, Message, ReplyKeyboardMarkup, WebAppInfo
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.environ["BOT_TOKEN"]
DB_PATH = os.getenv("DB_PATH", "dating_bot.sqlite3")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")
MODERATOR_IDS = {int(value) for value in os.getenv("MODERATOR_IDS", "").split(",") if value.strip().isdigit()}
router = Router()


class ProfileForm(StatesGroup):
    name = State()
    age = State()
    city = State()
    about = State()
    photo = State()


class VerificationForm(StatesGroup):
    photo = State()


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


async def save_profile(profile: Profile) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO profiles(user_id,name,age,city,about,photo_id) VALUES(?,?,?,?,?,?)",
            (profile.user_id, profile.name, profile.age, profile.city, profile.about, profile.photo_id),
        )
        await db.execute("UPDATE users SET verification_status='pending' WHERE user_id=?", (profile.user_id,))
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
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="✅ Одобрить", callback_data=f"verify:approve:{request_id}"), InlineKeyboardButton(text="❌ Отклонить", callback_data=f"verify:reject:{request_id}")]])


async def is_verified(user_id: int) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT verification_status FROM users WHERE user_id=?", (user_id,))
        row = await cursor.fetchone()
        return bool(row and row[0] == "approved")


async def send_profile(message: Message, profile: Profile) -> None:
    text = f"<b>{profile.name}, {profile.age}</b>\n📍 {profile.city}\n\n{profile.about}"
    if profile.photo_id:
        await message.answer_photo(profile.photo_id, caption=text, reply_markup=card_keyboard(profile.user_id), parse_mode="HTML")
    else:
        await message.answer(text, reply_markup=card_keyboard(profile.user_id), parse_mode="HTML")


@router.message(CommandStart())
async def start(message: Message, state: FSMContext, command: CommandObject) -> None:
    await ensure_user(message.from_user.id)
    if not await is_adult(message.from_user.id):
        await message.answer("Бот предназначен только для пользователей 18+. Подтвердите возраст.", reply_markup=adult_keyboard())
        return
    if command.args == "verify":
        await verify_start(message, state)
        return
    if await get_profile(message.from_user.id) and not await is_verified(message.from_user.id):
        await message.answer("Ваша анкета ожидает проверки. Отправьте заявку командой /verify.")
        return
    await message.answer("Добро пожаловать. Откройте приложение или используйте /profile для анкеты.", reply_markup=app_keyboard())


@router.message(Command("myid"))
async def my_id(message: Message) -> None:
    await message.answer(f"Ваш Telegram ID: {message.from_user.id}")


@router.callback_query(F.data == "adult:yes")
async def confirm_adult(callback: CallbackQuery) -> None:
    await ensure_user(callback.from_user.id)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET is_adult=1 WHERE user_id=?", (callback.from_user.id,))
        await db.commit()
    await callback.message.edit_text("Возраст подтверждён. Откройте Mini App или создайте анкету командой /profile.")
    if WEBAPP_URL:
        await callback.message.answer("Готово. Запустите приложение кнопкой ниже.", reply_markup=app_keyboard())
    await callback.answer()


@router.message(Command("profile"))
async def profile_start(message: Message, state: FSMContext) -> None:
    if not await is_adult(message.from_user.id):
        await message.answer("Сначала подтвердите, что вам 18+.", reply_markup=adult_keyboard())
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
    await save_profile(Profile(message.from_user.id, data["name"], data["age"], data["city"], data["about"], message.photo[-1].file_id))
    await state.clear()
    await message.answer("Анкета сохранена. Для доступа к знакомствам отправьте заявку: /verify")


@router.message(ProfileForm.photo, Command("skip_photo"))
async def profile_skip_photo(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await save_profile(Profile(message.from_user.id, data["name"], data["age"], data["city"], data["about"], None))
    await state.clear()
    await message.answer("Анкета сохранена без фото. Для доступа к знакомствам отправьте заявку: /verify")


@router.message(Command("verify"))
async def verify_start(message: Message, state: FSMContext) -> None:
    if not await is_adult(message.from_user.id):
        await message.answer("Сначала подтвердите, что вам 18+.", reply_markup=adult_keyboard())
        return
    if not await get_profile(message.from_user.id):
        await message.answer("Сначала создайте анкету: /profile")
        return
    code = str(secrets.randbelow(900000) + 100000)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE users SET verification_status='pending' WHERE user_id=?", (message.from_user.id,))
        await db.execute("INSERT INTO verification_requests(user_id,code,photo_id) VALUES(?,?,?)", (message.from_user.id, code, "pending"))
        await db.commit()
    await state.update_data(verification_code=code)
    await state.set_state(VerificationForm.photo)
    await message.answer(f"Запишите видеосообщение-кружок на 5–10 секунд:\n1. Назовите себя и произнесите код {code}.\n2. Покажите жест ✌️, затем 👍.\n\nНе отправляйте документы или интимные материалы.")


@router.message(VerificationForm.photo, F.video_note)
async def verify_video_note(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    code = data.get("verification_code")
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE verification_requests SET photo_id=? WHERE user_id=? AND code=? AND status='pending'", (message.video_note.file_id, message.from_user.id, code))
        cursor = await db.execute("SELECT id FROM verification_requests WHERE user_id=? AND code=? AND status='pending' ORDER BY id DESC LIMIT 1", (message.from_user.id, code))
        request = await cursor.fetchone()
        await db.commit()
    await state.clear()
    await message.answer("Заявка отправлена на ручную проверку. Мы уведомим вас о решении.")
    if request:
        profile = await get_profile(message.from_user.id)
        for moderator_id in MODERATOR_IDS:
            await message.bot.send_video_note(moderator_id, message.video_note.file_id)
            await message.bot.send_message(moderator_id, f"Заявка #{request[0]}\n{profile.name}, {profile.age}, {profile.city}\n{profile.about}\nПроверьте код и жесты на видеосообщении.", reply_markup=moderation_keyboard(request[0]))


@router.message(VerificationForm.photo)
async def verify_wrong_media(message: Message) -> None:
    await message.answer("Нужно отправить именно видеосообщение-кружок: 5–10 секунд, код и два жеста.")


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
        await db.execute("UPDATE verification_requests SET status=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?", (status, request_id))
        await db.execute("UPDATE users SET verification_status=?, is_active=? WHERE user_id=?", (status, 1 if status == "approved" else 0, user_id))
        await db.commit()
    await callback.message.edit_reply_markup(reply_markup=None)
    notification = "✅ Ваша анкета одобрена. Теперь можно пользоваться Yaqin." if status == "approved" else "Заявка отклонена. После исправления анкеты отправьте /verify снова."
    await callback.bot.send_message(user_id, notification)
    await callback.answer("Готово")


@router.message(Command("search"))
async def search(message: Message) -> None:
    if not await is_adult(message.from_user.id):
        await message.answer("Сначала подтвердите, что вам 18+.", reply_markup=adult_keyboard())
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
        await db.execute("INSERT INTO reports(reporter,reported,reason) VALUES(?,?,?)", (callback.from_user.id, target, "report from card"))
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
