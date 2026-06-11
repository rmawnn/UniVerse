from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.recommendation import (
    CommunityRecommendationsResponse,
    JobMatchResponse,
)
from app.services.recommendation_service import get_community_recommendations
from app.services.job_matching_service import compute_job_match

router = APIRouter()


@router.get(
    "/ai/recommendations/communities",
    response_model=CommunityRecommendationsResponse,
)
async def recommend_communities(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-powered community recommendations based on user profile and activity."""
    results = await get_community_recommendations(db, current_user, limit=limit)
    return CommunityRecommendationsResponse(recommendations=results)


@router.get(
    "/jobs/{job_id}/match",
    response_model=JobMatchResponse,
)
async def get_job_match(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-powered job match score based on student profile and activity."""
    return await compute_job_match(db, current_user, job_id)
