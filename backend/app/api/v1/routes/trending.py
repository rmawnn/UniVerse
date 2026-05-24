from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_optional
from app.models.user import User
from app.schemas.trending import (
    TrendingCommunityItem,
    TrendingJobItem,
    TrendingPostItem,
)
from app.services import trending_service

router = APIRouter()


@router.get("/trending/posts", response_model=list[TrendingPostItem])
async def trending_posts(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """Top posts ranked by engagement with recency decay."""
    return await trending_service.get_trending_posts(db, limit=limit, days=days)


@router.get("/trending/communities", response_model=list[TrendingCommunityItem])
async def trending_communities(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(7, ge=1, le=30),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Top communities ranked by growth and activity."""
    return await trending_service.get_trending_communities(
        db,
        current_user_id=current_user.id if current_user else None,
        limit=limit,
        activity_days=days,
    )


@router.get("/trending/jobs", response_model=list[TrendingJobItem])
async def trending_jobs(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(14, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
):
    """Top jobs ranked by interest signals."""
    return await trending_service.get_trending_jobs(db, limit=limit, days=days)
