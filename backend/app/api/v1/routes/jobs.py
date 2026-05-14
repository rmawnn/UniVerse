from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.job import (
    JobApplicationResponse,
    JobApplyRequest,
    JobPostCreateRequest,
    JobPostResponse,
    MyApplicationResponse,
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
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """List active job posts, newest first."""
    return await job_service.list_jobs(
        db, page=page, page_size=page_size, current_user=current_user,
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
