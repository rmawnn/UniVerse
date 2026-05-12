import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CreateCollectionRequest(BaseModel):
    """Payload for creating a saved collection."""
    name: str = Field(..., min_length=1, max_length=100)


class SavedCollectionResponse(BaseModel):
    """Public-facing collection representation."""
    id: uuid.UUID
    name: str
    post_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
