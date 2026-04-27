import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.services.post_service import _build_response


async def get_home_feed(
    db: AsyncSession,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[PostResponse]:
    """
    Home timeline: posts from all communities the user has joined,
    newest first.

    Returns an empty paginated response if the user hasn't joined
    any communities yet.
    """
    community_repo = CommunityRepository(db)
    community_ids = await community_repo.get_joined_ids(current_user.id)

    if not community_ids:
        return PaginatedResponse(
            items=[], total=0, page=page, page_size=page_size, total_pages=0,
        )

    post_repo = PostRepository(db)
    skip = (page - 1) * page_size

    total = await post_repo.count_by_communities(community_ids)
    posts = await post_repo.list_by_communities_ranked(community_ids, skip=skip, limit=page_size)

    if not posts:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load authors
    user_repo = UserRepository(db)
    author_ids = {p.author_id for p in posts}
    authors: dict[UUID, User] = {}
    for aid in author_ids:
        user = await user_repo.get_by_id(aid)
        if user:
            authors[aid] = user

    # Batch-load like counts, comment counts, and user's likes
    post_ids = [p.id for p in posts]
    like_repo = PostLikeRepository(db)
    like_counts = await like_repo.count_by_posts(post_ids)
    comment_repo = CommentRepository(db)
    comment_counts = await comment_repo.count_by_posts(post_ids)
    liked_set = await like_repo.liked_by_user(post_ids, current_user.id)

    items = [
        _build_response(
            p, authors.get(p.author_id),
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            liked_by_me=p.id in liked_set,
        )
        for p in posts
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )
