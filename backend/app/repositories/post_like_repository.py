from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post_like import PostLike


class PostLikeRepository:
    """Database access for PostLike entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_like(self, post_id: UUID, user_id: UUID) -> PostLike | None:
        return await self.db.get(PostLike, (user_id, post_id))

    async def create_like(self, post_id: UUID, user_id: UUID) -> PostLike:
        like = PostLike(user_id=user_id, post_id=post_id)
        self.db.add(like)
        await self.db.flush()
        return like

    async def delete_like(self, post_id: UUID, user_id: UUID) -> None:
        stmt = delete(PostLike).where(
            PostLike.user_id == user_id,
            PostLike.post_id == post_id,
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def count_by_post(self, post_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(PostLike)
            .where(PostLike.post_id == post_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_by_posts(self, post_ids: list[UUID]) -> dict[UUID, int]:
        """Batch count likes for multiple posts. Returns {post_id: count}."""
        if not post_ids:
            return {}
        stmt = (
            select(PostLike.post_id, func.count())
            .where(PostLike.post_id.in_(post_ids))
            .group_by(PostLike.post_id)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        # Fill in zeros for posts with no likes
        return {pid: counts.get(pid, 0) for pid in post_ids}

    async def liked_by_user(self, post_ids: list[UUID], user_id: UUID) -> set[UUID]:
        """Return the set of post_ids the user has liked (batch)."""
        if not post_ids:
            return set()
        stmt = (
            select(PostLike.post_id)
            .where(PostLike.post_id.in_(post_ids), PostLike.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result.all()}
