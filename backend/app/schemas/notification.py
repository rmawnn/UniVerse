import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    """Public-facing notification representation."""
    id: uuid.UUID
    type: str
    reference_id: uuid.UUID | None = None
    content: str
    is_read: bool
    created_at: datetime


class NotificationMarkReadResponse(BaseModel):
    """Response after marking notification(s) as read."""
    success: bool
    unread_count: int
