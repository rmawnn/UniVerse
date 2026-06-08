"""
Shared test fixtures for the UniVerse backend test suite.

Strategy:
  - Uses a real PostgreSQL test database (universe_test_db) to match
    production behavior exactly — no SQLite quirks.
  - Creates all tables once per session via Base.metadata.create_all.
  - Each test gets a fresh connection + transaction that is rolled back
    after the test, so every test starts with a clean DB.
  - The FastAPI app's get_db dependency is overridden to use the test session.
  - NullPool avoids connection caching issues across event loop boundaries.

Setup (one-time):
  createdb -U postgres universe_test_db
"""

import os
from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

# ── Set environment variables BEFORE importing app code ───────────
# Clear DATABASE_URL so the test DB name override (DB_NAME) is respected
# even when a Supabase DATABASE_URL is configured in .env.
os.environ.update({
    "DATABASE_URL": "",
    "DB_USER": os.environ.get("DB_USER", "postgres"),
    "DB_PASSWORD": os.environ.get("DB_PASSWORD", "postgres"),
    "DB_HOST": os.environ.get("DB_HOST", "localhost"),
    "DB_PORT": os.environ.get("DB_PORT", "5432"),
    "DB_NAME": "universe_test_db",
    "DEBUG": "True",
    "ENVIRONMENT": "development",
    "SECRET_KEY": "test-secret-key-not-for-production-use-1234567890",
})

from app.core.database import get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.base import Base  # noqa: E402

# Import all models so Base.metadata knows every table
import app.models  # noqa: E402, F401

from app.core.config import settings  # noqa: E402


def _make_engine():
    """Create a fresh async engine with NullPool (no cross-loop issues)."""
    return create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )


# ── Session-scoped: create/drop tables once ──────────────────────

@pytest.fixture(scope="session")
async def _create_tables():
    """Create all tables at session start, drop them at session end."""
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    yield
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ── Per-test: transactional rollback isolation ───────────────────

@pytest.fixture
async def db(_create_tables) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a DB session that rolls back after each test.

    Uses a real transaction that is rolled back at the end, so tests
    see their own writes but nothing persists to the next test.
    """
    engine = _make_engine()
    async with engine.connect() as conn:
        transaction = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()
    await engine.dispose()


@pytest.fixture
async def app(db: AsyncSession):
    """FastAPI app with get_db overridden to use the test session."""
    application = create_app()

    async def override_get_db():
        try:
            yield db
            # Don't commit here — the outer transaction will be rolled back
            await db.flush()
        except Exception:
            await db.rollback()
            raise

    application.dependency_overrides[get_db] = override_get_db
    yield application
    application.dependency_overrides.clear()


@pytest.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for making requests to the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ══════════════════════════════════════════════════════════════════
#  Helper fixtures & factories
# ══════════════════════════════════════════════════════════════════

@pytest.fixture(autouse=True)
def _clear_rate_limits():
    """Clear in-memory rate limiter state between tests.

    Without this, the cumulative registration attempts across tests hit
    the per-IP rate limit (5/hour) and return 429.
    """
    from app.core.rate_limit import _buckets
    _buckets.clear()


@pytest.fixture
def unique_suffix():
    """Return a short unique suffix for generating unique test data."""
    return uuid4().hex[:8]


@pytest.fixture
async def university(db: AsyncSession):
    """Insert a test university and return it."""
    from app.models.university import University

    uni = University(
        name=f"Test University {uuid4().hex[:6]}",
        domain=f"test{uuid4().hex[:6]}.edu",
        country="Testland",
    )
    db.add(uni)
    await db.flush()
    await db.refresh(uni)
    return uni


@pytest.fixture
async def registered_user(client: AsyncClient, unique_suffix: str):
    """Register a user via the API and return (user_data, password)."""
    password = "TestPassword123"
    payload = {
        "email": f"user_{unique_suffix}@testuni.edu",
        "password": password,
        "full_name": f"Test User {unique_suffix}",
        "username": f"user_{unique_suffix}",
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json(), password


@pytest.fixture
async def auth_header(client: AsyncClient, registered_user):
    """Register + login a user and return the Authorization header dict."""
    user_data, password = registered_user
    resp = await client.post("/api/v1/auth/login", json={
        "identifier": user_data["email"],
        "password": password,
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def verified_user_header(
    client: AsyncClient,
    db: AsyncSession,
    university,
    unique_suffix: str,
):
    """
    Create a fully verified user and return (auth_header, user_data).

    Registers, logs in, sends verification code, confirms it.
    """
    password = "TestPassword123"
    email = f"vuser_{unique_suffix}@testuni.edu"
    username = f"vuser_{unique_suffix}"
    uni_email = f"student_{unique_suffix}@{university.domain}"

    # Register
    resp = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": f"Verified User {unique_suffix}",
        "username": username,
    })
    assert resp.status_code == 201, resp.text
    user_data = resp.json()

    # Login
    resp = await client.post("/api/v1/auth/login", json={
        "identifier": email, "password": password,
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Send verification code
    resp = await client.post("/api/v1/verification/send", json={
        "university_email": uni_email,
    }, headers=headers)
    assert resp.status_code == 200, resp.text
    send_data = resp.json()
    verification_id = send_data["verification_id"]
    code = send_data["debug_code"]

    # Confirm verification
    resp = await client.post("/api/v1/verification/confirm", json={
        "verification_id": verification_id,
        "code": code,
    }, headers=headers)
    assert resp.status_code == 200, resp.text

    return headers, user_data


@pytest.fixture
async def community(client: AsyncClient, verified_user_header):
    """Create a community and return (community_data, auth_headers)."""
    headers, _ = verified_user_header
    resp = await client.post("/api/v1/communities", json={
        "name": f"Test Community {uuid4().hex[:6]}",
        "description": "A community for testing",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json(), headers


@pytest.fixture
async def post_in_community(client: AsyncClient, community):
    """Create a post in the test community and return (post_data, community_data, headers)."""
    community_data, headers = community
    resp = await client.post(
        f"/api/v1/communities/{community_data['id']}/posts",
        json={"content": "Hello from the test suite!"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json(), community_data, headers
