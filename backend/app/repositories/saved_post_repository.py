from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post
from app.models.saved_post import SavedPost


class SavedPostRepository:
    """Database access for SavedPost entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, saved: SavedPost) -> SavedPost:
        self.db.add(saved)
        await self.db.flush()
        return saved

    async def delete(self, user_id: UUID, post_id: UUID) -> bool:
        """Remove a saved post. Returns True if a row was deleted."""
        stmt = (
            delete(SavedPost)
            .where(SavedPost.user_id == user_id, SavedPost.post_id == post_id)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0

    async def exists(self, user_id: UUID, post_id: UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(SavedPost)
            .where(SavedPost.user_id == user_id, SavedPost.post_id == post_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one() > 0

    async def saved_by_user(
        self, post_ids: list[UUID], user_id: UUID,
    ) -> set[UUID]:
        """Return the set of post IDs that the user has saved (for batch enrichment)."""
        if not post_ids:
            return set()
        stmt = (
            select(SavedPost.post_id)
            .where(
                SavedPost.user_id == user_id,
                SavedPost.post_id.in_(post_ids),
            )
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result.all()}

    async def list_by_user(
        self, user_id: UUID, *, skip: int = 0, limit: int = 20,
    ) -> list[Post]:
        """Return saved posts for a user, newest-saved first."""
        stmt = (
            select(Post)
            .join(SavedPost, SavedPost.post_id == Post.id)
            .where(
                SavedPost.user_id == user_id,
                Post.is_deleted == False,  # noqa: E712
            )
            .order_by(SavedPost.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: UUID) -> int:
        """Count saved posts for a user (excluding deleted posts)."""
        stmt = (
            select(func.count())
            .select_from(SavedPost)
            .join(Post, Post.id == SavedPost.post_id)
            .where(
                SavedPost.user_id == user_id,
                Post.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
