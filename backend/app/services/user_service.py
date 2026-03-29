import math

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Unauthorized
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.user import ChangePasswordRequest, UserSearchResponse, UserUpdateRequest, UserResponse


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


async def search_users(
    db: AsyncSession,
    current_user: User,
    query: str,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserSearchResponse]:
    """Search users by username or full_name.

    Excludes the current user from results.
    Rejects queries shorter than 2 characters.
    """
    query = query.strip()
    if len(query) < 2:
        raise BadRequest("Search query must be at least 2 characters")

    repo = UserRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_search(query, exclude_user_id=current_user.id)
    users = await repo.search(query, exclude_user_id=current_user.id, skip=skip, limit=page_size)

    items = [UserSearchResponse.model_validate(u) for u in users]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )
