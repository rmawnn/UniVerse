from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExists, Unauthorized
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse


async def register(db: AsyncSession, data: RegisterRequest) -> UserResponse:
    """Create a new user account.

    Checks for duplicate email/username, hashes the password, persists the
    user, and returns the public-facing representation.
    """
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
    return UserResponse.model_validate(user)


async def login(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    """Authenticate a user and return a JWT access token.

    Validates email existence, password correctness, and active status.
    """
    repo = UserRepository(db)
    user = await repo.get_by_email(data.email)

    if not user:
        raise Unauthorized("Invalid email or password")

    if not verify_password(data.password, user.password_hash):
        raise Unauthorized("Invalid email or password")

    if not user.is_active:
        raise Unauthorized("Account is deactivated")

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role},
    )

    return TokenResponse(access_token=token)
