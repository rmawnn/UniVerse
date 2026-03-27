import uuid
from datetime import datetime

from pydantic import BaseModel


class UniversityResponse(BaseModel):
    """Public representation of a university."""

    id: uuid.UUID
    name: str
    domain: str
    country: str | None = None
    logo_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
