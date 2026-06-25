from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import RateLimiter
from app.models.user import User
from app.schemas.search import UnifiedSearchResponse
from app.services import search_service

router = APIRouter()


@router.get("/search", response_model=UnifiedSearchResponse)
async def search(
    q: str = Query(..., min_length=2, max_length=200),
    page_size: int = Query(6, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=30, window_seconds=60, prefix="search")),
):
    """Unified search across users, communities, posts, and jobs. Rate limited: 30/min."""
    return await search_service.unified_search(
        db,
        q,
        current_user_id=current_user.id,
        limit_per_type=page_size,
    )
