from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class VerificationSendRequest(BaseModel):
    """User submits their university email to start verification."""
    university_email: EmailStr


class VerificationConfirmRequest(BaseModel):
    """User submits the 6-digit code they received."""
    university_email: EmailStr
    verification_code: str = Field(..., min_length=6, max_length=6)


class VerificationSendResponse(BaseModel):
    """Response after sending a verification code."""
    message: str
    status: str
    expires_at: datetime
    # Included only in development mode so you can test without real email
    debug_code: str | None = None


class VerificationConfirmResponse(BaseModel):
    """Response after successful verification."""
    message: str
    status: str
    university_name: str
