from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.conversation_participant import ConversationParticipant
from app.models.message import Message


class ConversationRepository:
    """Database access for Conversation and ConversationParticipant entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, conversation: Conversation) -> Conversation:
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        return conversation

    async def get_by_id(self, conversation_id: UUID) -> Conversation | None:
        return await self.db.get(Conversation, conversation_id)

    async def add_participant(self, participant: ConversationParticipant) -> ConversationParticipant:
        self.db.add(participant)
        await self.db.flush()
        return participant

    async def is_participant(self, conversation_id: UUID, user_id: UUID) -> bool:
        result = await self.db.get(ConversationParticipant, (user_id, conversation_id))
        return result is not None

    async def get_between_users(self, user_id_1: UUID, user_id_2: UUID) -> Conversation | None:
        """Find an existing 1-to-1 conversation between two users."""
        # Subquery: conversations where user1 is a participant
        sub1 = (
            select(ConversationParticipant.conversation_id)
            .where(ConversationParticipant.user_id == user_id_1)
        ).subquery()

        # Subquery: conversations where user2 is a participant
        sub2 = (
            select(ConversationParticipant.conversation_id)
            .where(ConversationParticipant.user_id == user_id_2)
        ).subquery()

        # Subquery: conversations with exactly 2 participants (1-to-1)
        sub_count = (
            select(
                ConversationParticipant.conversation_id,
                func.count().label("cnt"),
            )
            .group_by(ConversationParticipant.conversation_id)
            .having(func.count() == 2)
        ).subquery()

        stmt = (
            select(Conversation)
            .where(
                Conversation.id.in_(select(sub1.c.conversation_id)),
                Conversation.id.in_(select(sub2.c.conversation_id)),
                Conversation.id.in_(select(sub_count.c.conversation_id)),
            )
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(
        self, user_id: UUID, *, skip: int = 0, limit: int = 20,
    ) -> list[Conversation]:
        """List conversations the user participates in, newest activity first."""
        # Subquery: latest message timestamp per conversation
        latest_msg = (
            select(
                Message.conversation_id,
                func.max(Message.created_at).label("last_activity"),
            )
            .group_by(Message.conversation_id)
        ).subquery()

        stmt = (
            select(Conversation)
            .join(
                ConversationParticipant,
                ConversationParticipant.conversation_id == Conversation.id,
            )
            .outerjoin(
                latest_msg,
                latest_msg.c.conversation_id == Conversation.id,
            )
            .where(ConversationParticipant.user_id == user_id)
            .order_by(func.coalesce(latest_msg.c.last_activity, Conversation.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(ConversationParticipant)
            .where(ConversationParticipant.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_participants(self, conversation_id: UUID) -> list[ConversationParticipant]:
        stmt = (
            select(ConversationParticipant)
            .where(ConversationParticipant.conversation_id == conversation_id)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_participants_batch(
        self, conversation_ids: list[UUID],
    ) -> dict[UUID, list[UUID]]:
        """Batch load participant user_ids for multiple conversations."""
        if not conversation_ids:
            return {}
        stmt = (
            select(ConversationParticipant.conversation_id, ConversationParticipant.user_id)
            .where(ConversationParticipant.conversation_id.in_(conversation_ids))
        )
        result = await self.db.execute(stmt)
        mapping: dict[UUID, list[UUID]] = {cid: [] for cid in conversation_ids}
        for row in result.all():
            mapping[row[0]].append(row[1])
        return mapping

    async def mark_read(self, conversation_id: UUID, user_id: UUID) -> None:
        """Update last_read_at to now for a participant."""
        stmt = (
            update(ConversationParticipant)
            .where(
                ConversationParticipant.user_id == user_id,
                ConversationParticipant.conversation_id == conversation_id,
            )
            .values(last_read_at=datetime.now(timezone.utc))
        )
        await self.db.execute(stmt)

    async def get_last_read_batch(
        self, user_id: UUID, conversation_ids: list[UUID],
    ) -> dict[UUID, datetime | None]:
        """Batch load last_read_at for a user across multiple conversations."""
        if not conversation_ids:
            return {}
        stmt = (
            select(
                ConversationParticipant.conversation_id,
                ConversationParticipant.last_read_at,
            )
            .where(
                ConversationParticipant.user_id == user_id,
                ConversationParticipant.conversation_id.in_(conversation_ids),
            )
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}
