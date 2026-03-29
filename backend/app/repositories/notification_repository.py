from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    """Database access for Notification entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def get_by_id(self, notification_id: UUID) -> Notification | None:
        return await self.db.get(Notification, notification_id)

    async def list_by_user(
        self, user_id: UUID, *, skip: int = 0, limit: int = 20,
    ) -> list[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_unread(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def mark_as_read(self, notification_id: UUID) -> None:
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id)
            .values(is_read=True)
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def mark_all_as_read(self, user_id: UUID) -> None:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
            .values(is_read=True)
        )
        await self.db.execute(stmt)
        await self.db.flush()
