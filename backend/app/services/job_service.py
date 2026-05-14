import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExists, BadRequest, Forbidden, NotFound
from app.models.job_application import JobApplication
from app.models.job_post import JobPost
from app.models.user import User
from app.repositories.job_repository import JobRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.job import (
    JobApplicationResponse,
    JobApplyRequest,
    JobPostAuthorSummary,
    JobPostCreateRequest,
    JobPostResponse,
    MyApplicationResponse,
)


# ── Job CRUD ─────────────────────────────────────────────────

async def create_job(
    db: AsyncSession,
    current_user: User,
    data: JobPostCreateRequest,
) -> JobPostResponse:
    """Create a new job post. Only active users can post."""
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    job = JobPost(
        author_id=current_user.id,
        title=data.title,
        description=data.description,
        company_name=data.company_name,
        location=data.location,
        job_type=data.job_type,
    )
    repo = JobRepository(db)
    job = await repo.create_job(job)

    return _build_job_response(job, current_user, application_count=0, has_applied=False)


async def get_job(
    db: AsyncSession,
    job_id: UUID,
    current_user: User | None = None,
) -> JobPostResponse:
    """Get a single job post by ID."""
    repo = JobRepository(db)
    job = await repo.get_job_by_id(job_id)
    if not job:
        raise NotFound("Job post")

    user_repo = UserRepository(db)
    author = await user_repo.get_by_id(job.author_id)
    app_count = await repo.count_applications_for_job(job_id)

    has_applied = False
    if current_user:
        existing = await repo.get_application(job_id, current_user.id)
        has_applied = existing is not None

    return _build_job_response(job, author, application_count=app_count, has_applied=has_applied)


async def list_jobs(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = None,
) -> PaginatedResponse[JobPostResponse]:
    """List active job posts, newest first."""
    repo = JobRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_jobs(active_only=True)
    jobs = await repo.list_jobs(skip=skip, limit=page_size, active_only=True)

    if not jobs:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load authors
    user_repo = UserRepository(db)
    author_ids = {j.author_id for j in jobs}
    authors: dict[UUID, User] = {}
    for aid in author_ids:
        user = await user_repo.get_by_id(aid)
        if user:
            authors[aid] = user

    # Batch-load application counts and user's applied set
    job_ids = [j.id for j in jobs]
    app_counts = await repo.count_applications_by_jobs(job_ids)
    applied_set: set[UUID] = set()
    if current_user:
        applied_set = await repo.applied_by_user(job_ids, current_user.id)

    items = [
        _build_job_response(
            j,
            authors.get(j.author_id),
            application_count=app_counts.get(j.id, 0),
            has_applied=j.id in applied_set,
        )
        for j in jobs
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def delete_job(
    db: AsyncSession,
    job_id: UUID,
    current_user: User,
) -> None:
    """Delete a job post. Only the author can delete."""
    repo = JobRepository(db)
    job = await repo.get_job_by_id(job_id)
    if not job:
        raise NotFound("Job post")

    if job.author_id != current_user.id:
        raise Forbidden("You can only delete your own job posts")

    await repo.delete_job(job)


# ── Applications ─────────────────────────────────────────────

async def apply_to_job(
    db: AsyncSession,
    job_id: UUID,
    current_user: User,
    data: JobApplyRequest,
) -> JobApplicationResponse:
    """Apply to a job post."""
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    repo = JobRepository(db)
    job = await repo.get_job_by_id(job_id)
    if not job:
        raise NotFound("Job post")

    if not job.is_active:
        raise BadRequest("This job is no longer accepting applications")

    if job.author_id == current_user.id:
        raise BadRequest("You cannot apply to your own job post")

    existing = await repo.get_application(job_id, current_user.id)
    if existing:
        raise AlreadyExists("Application")

    application = JobApplication(
        job_id=job_id,
        applicant_id=current_user.id,
        message=data.message,
    )
    application = await repo.create_application(application)

    return _build_application_response(application, current_user)


async def list_job_applications(
    db: AsyncSession,
    job_id: UUID,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[JobApplicationResponse]:
    """List applications for a job. Only the job owner can see these."""
    repo = JobRepository(db)
    job = await repo.get_job_by_id(job_id)
    if not job:
        raise NotFound("Job post")

    if job.author_id != current_user.id:
        raise Forbidden("Only the job owner can view applications")

    skip = (page - 1) * page_size
    total = await repo.count_applications_for_job(job_id)
    applications = await repo.list_applications_for_job(job_id, skip=skip, limit=page_size)

    if not applications:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load applicant users
    user_repo = UserRepository(db)
    applicant_ids = {a.applicant_id for a in applications}
    applicants: dict[UUID, User] = {}
    for uid in applicant_ids:
        user = await user_repo.get_by_id(uid)
        if user:
            applicants[uid] = user

    items = [
        _build_application_response(a, applicants.get(a.applicant_id))
        for a in applications
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def list_my_applications(
    db: AsyncSession,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[MyApplicationResponse]:
    """List the current user's own applications."""
    repo = JobRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_applications_by_user(current_user.id)
    applications = await repo.list_applications_by_user(
        current_user.id, skip=skip, limit=page_size,
    )

    if not applications:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load job posts for titles
    job_ids = {a.job_id for a in applications}
    jobs: dict[UUID, JobPost] = {}
    for jid in job_ids:
        job = await repo.get_job_by_id(jid)
        if job:
            jobs[jid] = job

    items = [
        _build_my_application_response(a, jobs.get(a.job_id))
        for a in applications
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


# ── Response builders ────────────────────────────────────────

def _build_job_response(
    job: JobPost,
    author: User | None,
    *,
    application_count: int = 0,
    has_applied: bool = False,
) -> JobPostResponse:
    author_summary = JobPostAuthorSummary(
        id=author.id,
        username=author.username,
        full_name=author.full_name,
        profile_image_url=author.profile_image_url,
    ) if author else JobPostAuthorSummary(
        id=job.author_id,
        username="[deleted]",
        full_name="Deleted User",
        profile_image_url=None,
    )

    return JobPostResponse(
        id=job.id,
        author=author_summary,
        title=job.title,
        description=job.description,
        company_name=job.company_name,
        location=job.location,
        job_type=job.job_type,
        is_active=job.is_active,
        application_count=application_count,
        has_applied=has_applied,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _build_application_response(
    application: JobApplication,
    applicant: User | None,
) -> JobApplicationResponse:
    applicant_summary = JobPostAuthorSummary(
        id=applicant.id,
        username=applicant.username,
        full_name=applicant.full_name,
        profile_image_url=applicant.profile_image_url,
    ) if applicant else JobPostAuthorSummary(
        id=application.applicant_id,
        username="[deleted]",
        full_name="Deleted User",
        profile_image_url=None,
    )

    return JobApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        applicant=applicant_summary,
        message=application.message,
        created_at=application.created_at,
    )


def _build_my_application_response(
    application: JobApplication,
    job: JobPost | None,
) -> MyApplicationResponse:
    return MyApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=job.title if job else "[deleted]",
        company_name=job.company_name if job else None,
        job_type=job.job_type if job else "unknown",
        message=application.message,
        created_at=application.created_at,
    )
