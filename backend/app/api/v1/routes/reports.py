from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.report import ReportCreateRequest, ReportResponse
from app.services import report_service

router = APIRouter()


@router.post("/reports", response_model=ReportResponse, status_code=201)
async def create_report(
    data: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a report for inappropriate content."""
    return await report_service.create_report(
        db,
        reporter=current_user,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
    )
