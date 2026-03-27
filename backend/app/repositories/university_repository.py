from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.university import University


class UniversityRepository:
    """Database access for University entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, university_id: UUID) -> University | None:
        return await self.db.get(University, university_id)

    async def get_by_domain(self, domain: str) -> University | None:
        """Lookup by email domain — used during student verification."""
        stmt = select(University).where(University.domain == domain.lower())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self, *, skip: int = 0, limit: int = 50
    ) -> list[University]:
        stmt = (
            select(University)
            .order_by(University.name)
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        stmt = select(func.count()).select_from(University)
        result = await self.db.execute(stmt)
        return result.scalar_one()
