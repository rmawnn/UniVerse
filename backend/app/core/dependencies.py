from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract the JWT, validate it, and return the full User ORM object."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)

    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Return the authenticated user if a valid token is present, else None.

    Unlike get_current_user, this never raises — unauthenticated callers
    simply get None. Use this for public endpoints that enrich the response
    when the caller happens to be logged in.
    """
    if token is None:
        return None
    try:
        payload = decode_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        return None

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)

    if user is None or not user.is_active:
        return None
    return user


async def require_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Gate that blocks unverified students from protected endpoints."""
    if not current_user.is_verified_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student verification required",
        )
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Gate that restricts access to admin users only."""
    from app.utils.constants import UserRole

    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
