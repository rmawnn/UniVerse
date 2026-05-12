from uuid import UUID

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.post import Post
from app.models.post_like import PostLike


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

    async def list_by_author(
        self, author_id: UUID, *, skip: int = 0, limit: int = 20,
    ) -> list[Post]:
        """Fetch posts created by a specific user, newest first."""
        stmt = (
            select(Post)
            .where(Post.author_id == author_id, Post.is_deleted == False)  # noqa: E712
            .order_by(Post.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_author(self, author_id: UUID) -> int:
        """Count non-deleted posts created by a specific user."""
        stmt = (
            select(func.count())
            .select_from(Post)
            .where(Post.author_id == author_id, Post.is_deleted == False)  # noqa: E712
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

    async def list_by_communities_ranked(
        self, community_ids: list[UUID], *, skip: int = 0, limit: int = 20,
    ) -> list[Post]:
        """Fetch posts from multiple communities, ranked by engagement.

        Score = (likes * 2) + comments - (age_in_hours / 6)
        Higher score = shown first. Recent posts with no engagement still
        appear near the top because their age penalty is small.
        """
        if not community_ids:
            return []

        # Subquery: like counts per post
        like_counts = (
            select(
                PostLike.post_id,
                func.count().label("like_cnt"),
            )
            .group_by(PostLike.post_id)
        ).subquery()

        # Subquery: comment counts per post (non-deleted)
        comment_counts = (
            select(
                Comment.post_id,
                func.count().label("comment_cnt"),
            )
            .where(Comment.is_deleted == False)  # noqa: E712
            .group_by(Comment.post_id)
        ).subquery()

        # Age in hours: extract(epoch from now() - created_at) / 3600
        age_hours = func.extract(
            "epoch", func.now() - Post.created_at
        ) / 3600

        score = (
            func.coalesce(like_counts.c.like_cnt, 0) * 2
            + func.coalesce(comment_counts.c.comment_cnt, 0)
            - age_hours / 6
        )

        stmt = (
            select(Post)
            .outerjoin(like_counts, like_counts.c.post_id == Post.id)
            .outerjoin(comment_counts, comment_counts.c.post_id == Post.id)
            .where(
                Post.community_id.in_(community_ids),
                Post.is_deleted == False,  # noqa: E712
            )
            .order_by(score.desc())
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

    async def list_all_admin(self, *, skip: int = 0, limit: int = 50) -> list[Post]:
        stmt = (
            select(Post)
            .order_by(Post.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_all_admin(self) -> int:
        stmt = select(func.count()).select_from(Post)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_by_id_admin(self, post_id: UUID) -> Post | None:
        """Get post by ID including deleted (for admin)."""
        return await self.db.get(Post, post_id)

    async def list_trending(self, *, limit: int = 10) -> list[Post]:
        """Return globally trending posts ranked by engagement.

        Score = (likes * 2) + comments - (age_in_hours / 6)
        Only non-deleted posts from non-deleted, public communities.
        """
        from app.models.community import Community

        like_counts = (
            select(
                PostLike.post_id,
                func.count().label("like_cnt"),
            )
            .group_by(PostLike.post_id)
        ).subquery()

        comment_counts = (
            select(
                Comment.post_id,
                func.count().label("comment_cnt"),
            )
            .where(Comment.is_deleted == False)  # noqa: E712
            .group_by(Comment.post_id)
        ).subquery()

        age_hours = func.extract("epoch", func.now() - Post.created_at) / 3600

        score = (
            func.coalesce(like_counts.c.like_cnt, 0) * 2
            + func.coalesce(comment_counts.c.comment_cnt, 0)
            - age_hours / 6
        )

        stmt = (
            select(Post)
            .join(Community, Community.id == Post.community_id)
            .outerjoin(like_counts, like_counts.c.post_id == Post.id)
            .outerjoin(comment_counts, comment_counts.c.post_id == Post.id)
            .where(
                Post.is_deleted == False,  # noqa: E712
                Community.is_deleted == False,  # noqa: E712
                Community.is_public == True,  # noqa: E712
            )
            .order_by(score.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def set_deleted(self, post: Post, is_deleted: bool) -> Post:
        post.is_deleted = is_deleted
        await self.db.flush()
        await self.db.refresh(post)
        return post
