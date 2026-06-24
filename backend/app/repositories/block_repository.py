from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_block import UserBlock


class BlockRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def exists(self, blocker_id: UUID, blocked_id: UUID) -> bool:
        stmt = select(func.count()).select_from(UserBlock).where(
            UserBlock.blocker_id == blocker_id,
            UserBlock.blocked_id == blocked_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one() > 0

    async def create(self, blocker_id: UUID, blocked_id: UUID) -> UserBlock:
        block = UserBlock(blocker_id=blocker_id, blocked_id=blocked_id)
        self.db.add(block)
        await self.db.flush()
        return block

    async def remove(self, blocker_id: UUID, blocked_id: UUID) -> bool:
        stmt = delete(UserBlock).where(
            UserBlock.blocker_id == blocker_id,
            UserBlock.blocked_id == blocked_id,
        )
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def list_blocked_ids(self, blocker_id: UUID) -> list[UUID]:
        stmt = (
            select(UserBlock.blocked_id)
            .where(UserBlock.blocker_id == blocker_id)
            .order_by(UserBlock.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def is_blocked_by(self, user_id: UUID, by_user_id: UUID) -> bool:
        return await self.exists(by_user_id, user_id)
