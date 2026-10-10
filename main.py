from pathlib import Path
import re
import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

PROJECT_DIR = Path(__file__).resolve().parent
FRONTEND_FILE = PROJECT_DIR / "index.html"
PRIVACY_FILE = PROJECT_DIR / "privacy.html"
DATABASE_FILE = PROJECT_DIR / "leads.sqlite3"
CONSENT_COOKIE = "ja-cookie-consent"


def initialize_database():
    with sqlite3.connect(DATABASE_FILE) as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS cookie_consents (
                consent_id TEXT PRIMARY KEY,
                necessary INTEGER NOT NULL DEFAULT 1 CHECK (necessary = 1),
                preferences INTEGER NOT NULL DEFAULT 0 CHECK (preferences IN (0, 1)),
                analytics INTEGER NOT NULL DEFAULT 0 CHECK (analytics IN (0, 1)),
                marketing INTEGER NOT NULL DEFAULT 0 CHECK (marketing IN (0, 1)),
                updated_at TEXT NOT NULL
            )
        """)
    try:
        DATABASE_FILE.chmod(0o600)
    except OSError:
        pass


@app.on_event("startup")
async def startup():
    initialize_database()

app.mount("/static", StaticFiles(directory=PROJECT_DIR / "static"), name="static")


@app.get("/")
async def root():
    return FileResponse(FRONTEND_FILE, media_type="text/html")


@app.get("/privacidad")
async def privacy_policy():
    return FileResponse(PRIVACY_FILE, media_type="text/html")


@app.get("/api/cookie-consent")
async def get_cookie_consent(request: Request):
    consent_id = request.cookies.get(CONSENT_COOKIE)
    if not consent_id:
        return JSONResponse({"consent": None}, headers={"Cache-Control": "no-store"})

    initialize_database()
    with sqlite3.connect(DATABASE_FILE, timeout=5) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT necessary, preferences, analytics, marketing, updated_at "
            "FROM cookie_consents WHERE consent_id = ?",
            (consent_id,),
        ).fetchone()

    consent = dict(row) if row else None
    if consent:
        for category in ("necessary", "preferences", "analytics", "marketing"):
            consent[category] = bool(consent[category])
    return JSONResponse({"consent": consent}, headers={"Cache-Control": "no-store"})


@app.post("/api/cookie-consent")
async def save_cookie_consent(request: Request):
    try:
        data = await request.json()
    except (ValueError, UnicodeDecodeError):
        return JSONResponse({"message": "No se pudo guardar tu elección."}, status_code=400)

    categories = ("preferences", "analytics", "marketing")
    if not isinstance(data, dict) or any(type(data.get(category)) is not bool for category in categories):
        return JSONResponse({"message": "Revisa las opciones de cookies e inténtalo de nuevo."}, status_code=422)

    consent_id = request.cookies.get(CONSENT_COOKIE) or uuid.uuid4().hex
    updated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    initialize_database()
    with sqlite3.connect(DATABASE_FILE, timeout=5) as connection:
        connection.execute(
            """INSERT INTO cookie_consents
               (consent_id, necessary, preferences, analytics, marketing, updated_at)
               VALUES (?, 1, ?, ?, ?, ?)
               ON CONFLICT(consent_id) DO UPDATE SET
                 necessary = 1,
                 preferences = excluded.preferences,
                 analytics = excluded.analytics,
                 marketing = excluded.marketing,
                 updated_at = excluded.updated_at""",
            (consent_id, *(int(data[category]) for category in categories), updated_at),
        )

    response = JSONResponse({"ok": True, "updated_at": updated_at}, headers={"Cache-Control": "no-store"})
    response.set_cookie(
        CONSENT_COOKIE,
        consent_id,
        max_age=60 * 60 * 24 * 180,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="lax",
        path="/",
    )
    return response


@app.post("/api/leads")
async def create_lead(request: Request):
    try:
        data = await request.json()
    except (ValueError, UnicodeDecodeError):
        return JSONResponse({"message": "No se pudo leer el formulario."}, status_code=400)

    if not isinstance(data, dict):
        return JSONResponse({"message": "Revisa los datos e inténtalo de nuevo."}, status_code=400)

    full_name = data.get("full_name")
    phone = data.get("phone")
    if not isinstance(full_name, str) or not isinstance(phone, str):
        return JSONResponse({"message": "Escribe tu nombre y número de teléfono."}, status_code=422)

    full_name = " ".join(full_name.split())
    phone_digits = re.sub(r"\D", "", phone)
    if not 2 <= len(full_name) <= 100 or not re.fullmatch(r"[^\W\d_]+(?:[ '\u2019.-][^\W\d_]+)*", full_name, re.UNICODE):
        return JSONResponse({"message": "Escribe un nombre completo válido."}, status_code=422)
    if not 7 <= len(phone_digits) <= 15:
        return JSONResponse({"message": "Escribe un número de teléfono válido."}, status_code=422)

    initialize_database()
    with sqlite3.connect(DATABASE_FILE, timeout=5) as connection:
        cursor = connection.execute(
            "INSERT OR IGNORE INTO leads (full_name, phone, created_at) VALUES (?, ?, ?)",
            (full_name, phone_digits, datetime.now(timezone.utc).isoformat(timespec="seconds")),
        )
        duplicate = cursor.rowcount == 0

    return {"ok": True, "duplicate": duplicate}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
