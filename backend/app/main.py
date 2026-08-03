from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.utils.data_loader import init_db
from app.routes import notes, auth, group, ai
from app.core.config import settings
from app.utils.limiter import limiter

init_db()

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/uploads",
    StaticFiles(directory=Path(__file__).resolve().parent / settings.upload_dir, html=False),
    name="uploads",
)

app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(group.router)
app.include_router(ai.router)