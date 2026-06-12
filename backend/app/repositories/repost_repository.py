from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repost import Repost


class RepostRepository:
    """Database access for Repost entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, post_id: UUID, user_id: UUID) -> Repost | None:
        return await self.db.get(Repost, (user_id, post_id))

    async def create(self, post_id: UUID, user_id: UUID) -> Repost:
        repost = Repost(user_id=user_id, post_id=post_id)
        self.db.add(repost)
        await self.db.flush()
        return repost

    async def delete(self, post_id: UUID, user_id: UUID) -> None:
        stmt = delete(Repost).where(
            Repost.user_id == user_id,
            Repost.post_id == post_id,
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def count_by_post(self, post_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Repost)
            .where(Repost.post_id == post_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_by_posts(self, post_ids: list[UUID]) -> dict[UUID, int]:
        if not post_ids:
            return {}
        stmt = (
            select(Repost.post_id, func.count())
            .where(Repost.post_id.in_(post_ids))
            .group_by(Repost.post_id)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        return {pid: counts.get(pid, 0) for pid in post_ids}

    async def reposted_by_user(self, post_ids: list[UUID], user_id: UUID) -> set[UUID]:
        if not post_ids:
            return set()
        stmt = (
            select(Repost.post_id)
            .where(Repost.post_id.in_(post_ids), Repost.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result.all()}
