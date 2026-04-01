from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user_optional, require_verified_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.community import (
    CommunityCreateRequest,
    CommunityDetailResponse,
    CommunityResponse,
    CommunitySearchResponse,
)
from app.services import community_service

router = APIRouter()


@router.post("", response_model=CommunityDetailResponse, status_code=201)
async def create_community(
    data: CommunityCreateRequest,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new community. Requires verified student."""
    return await community_service.create_community(db, current_user, data)


@router.get("/search", response_model=PaginatedResponse[CommunitySearchResponse])
async def search_communities(
    q: str = Query(..., min_length=2, max_length=100),
    university_id: UUID | None = Query(None, description="Optional university filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Search communities by name or description. Public, with membership context if authenticated."""
    return await community_service.search_communities(
        db, q, university_id=university_id, current_user=current_user,
        page=page, page_size=page_size,
    )


@router.get("", response_model=PaginatedResponse[CommunityResponse])
async def list_communities(
    university_id: UUID = Query(..., description="Filter by university"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List communities for a university (public)."""
    return await community_service.list_communities(
        db, university_id, page=page, page_size=page_size,
    )


@router.get("/{community_id}", response_model=CommunityDetailResponse)
async def get_community(
    community_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Get a single community. Includes membership context if authenticated."""
    return await community_service.get_community(db, community_id, current_user)


@router.post("/{community_id}/join", response_model=CommunityDetailResponse)
async def join_community(
    community_id: UUID,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a public community. Requires verified student."""
    return await community_service.join_community(db, community_id, current_user)
