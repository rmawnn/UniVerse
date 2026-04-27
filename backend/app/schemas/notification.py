import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationActorSummary(BaseModel):
    """Lightweight actor info embedded in notification responses."""
    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None


class NotificationResponse(BaseModel):
    """Public-facing notification representation."""
    id: uuid.UUID
    type: str
    reference_id: uuid.UUID | None = None
    actor: NotificationActorSummary | None = None
    content: str
    is_read: bool
    created_at: datetime


class NotificationMarkReadResponse(BaseModel):
    """Response after marking notification(s) as read."""
    success: bool
    unread_count: int
