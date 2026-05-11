import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFound
from app.models.saved_post import SavedPost
from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.saved_post_repository import SavedPostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.services.post_service import _build_response


async def save_post(
    db: AsyncSession,
    post_id: UUID,
    current_user: User,
) -> dict:
    """Save/bookmark a post. Idempotent — returns {saved: true}."""
    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise NotFound("Post")

    repo = SavedPostRepository(db)
    if not await repo.exists(current_user.id, post_id):
        saved = SavedPost(user_id=current_user.id, post_id=post_id)
        await repo.create(saved)

    return {"saved": True}


async def unsave_post(
    db: AsyncSession,
    post_id: UUID,
    current_user: User,
) -> dict:
    """Remove a saved/bookmarked post. Idempotent — returns {saved: false}."""
    repo = SavedPostRepository(db)
    await repo.delete(current_user.id, post_id)

    return {"saved": False}


async def list_saved_posts(
    db: AsyncSession,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[PostResponse]:
    """List the current user's saved posts, newest-saved first."""
    repo = SavedPostRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_by_user(current_user.id)
    posts = await repo.list_by_user(current_user.id, skip=skip, limit=page_size)

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

    # All these posts are saved by the current user
    items = [
        _build_response(
            p, authors.get(p.author_id),
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            liked_by_me=p.id in liked_set,
            saved_by_me=True,
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
