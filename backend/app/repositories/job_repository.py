from uuid import UUID

from sqlalchemy import or_, select, func, delete, case, literal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_application import JobApplication
from app.models.job_post import JobPost
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.saved_job import SavedJob
from app.models.user import User
from app.models.user_follow import UserFollow


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

    async def get_application_by_id(self, app_id: UUID) -> JobApplication | None:
        return await self.db.get(JobApplication, app_id)

    async def update_application_status(
        self, application: JobApplication, status: str,
    ) -> JobApplication:
        application.status = status
        await self.db.flush()
        await self.db.refresh(application)
        return application

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

    async def get_application_stats(self, job_id: UUID) -> dict[str, int]:
        """Return {total, pending, accepted, rejected} counts for a job."""
        stmt = (
            select(
                JobApplication.status,
                func.count().label("cnt"),
            )
            .where(JobApplication.job_id == job_id)
            .group_by(JobApplication.status)
        )
        result = await self.db.execute(stmt)
        counts = {row.status: row.cnt for row in result}
        total = sum(counts.values())
        return {
            "total_applications": total,
            "pending_count": counts.get("pending", 0),
            "accepted_count": counts.get("accepted", 0),
            "rejected_count": counts.get("rejected", 0),
        }

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

    # ── Recommendations ─────────────────────────────────────

    async def get_user_applied_job_types(self, user_id: UUID) -> set[str]:
        """Return the set of job_types the user has previously applied to."""
        stmt = (
            select(JobPost.job_type)
            .join(JobApplication, JobApplication.job_id == JobPost.id)
            .where(JobApplication.applicant_id == user_id)
            .distinct()
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result.all()}

    async def list_applications_for_activity(
        self, job_id: UUID,
    ) -> list[JobApplication]:
        """Return all applications for a job, oldest first (timeline order)."""
        stmt = (
            select(JobApplication)
            .where(JobApplication.job_id == job_id)
            .order_by(JobApplication.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_recommended_jobs(
        self,
        user_id: UUID,
        *,
        university_id: UUID | None = None,
        preferred_types: set[str] | None = None,
        following_ids: set[UUID] | None = None,
        user_post_count: int = 0,
        limit: int = 10,
    ) -> list[JobPost]:
        """
        Return active jobs scored by relevance signals:
          +10  author is at the same university
          +5   job_type matches a type the user has applied to before
          +3   user follows the job author
          +2   user is active (post_count > 5)
          +1   baseline so every job has a nonzero score
        Excludes jobs authored by the user and already-applied jobs.
        """
        # ── Subquery: jobs user already applied to ──────────
        applied_sub = (
            select(JobApplication.job_id)
            .where(JobApplication.applicant_id == user_id)
        ).subquery()

        # ── Same-university signal ──────────────────────────
        if university_id:
            author_uni = (
                select(User.id)
                .where(User.university_id == university_id)
            ).subquery()
            uni_score = case(
                (JobPost.author_id.in_(select(author_uni)), 10),
                else_=0,
            )
        else:
            uni_score = literal(0)

        # ── Job-type preference signal ──────────────────────
        if preferred_types:
            type_score = case(
                (JobPost.job_type.in_(preferred_types), 5),
                else_=0,
            )
        else:
            type_score = literal(0)

        # ── Following signal ────────────────────────────────
        if following_ids:
            follow_score = case(
                (JobPost.author_id.in_(following_ids), 3),
                else_=0,
            )
        else:
            follow_score = literal(0)

        # ── Activity signal ─────────────────────────────────
        activity_score = literal(2) if user_post_count > 5 else literal(0)

        total_score = (
            uni_score + type_score + follow_score + activity_score + literal(1)
        ).label("score")

        stmt = (
            select(JobPost, total_score)
            .where(
                JobPost.is_active == True,  # noqa: E712
                JobPost.author_id != user_id,
                JobPost.id.notin_(select(applied_sub)),
            )
            .order_by(total_score.desc(), JobPost.created_at.desc())
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]
