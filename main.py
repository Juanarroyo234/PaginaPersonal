from pathlib import Path
import re
import sqlite3
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

PROJECT_DIR = Path(__file__).resolve().parent
FRONTEND_FILE = PROJECT_DIR / "index.html"
DATABASE_FILE = PROJECT_DIR / "leads.sqlite3"


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
