from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_verified_user
from app.core.rate_limit import RateLimiter
from app.models.user import User
from app.schemas.comment import CommentCreateRequest, CommentResponse
from app.schemas.common import PaginatedResponse
from app.services import comment_service

router = APIRouter()


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=201,
)
async def create_comment(
    post_id: UUID,
    data: CommentCreateRequest,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=20, window_seconds=300, prefix="comment:create")),
):
    """Create a comment on a post. Rate limited: 20 per 5 min."""
    return await comment_service.create_comment(db, post_id, current_user, data)


@router.get(
    "/posts/{post_id}/comments",
    response_model=PaginatedResponse[CommentResponse],
)
async def list_post_comments(
    post_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List comments on a post, oldest first (public)."""
    return await comment_service.list_comments(
        db, post_id, page=page, page_size=page_size,
    )
