from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import RateLimiter
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.notification import NotificationMarkReadResponse, NotificationResponse
from app.services import notification_service

router = APIRouter()


@router.get("/notifications", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=60, window_seconds=60, prefix="notif:list")),
):
    """List my notifications, newest first. Rate limited: 60/min."""
    return await notification_service.list_notifications(
        db, current_user, page=page, page_size=page_size,
    )


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationMarkReadResponse,
)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    return await notification_service.mark_as_read(db, notification_id, current_user)


@router.patch("/notifications/read-all", response_model=NotificationMarkReadResponse)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    return await notification_service.mark_all_as_read(db, current_user)
