"""
Trending service — lightweight scoring for posts, communities, and jobs.

All scoring uses SQL-computed values, no ML or external engines.

Scoring formulas:
  Posts:        (likes * 3) + (comments * 2) + (saves) - (age_hours / 4)
  Communities:  (members) + (posts_7d * 2) + (new_members_7d * 3)
  Jobs:         (applications * 3) + (saves * 2) - (age_hours / 6)
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.community import Community, CommunityMember
from app.models.job_application import JobApplication
from app.models.job_post import JobPost
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.saved_job import SavedJob
from app.models.saved_post import SavedPost
from app.models.user import User
from app.schemas.post import PostAuthorSummary
from app.schemas.trending import (
    TrendingCommunityItem,
    TrendingJobItem,
    TrendingPostItem,
)


# ── Trending Posts ──────────────────────────────────────────


async def get_trending_posts(
    db: AsyncSession,
    *,
    limit: int = 10,
    days: int = 7,
) -> list[TrendingPostItem]:
    """Top posts ranked by engagement with recency decay.

    score = (likes * 3) + (comments * 2) + (saves) - (age_hours / 4)
    Restricted to non-deleted posts in public communities from the last N days.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    like_sub = (
        select(PostLike.post_id, func.count().label("like_cnt"))
        .group_by(PostLike.post_id)
    ).subquery()

    comment_sub = (
        select(Comment.post_id, func.count().label("comment_cnt"))
        .where(Comment.is_deleted == False)  # noqa: E712
        .group_by(Comment.post_id)
    ).subquery()

    save_sub = (
        select(SavedPost.post_id, func.count().label("save_cnt"))
        .group_by(SavedPost.post_id)
    ).subquery()

    age_hours = func.extract("epoch", func.now() - Post.created_at) / 3600

    score = (
        func.coalesce(like_sub.c.like_cnt, 0) * 3
        + func.coalesce(comment_sub.c.comment_cnt, 0) * 2
        + func.coalesce(save_sub.c.save_cnt, 0)
        - age_hours / 4
    ).label("trending_score")

    stmt = (
        select(
            Post,
            func.coalesce(like_sub.c.like_cnt, 0).label("like_count"),
            func.coalesce(comment_sub.c.comment_cnt, 0).label("comment_count"),
            func.coalesce(save_sub.c.save_cnt, 0).label("save_count"),
            score,
        )
        .join(Community, Community.id == Post.community_id)
        .outerjoin(like_sub, like_sub.c.post_id == Post.id)
        .outerjoin(comment_sub, comment_sub.c.post_id == Post.id)
        .outerjoin(save_sub, save_sub.c.post_id == Post.id)
        .where(
            Post.is_deleted == False,  # noqa: E712
            Community.is_deleted == False,  # noqa: E712
            Community.is_public == True,  # noqa: E712
            Post.created_at >= cutoff,
        )
        .order_by(score.desc(), Post.id.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Batch-load authors
    author_ids = {row[0].author_id for row in rows}
    author_map: dict[UUID, User] = {}
    for aid in author_ids:
        u = await db.get(User, aid)
        if u:
            author_map[aid] = u

    items: list[TrendingPostItem] = []
    for post, like_count, comment_count, save_count, tscore in rows:
        author = author_map.get(post.author_id)
        items.append(
            TrendingPostItem(
                id=post.id,
                community_id=post.community_id,
                author=PostAuthorSummary(
                    id=author.id if author else post.author_id,
                    username=author.username if author else "deleted",
                    full_name=author.full_name if author else "deleted",
                    profile_image_url=author.profile_image_url if author else None,
                ),
                content=post.content or "",
                image_url=post.image_url,
                post_type=post.post_type,
                like_count=like_count,
                comment_count=comment_count,
                save_count=save_count,
                trending_score=round(float(tscore), 2) if tscore else 0.0,
                created_at=post.created_at,
            )
        )

    return items


# ── Trending Communities ────────────────────────────────────


async def get_trending_communities(
    db: AsyncSession,
    *,
    current_user_id: UUID | None = None,
    limit: int = 10,
    activity_days: int = 7,
) -> list[TrendingCommunityItem]:
    """Top communities ranked by growth and activity.

    score = (members) + (posts_7d * 2) + (new_members_7d * 3)
    Only non-deleted, public communities.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=activity_days)

    member_sub = (
        select(
            CommunityMember.community_id,
            func.count().label("member_cnt"),
        )
        .group_by(CommunityMember.community_id)
    ).subquery()

    new_member_sub = (
        select(
            CommunityMember.community_id,
            func.count().label("new_member_cnt"),
        )
        .where(CommunityMember.joined_at >= cutoff)
        .group_by(CommunityMember.community_id)
    ).subquery()

    posts_sub = (
        select(
            Post.community_id,
            func.count().label("post_cnt"),
        )
        .where(
            Post.is_deleted == False,  # noqa: E712
            Post.created_at >= cutoff,
        )
        .group_by(Post.community_id)
    ).subquery()

    score = (
        func.coalesce(member_sub.c.member_cnt, 0)
        + func.coalesce(posts_sub.c.post_cnt, 0) * 2
        + func.coalesce(new_member_sub.c.new_member_cnt, 0) * 3
    ).label("trending_score")

    stmt = (
        select(
            Community,
            func.coalesce(member_sub.c.member_cnt, 0).label("member_count"),
            func.coalesce(posts_sub.c.post_cnt, 0).label("posts_this_week"),
            func.coalesce(new_member_sub.c.new_member_cnt, 0).label("new_members_this_week"),
            score,
        )
        .outerjoin(member_sub, member_sub.c.community_id == Community.id)
        .outerjoin(new_member_sub, new_member_sub.c.community_id == Community.id)
        .outerjoin(posts_sub, posts_sub.c.community_id == Community.id)
        .where(
            Community.is_deleted == False,  # noqa: E712
            Community.is_public == True,  # noqa: E712
        )
        .order_by(score.desc(), Community.id.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Check membership if user provided
    joined_ids: set[UUID] = set()
    if current_user_id:
        comm_ids = [row[0].id for row in rows]
        if comm_ids:
            mem_stmt = (
                select(CommunityMember.community_id)
                .where(
                    CommunityMember.user_id == current_user_id,
                    CommunityMember.community_id.in_(comm_ids),
                )
            )
            mem_result = await db.execute(mem_stmt)
            joined_ids = {r[0] for r in mem_result.all()}

    items: list[TrendingCommunityItem] = []
    for comm, member_count, posts_week, new_members_week, tscore in rows:
        items.append(
            TrendingCommunityItem(
                id=comm.id,
                name=comm.name,
                description=comm.description,
                member_count=member_count,
                posts_this_week=posts_week,
                new_members_this_week=new_members_week,
                trending_score=round(float(tscore), 2) if tscore else 0.0,
                is_member=(comm.id in joined_ids) if current_user_id else None,
                created_at=comm.created_at,
            )
        )

    return items


# ── Trending Jobs ───────────────────────────────────────────


async def get_trending_jobs(
    db: AsyncSession,
    *,
    limit: int = 10,
    days: int = 14,
) -> list[TrendingJobItem]:
    """Top jobs ranked by interest signals.

    score = (applications * 3) + (saves * 2) - (age_hours / 6)
    Only active jobs from the last N days.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    app_sub = (
        select(
            JobApplication.job_id,
            func.count().label("app_cnt"),
        )
        .group_by(JobApplication.job_id)
    ).subquery()

    save_sub = (
        select(
            SavedJob.job_id,
            func.count().label("save_cnt"),
        )
        .group_by(SavedJob.job_id)
    ).subquery()

    age_hours = func.extract("epoch", func.now() - JobPost.created_at) / 3600

    score = (
        func.coalesce(app_sub.c.app_cnt, 0) * 3
        + func.coalesce(save_sub.c.save_cnt, 0) * 2
        - age_hours / 6
    ).label("trending_score")

    stmt = (
        select(
            JobPost,
            func.coalesce(app_sub.c.app_cnt, 0).label("application_count"),
            func.coalesce(save_sub.c.save_cnt, 0).label("save_count"),
            score,
        )
        .outerjoin(app_sub, app_sub.c.job_id == JobPost.id)
        .outerjoin(save_sub, save_sub.c.job_id == JobPost.id)
        .where(
            JobPost.is_active == True,  # noqa: E712
            JobPost.created_at >= cutoff,
        )
        .order_by(score.desc(), JobPost.id.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Batch-load authors
    author_ids = {row[0].author_id for row in rows}
    author_map: dict[UUID, str] = {}
    for aid in author_ids:
        u = await db.get(User, aid)
        if u:
            author_map[aid] = u.username

    items: list[TrendingJobItem] = []
    for job, app_count, save_count, tscore in rows:
        items.append(
            TrendingJobItem(
                id=job.id,
                title=job.title,
                company_name=job.company_name,
                location=job.location,
                job_type=job.job_type,
                author_username=author_map.get(job.author_id, "deleted"),
                application_count=app_count,
                save_count=save_count,
                trending_score=round(float(tscore), 2) if tscore else 0.0,
                created_at=job.created_at,
            )
        )

    return items
