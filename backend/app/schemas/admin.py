from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AdminUserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: str
    is_active: bool
    is_verified_student: bool
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
