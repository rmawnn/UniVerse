import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExists, BadRequest, Forbidden, NotFound
from app.models.job_application import JobApplication
from app.models.job_post import JobPost
from app.models.post import Post
from app.models.saved_job import SavedJob
from app.models.user import User
from app.repositories.follow_repository import FollowRepository
from app.repositories.job_repository import JobRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.job import (
    JobActivityEvent,
    JobApplicationResponse,
    JobApplyRequest,
    JobPostAuthorSummary,
    JobPostCreateRequest,
    JobPostResponse,
    JobStatsResponse,
    MyApplicationResponse,
    SavedJobToggleResponse,
    UpdateApplicationStatusRequest,
)
from app.services import storage_service
from app.services.notification_service import notify


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

    # Notify followers that this user posted a job (respecting preferences)
    follow_repo = FollowRepository(db)
    user_repo = UserRepository(db)
    follower_ids = await follow_repo.get_follower_ids(current_user.id)
    if follower_ids:
        followers = await user_repo.get_by_ids(follower_ids)
        for fid, follower in followers.items():
            if follower.notify_new_jobs:
                await notify(
                    db,
                    user_id=fid,
                    actor_id=current_user.id,
                    type="job_posted",
                    reference_id=job.id,
                    content=f"{current_user.full_name} posted a new job: {job.title}",
                )

    return _build_job_response(job, current_user, application_count=0, has_applied=False, saved_by_me=False)


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
    saved_by_me = False
    if current_user:
        existing = await repo.get_application(job_id, current_user.id)
        has_applied = existing is not None
        saved_by_me = await repo.is_saved(current_user.id, job_id)

    return _build_job_response(
        job, author,
        application_count=app_count, has_applied=has_applied,
        saved_by_me=saved_by_me,
    )


async def list_jobs(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = None,
    job_type: str | None = None,
    location: str | None = None,
    q: str | None = None,
) -> PaginatedResponse[JobPostResponse]:
    """List active job posts, newest first. Supports filtering."""
    repo = JobRepository(db)
    skip = (page - 1) * page_size

    filters = dict(active_only=True, job_type=job_type, location=location, q=q)
    total = await repo.count_jobs(**filters)
    jobs = await repo.list_jobs(skip=skip, limit=page_size, **filters)

    if not jobs:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load authors
    user_repo = UserRepository(db)
    author_ids = {j.author_id for j in jobs}
    authors = await user_repo.get_by_ids(author_ids)

    # Batch-load application counts, applied set, and saved set
    job_ids = [j.id for j in jobs]
    app_counts = await repo.count_applications_by_jobs(job_ids)
    applied_set: set[UUID] = set()
    saved_set: set[UUID] = set()
    if current_user:
        applied_set = await repo.applied_by_user(job_ids, current_user.id)
        saved_set = await repo.saved_by_user(job_ids, current_user.id)

    items = [
        _build_job_response(
            j,
            authors.get(j.author_id),
            application_count=app_counts.get(j.id, 0),
            has_applied=j.id in applied_set,
            saved_by_me=j.id in saved_set,
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


async def get_job_stats(
    db: AsyncSession,
    job_id: UUID,
    current_user: User,
) -> JobStatsResponse:
    """Get application stats for a job. Only the job owner can view."""
    repo = JobRepository(db)
    job = await repo.get_job_by_id(job_id)
    if not job:
        raise NotFound("Job post")

    if job.author_id != current_user.id:
        raise Forbidden("Only the job owner can view stats")

    stats = await repo.get_application_stats(job_id)
    return JobStatsResponse(**stats)


async def get_job_activity(
    db: AsyncSession,
    job_id: UUID,
    current_user: User,
) -> list[JobActivityEvent]:
    """
    Build a chronological activity timeline for a job.

    Derives events from application records:
      - "applied"  → each application's created_at
      - "accepted" / "rejected" → application's updated_at when status changed

    Only the job owner can view.
    """
    repo = JobRepository(db)
    job = await repo.get_job_by_id(job_id)
    if not job:
        raise NotFound("Job post")

    if job.author_id != current_user.id:
        raise Forbidden("Only the job owner can view the activity timeline")

    applications = await repo.list_applications_for_activity(job_id)

    if not applications:
        return []

    # Batch-load applicant users
    user_repo = UserRepository(db)
    applicant_ids = {a.applicant_id for a in applications}
    applicants = await user_repo.get_by_ids(applicant_ids)

    events: list[JobActivityEvent] = []

    for app in applications:
        applicant = applicants.get(app.applicant_id)
        user_summary = JobPostAuthorSummary(
            id=applicant.id,
            username=applicant.username,
            full_name=applicant.full_name,
            profile_image_url=applicant.profile_image_url,
        ) if applicant else JobPostAuthorSummary(
            id=app.applicant_id,
            username="[deleted]",
            full_name="Deleted User",
            profile_image_url=None,
        )

        # "applied" event
        events.append(JobActivityEvent(
            event_type="applied",
            user=user_summary,
            timestamp=app.created_at,
        ))

        # status-change event (only if decision was made)
        if app.status in ("accepted", "rejected"):
            events.append(JobActivityEvent(
                event_type=app.status,
                user=user_summary,
                timestamp=app.updated_at,
            ))

    # Sort chronologically (newest first for display)
    events.sort(key=lambda e: e.timestamp, reverse=True)

    return events


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
        cv_url=data.cv_url,
    )
    application = await repo.create_application(application)

    # Notify the job owner about the new application (respecting preferences)
    user_repo = UserRepository(db)
    job_owner = await user_repo.get_by_id(job.author_id)
    if job_owner and job_owner.notify_job_applications:
        await notify(
            db,
            user_id=job.author_id,
            actor_id=current_user.id,
            type="job_application",
            reference_id=job.id,
            content=f"{current_user.full_name} applied to your job: {job.title}",
        )

    return _build_application_response(application, current_user)


async def update_application_status(
    db: AsyncSession,
    application_id: UUID,
    current_user: User,
    data: UpdateApplicationStatusRequest,
) -> JobApplicationResponse:
    """Accept or reject an application. Only the job owner can update."""
    repo = JobRepository(db)

    application = await repo.get_application_by_id(application_id)
    if not application:
        raise NotFound("Application")

    job = await repo.get_job_by_id(application.job_id)
    if not job:
        raise NotFound("Job post")

    if job.author_id != current_user.id:
        raise Forbidden("Only the job owner can update application status")

    if application.status != "pending":
        raise BadRequest("This application has already been reviewed")

    application = await repo.update_application_status(application, data.status)

    # Notify the applicant about the decision
    status_text = "accepted" if data.status == "accepted" else "rejected"
    await notify(
        db,
        user_id=application.applicant_id,
        actor_id=current_user.id,
        type="job_application",
        reference_id=job.id,
        content=f"Your application for {job.title} has been {status_text}",
    )

    # Load applicant user for the response
    user_repo = UserRepository(db)
    applicant = await user_repo.get_by_id(application.applicant_id)

    return _build_application_response(application, applicant)


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


async def get_application_cv_url(
    db: AsyncSession,
    application_id: UUID,
    current_user: User,
) -> str:
    """
    Return a time-limited signed URL for an applicant's CV.

    Only the job owner (employer) can download.
    """
    repo = JobRepository(db)
    application = await repo.get_application_by_id(application_id)
    if not application:
        raise NotFound("Application")

    job = await repo.get_job_by_id(application.job_id)
    if not job:
        raise NotFound("Job post")

    if job.author_id != current_user.id:
        raise Forbidden("Only the job owner can download applicant CVs")

    if not application.cv_url:
        raise NotFound("No CV attached to this application")

    signed_url = await storage_service.get_signed_url(application.cv_url, expires_in=3600)
    return signed_url


# ── Saved jobs ───────────────────────────────────────────────

async def save_job(
    db: AsyncSession,
    job_id: UUID,
    current_user: User,
) -> SavedJobToggleResponse:
    """Save a job post."""
    repo = JobRepository(db)
    job = await repo.get_job_by_id(job_id)
    if not job:
        raise NotFound("Job post")

    if not job.is_active:
        raise BadRequest("Cannot save an inactive job")

    already = await repo.is_saved(current_user.id, job_id)
    if already:
        return SavedJobToggleResponse(saved=True)

    saved = SavedJob(user_id=current_user.id, job_id=job_id)
    await repo.save_job(saved)
    return SavedJobToggleResponse(saved=True)


async def unsave_job(
    db: AsyncSession,
    job_id: UUID,
    current_user: User,
) -> SavedJobToggleResponse:
    """Unsave a job post."""
    repo = JobRepository(db)
    await repo.unsave_job(current_user.id, job_id)
    return SavedJobToggleResponse(saved=False)


async def list_saved_jobs(
    db: AsyncSession,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[JobPostResponse]:
    """List the current user's saved job posts."""
    repo = JobRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_saved_jobs(current_user.id)
    jobs = await repo.list_saved_jobs(current_user.id, skip=skip, limit=page_size)

    if not jobs:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load authors
    user_repo = UserRepository(db)
    author_ids = {j.author_id for j in jobs}
    authors = await user_repo.get_by_ids(author_ids)

    # Batch-load application counts and applied/saved sets
    job_ids = [j.id for j in jobs]
    app_counts = await repo.count_applications_by_jobs(job_ids)
    applied_set = await repo.applied_by_user(job_ids, current_user.id)

    items = [
        _build_job_response(
            j,
            authors.get(j.author_id),
            application_count=app_counts.get(j.id, 0),
            has_applied=j.id in applied_set,
            saved_by_me=True,  # all are saved since we're listing saved jobs
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


# ── Recommendations ─────────────────────────────────────────

async def list_recommended_jobs(
    db: AsyncSession,
    current_user: User,
    *,
    limit: int = 10,
) -> list[JobPostResponse]:
    """
    Return scored job recommendations for the current user.

    Scoring signals (no ML — simple heuristics):
      +10  author is at the same university
      +5   job_type matches a type the user previously applied to
      +3   user follows the job author
      +2   user is active (has > 5 posts)
      +1   baseline

    Excludes the user's own jobs and already-applied jobs.
    """
    from sqlalchemy import select, func as sa_func

    repo = JobRepository(db)
    user_repo = UserRepository(db)
    follow_repo = FollowRepository(db)

    # Gather scoring inputs
    preferred_types = await repo.get_user_applied_job_types(current_user.id)
    following_ids = await user_repo.get_following_ids(current_user.id)

    # Count user's posts for the activity signal
    post_count_stmt = (
        select(sa_func.count())
        .select_from(Post)
        .where(Post.author_id == current_user.id, Post.is_deleted == False)  # noqa: E712
    )
    post_count_result = await db.execute(post_count_stmt)
    user_post_count = post_count_result.scalar_one()

    jobs = await repo.list_recommended_jobs(
        current_user.id,
        university_id=current_user.university_id,
        preferred_types=preferred_types if preferred_types else None,
        following_ids=following_ids if following_ids else None,
        user_post_count=user_post_count,
        limit=limit,
    )

    if not jobs:
        return []

    # Batch-load enrichment (same pattern as list_jobs)
    author_ids = {j.author_id for j in jobs}
    authors = await user_repo.get_by_ids(author_ids)

    job_ids = [j.id for j in jobs]
    app_counts = await repo.count_applications_by_jobs(job_ids)
    applied_set = await repo.applied_by_user(job_ids, current_user.id)
    saved_set = await repo.saved_by_user(job_ids, current_user.id)

    return [
        _build_job_response(
            j,
            authors.get(j.author_id),
            application_count=app_counts.get(j.id, 0),
            has_applied=j.id in applied_set,
            saved_by_me=j.id in saved_set,
        )
        for j in jobs
    ]


# ── Response builders ────────────────────────────────────────

def _build_job_response(
    job: JobPost,
    author: User | None,
    *,
    application_count: int = 0,
    has_applied: bool = False,
    saved_by_me: bool = False,
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
        saved_by_me=saved_by_me,
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
        cv_url=application.cv_url,
        status=application.status,
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
        cv_url=application.cv_url,
        status=application.status,
        created_at=application.created_at,
    )
