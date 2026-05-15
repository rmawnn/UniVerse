import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Job Post schemas ─────────────────────────────────────────

class JobPostCreateRequest(BaseModel):
    """Payload for creating a new job post."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    company_name: str | None = Field(None, max_length=200)
    location: str | None = Field(None, max_length=200)
    job_type: str = Field(..., pattern=r"^(internship|part-time|full-time|freelance)$")


class JobPostAuthorSummary(BaseModel):
    """Lightweight author info embedded in job responses."""
    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None

    model_config = {"from_attributes": True}


class JobPostResponse(BaseModel):
    """Public-facing job post representation."""
    id: uuid.UUID
    author: JobPostAuthorSummary
    title: str
    description: str
    company_name: str | None = None
    location: str | None = None
    job_type: str
    is_active: bool
    application_count: int = 0
    has_applied: bool = False
    saved_by_me: bool = False
    created_at: datetime
    updated_at: datetime


class SavedJobToggleResponse(BaseModel):
    """Response for save/unsave job toggle."""
    saved: bool


# ── Job Application schemas ──────────────────────────────────

class JobApplyRequest(BaseModel):
    """Payload for applying to a job."""
    message: str | None = Field(None, max_length=2000)


class JobApplicationResponse(BaseModel):
    """Application visible to the job owner."""
    id: uuid.UUID
    job_id: uuid.UUID
    applicant: JobPostAuthorSummary
    message: str | None = None
    created_at: datetime


class MyApplicationResponse(BaseModel):
    """Application visible to the applicant themselves."""
    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    company_name: str | None = None
    job_type: str
    message: str | None = None
    created_at: datetime
