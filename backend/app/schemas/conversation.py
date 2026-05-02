import uuid
from datetime import datetime

from pydantic import BaseModel


class ConversationCreateRequest(BaseModel):
    """Payload for starting a DM conversation."""
    participant_id: uuid.UUID


class ParticipantSummary(BaseModel):
    """Lightweight user info embedded in conversation responses."""
    id: uuid.UUID
    username: str
    full_name: str
    profile_image_url: str | None = None

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    """Public-facing conversation representation."""
    id: uuid.UUID
    participants: list[ParticipantSummary]
    last_message: "MessageSummary | None" = None
    unread_count: int = 0
    created_at: datetime


class MessageSummary(BaseModel):
    """Compact message preview for conversation list."""
    id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    created_at: datetime


# Rebuild to resolve forward ref
ConversationResponse.model_rebuild()
