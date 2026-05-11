from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment


class CommentRepository:
    """Database access for Comment entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, comment: Comment) -> Comment:
        self.db.add(comment)
        await self.db.flush()
        await self.db.refresh(comment)
        return comment

    async def get_by_id(self, comment_id: UUID) -> Comment | None:
        stmt = select(Comment).where(
            Comment.id == comment_id,
            Comment.is_deleted == False,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_top_level_by_post(
        self, post_id: UUID, *, skip: int = 0, limit: int = 50,
    ) -> list[Comment]:
        """List only top-level comments (no parent) for a post."""
        stmt = (
            select(Comment)
            .where(
                Comment.post_id == post_id,
                Comment.is_deleted == False,  # noqa: E712
                Comment.parent_comment_id == None,  # noqa: E711
            )
            .order_by(Comment.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_top_level_by_post(self, post_id: UUID) -> int:
        """Count only top-level comments for a post."""
        stmt = (
            select(func.count())
            .select_from(Comment)
            .where(
                Comment.post_id == post_id,
                Comment.is_deleted == False,  # noqa: E712
                Comment.parent_comment_id == None,  # noqa: E711
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def list_replies(
        self, parent_ids: list[UUID],
    ) -> list[Comment]:
        """List all replies for the given parent comment IDs."""
        if not parent_ids:
            return []
        stmt = (
            select(Comment)
            .where(
                Comment.parent_comment_id.in_(parent_ids),
                Comment.is_deleted == False,  # noqa: E712
            )
            .order_by(Comment.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_replies(self, parent_ids: list[UUID]) -> dict[UUID, int]:
        """Batch count replies for multiple parent comments."""
        if not parent_ids:
            return {}
        stmt = (
            select(Comment.parent_comment_id, func.count())
            .where(
                Comment.parent_comment_id.in_(parent_ids),
                Comment.is_deleted == False,  # noqa: E712
            )
            .group_by(Comment.parent_comment_id)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        return {pid: counts.get(pid, 0) for pid in parent_ids}

    async def count_by_post(self, post_id: UUID) -> int:
        """Count ALL comments (top-level + replies) for a post."""
        stmt = (
            select(func.count())
            .select_from(Comment)
            .where(Comment.post_id == post_id, Comment.is_deleted == False)  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_by_posts(self, post_ids: list[UUID]) -> dict[UUID, int]:
        """Batch count comments for multiple posts. Returns {post_id: count}."""
        if not post_ids:
            return {}
        stmt = (
            select(Comment.post_id, func.count())
            .where(
                Comment.post_id.in_(post_ids),
                Comment.is_deleted == False,  # noqa: E712
            )
            .group_by(Comment.post_id)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        return {pid: counts.get(pid, 0) for pid in post_ids}
