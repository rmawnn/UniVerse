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
        """Lookup by exact email domain — used during student verification."""
        stmt = select(University).where(University.domain == domain.lower())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_domain_suffix(self, root_domain: str) -> University | None:
        """Find a university whose stored domain ends with the given root.

        Handles cases where the DB stores ``stu.rumeli.com.tr`` but the
        lookup key is ``rumeli.com.tr``, or the DB stores ``acibadem.edu.tr``
        and the lookup key is also ``acibadem.edu.tr``.
        """
        root = root_domain.lower()
        pattern = f"%.{root}"
        stmt = (
            select(University)
            .where(
                (University.domain == root)
                | (University.domain.like(pattern))
            )
            .limit(1)
        )
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
