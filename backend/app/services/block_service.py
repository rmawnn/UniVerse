from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.user import User
from app.repositories.block_repository import BlockRepository
from app.repositories.follow_repository import FollowRepository
from app.repositories.user_repository import UserRepository


async def block_user(
    db: AsyncSession,
    current_user: User,
    target_user_id: UUID,
) -> dict:
    if current_user.id == target_user_id:
        raise BadRequest("You cannot block yourself")

    user_repo = UserRepository(db)
    target = await user_repo.get_by_id(target_user_id)
    if not target:
        raise NotFound("User")

    block_repo = BlockRepository(db)
    if await block_repo.exists(current_user.id, target_user_id):
        raise BadRequest("User is already blocked")

    await block_repo.create(current_user.id, target_user_id)

    follow_repo = FollowRepository(db)
    await follow_repo.delete(current_user.id, target_user_id)
    await follow_repo.delete(target_user_id, current_user.id)

    return {"blocked": True}


async def unblock_user(
    db: AsyncSession,
    current_user: User,
    target_user_id: UUID,
) -> dict:
    block_repo = BlockRepository(db)
    removed = await block_repo.remove(current_user.id, target_user_id)
    if not removed:
        raise BadRequest("User is not blocked")
    return {"blocked": False}


async def get_blocked_users(
    db: AsyncSession,
    current_user: User,
) -> list[dict]:
    block_repo = BlockRepository(db)
    blocked_ids = await block_repo.list_blocked_ids(current_user.id)
    if not blocked_ids:
        return []

    user_repo = UserRepository(db)
    users = await user_repo.get_by_ids(set(blocked_ids))
    return [
        {
            "id": str(u.id),
            "username": u.username,
            "full_name": u.full_name,
            "profile_image_url": u.profile_image_url,
        }
        for uid in blocked_ids
        if (u := users.get(uid))
    ]


async def is_blocked(
    db: AsyncSession,
    blocker_id: UUID,
    blocked_id: UUID,
) -> bool:
    block_repo = BlockRepository(db)
    return await block_repo.exists(blocker_id, blocked_id)
