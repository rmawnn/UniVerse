import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PostCreateRequest(BaseModel):
    """Payload for creating a post inside a community."""
    content: str = Field(..., min_length=1, max_length=5000)
    image_url: str | None = Field(None, max_length=500)


class PostAuthorSummary(BaseModel):
    """Lightweight author info embedded in post responses."""
    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    """Public-facing post representation."""
    id: uuid.UUID
    community_id: uuid.UUID
    author: PostAuthorSummary
    content: str
    image_url: str | None = None
    like_count: int = 0
    comment_count: int = 0
    liked_by_me: bool = False
    saved_by_me: bool = False
    created_at: datetime
    updated_at: datetime
