from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.story import Story
from app.models.user import User


class StoryRepository:
    """Database access for Story entities.

    None of the methods call commit() — transaction boundaries
    are owned by the get_db dependency.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, story: Story) -> Story:
        self.db.add(story)
        await self.db.flush()
        await self.db.refresh(story)
        return story

    async def get_active_by_user(self, user_id: UUID) -> list[Story]:
        """Get all active (non-expired) stories for a user, newest first."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(Story)
            .where(
                Story.user_id == user_id,
                Story.expires_at > now,
            )
            .order_by(Story.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_active_user_ids(self) -> list[UUID]:
        """Get distinct user IDs that have at least one active story."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(Story.user_id)
            .where(Story.expires_at > now)
            .distinct()
        )
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]

    async def list_active_grouped(self) -> list[tuple[User, list[Story]]]:
        """Get all active stories grouped by user.

        Returns a list of (User, [Story, ...]) tuples,
        ordered by most recent story per user.
        """
        now = datetime.now(timezone.utc)

        # Get active stories with their authors
        stmt = (
            select(Story, User)
            .join(User, Story.user_id == User.id)
            .where(
                Story.expires_at > now,
                User.is_active == True,  # noqa: E712
            )
            .order_by(Story.created_at.desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        # Group by user
        user_map: dict[UUID, tuple[User, list[Story]]] = {}
        for story, user in rows:
            if user.id not in user_map:
                user_map[user.id] = (user, [])
            user_map[user.id][1].append(story)

        return list(user_map.values())
