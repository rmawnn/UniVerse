from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post


class PostRepository:
    """Database access for Post entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, post: Post) -> Post:
        self.db.add(post)
        await self.db.flush()
        await self.db.refresh(post)
        return post

    async def get_by_id(self, post_id: UUID) -> Post | None:
        stmt = select(Post).where(Post.id == post_id, Post.is_deleted == False)  # noqa: E712
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_community(
        self, community_id: UUID, *, skip: int = 0, limit: int = 20,
    ) -> list[Post]:
        stmt = (
            select(Post)
            .where(Post.community_id == community_id, Post.is_deleted == False)  # noqa: E712
            .order_by(Post.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_community(self, community_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Post)
            .where(Post.community_id == community_id, Post.is_deleted == False)  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def list_by_communities(
        self, community_ids: list[UUID], *, skip: int = 0, limit: int = 20,
    ) -> list[Post]:
        """Fetch posts from multiple communities, newest first (for feed)."""
        if not community_ids:
            return []
        stmt = (
            select(Post)
            .where(
                Post.community_id.in_(community_ids),
                Post.is_deleted == False,  # noqa: E712
            )
            .order_by(Post.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_communities(self, community_ids: list[UUID]) -> int:
        """Count non-deleted posts across multiple communities."""
        if not community_ids:
            return 0
        stmt = (
            select(func.count())
            .select_from(Post)
            .where(
                Post.community_id.in_(community_ids),
                Post.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
