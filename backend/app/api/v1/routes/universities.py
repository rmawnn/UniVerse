from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.university import UniversityResponse
from app.services import university_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[UniversityResponse])
async def list_universities(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """List all supported universities (public, paginated)."""
    return await university_service.list_universities(
        db, page=page, page_size=page_size,
    )


@router.get("/{university_id}", response_model=UniversityResponse)
async def get_university(
    university_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single university by ID (public)."""
    return await university_service.get_university(db, university_id)
