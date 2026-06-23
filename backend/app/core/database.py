import ssl
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# When connecting to Supabase (remote host), enable SSL.
# For local PostgreSQL, SSL is not needed.
_connect_args: dict = {}
if settings.requires_ssl:
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE  # Supabase uses self-signed certs
    _connect_args["ssl"] = _ssl_ctx

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_recycle=300,
    connect_args=_connect_args,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a DB session per request.

    Transaction boundary:
      - Commits automatically if the request handler returns without error.
      - Rolls back on any exception, then re-raises so FastAPI's
        exception handlers can convert it to an HTTP response.

    This means repositories must NEVER call session.commit() directly.
    The session is the unit-of-work for the entire request lifecycle.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Dispose the connection pool. Called once during app shutdown."""
    await engine.dispose()
