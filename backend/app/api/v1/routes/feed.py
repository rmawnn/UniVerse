from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.services import feed_service

router = APIRouter()


@router.get("/feed", response_model=PaginatedResponse[PostResponse])
async def get_home_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Home timeline: posts from all communities the user has joined, newest first."""
    return await feed_service.get_home_feed(
        db, current_user, page=page, page_size=page_size,
    )
