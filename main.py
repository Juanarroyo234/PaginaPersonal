from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

PROJECT_DIR = Path(__file__).resolve().parent
FRONTEND_FILE = PROJECT_DIR / "pagina_logos_corregidos_v2.html"

app.mount("/static", StaticFiles(directory=PROJECT_DIR / "static"), name="static")


@app.get("/")
async def root():
    return FileResponse(FRONTEND_FILE, media_type="text/html")


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}
