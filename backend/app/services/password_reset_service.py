"""
Password reset service for UniVerse.

Security properties:
  - Only the SHA-256 hash of the reset token is stored in the DB.
  - Tokens expire after RESET_TOKEN_EXPIRY_MINUTES (30 min).
  - Once used, the token is marked and cannot be replayed.
  - All other pending tokens for the same user are invalidated on reset.
  - Generic responses prevent email enumeration.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequest
from app.core.security import hash_password
from app.models.password_reset import PasswordResetToken
from app.repositories.password_reset_repository import PasswordResetRepository
from app.repositories.user_repository import UserRepository
from app.services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)

RESET_TOKEN_EXPIRY_MINUTES = 30
FRONTEND_BASE_URL = "http://localhost:3000"


def _hash_reset_token(raw_token: str) -> str:
    """SHA-256 hash a raw token for safe DB storage."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


async def forgot_password(db: AsyncSession, email: str) -> dict[str, str]:
    """
    Handle a forgot-password request.

    Always returns a generic success message regardless of whether the
    email exists — this prevents email enumeration.

    If the user exists:
      1. Generate a cryptographically random token
      2. Store only the SHA-256 hash in the DB
      3. Send the raw token via email link
    """
    generic_message = (
        "If an account with that email exists, "
        "we've sent a password reset link."
    )

    repo = UserRepository(db)
    user = await repo.get_by_email(email.lower().strip())

    if not user or not user.is_active:
        logger.debug("Forgot-password for non-existent/inactive email (no action)")
        return {"message": generic_message}

    # Generate secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_reset_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)

    # Store hashed token
    reset_repo = PasswordResetRepository(db)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    await reset_repo.create(reset_token)

    # Build reset URL and send email
    # Use first CORS origin as frontend URL, fallback to localhost
    frontend_url = FRONTEND_BASE_URL
    if settings.CORS_ORIGINS:
        frontend_url = settings.CORS_ORIGINS[0].rstrip("/")

    reset_url = f"{frontend_url}/reset-password?token={raw_token}"

    email_sent = await send_password_reset_email(
        to=user.email,
        reset_url=reset_url,
        expiry_minutes=RESET_TOKEN_EXPIRY_MINUTES,
    )

    if email_sent:
        logger.info("Password reset email sent to user %s", user.id)
    else:
        logger.warning(
            "Password reset email NOT sent for user %s (provider not configured or failed)",
            user.id,
        )

    return {"message": generic_message}


async def reset_password(db: AsyncSession, raw_token: str, new_password: str) -> dict[str, str]:
    """
    Validate the reset token and update the user's password.

    Checks:
      - Token exists (by hash lookup)
      - Token is not expired
      - Token has not been used before

    On success:
      - Updates password hash
      - Marks the token as used
      - Invalidates all other pending reset tokens for this user
    """
    token_hash = _hash_reset_token(raw_token)

    reset_repo = PasswordResetRepository(db)
    token_record = await reset_repo.get_by_token_hash(token_hash)

    if not token_record:
        logger.warning("Password reset attempted with invalid token")
        raise BadRequest("Invalid or expired reset link. Please request a new one.")

    if token_record.used_at is not None:
        logger.warning("Password reset attempted with already-used token %s", token_record.id)
        raise BadRequest("This reset link has already been used. Please request a new one.")

    if datetime.now(timezone.utc) > token_record.expires_at:
        logger.warning("Password reset attempted with expired token %s", token_record.id)
        raise BadRequest("This reset link has expired. Please request a new one.")

    # Fetch the user
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(token_record.user_id)

    if not user or not user.is_active:
        logger.warning("Password reset for non-existent/inactive user %s", token_record.user_id)
        raise BadRequest("Invalid or expired reset link. Please request a new one.")

    # Update password
    new_hash = hash_password(new_password)
    await user_repo.update_password(user, new_hash)

    # Mark token used & invalidate all other pending tokens for this user
    await reset_repo.mark_used(token_record)
    await reset_repo.invalidate_all_for_user(token_record.user_id)

    logger.info("Password reset successful for user %s", user.id)
    return {"message": "Your password has been reset successfully. You can now sign in."}
