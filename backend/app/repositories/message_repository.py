from datetime import datetime
from uuid import UUID

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message


class MessageRepository:
    """Database access for Message entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, message: Message) -> Message:
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return message

    async def list_by_conversation(
        self, conversation_id: UUID, *, skip: int = 0, limit: int = 50,
    ) -> list[Message]:
        stmt = (
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.is_deleted == False,  # noqa: E712
            )
            .order_by(Message.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_conversation(self, conversation_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_latest_by_conversations(
        self, conversation_ids: list[UUID],
    ) -> dict[UUID, Message]:
        """Get the latest message for each conversation (batch)."""
        if not conversation_ids:
            return {}

        # Subquery: max created_at per conversation
        sub = (
            select(
                Message.conversation_id,
                func.max(Message.created_at).label("max_created"),
            )
            .where(
                Message.conversation_id.in_(conversation_ids),
                Message.is_deleted == False,  # noqa: E712
            )
            .group_by(Message.conversation_id)
        ).subquery()

        stmt = (
            select(Message)
            .join(
                sub,
                (Message.conversation_id == sub.c.conversation_id)
                & (Message.created_at == sub.c.max_created),
            )
        )
        result = await self.db.execute(stmt)
        messages = result.scalars().all()
        return {m.conversation_id: m for m in messages}

    async def count_unread_batch(
        self,
        user_id: UUID,
        conversation_last_read: dict[UUID, datetime | None],
    ) -> dict[UUID, int]:
        """Count unread messages per conversation for a user.

        A message is unread if it was sent by someone else AND created after
        the user's last_read_at (or all messages if last_read_at is None).
        """
        if not conversation_last_read:
            return {}

        conv_ids = list(conversation_last_read.keys())

        conditions = []
        for conv_id, last_read in conversation_last_read.items():
            if last_read is None:
                conditions.append(
                    and_(
                        Message.conversation_id == conv_id,
                        Message.sender_id != user_id,
                        Message.is_deleted == False,  # noqa: E712
                    )
                )
            else:
                conditions.append(
                    and_(
                        Message.conversation_id == conv_id,
                        Message.sender_id != user_id,
                        Message.is_deleted == False,  # noqa: E712
                        Message.created_at > last_read,
                    )
                )

        if not conditions:
            return {cid: 0 for cid in conv_ids}

        from sqlalchemy import or_

        stmt = (
            select(
                Message.conversation_id,
                func.count().label("cnt"),
            )
            .where(or_(*conditions))
            .group_by(Message.conversation_id)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        return {cid: counts.get(cid, 0) for cid in conv_ids}
