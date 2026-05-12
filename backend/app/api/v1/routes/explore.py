from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_optional
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.community import ExploreCommunityResponse
from app.schemas.explore import ExploreResponse
from app.services import community_service, explore_service

router = APIRouter()


@router.get(
    "/explore",
    response_model=ExploreResponse,
)
async def explore(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Combined explore page: trending posts, suggested communities & users."""
    return await explore_service.get_explore(db, current_user=current_user)


@router.get(
    "/explore/communities",
    response_model=PaginatedResponse[ExploreCommunityResponse],
)
async def explore_communities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Trending communities ranked by members + recent activity."""
    return await community_service.explore_communities(
        db, current_user=current_user, page=page, page_size=page_size,
    )
