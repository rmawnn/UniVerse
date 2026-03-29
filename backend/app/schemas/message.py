import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.conversation import ParticipantSummary


class MessageCreateRequest(BaseModel):
    """Payload for sending a message."""
    content: str = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    """Public-facing message representation."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender: ParticipantSummary
    content: str
    created_at: datetime
