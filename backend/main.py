from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.db import Base, engine
from backend import models  # Viktig: importer modellene så de registreres hos Base

from backend.api.rss.innenriks import router as innenriks_router
from backend.api.rss.utenriks import router as utenriks_router
from backend.api.internal.hva_skjer import router as hva_skjer_router
from backend.api.weather import router as weather_router

print("Main lastet ✅")

app = FastAPI()

# Sørg for at tabeller finnes ved oppstart
@app.on_event("startup")
def on_startup():
    print("Kjører create_all()...")
    Base.metadata.create_all(bind=engine)

# RSS
app.include_router(innenriks_router, prefix="/api/rss")
app.include_router(utenriks_router, prefix="/api/rss")

# Lokale saker (public + admin)
app.include_router(hva_skjer_router, prefix="/api")
app.include_router(weather_router, prefix="/api")

# Frontend
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

print(f"Serving frontend fra: {FRONTEND_DIR}")

app.mount(
    "/",
    StaticFiles(directory=str(FRONTEND_DIR), html=True),
    name="frontend",
)
print("Frontend mountet ✅")
