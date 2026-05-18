from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


# ── Users ────────────────────────────────────────────────────


class AdminUserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: str
    is_active: bool
    is_verified_student: bool
    role: str
    university_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RoleUpdateRequest(BaseModel):
    role: str


class AdminUserDetailResponse(AdminUserResponse):
    bio: str | None = None
    department: str | None = None
    academic_year: int | None = None
    profile_image_url: str | None = None
    university_name: str | None = None
    communities: list[dict] = []
    recent_posts: list[dict] = []


# ── Verifications ────────────────────────────────────────────


class AdminVerificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    username: str
    full_name: str
    verification_method: str
    university_email: str | None = None
    document_url: str | None = None
    university_id: UUID
    university_name: str | None = None
    status: str
    rejection_reason: str | None = None
    created_at: datetime
    expires_at: datetime | None = None
    verified_at: datetime | None = None


class RejectRequest(BaseModel):
    reason: str | None = None


# ── Communities ──────────────────────────────────────────────


class AdminCommunityResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    university_id: UUID
    member_count: int
    is_deleted: bool
    created_at: datetime


class AdminCommunityDetailResponse(AdminCommunityResponse):
    created_by_username: str | None = None
    members: list[dict] = []
    recent_posts: list[dict] = []


# ── Posts ────────────────────────────────────────────────────


class AdminPostResponse(BaseModel):
    id: UUID
    author_username: str
    author_full_name: str
    community_id: UUID
    community_name: str
    content_preview: str
    image_url: str | None = None
    is_deleted: bool
    created_at: datetime


class AdminPostDetailResponse(AdminPostResponse):
    content: str
    like_count: int = 0
    comment_count: int = 0
    comments: list[dict] = []


# ── Stats & Activity ────────────────────────────────────────


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    verified_students: int
    pending_verifications: int
    total_communities: int
    active_communities: int
    total_posts: int
    hidden_posts: int
    total_messages: int


class RecentActivityResponse(BaseModel):
    latest_users: list[dict]
    latest_verifications: list[dict]
    latest_posts: list[dict]
    latest_communities: list[dict]
