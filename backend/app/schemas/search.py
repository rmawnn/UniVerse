from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SearchUserItem(BaseModel):
    id: UUID
    username: str
    full_name: str
    profile_image_url: str | None = None
    is_verified_student: bool


class SearchCommunityItem(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    member_count: int
    is_member: bool | None = None


class SearchPostItem(BaseModel):
    id: UUID
    author_username: str
    author_full_name: str
    community_name: str
    content_preview: str
    like_count: int
    comment_count: int
    created_at: datetime


class SearchJobItem(BaseModel):
    id: UUID
    title: str
    company_name: str | None = None
    location: str | None = None
    job_type: str
    is_active: bool
    created_at: datetime


class UnifiedSearchResponse(BaseModel):
    users: list[SearchUserItem]
    communities: list[SearchCommunityItem]
    posts: list[SearchPostItem]
    jobs: list[SearchJobItem]
    users_total: int
    communities_total: int
    posts_total: int
    jobs_total: int
