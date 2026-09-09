from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import os
import sqlite3
import time
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qsl

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DB_PATH", ROOT.parent / "dating_bot.sqlite3"))
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
STATIC_DIR = ROOT / "static"

app = FastAPI(title="Yaqin Mini App")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    age: int = Field(ge=18, le=100)
    city: str = Field(min_length=1, max_length=60)
    about: str = Field(max_length=500)


def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def telegram_user(init_data: Optional[str]) -> int:
    dev_user = os.getenv("DEV_USER_ID")
    if dev_user and not init_data:
        return int(dev_user)
    if not init_data or not BOT_TOKEN:
        raise HTTPException(401, "Telegram authorization required")
    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", "")
    auth_date = int(values.get("auth_date", "0"))
    if not received_hash or time.time() - auth_date > 86400:
        raise HTTPException(401, "Expired Telegram session")
    data_check = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise HTTPException(401, "Invalid Telegram signature")
    user = json.loads(values.get("user", "{}"))
    if not user.get("id"):
        raise HTTPException(401, "Telegram user missing")
    return int(user["id"])


def profile_json(row):
    if not row:
        return None
    profile = dict(row)
    profile["photo_url"] = f"/api/photo/{profile['photo_id']}" if profile.get("photo_id") else None
    return profile


def verification_stage(connection, user_id: int) -> str:
    """Where the user is in the manual check: no request yet, video pending, or waiting for a moderator."""
    row = connection.execute(
        "SELECT status,photo_id FROM verification_requests WHERE user_id=? ORDER BY id DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    if not row:
        return "none"
    if row["status"] != "pending":
        return "reviewed"
    return "awaiting_video" if row["photo_id"] == "pending" else "in_review"


@app.get("/api/me")
def me(x_telegram_init_data: Optional[str] = Header(default=None)):
    user_id = telegram_user(x_telegram_init_data)
    with db() as connection:
        row = connection.execute("SELECT user_id,name,age,city,about,photo_id FROM profiles WHERE user_id=?", (user_id,)).fetchone()
        status = connection.execute("SELECT verification_status FROM users WHERE user_id=?", (user_id,)).fetchone()
        stage = verification_stage(connection, user_id)
    return {
        "user_id": user_id,
        "verification_status": status[0] if status else "pending",
        "verification_stage": stage,
        "profile": profile_json(row),
    }


@app.put("/api/me")
def update_me(payload: ProfileUpdate, x_telegram_init_data: Optional[str] = Header(default=None)):
    user_id = telegram_user(x_telegram_init_data)
    with db() as connection:
        connection.execute("UPDATE users SET is_adult=1,is_active=1 WHERE user_id=?", (user_id,))
        connection.execute("UPDATE users SET verification_status='pending' WHERE user_id=?", (user_id,))
        connection.execute(
            "INSERT OR REPLACE INTO profiles(user_id,name,age,city,about,photo_id) VALUES(?,?,?,?,?,COALESCE((SELECT photo_id FROM profiles WHERE user_id=?),NULL))",
            (user_id, payload.name.strip(), payload.age, payload.city.strip(), payload.about.strip(), user_id),
        )
        connection.commit()
    return {"ok": True}


@app.get("/api/discover")
def discover(x_telegram_init_data: Optional[str] = Header(default=None)):
    user_id = telegram_user(x_telegram_init_data)
    with db() as connection:
        rows = connection.execute(
            """
            SELECT p.user_id,p.name,p.age,p.city,p.about,p.photo_id
            FROM profiles p JOIN users u ON u.user_id=p.user_id
            WHERE p.user_id != ? AND u.is_adult=1 AND u.is_active=1
              AND p.user_id NOT IN (SELECT to_user FROM likes WHERE from_user=?)
              AND p.user_id NOT IN (SELECT blocked_user FROM blocks WHERE user_id=?)
              AND p.user_id NOT IN (SELECT user_id FROM blocks WHERE blocked_user=?)
              AND u.verification_status='approved'
            ORDER BY p.user_id DESC LIMIT 20
            """,
            (user_id, user_id, user_id, user_id),
        ).fetchall()
    return {"items": [profile_json(row) for row in rows]}


@app.post("/api/like/{target_id}")
def like(target_id: int, x_telegram_init_data: Optional[str] = Header(default=None)):
    user_id = telegram_user(x_telegram_init_data)
    if target_id == user_id:
        raise HTTPException(400, "Cannot like yourself")
    with db() as connection:
        connection.execute("INSERT OR IGNORE INTO likes(from_user,to_user) VALUES(?,?)", (user_id, target_id))
        mutual = connection.execute("SELECT 1 FROM likes WHERE from_user=? AND to_user=?", (target_id, user_id)).fetchone() is not None
        connection.commit()
    return {"liked": True, "mutual": mutual}


@app.get("/api/matches")
def matches(x_telegram_init_data: Optional[str] = Header(default=None)):
    user_id = telegram_user(x_telegram_init_data)
    with db() as connection:
        rows = connection.execute(
            """
            SELECT p.user_id,p.name,p.age,p.city,p.about,p.photo_id
            FROM profiles p WHERE p.user_id IN (
              SELECT l.to_user FROM likes l JOIN likes back ON back.from_user=l.to_user AND back.to_user=l.from_user
              WHERE l.from_user=?
            ) ORDER BY p.name
            """,
            (user_id,),
        ).fetchall()
    return {"items": [profile_json(row) for row in rows]}


@app.post("/api/block/{target_id}")
def block(target_id: int, x_telegram_init_data: Optional[str] = Header(default=None)):
    user_id = telegram_user(x_telegram_init_data)
    with db() as connection:
        connection.execute("INSERT OR IGNORE INTO blocks(user_id,blocked_user) VALUES(?,?)", (user_id, target_id))
        connection.commit()
    return {"ok": True}


@app.post("/api/report/{target_id}")
def report(target_id: int, x_telegram_init_data: Optional[str] = Header(default=None)):
    user_id = telegram_user(x_telegram_init_data)
    with db() as connection:
        connection.execute("INSERT INTO reports(reporter,reported,reason) VALUES(?,?,?)", (user_id, target_id, "reported in Mini App"))
        connection.execute("INSERT OR IGNORE INTO blocks(user_id,blocked_user) VALUES(?,?)", (user_id, target_id))
        connection.commit()
    return {"ok": True}


@app.get("/api/photo/{file_id}")
async def photo(file_id: str):
    if not BOT_TOKEN:
        raise HTTPException(404, "Photo storage unavailable")
    with db() as connection:
        known = connection.execute("SELECT 1 FROM profiles WHERE photo_id=?", (file_id,)).fetchone()
    if not known:
        raise HTTPException(404, "Unknown photo")
    async with httpx.AsyncClient(timeout=15) as client:
        info = await client.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getFile", params={"file_id": file_id})
        payload = info.json()
        if not payload.get("ok"):
            raise HTTPException(404, "Photo not found")
        file_path = payload["result"]["file_path"]
        download = await client.get(f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}")
    if download.status_code != 200:
        raise HTTPException(404, "Photo not found")
    media_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"
    return Response(download.content, media_type=media_type, headers={"Cache-Control": "public, max-age=86400"})


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/{asset:path}")
def assets(asset: str):
    path = STATIC_DIR / asset
    if not path.is_file():
        raise HTTPException(404)
    return FileResponse(path)
