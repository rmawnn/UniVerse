import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound, AlreadyExists
from app.models.user import User
from app.repositories.follow_repository import FollowRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserSearchResponse


async def follow_user(
    db: AsyncSession,
    current_user: User,
    target_user_id: UUID,
) -> dict:
    """Follow a user. Returns follower/following counts.

    Rules:
    - Cannot follow yourself
    - Cannot follow an inactive user
    - Duplicate follow raises AlreadyExists
    """
    if current_user.id == target_user_id:
        raise BadRequest("You cannot follow yourself")

    user_repo = UserRepository(db)
    target = await user_repo.get_by_id(target_user_id)

    if not target or not target.is_active:
        raise NotFound("User")

    follow_repo = FollowRepository(db)

    if await follow_repo.exists(current_user.id, target_user_id):
        raise AlreadyExists("Follow relationship")

    await follow_repo.create(current_user.id, target_user_id)

    followers_count = await follow_repo.count_followers(target_user_id)
    following_count = await follow_repo.count_following(target_user_id)

    return {
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": True,
    }


async def unfollow_user(
    db: AsyncSession,
    current_user: User,
    target_user_id: UUID,
) -> dict:
    """Unfollow a user. Returns updated counts.

    Rules:
    - Cannot unfollow yourself (no-op guard)
    - If not following, raises NotFound
    """
    if current_user.id == target_user_id:
        raise BadRequest("You cannot unfollow yourself")

    user_repo = UserRepository(db)
    target = await user_repo.get_by_id(target_user_id)

    if not target or not target.is_active:
        raise NotFound("User")

    follow_repo = FollowRepository(db)
    deleted = await follow_repo.delete(current_user.id, target_user_id)

    if not deleted:
        raise NotFound("Follow relationship")

    followers_count = await follow_repo.count_followers(target_user_id)
    following_count = await follow_repo.count_following(target_user_id)

    return {
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": False,
    }


async def list_followers(
    db: AsyncSession,
    target_user_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserSearchResponse]:
    """List users who follow the target user."""
    user_repo = UserRepository(db)
    target = await user_repo.get_by_id(target_user_id)

    if not target or not target.is_active:
        raise NotFound("User")

    follow_repo = FollowRepository(db)
    skip = (page - 1) * page_size

    total = await follow_repo.count_active_followers(target_user_id)
    users = await follow_repo.list_followers(target_user_id, skip=skip, limit=page_size)

    items = [UserSearchResponse.model_validate(u) for u in users]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def list_following(
    db: AsyncSession,
    target_user_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserSearchResponse]:
    """List users the target user follows."""
    user_repo = UserRepository(db)
    target = await user_repo.get_by_id(target_user_id)

    if not target or not target.is_active:
        raise NotFound("User")

    follow_repo = FollowRepository(db)
    skip = (page - 1) * page_size

    total = await follow_repo.count_active_following(target_user_id)
    users = await follow_repo.list_following(target_user_id, skip=skip, limit=page_size)

    items = [UserSearchResponse.model_validate(u) for u in users]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )
