from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_verified_user
from app.models.user import User
from app.schemas.repost import RepostToggleResponse
from app.services import repost_service

router = APIRouter()


@router.post("/posts/{post_id}/repost", response_model=RepostToggleResponse)
async def toggle_repost(
    post_id: UUID,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle repost on a post. Repost if not reposted, un-repost if already reposted."""
    return await repost_service.toggle_repost(db, post_id, current_user)
