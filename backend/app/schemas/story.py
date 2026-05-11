import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class StoryCreateRequest(BaseModel):
    """Payload to create a story."""
    image_url: str = Field(..., min_length=1, max_length=500)


class StoryAuthorSummary(BaseModel):
    """Lightweight author info for story responses."""
    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None


class StoryResponse(BaseModel):
    """Single story representation."""
    id: uuid.UUID
    author: StoryAuthorSummary
    image_url: str
    created_at: datetime
    expires_at: datetime


class UserStoriesResponse(BaseModel):
    """A user's active stories grouped together."""
    user: StoryAuthorSummary
    stories: list[StoryResponse]
