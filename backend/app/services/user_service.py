from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Unauthorized
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import ChangePasswordRequest, UserUpdateRequest, UserResponse


async def change_password(
    db: AsyncSession,
    current_user: User,
    data: ChangePasswordRequest,
) -> None:
    """Verify the current password, then replace it with the new one.

    Raises Unauthorized if current_password doesn't match.
    The schema already enforces that new != current at the string level.
    """
    if not verify_password(data.current_password, current_user.password_hash):
        raise Unauthorized("Current password is incorrect")

    new_hash = hash_password(data.new_password)
    repo = UserRepository(db)
    await repo.update_password(current_user, new_hash)


async def update_profile(
    db: AsyncSession,
    current_user: User,
    data: UserUpdateRequest,
) -> UserResponse:
    """Apply a partial update to the authenticated user's own profile.

    Only fields explicitly sent by the client are written — omitted fields
    stay unchanged.  Raises BadRequest if the payload is entirely empty.
    """
    fields = data.model_dump(exclude_unset=True)

    if not fields:
        raise BadRequest("No fields provided to update")

    repo = UserRepository(db)
    user = await repo.update(current_user, **fields)
    return UserResponse.model_validate(user)
