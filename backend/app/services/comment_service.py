import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import Forbidden, NotFound
from app.models.comment import Comment
from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.comment import CommentCreateRequest, CommentResponse
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostAuthorSummary


async def create_comment(
    db: AsyncSession,
    post_id: UUID,
    current_user: User,
    data: CommentCreateRequest,
) -> CommentResponse:
    """
    Create a comment on a post.

    Rules:
      - Post must exist (and not be deleted)
      - User must be a member of the post's community
    """
    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise NotFound("Post")

    community_repo = CommunityRepository(db)
    if not await community_repo.is_member(post.community_id, current_user.id):
        raise Forbidden("You must be a member of the community to comment")

    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        content=data.content,
    )
    comment_repo = CommentRepository(db)
    comment = await comment_repo.create(comment)

    return _build_response(comment, current_user)


async def list_comments(
    db: AsyncSession,
    post_id: UUID,
    *,
    page: int = 1,
    page_size: int = 50,
) -> PaginatedResponse[CommentResponse]:
    """List comments for a post, oldest first."""
    post_repo = PostRepository(db)
    if not await post_repo.get_by_id(post_id):
        raise NotFound("Post")

    comment_repo = CommentRepository(db)
    skip = (page - 1) * page_size

    total = await comment_repo.count_by_post(post_id)
    comments = await comment_repo.list_by_post(post_id, skip=skip, limit=page_size)

    # Batch-load authors
    user_repo = UserRepository(db)
    author_ids = {c.author_id for c in comments}
    authors: dict[UUID, User] = {}
    for aid in author_ids:
        user = await user_repo.get_by_id(aid)
        if user:
            authors[aid] = user

    items = [_build_response(c, authors.get(c.author_id)) for c in comments]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


def _build_response(comment: Comment, author: User | None) -> CommentResponse:
    """Build a CommentResponse with embedded author summary."""
    author_summary = PostAuthorSummary(
        id=author.id,
        username=author.username,
        full_name=author.full_name,
        profile_image_url=author.profile_image_url,
    ) if author else PostAuthorSummary(
        id=comment.author_id,
        username="[deleted]",
        full_name="Deleted User",
        profile_image_url=None,
    )

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        author=author_summary,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )
