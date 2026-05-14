import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.post import Post
from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.saved_post_repository import SavedPostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostAuthorSummary, PostCreateRequest, PostResponse


SHORTS_DAILY_LIMIT = 10


async def create_post(
    db: AsyncSession,
    community_id: UUID,
    current_user: User,
    data: PostCreateRequest,
) -> PostResponse:
    """
    Create a post inside a community.

    Rules:
      - Community must exist
      - User must be a member of the community
      - Short posts: max 10 per user per 24 hours
      - Short posts require a video_url
    """
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    post_repo = PostRepository(db)

    # Short-specific validation
    if data.post_type == "short":
        if not data.video_url:
            raise BadRequest("Short posts require a video")
        today_count = await post_repo.count_shorts_by_author_today(current_user.id)
        if today_count >= SHORTS_DAILY_LIMIT:
            raise BadRequest(
                f"You can create up to {SHORTS_DAILY_LIMIT} shorts per day. "
                f"Try again tomorrow."
            )

    community_repo = CommunityRepository(db)

    community = await community_repo.get_by_id(community_id)
    if not community:
        raise NotFound("Community")

    if not await community_repo.is_member(community_id, current_user.id):
        raise Forbidden("You must be a member of this community to post")

    post = Post(
        community_id=community_id,
        author_id=current_user.id,
        content=data.content,
        image_url=data.image_url,
        video_url=data.video_url,
        post_type=data.post_type,
    )
    post = await post_repo.create(post)

    # New post has 0 likes, not liked or saved yet
    return _build_response(post, current_user, like_count=0, liked_by_me=False, saved_by_me=False)


async def get_post(
    db: AsyncSession,
    post_id: UUID,
    current_user: User | None = None,
) -> PostResponse:
    """Get a single post by ID with like context."""
    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)

    if not post:
        raise NotFound("Post")

    user_repo = UserRepository(db)
    author = await user_repo.get_by_id(post.author_id)

    like_repo = PostLikeRepository(db)
    like_count = await like_repo.count_by_post(post_id)
    liked_by_me = False
    saved_by_me = False
    if current_user:
        liked_by_me = await like_repo.get_like(post_id, current_user.id) is not None
        save_repo = SavedPostRepository(db)
        saved_by_me = await save_repo.exists(current_user.id, post_id)

    comment_repo = CommentRepository(db)
    comment_count = await comment_repo.count_by_post(post_id)

    return _build_response(
        post, author,
        like_count=like_count, comment_count=comment_count,
        liked_by_me=liked_by_me, saved_by_me=saved_by_me,
    )


async def list_posts(
    db: AsyncSession,
    community_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = None,
) -> PaginatedResponse[PostResponse]:
    """List posts for a community, newest first, with like counts."""
    community_repo = CommunityRepository(db)
    if not await community_repo.get_by_id(community_id):
        raise NotFound("Community")

    post_repo = PostRepository(db)
    skip = (page - 1) * page_size

    total = await post_repo.count_by_community(community_id)
    posts = await post_repo.list_by_community(community_id, skip=skip, limit=page_size)

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

    # Batch-load like counts, comment counts, and user's likes/saves
    post_ids = [p.id for p in posts]
    like_repo = PostLikeRepository(db)
    like_counts = await like_repo.count_by_posts(post_ids)
    comment_repo = CommentRepository(db)
    comment_counts = await comment_repo.count_by_posts(post_ids)
    liked_set: set[UUID] = set()
    saved_set: set[UUID] = set()
    if current_user:
        liked_set = await like_repo.liked_by_user(post_ids, current_user.id)
        save_repo = SavedPostRepository(db)
        saved_set = await save_repo.saved_by_user(post_ids, current_user.id)

    items = [
        _build_response(
            p, authors.get(p.author_id),
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            liked_by_me=p.id in liked_set,
            saved_by_me=p.id in saved_set,
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


async def list_user_posts(
    db: AsyncSession,
    author_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    post_type: str | None = None,
    current_user: User | None = None,
) -> PaginatedResponse[PostResponse]:
    """List posts created by a specific user, newest first, with like counts."""
    post_repo = PostRepository(db)
    skip = (page - 1) * page_size

    total = await post_repo.count_by_author(author_id, post_type=post_type)
    posts = await post_repo.list_by_author(author_id, skip=skip, limit=page_size, post_type=post_type)

    if not posts:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load authors (likely just one user, but keeps pattern consistent)
    user_repo = UserRepository(db)
    author_ids = {p.author_id for p in posts}
    authors: dict[UUID, User] = {}
    for aid in author_ids:
        user = await user_repo.get_by_id(aid)
        if user:
            authors[aid] = user

    # Batch-load like counts, comment counts, and current user's likes/saves
    post_ids = [p.id for p in posts]
    like_repo = PostLikeRepository(db)
    like_counts = await like_repo.count_by_posts(post_ids)
    comment_repo = CommentRepository(db)
    comment_counts = await comment_repo.count_by_posts(post_ids)
    liked_set: set[UUID] = set()
    saved_set: set[UUID] = set()
    if current_user:
        liked_set = await like_repo.liked_by_user(post_ids, current_user.id)
        save_repo = SavedPostRepository(db)
        saved_set = await save_repo.saved_by_user(post_ids, current_user.id)

    items = [
        _build_response(
            p, authors.get(p.author_id),
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            liked_by_me=p.id in liked_set,
            saved_by_me=p.id in saved_set,
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


async def list_shorts(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = None,
) -> PaginatedResponse[PostResponse]:
    """List short-form video posts, newest first."""
    post_repo = PostRepository(db)
    skip = (page - 1) * page_size

    total = await post_repo.count_shorts()
    posts = await post_repo.list_shorts(skip=skip, limit=page_size)

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

    # Batch-load like counts, comment counts, and user's likes/saves
    post_ids = [p.id for p in posts]
    like_repo = PostLikeRepository(db)
    like_counts = await like_repo.count_by_posts(post_ids)
    comment_repo = CommentRepository(db)
    comment_counts = await comment_repo.count_by_posts(post_ids)
    liked_set: set[UUID] = set()
    saved_set: set[UUID] = set()
    if current_user:
        liked_set = await like_repo.liked_by_user(post_ids, current_user.id)
        save_repo = SavedPostRepository(db)
        saved_set = await save_repo.saved_by_user(post_ids, current_user.id)

    items = [
        _build_response(
            p, authors.get(p.author_id),
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            liked_by_me=p.id in liked_set,
            saved_by_me=p.id in saved_set,
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


def _build_response(
    post: Post,
    author: User | None,
    *,
    like_count: int = 0,
    comment_count: int = 0,
    liked_by_me: bool = False,
    saved_by_me: bool = False,
    feed_label: str | None = None,
    recommendation_score: float | None = None,
) -> PostResponse:
    """Build a PostResponse with embedded author summary, like, comment, and save data."""
    author_summary = PostAuthorSummary(
        id=author.id,
        username=author.username,
        full_name=author.full_name,
        profile_image_url=author.profile_image_url,
    ) if author else PostAuthorSummary(
        id=post.author_id,
        username="[deleted]",
        full_name="Deleted User",
        profile_image_url=None,
    )

    return PostResponse(
        id=post.id,
        community_id=post.community_id,
        author=author_summary,
        content=post.content,
        image_url=post.image_url,
        video_url=post.video_url,
        post_type=post.post_type,
        like_count=like_count,
        comment_count=comment_count,
        liked_by_me=liked_by_me,
        saved_by_me=saved_by_me,
        feed_label=feed_label,
        recommendation_score=recommendation_score,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )
