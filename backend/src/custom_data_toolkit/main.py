from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.db.engine import engine
from custom_data_toolkit.middleware.error_handler import register_error_handlers
from custom_data_toolkit.repositories import AuthRepository
from custom_data_toolkit.routers import auth, health
from custom_data_toolkit.services import AuthService


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        with Session(engine) as session:
            AuthService(AuthRepository(session)).ensure_bootstrap_admin()
    except Exception as exc:  # noqa: BLE001 — 迁移未跑时允许进程启动
        print(f"[startup] bootstrap admin skipped: {exc}")
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
