from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.post import PostAuthorSummary


# ── Trending Posts ──────────────────────────────────────────


class TrendingPostItem(BaseModel):
    id: UUID
    community_id: UUID
    author: PostAuthorSummary
    content: str
    image_url: str | None = None
    post_type: str = "text"
    like_count: int = 0
    comment_count: int = 0
    save_count: int = 0
    trending_score: float = 0.0
    created_at: datetime


# ── Trending Communities ────────────────────────────────────


class TrendingCommunityItem(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    member_count: int = 0
    posts_this_week: int = 0
    new_members_this_week: int = 0
    trending_score: float = 0.0
    is_member: bool | None = None
    created_at: datetime


# ── Trending Jobs ───────────────────────────────────────────


class TrendingJobItem(BaseModel):
    id: UUID
    title: str
    company_name: str | None = None
    location: str | None = None
    job_type: str
    author_username: str
    application_count: int = 0
    save_count: int = 0
    trending_score: float = 0.0
    created_at: datetime


# ── Combined response ───────────────────────────────────────


class TrendingResponse(BaseModel):
    posts: list[TrendingPostItem]
    communities: list[TrendingCommunityItem]
    jobs: list[TrendingJobItem]
