from uuid import UUID

from sqlalchemy import or_, select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_application import JobApplication
from app.models.job_post import JobPost
from app.models.saved_job import SavedJob


class JobRepository:
    """Database access for JobPost and JobApplication entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Job posts ────────────────────────────────────────────

    async def create_job(self, job: JobPost) -> JobPost:
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def get_job_by_id(self, job_id: UUID) -> JobPost | None:
        return await self.db.get(JobPost, job_id)

    def _apply_filters(self, stmt, *, active_only, job_type, location, q):
        """Shared filter logic for list and count queries."""
        if active_only:
            stmt = stmt.where(JobPost.is_active == True)  # noqa: E712
        if job_type:
            stmt = stmt.where(JobPost.job_type == job_type)
        if location:
            stmt = stmt.where(JobPost.location.ilike(f"%{location}%"))
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(or_(
                JobPost.title.ilike(pattern),
                JobPost.company_name.ilike(pattern),
                JobPost.description.ilike(pattern),
            ))
        return stmt

    async def list_jobs(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        active_only: bool = True,
        job_type: str | None = None,
        location: str | None = None,
        q: str | None = None,
    ) -> list[JobPost]:
        stmt = select(JobPost).order_by(JobPost.created_at.desc())
        stmt = self._apply_filters(
            stmt, active_only=active_only, job_type=job_type,
            location=location, q=q,
        )
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_jobs(
        self,
        *,
        active_only: bool = True,
        job_type: str | None = None,
        location: str | None = None,
        q: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(JobPost)
        stmt = self._apply_filters(
            stmt, active_only=active_only, job_type=job_type,
            location=location, q=q,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_job(self, job: JobPost) -> None:
        await self.db.delete(job)
        await self.db.flush()

    # ── Applications ─────────────────────────────────────────

    async def create_application(self, app: JobApplication) -> JobApplication:
        self.db.add(app)
        await self.db.flush()
        await self.db.refresh(app)
        return app

    async def get_application(
        self, job_id: UUID, applicant_id: UUID,
    ) -> JobApplication | None:
        stmt = select(JobApplication).where(
            JobApplication.job_id == job_id,
            JobApplication.applicant_id == applicant_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_applications_for_job(
        self, job_id: UUID, *, skip: int = 0, limit: int = 50,
    ) -> list[JobApplication]:
        stmt = (
            select(JobApplication)
            .where(JobApplication.job_id == job_id)
            .order_by(JobApplication.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_applications_for_job(self, job_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(JobApplication)
            .where(JobApplication.job_id == job_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def list_applications_by_user(
        self, user_id: UUID, *, skip: int = 0, limit: int = 50,
    ) -> list[JobApplication]:
        stmt = (
            select(JobApplication)
            .where(JobApplication.applicant_id == user_id)
            .order_by(JobApplication.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_applications_by_user(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(JobApplication)
            .where(JobApplication.applicant_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    # ── Batch helpers (avoid N+1) ────────────────────────────

    async def count_applications_by_jobs(
        self, job_ids: list[UUID],
    ) -> dict[UUID, int]:
        """Return {job_id: count} for a batch of jobs."""
        if not job_ids:
            return {}
        stmt = (
            select(
                JobApplication.job_id,
                func.count().label("cnt"),
            )
            .where(JobApplication.job_id.in_(job_ids))
            .group_by(JobApplication.job_id)
        )
        result = await self.db.execute(stmt)
        return {row.job_id: row.cnt for row in result}

    async def applied_by_user(
        self, job_ids: list[UUID], user_id: UUID,
    ) -> set[UUID]:
        """Return set of job_ids the user has already applied to."""
        if not job_ids:
            return set()
        stmt = (
            select(JobApplication.job_id)
            .where(
                JobApplication.job_id.in_(job_ids),
                JobApplication.applicant_id == user_id,
            )
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result}

    # ── Saved jobs ───────────────────────────────────────────

    async def save_job(self, saved: SavedJob) -> SavedJob:
        self.db.add(saved)
        await self.db.flush()
        return saved

    async def unsave_job(self, user_id: UUID, job_id: UUID) -> bool:
        """Remove a saved job. Returns True if a row was deleted."""
        stmt = (
            delete(SavedJob)
            .where(SavedJob.user_id == user_id, SavedJob.job_id == job_id)
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0

    async def is_saved(self, user_id: UUID, job_id: UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(SavedJob)
            .where(SavedJob.user_id == user_id, SavedJob.job_id == job_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one() > 0

    async def saved_by_user(
        self, job_ids: list[UUID], user_id: UUID,
    ) -> set[UUID]:
        """Return set of job_ids the user has saved (for batch enrichment)."""
        if not job_ids:
            return set()
        stmt = (
            select(SavedJob.job_id)
            .where(
                SavedJob.user_id == user_id,
                SavedJob.job_id.in_(job_ids),
            )
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result}

    async def list_saved_jobs(
        self, user_id: UUID, *, skip: int = 0, limit: int = 20,
    ) -> list[JobPost]:
        """Return saved job posts for a user, newest-saved first."""
        stmt = (
            select(JobPost)
            .join(SavedJob, SavedJob.job_id == JobPost.id)
            .where(SavedJob.user_id == user_id)
            .order_by(SavedJob.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_saved_jobs(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(SavedJob)
            .where(SavedJob.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
