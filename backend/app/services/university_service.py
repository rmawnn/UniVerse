import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFound
from app.repositories.university_repository import UniversityRepository
from app.schemas.common import PaginatedResponse
from app.schemas.university import UniversityResponse


async def list_universities(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
) -> PaginatedResponse[UniversityResponse]:
    """Return a paginated list of universities ordered by name."""
    repo = UniversityRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count()
    universities = await repo.get_all(skip=skip, limit=page_size)

    return PaginatedResponse(
        items=[UniversityResponse.model_validate(u) for u in universities],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def get_university(
    db: AsyncSession,
    university_id: UUID,
) -> UniversityResponse:
    """Return a single university by ID. Raises NotFound if missing."""
    repo = UniversityRepository(db)
    university = await repo.get_by_id(university_id)

    if not university:
        raise NotFound("University")

    return UniversityResponse.model_validate(university)
