import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserResponse(BaseModel):
    """Public-facing user representation. Never includes password_hash."""

    id: uuid.UUID
    email: EmailStr
    username: str
    full_name: str
    university_id: uuid.UUID | None = None
    department: str | None = None
    academic_year: int | None = None
    bio: str | None = None
    profile_image_url: str | None = None
    is_active: bool
    is_verified_student: bool
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    """Fields an authenticated user is allowed to edit on their own profile."""

    full_name: str | None = Field(None, min_length=1, max_length=100)
    bio: str | None = Field(None, max_length=500)
    profile_image_url: str | None = Field(None, max_length=500)
    department: str | None = Field(None, max_length=150)
    academic_year: int | None = Field(None, ge=1, le=8)


class ChangePasswordRequest(BaseModel):
    """Payload for authenticated password change."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_must_differ(self) -> "ChangePasswordRequest":
        if self.current_password == self.new_password:
            raise ValueError("New password must be different from current password")
        return self


class UserStatusResponse(BaseModel):
    """Lightweight auth-status payload for quick checks."""

    id: uuid.UUID
    email: EmailStr
    is_active: bool
    is_verified_student: bool
    role: str

    model_config = {"from_attributes": True}
