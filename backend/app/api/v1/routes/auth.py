from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import RateLimiter
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest
from app.schemas.user import UserResponse
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=5, window_seconds=3600, prefix="auth:register")),
):
    """Create a new student account. Rate limited: 5 per hour per IP."""
    return await auth_service.register(db, data)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=10, window_seconds=300, prefix="auth:login")),
):
    """Authenticate and receive JWT tokens. Rate limited: 10 per 5 min per IP."""
    return await auth_service.login(db, data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=20, window_seconds=300, prefix="auth:refresh")),
):
    """Exchange a refresh token for a new access token."""
    return await auth_service.refresh(db, data.refresh_token)


@router.post("/logout", status_code=204)
async def logout(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Invalidate a refresh token (logout)."""
    await auth_service.logout(db, data.refresh_token)
