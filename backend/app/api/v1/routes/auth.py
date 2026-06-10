from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import RateLimiter
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services import auth_service
from app.services import password_reset_service

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


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=3, window_seconds=300, prefix="auth:forgot")),
):
    """Request a password reset email. Rate limited: 3 per 5 min per IP.

    Always returns a generic success message regardless of whether the
    email exists — this prevents email enumeration.
    """
    result = await password_reset_service.forgot_password(db, data.email)
    return MessageResponse(**result)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=5, window_seconds=300, prefix="auth:reset")),
):
    """Reset password using a valid reset token. Rate limited: 5 per 5 min per IP."""
    result = await password_reset_service.reset_password(db, data.token, data.new_password)
    return MessageResponse(**result)
