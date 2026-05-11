from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.services import saved_post_service

router = APIRouter()


@router.post("/posts/{post_id}/save", status_code=201)
async def save_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save/bookmark a post."""
    return await saved_post_service.save_post(db, post_id, current_user)


@router.delete("/posts/{post_id}/save")
async def unsave_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a saved/bookmarked post."""
    return await saved_post_service.unsave_post(db, post_id, current_user)


@router.get("/users/me/saved-posts", response_model=PaginatedResponse[PostResponse])
async def list_saved_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's saved posts, newest-saved first."""
    return await saved_post_service.list_saved_posts(
        db, current_user, page=page, page_size=page_size,
    )
