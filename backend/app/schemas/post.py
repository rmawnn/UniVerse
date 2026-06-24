import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.utils.sanitize import sanitize_text, is_safe_url


class PostCreateRequest(BaseModel):
    """Payload for creating a post inside a community."""
    content: str = Field(..., min_length=1, max_length=5000)
    image_url: str | None = Field(None, max_length=500)
    video_url: str | None = Field(None, max_length=500)
    post_type: str = Field("text", pattern=r"^(text|image|short|poll)$")
    poll_options: list[str] | None = Field(None, min_length=2, max_length=5)

    @field_validator("content")
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        return sanitize_text(v)

    @field_validator("image_url", "video_url")
    @classmethod
    def validate_urls(cls, v: str | None) -> str | None:
        if v is not None and not is_safe_url(v):
            raise ValueError("URL contains an unsafe scheme")
        return v

    @field_validator("poll_options")
    @classmethod
    def validate_poll_options(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        cleaned = [sanitize_text(o.strip()) for o in v if o.strip()]
        if len(cleaned) < 2:
            raise ValueError("Poll must have at least 2 options")
        if len(cleaned) > 5:
            raise ValueError("Poll can have at most 5 options")
        return cleaned


class PostAuthorSummary(BaseModel):
    """Lightweight author info embedded in post responses."""
    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None

    model_config = {"from_attributes": True}


class PollOptionResponse(BaseModel):
    id: uuid.UUID
    label: str
    position: int
    vote_count: int = 0
    pct: float = 0.0

    model_config = {"from_attributes": True}


class PollResponse(BaseModel):
    options: list[PollOptionResponse] = []
    total_votes: int = 0
    voted_option_id: uuid.UUID | None = None


class PostResponse(BaseModel):
    """Public-facing post representation."""
    id: uuid.UUID
    community_id: uuid.UUID
    author: PostAuthorSummary
    content: str
    image_url: str | None = None
    video_url: str | None = None
    post_type: str = "text"
    category: str | None = None
    like_count: int = 0
    comment_count: int = 0
    repost_count: int = 0
    liked_by_me: bool = False
    saved_by_me: bool = False
    reposted_by_me: bool = False
    feed_label: str | None = None
    recommendation_score: float | None = None
    poll: PollResponse | None = None
    created_at: datetime
    updated_at: datetime
