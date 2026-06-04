import logging
from uuid import UUID

from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExists, BadRequest, Unauthorized
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    invalidate_token,
    is_token_invalidated,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)


async def register(db: AsyncSession, data: RegisterRequest) -> UserResponse:
    """Create a new user account.

    Validates that the email belongs to a recognized university domain,
    checks for duplicate email/username, hashes the password, persists the
    user, and returns the public-facing representation.
    """
    from app.services.domain_validation_service import validate_university_email

    # Enforce university email — block generic providers
    domain_result = validate_university_email(data.email)
    if not domain_result.valid:
        raise BadRequest(
            domain_result.reason
            or "Registration requires a university email address. "
            "Generic email providers (Gmail, Hotmail, Outlook, Yahoo, etc.) are not accepted."
        )

    repo = UserRepository(db)

    if await repo.get_by_email(data.email):
        raise AlreadyExists("A user with this email")

    if await repo.get_by_username(data.username):
        raise AlreadyExists("A user with this username")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        username=data.username,
    )

    user = await repo.create(user)
    logger.info("New user registered: %s (id=%s)", data.username, user.id)
    return UserResponse.model_validate(user)


async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    """Authenticate a user and return JWT access + refresh tokens.

    Accepts either an email address or a username in the ``identifier`` field.
    If the input contains ``@`` it is treated as an email, otherwise as a
    username.
    """
    repo = UserRepository(db)
    identifier = data.identifier.strip()

    # Detect whether the user provided an email or a username
    if "@" in identifier:
        user = await repo.get_by_email(identifier)
        if not user:
            logger.warning("Login failed: email not found — %s", identifier)
            raise Unauthorized("No account found with that email")
    else:
        user = await repo.get_by_username(identifier)
        if not user:
            logger.warning("Login failed: username not found — %s", identifier)
            raise Unauthorized("No account found with that username")

    if not verify_password(data.password, user.password_hash):
        logger.warning("Login failed: wrong password for user %s", user.id)
        raise Unauthorized("Incorrect password")

    if not user.is_active:
        logger.warning("Login failed: deactivated account %s", user.id)
        raise Unauthorized("Account is deactivated")

    access = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role},
    )
    refresh = create_refresh_token(subject=str(user.id))

    logger.info("User logged in: %s (id=%s)", user.username, user.id)
    return TokenResponse(access_token=access, refresh_token=refresh)


async def refresh(db: AsyncSession, refresh_token: str) -> TokenResponse:
    """Exchange a valid refresh token for a new access + refresh token pair.

    The old refresh token is invalidated (rotation) to prevent replay attacks.
    """
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise Unauthorized("Invalid or expired refresh token")

    if payload.get("type") != "refresh":
        raise Unauthorized("Token is not a refresh token")

    if is_token_invalidated(refresh_token):
        logger.warning("Refresh token reuse detected — possible token theft")
        raise Unauthorized("Refresh token has been revoked")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise Unauthorized("Invalid token payload")

    # Verify user still exists and is active
    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id_str))
    if not user or not user.is_active:
        raise Unauthorized("User not found or deactivated")

    # Invalidate the old refresh token (rotation)
    invalidate_token(refresh_token)

    # Issue new pair
    access = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role},
    )
    new_refresh = create_refresh_token(subject=str(user.id))

    return TokenResponse(access_token=access, refresh_token=new_refresh)


async def logout(db: AsyncSession, refresh_token: str) -> None:
    """Invalidate a refresh token (secure logout)."""
    invalidate_token(refresh_token)
    logger.info("Refresh token invalidated via logout")
