import math
from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_follow import UserFollow


class FollowRepository:
    """Database access for UserFollow entities.

    All methods receive an AsyncSession from the caller (service layer).
    None of them call commit() — transaction boundaries are owned by
    the get_db dependency at the request level.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def exists(self, follower_id: UUID, following_id: UUID) -> bool:
        """Check if a follow relationship already exists."""
        stmt = select(
            select(UserFollow)
            .where(
                UserFollow.follower_id == follower_id,
                UserFollow.following_id == following_id,
            )
            .exists()
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def create(self, follower_id: UUID, following_id: UUID) -> UserFollow:
        """Create a new follow relationship."""
        follow = UserFollow(follower_id=follower_id, following_id=following_id)
        self.db.add(follow)
        await self.db.flush()
        return follow

    async def delete(self, follower_id: UUID, following_id: UUID) -> bool:
        """Remove a follow relationship. Returns True if a row was deleted."""
        stmt = (
            delete(UserFollow)
            .where(
                UserFollow.follower_id == follower_id,
                UserFollow.following_id == following_id,
            )
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0

    async def count_followers(self, user_id: UUID) -> int:
        """Count how many users follow this user."""
        stmt = (
            select(func.count())
            .select_from(UserFollow)
            .where(UserFollow.following_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_following(self, user_id: UUID) -> int:
        """Count how many users this user follows."""
        stmt = (
            select(func.count())
            .select_from(UserFollow)
            .where(UserFollow.follower_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def list_followers(
        self,
        user_id: UUID,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> list[User]:
        """List users who follow this user, newest first."""
        stmt = (
            select(User)
            .join(UserFollow, UserFollow.follower_id == User.id)
            .where(
                UserFollow.following_id == user_id,
                User.is_active == True,  # noqa: E712
            )
            .order_by(UserFollow.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_active_followers(self, user_id: UUID) -> int:
        """Count active followers (for paginated list)."""
        stmt = (
            select(func.count())
            .select_from(UserFollow)
            .join(User, UserFollow.follower_id == User.id)
            .where(
                UserFollow.following_id == user_id,
                User.is_active == True,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def list_following(
        self,
        user_id: UUID,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> list[User]:
        """List users this user follows, newest first."""
        stmt = (
            select(User)
            .join(UserFollow, UserFollow.following_id == User.id)
            .where(
                UserFollow.follower_id == user_id,
                User.is_active == True,  # noqa: E712
            )
            .order_by(UserFollow.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_active_following(self, user_id: UUID) -> int:
        """Count active users this user follows (for paginated list)."""
        stmt = (
            select(func.count())
            .select_from(UserFollow)
            .join(User, UserFollow.following_id == User.id)
            .where(
                UserFollow.follower_id == user_id,
                User.is_active == True,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
