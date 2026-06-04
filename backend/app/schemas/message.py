import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.conversation import ParticipantSummary
from app.utils.sanitize import sanitize_text


class MessageCreateRequest(BaseModel):
    """Payload for sending a message."""
    content: str = Field(..., min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        return sanitize_text(v)


class MessageResponse(BaseModel):
    """Public-facing message representation."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender: ParticipantSummary
    content: str
    created_at: datetime
