from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.community import Community, CommunityMember
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.user import User
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.search import (
    SearchCommunityItem,
    SearchJobItem,
    SearchPostItem,
    SearchUserItem,
    UnifiedSearchResponse,
)


async def unified_search(
    db: AsyncSession,
    query: str,
    *,
    current_user_id: UUID | None = None,
    limit_per_type: int = 5,
) -> UnifiedSearchResponse:
    """Search across all content types, returning top results from each."""

    user_repo = UserRepository(db)
    comm_repo = CommunityRepository(db)
    post_repo = PostRepository(db)

    # ── Users ──────────────────────────────────────────────
    users_raw = await user_repo.search(
        query,
        exclude_user_id=current_user_id,
        skip=0,
        limit=limit_per_type,
    )
    users_total = await user_repo.count_search(query, exclude_user_id=current_user_id)
    users = [
        SearchUserItem(
            id=u.id,
            username=u.username,
            full_name=u.full_name,
            profile_image_url=u.profile_image_url,
            is_verified_student=u.is_verified_student,
        )
        for u in users_raw
    ]

    # ── Communities ────────────────────────────────────────
    comms_raw = await comm_repo.search(query, skip=0, limit=limit_per_type)
    comms_total = await comm_repo.count_search(query)

    # Batch-load membership status
    comm_ids = [c.id for c in comms_raw]
    member_counts = await comm_repo.member_counts_batch(comm_ids) if comm_ids else {}
    membership_set: set[UUID] = set()
    if current_user_id and comm_ids:
        mem_stmt = (
            select(CommunityMember.community_id)
            .where(
                CommunityMember.user_id == current_user_id,
                CommunityMember.community_id.in_(comm_ids),
            )
        )
        mem_result = await db.execute(mem_stmt)
        membership_set = {row[0] for row in mem_result.all()}

    communities = [
        SearchCommunityItem(
            id=c.id,
            name=c.name,
            description=c.description,
            member_count=member_counts.get(c.id, 0),
            is_member=c.id in membership_set if current_user_id else None,
        )
        for c in comms_raw
    ]

    # ── Posts ──────────────────────────────────────────────
    posts_raw = await post_repo.search(query, skip=0, limit=limit_per_type)
    posts_total = await post_repo.count_search(query)

    # Batch-load authors and communities for posts
    author_ids = {p.author_id for p in posts_raw}
    community_ids = {p.community_id for p in posts_raw}

    author_map: dict[UUID, User] = {}
    for aid in author_ids:
        u = await db.get(User, aid)
        if u:
            author_map[aid] = u

    comm_map: dict[UUID, Community] = {}
    for cid in community_ids:
        c = await db.get(Community, cid)
        if c:
            comm_map[cid] = c

    # Batch-load like and comment counts
    like_counts: dict[UUID, int] = {}
    comment_counts: dict[UUID, int] = {}
    post_ids = [p.id for p in posts_raw]
    if post_ids:
        lk_stmt = (
            select(PostLike.post_id, func.count())
            .where(PostLike.post_id.in_(post_ids))
            .group_by(PostLike.post_id)
        )
        lk_result = await db.execute(lk_stmt)
        like_counts = {row[0]: row[1] for row in lk_result.all()}

        cm_stmt = (
            select(Comment.post_id, func.count())
            .where(
                Comment.post_id.in_(post_ids),
                Comment.is_deleted == False,  # noqa: E712
            )
            .group_by(Comment.post_id)
        )
        cm_result = await db.execute(cm_stmt)
        comment_counts = {row[0]: row[1] for row in cm_result.all()}

    posts = [
        SearchPostItem(
            id=p.id,
            author_username=author_map[p.author_id].username if p.author_id in author_map else "deleted",
            author_full_name=author_map[p.author_id].full_name if p.author_id in author_map else "deleted",
            community_name=comm_map[p.community_id].name if p.community_id in comm_map else "deleted",
            content_preview=(p.content or "")[:120],
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            created_at=p.created_at,
        )
        for p in posts_raw
    ]

    # ── Jobs ──────────────────────────────────────────────
    from app.models.job_post import JobPost
    from app.repositories.job_repository import JobRepository

    job_repo = JobRepository(db)
    jobs_raw = await job_repo.list_jobs(
        skip=0, limit=limit_per_type, active_only=True, q=query,
    )
    jobs_total = await job_repo.count_jobs(active_only=True, q=query)

    jobs = [
        SearchJobItem(
            id=j.id,
            title=j.title,
            company_name=j.company_name,
            location=j.location,
            job_type=j.job_type,
            is_active=j.is_active,
            created_at=j.created_at,
        )
        for j in jobs_raw
    ]

    return UnifiedSearchResponse(
        users=users,
        communities=communities,
        posts=posts,
        jobs=jobs,
        users_total=users_total,
        communities_total=comms_total,
        posts_total=posts_total,
        jobs_total=jobs_total,
    )
