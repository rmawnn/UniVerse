from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.job import (
    JobActivityEvent,
    JobApplicationResponse,
    JobApplyRequest,
    JobPostCreateRequest,
    JobPostResponse,
    JobStatsResponse,
    MyApplicationResponse,
    SavedJobToggleResponse,
    UpdateApplicationStatusRequest,
)
from app.services import job_service

router = APIRouter()


# ── Job CRUD ─────────────────────────────────────────────────

@router.post("/jobs", response_model=JobPostResponse, status_code=201)
async def create_job(
    data: JobPostCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new job/internship posting."""
    return await job_service.create_job(db, current_user, data)


@router.get("/jobs", response_model=PaginatedResponse[JobPostResponse])
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    job_type: str | None = Query(None, pattern=r"^(internship|part-time|full-time|freelance)$"),
    location: str | None = Query(None, max_length=200),
    q: str | None = Query(None, max_length=200),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """List active job posts. Supports search (q) across title/company/description, plus type and location filters."""
    return await job_service.list_jobs(
        db, page=page, page_size=page_size, current_user=current_user,
        job_type=job_type, location=location, q=q,
    )


@router.get("/jobs/saved", response_model=PaginatedResponse[JobPostResponse])
async def list_saved_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's saved job posts."""
    return await job_service.list_saved_jobs(
        db, current_user, page=page, page_size=page_size,
    )


@router.get("/jobs/my-applications", response_model=PaginatedResponse[MyApplicationResponse])
async def list_my_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's own job applications."""
    return await job_service.list_my_applications(
        db, current_user, page=page, page_size=page_size,
    )


@router.get("/jobs/recommendations", response_model=list[JobPostResponse])
async def list_recommended_jobs(
    limit: int = Query(10, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personalized job recommendations for the current user."""
    return await job_service.list_recommended_jobs(
        db, current_user, limit=limit,
    )


@router.get("/jobs/{job_id}/activity", response_model=list[JobActivityEvent])
async def get_job_activity(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the activity timeline for a job. Only the job owner can view."""
    return await job_service.get_job_activity(db, job_id, current_user)


@router.get("/jobs/{job_id}", response_model=JobPostResponse)
async def get_job(
    job_id: UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get a single job post by ID."""
    return await job_service.get_job(db, job_id, current_user=current_user)


@router.delete("/jobs/{job_id}", response_model=SuccessResponse)
async def delete_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a job post. Only the owner can delete."""
    await job_service.delete_job(db, job_id, current_user)
    return SuccessResponse(message="Job post deleted")


# ── Applications ─────────────────────────────────────────────

@router.post("/jobs/{job_id}/apply", response_model=JobApplicationResponse, status_code=201)
async def apply_to_job(
    job_id: UUID,
    data: JobApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply to a job post."""
    return await job_service.apply_to_job(db, job_id, current_user, data)


@router.patch("/jobs/applications/{application_id}", response_model=JobApplicationResponse)
async def update_application_status(
    application_id: UUID,
    data: UpdateApplicationStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept or reject a job application. Only the job owner can update."""
    return await job_service.update_application_status(
        db, application_id, current_user, data,
    )


@router.get("/jobs/{job_id}/stats", response_model=JobStatsResponse)
async def get_job_stats(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get application statistics for a job. Only the job owner can view."""
    return await job_service.get_job_stats(db, job_id, current_user)


@router.post("/jobs/{job_id}/save", response_model=SavedJobToggleResponse)
async def save_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a job post for later."""
    return await job_service.save_job(db, job_id, current_user)


@router.delete("/jobs/{job_id}/save", response_model=SavedJobToggleResponse)
async def unsave_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a saved job post."""
    return await job_service.unsave_job(db, job_id, current_user)


@router.get("/jobs/{job_id}/applications", response_model=PaginatedResponse[JobApplicationResponse])
async def list_job_applications(
    job_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List applications for a job. Only the job owner can view."""
    return await job_service.list_job_applications(
        db, job_id, current_user, page=page, page_size=page_size,
    )
