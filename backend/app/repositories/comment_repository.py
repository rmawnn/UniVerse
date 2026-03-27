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

    async def list_by_post(
        self, post_id: UUID, *, skip: int = 0, limit: int = 50,
    ) -> list[Comment]:
        stmt = (
            select(Comment)
            .where(Comment.post_id == post_id, Comment.is_deleted == False)  # noqa: E712
            .order_by(Comment.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_post(self, post_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Comment)
            .where(Comment.post_id == post_id, Comment.is_deleted == False)  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
