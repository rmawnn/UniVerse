from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import v1_router
from app.core.config import settings
from app.core.database import dispose_engine
from app.core.exceptions import AppException, app_exception_handler
from app.core.logging import logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""

    # ── Startup ──────────────────────────────────────────────
    setup_logging()
    logger.info(
        "Starting %s v%s [%s]",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.ENVIRONMENT.value,
    )
    logger.info("Database pool: size=%d, overflow=%d",
                settings.DATABASE_POOL_SIZE, settings.DATABASE_MAX_OVERFLOW)

    yield

    # ── Shutdown ─────────────────────────────────────────────
    logger.info("Shutting down — disposing database connection pool")
    await dispose_engine()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Student-only university social platform",
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    # --- Middleware ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Exception handlers ---
    app.add_exception_handler(AppException, app_exception_handler)

    # --- Routers ---
    app.include_router(v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
