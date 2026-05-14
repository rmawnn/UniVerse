from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post_like import PostLike


class PostLikeRepository:
    """Database access for PostLike entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_like(self, post_id: UUID, user_id: UUID) -> PostLike | None:
        return await self.db.get(PostLike, (user_id, post_id))

    async def create_like(self, post_id: UUID, user_id: UUID) -> PostLike:
        like = PostLike(user_id=user_id, post_id=post_id)
        self.db.add(like)
        await self.db.flush()
        return like

    async def delete_like(self, post_id: UUID, user_id: UUID) -> None:
        stmt = delete(PostLike).where(
            PostLike.user_id == user_id,
            PostLike.post_id == post_id,
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def count_by_post(self, post_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(PostLike)
            .where(PostLike.post_id == post_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_by_posts(self, post_ids: list[UUID]) -> dict[UUID, int]:
        """Batch count likes for multiple posts. Returns {post_id: count}."""
        if not post_ids:
            return {}
        stmt = (
            select(PostLike.post_id, func.count())
            .where(PostLike.post_id.in_(post_ids))
            .group_by(PostLike.post_id)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        # Fill in zeros for posts with no likes
        return {pid: counts.get(pid, 0) for pid in post_ids}

    async def count_received_by_author(self, author_id: UUID) -> int:
        """Count total likes received on all non-deleted posts by an author."""
        from app.models.post import Post

        stmt = (
            select(func.count())
            .select_from(PostLike)
            .join(Post, Post.id == PostLike.post_id)
            .where(Post.author_id == author_id, Post.is_deleted == False)  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def author_affinity(
        self, user_id: UUID, author_ids: set[UUID],
    ) -> dict[UUID, int]:
        """Count how many posts by each author the user has liked.

        Returns {author_id: like_count} — only authors with > 0 likes.
        """
        if not author_ids:
            return {}
        from app.models.post import Post

        stmt = (
            select(Post.author_id, func.count())
            .select_from(PostLike)
            .join(Post, Post.id == PostLike.post_id)
            .where(
                PostLike.user_id == user_id,
                Post.author_id.in_(author_ids),
            )
            .group_by(Post.author_id)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def community_affinity(
        self, user_id: UUID, community_ids: list[UUID],
    ) -> dict[UUID, int]:
        """Count how many posts in each community the user has liked.

        Returns {community_id: like_count} — only communities with > 0 likes.
        """
        if not community_ids:
            return {}
        from app.models.post import Post

        stmt = (
            select(Post.community_id, func.count())
            .select_from(PostLike)
            .join(Post, Post.id == PostLike.post_id)
            .where(
                PostLike.user_id == user_id,
                Post.community_id.in_(community_ids),
            )
            .group_by(Post.community_id)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def liked_by_user(self, post_ids: list[UUID], user_id: UUID) -> set[UUID]:
        """Return the set of post_ids the user has liked (batch)."""
        if not post_ids:
            return set()
        stmt = (
            select(PostLike.post_id)
            .where(PostLike.post_id.in_(post_ids), PostLike.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result.all()}
