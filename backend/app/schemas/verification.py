import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ── Email verification ──────────────────────────────────────

class VerificationSendRequest(BaseModel):
    """User submits their university email to start verification."""
    university_email: EmailStr


class VerificationSendResponse(BaseModel):
    """Response after sending a verification code."""
    verification_id: uuid.UUID
    message: str
    status: str
    expires_at: datetime
    # Included only in development mode so you can test without real email
    debug_code: str | None = None


class VerificationConfirmRequest(BaseModel):
    """User submits verification_id + 6-digit code."""
    verification_id: uuid.UUID
    code: str = Field(..., min_length=6, max_length=6)


class VerificationConfirmResponse(BaseModel):
    """Response after successful verification."""
    message: str
    status: str
    university_name: str


# ── Document verification ───────────────────────────────────

class DocumentVerificationResponse(BaseModel):
    """Response after submitting a document for review."""
    verification_id: uuid.UUID
    message: str
    status: str


# ── Status ──────────────────────────────────────────────────

class VerificationStatusResponse(BaseModel):
    """Current verification state for the authenticated user."""
    is_verified_student: bool
    university_id: str | None = None
    university_name: str | None = None
    verification_method: str | None = None
    verification_status: str | None = None
    university_email: str | None = None
    document_url: str | None = None
    rejection_reason: str | None = None
    verified_at: datetime | None = None
