from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_optional, require_verified_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostCreateRequest, PostResponse
from app.services import post_service

router = APIRouter()


@router.post(
    "/communities/{community_id}/posts",
    response_model=PostResponse,
    status_code=201,
)
async def create_post(
    community_id: UUID,
    data: PostCreateRequest,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a post inside a community. Requires verified member."""
    return await post_service.create_post(db, community_id, current_user, data)


@router.get(
    "/communities/{community_id}/posts",
    response_model=PaginatedResponse[PostResponse],
)
async def list_community_posts(
    community_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """List posts in a community, newest first (public). Shows liked_by_me if authenticated."""
    return await post_service.list_posts(
        db, community_id, page=page, page_size=page_size, current_user=current_user,
    )


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get a single post by ID (public). Shows liked_by_me if authenticated."""
    return await post_service.get_post(db, post_id, current_user)
