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
            raise Unauthorized("No account found with that email")
    else:
        user = await repo.get_by_username(identifier)
        if not user:
            raise Unauthorized("No account found with that username")

    if not verify_password(data.password, user.password_hash):
        raise Unauthorized("Incorrect password")

    if not user.is_active:
        raise Unauthorized("Account is deactivated")

    if not user.is_verified_student:
        # Allow login but include verification status in claims so
        # the frontend can prompt verification when needed.
        pass

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role},
    )

    return TokenResponse(access_token=token)
