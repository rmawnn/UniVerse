import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.comment import Comment
from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_repository import PostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.comment import CommentCreateRequest, CommentResponse
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostAuthorSummary
from app.services import notification_service


async def create_comment(
    db: AsyncSession,
    post_id: UUID,
    current_user: User,
    data: CommentCreateRequest,
) -> CommentResponse:
    """
    Create a comment or reply on a post.

    Rules:
      - Post must exist (and not be deleted)
      - User must be a member of the post's community
      - If replying, parent must exist, belong to the same post,
        and must itself be a top-level comment (no nested replies)
    """
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise NotFound("Post")

    community_repo = CommunityRepository(db)
    if not await community_repo.is_member(post.community_id, current_user.id):
        raise Forbidden("You must be a member of the community to comment")

    comment_repo = CommentRepository(db)

    # Validate parent comment if this is a reply
    parent_comment = None
    if data.parent_comment_id:
        parent_comment = await comment_repo.get_by_id(data.parent_comment_id)
        if not parent_comment:
            raise NotFound("Parent comment")
        if parent_comment.post_id != post_id:
            raise BadRequest("Parent comment does not belong to this post")
        if parent_comment.parent_comment_id is not None:
            raise BadRequest("Cannot reply to a reply — only one level of nesting is allowed")

    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        parent_comment_id=data.parent_comment_id,
        content=data.content,
    )
    comment = await comment_repo.create(comment)

    # Notify post author (don't notify yourself)
    if post.author_id != current_user.id:
        await notification_service.notify(
            db,
            user_id=post.author_id,
            actor_id=current_user.id,
            type="comment",
            reference_id=post_id,
            content=f"{current_user.full_name} commented on your post",
        )

    # If this is a reply, also notify the parent comment author
    if parent_comment and parent_comment.author_id != current_user.id:
        # Don't double-notify if parent author is also the post author
        if parent_comment.author_id != post.author_id:
            await notification_service.notify(
                db,
                user_id=parent_comment.author_id,
                actor_id=current_user.id,
                type="comment",
                reference_id=post_id,
                content=f"{current_user.full_name} replied to your comment",
            )

    return _build_response(comment, current_user, reply_count=0)


async def list_comments(
    db: AsyncSession,
    post_id: UUID,
    *,
    page: int = 1,
    page_size: int = 50,
) -> PaginatedResponse[CommentResponse]:
    """List top-level comments for a post with their replies."""
    post_repo = PostRepository(db)
    if not await post_repo.get_by_id(post_id):
        raise NotFound("Post")

    comment_repo = CommentRepository(db)
    skip = (page - 1) * page_size

    total = await comment_repo.count_top_level_by_post(post_id)
    top_comments = await comment_repo.list_top_level_by_post(
        post_id, skip=skip, limit=page_size
    )

    # Batch-load replies for all top-level comments
    top_ids = [c.id for c in top_comments]
    all_replies = await comment_repo.list_replies(top_ids)
    reply_counts = await comment_repo.count_replies(top_ids)

    # Group replies by parent
    replies_by_parent: dict[UUID, list[Comment]] = {}
    for r in all_replies:
        replies_by_parent.setdefault(r.parent_comment_id, []).append(r)

    user_repo = UserRepository(db)
    all_author_ids = (
        {c.author_id for c in top_comments}
        | {r.author_id for r in all_replies}
    )
    authors = await user_repo.get_by_ids(all_author_ids) if all_author_ids else {}

    items = []
    for c in top_comments:
        parent_replies = replies_by_parent.get(c.id, [])
        reply_responses = [
            _build_response(r, authors.get(r.author_id), reply_count=0)
            for r in parent_replies
        ]
        resp = _build_response(
            c,
            authors.get(c.author_id),
            reply_count=reply_counts.get(c.id, 0),
            replies=reply_responses,
        )
        items.append(resp)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


def _build_response(
    comment: Comment,
    author: User | None,
    *,
    reply_count: int = 0,
    replies: list[CommentResponse] | None = None,
) -> CommentResponse:
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
        parent_comment_id=comment.parent_comment_id,
        reply_count=reply_count,
        replies=replies or [],
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )
