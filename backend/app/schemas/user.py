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
    email_verified: bool = False
    is_verified_student: bool
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MyProfileResponse(BaseModel):
    """Enriched profile for the authenticated user. Includes counts."""

    id: uuid.UUID
    email: EmailStr
    username: str
    full_name: str
    university_id: uuid.UUID | None = None
    university_name: str | None = None
    department: str | None = None
    academic_year: int | None = None
    bio: str | None = None
    profile_image_url: str | None = None
    is_active: bool
    email_verified: bool = False
    is_verified_student: bool
    role: str
    posts_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    communities_count: int = 0
    created_at: datetime
    updated_at: datetime


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


class CommunitySummary(BaseModel):
    """Lightweight community info for profile views."""
    id: uuid.UUID
    name: str


class PublicUserProfileResponse(BaseModel):
    """Public profile visible to other authenticated users.
    Does not expose email, password_hash, role, or is_active."""

    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None
    bio: str | None = None
    department: str | None = None
    academic_year: int | None = None
    university_id: uuid.UUID | None = None
    university_name: str | None = None
    is_verified_student: bool
    communities: list[CommunitySummary] = []
    posts_count: int = 0
    followers_count: int = 0
    following_count: int = 0
    communities_count: int = 0
    is_following: bool = False
    created_at: datetime


class UserSearchResponse(BaseModel):
    """Lightweight user representation for search results.
    Does not expose email, role, or sensitive flags."""

    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None
    university_id: uuid.UUID | None = None
    is_verified_student: bool

    model_config = {"from_attributes": True}


class FollowResponse(BaseModel):
    """Response after follow/unfollow action."""
    followers_count: int
    following_count: int
    is_following: bool


class UserStatusResponse(BaseModel):
    """Lightweight auth-status payload for quick checks."""

    id: uuid.UUID
    email: EmailStr
    is_active: bool
    email_verified: bool = False
    is_verified_student: bool
    role: str

    model_config = {"from_attributes": True}


class UserInsightsResponse(BaseModel):
    """Simple activity insights for the authenticated user."""

    total_posts: int
    total_likes_received: int
    total_comments_received: int


class NotificationSettingsResponse(BaseModel):
    """Current notification preference toggles."""
    notify_job_applications: bool
    notify_new_jobs: bool

    model_config = {"from_attributes": True}


class NotificationSettingsUpdateRequest(BaseModel):
    """Payload for updating notification preferences."""
    notify_job_applications: bool | None = None
    notify_new_jobs: bool | None = None
