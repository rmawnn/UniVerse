from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import v1_router
from app.core.config import settings
from app.core.database import dispose_engine
from app.core.exceptions import AppException, app_exception_handler
from app.core.logging import logger, setup_logging

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


def _log_security_posture() -> None:
    """Log the security configuration at startup for operator visibility."""
    env = settings.ENVIRONMENT.value

    # SECRET_KEY check
    from app.core.config import SECRET_KEY_PLACEHOLDERS
    if settings.SECRET_KEY.lower().strip() in SECRET_KEY_PLACEHOLDERS:
        logger.warning("SECRET_KEY is a placeholder — NOT SAFE for production")
    elif len(settings.SECRET_KEY) < 32:
        logger.warning("SECRET_KEY is short (%d chars) — recommend 64+", len(settings.SECRET_KEY))
    else:
        logger.info("SECRET_KEY: OK (%d chars)", len(settings.SECRET_KEY))

    # Database
    if settings.DATABASE_URL:
        # Mask the URL for logging (show host only)
        from urllib.parse import urlparse
        parsed = urlparse(settings.DATABASE_URL)
        logger.info("Database: %s:%s/%s (SSL=%s)",
                     parsed.hostname, parsed.port, parsed.path.lstrip("/"),
                     settings.requires_ssl)
    else:
        logger.warning("Database: URL not resolved — startup should have failed")

    # Supabase
    if settings.supabase_configured:
        logger.info("Supabase: configured (Storage + Realtime)")
    else:
        if settings.is_production:
            logger.error("Supabase: NOT configured — file storage will fail in production")
        else:
            logger.info("Supabase: not configured — using local fallbacks")

    # Email
    if settings.EMAIL_PROVIDER:
        logger.info("Email: provider=%s", settings.EMAIL_PROVIDER)
    else:
        if settings.is_production:
            logger.warning("Email: no provider set — verification codes cannot be delivered")
        else:
            logger.info("Email: disabled (dev mode)")

    # Debug codes
    if settings.allow_debug_codes:
        logger.warning("Debug codes ENABLED — verification codes visible in API responses")
    else:
        logger.info("Debug codes: disabled (codes never in API responses)")

    # DEBUG flag
    if settings.DEBUG:
        if settings.is_production:
            logger.error("DEBUG=True in production — this should never happen")
        else:
            logger.info("DEBUG: True (development)")
    else:
        logger.info("DEBUG: False")

    # CORS
    logger.info("CORS origins: %s", settings.CORS_ORIGINS)

    # Docs
    if settings.is_production:
        logger.info("API docs: disabled (production)")
    else:
        logger.info("API docs: enabled at /docs, /redoc")

    logger.info("Security posture check complete [%s]", env)


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

    # Security posture check
    _log_security_posture()

    # Initialize Supabase Storage buckets (no-op when not configured)
    from app.services.storage_service import initialize_buckets
    await initialize_buckets()

    if settings.supabase_configured:
        logger.info("Supabase integration active: Storage + Realtime")
    else:
        logger.info("Supabase not configured — using local filesystem + in-memory WS")

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
        # Disable interactive docs in production (security best practice)
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )

    # --- Middleware (order matters: last added = first executed) ---
    # CORS must be outermost so preflight requests are handled first
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.core.middleware import SecurityHeadersMiddleware, RequestLoggingMiddleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)

    # --- Exception handlers ---
    app.add_exception_handler(AppException, app_exception_handler)

    # --- Routers ---
    app.include_router(v1_router, prefix=settings.API_V1_PREFIX)

    # --- Static file serving for uploads ---
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

    return app


app = create_app()
