from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ReportCreateRequest(BaseModel):
    target_type: str  # post | comment | community | job | user
    target_id: UUID
    reason: str


class ReportResponse(BaseModel):
    id: UUID
    reporter_id: UUID
    target_type: str
    target_id: UUID
    reason: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminReportResponse(BaseModel):
    id: UUID
    reporter_id: UUID
    reporter_username: str
    target_type: str
    target_id: UUID
    target_label: str
    reason: str
    status: str
    created_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by: UUID | None = None


class ReportStatusUpdate(BaseModel):
    status: str  # reviewed | dismissed | action_taken
