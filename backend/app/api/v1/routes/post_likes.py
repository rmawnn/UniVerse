from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_verified_user
from app.models.user import User
from app.schemas.post_like import PostLikeToggleResponse
from app.services import post_like_service

router = APIRouter()


@router.post("/posts/{post_id}/like", response_model=PostLikeToggleResponse)
async def toggle_post_like(
    post_id: UUID,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle like on a post. Like if not liked, unlike if already liked."""
    return await post_like_service.toggle_like(db, post_id, current_user)
