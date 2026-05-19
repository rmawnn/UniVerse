from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import Report
from app.repositories.base_repository import BaseRepository


class ReportRepository(BaseRepository[Report]):
    model = Report

    async def find_existing(
        self, reporter_id: UUID, target_type: str, target_id: UUID,
    ) -> Report | None:
        stmt = select(Report).where(
            Report.reporter_id == reporter_id,
            Report.target_type == target_type,
            Report.target_id == target_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_reports(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        status: str | None = None,
        target_type: str | None = None,
    ) -> tuple[list[Report], int]:
        base = select(Report)
        count_base = select(func.count()).select_from(Report)

        if status:
            base = base.where(Report.status == status)
            count_base = count_base.where(Report.status == status)
        if target_type:
            base = base.where(Report.target_type == target_type)
            count_base = count_base.where(Report.target_type == target_type)

        total_result = await self.db.execute(count_base)
        total = total_result.scalar_one()

        stmt = base.order_by(Report.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        return items, total
