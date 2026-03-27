import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.post import PostAuthorSummary


class CommentCreateRequest(BaseModel):
    """Payload for creating a comment on a post."""
    content: str = Field(..., min_length=1, max_length=2000)


class CommentResponse(BaseModel):
    """Public-facing comment representation."""
    id: uuid.UUID
    post_id: uuid.UUID
    author: PostAuthorSummary
    content: str
    created_at: datetime
    updated_at: datetime
