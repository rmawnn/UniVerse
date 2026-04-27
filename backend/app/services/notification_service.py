import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import Forbidden, NotFound
from app.models.notification import Notification
from app.models.user import User
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.notification import (
    NotificationActorSummary,
    NotificationMarkReadResponse,
    NotificationResponse,
)


# ── Helpers for other services to create notifications ──────────


async def notify(
    db: AsyncSession,
    *,
    user_id: UUID,
    actor_id: UUID | None = None,
    type: str,
    content: str,
    reference_id: UUID | None = None,
) -> None:
    """
    Create a notification for a user.

    Called by other services (post_like_service, comment_service, etc.)
    to fire-and-forget a notification. Intentionally does not return
    anything — callers don't need the notification object.

    Duplicate prevention: if the same actor already has an unread
    notification of the same type for the same reference, skip creation.
    """
    repo = NotificationRepository(db)

    # Prevent duplicate unread notifications from the same actor
    if actor_id and reference_id:
        if await repo.exists_duplicate(
            user_id=user_id,
            actor_id=actor_id,
            type=type,
            reference_id=reference_id,
        ):
            return

    notification = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        reference_id=reference_id,
        content=content,
    )
    await repo.create(notification)


# ── API-facing operations ───────────────────────────────────────


async def list_notifications(
    db: AsyncSession,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[NotificationResponse]:
    """List notifications for the current user, newest first."""
    repo = NotificationRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_by_user(current_user.id)
    notifications = await repo.list_by_user(current_user.id, skip=skip, limit=page_size)

    # Batch-load actors
    user_repo = UserRepository(db)
    actor_ids = {n.actor_id for n in notifications if n.actor_id}
    actors: dict[UUID, User] = {}
    for aid in actor_ids:
        user = await user_repo.get_by_id(aid)
        if user:
            actors[aid] = user

    items = [
        _build_notification_response(n, actors.get(n.actor_id) if n.actor_id else None)
        for n in notifications
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def mark_as_read(
    db: AsyncSession,
    notification_id: UUID,
    current_user: User,
) -> NotificationMarkReadResponse:
    """Mark a single notification as read."""
    repo = NotificationRepository(db)
    notification = await repo.get_by_id(notification_id)

    if not notification:
        raise NotFound("Notification")

    if notification.user_id != current_user.id:
        raise Forbidden("You can only mark your own notifications as read")

    await repo.mark_as_read(notification_id)
    unread = await repo.count_unread(current_user.id)

    return NotificationMarkReadResponse(success=True, unread_count=unread)


async def mark_all_as_read(
    db: AsyncSession,
    current_user: User,
) -> NotificationMarkReadResponse:
    """Mark all of the current user's notifications as read."""
    repo = NotificationRepository(db)
    await repo.mark_all_as_read(current_user.id)
    return NotificationMarkReadResponse(success=True, unread_count=0)


def _build_notification_response(
    n: Notification,
    actor: User | None,
) -> NotificationResponse:
    """Build a NotificationResponse with optional embedded actor summary."""
    actor_summary = None
    if actor:
        actor_summary = NotificationActorSummary(
            id=actor.id,
            username=actor.username,
            full_name=actor.full_name,
            profile_image_url=actor.profile_image_url,
        )

    return NotificationResponse(
        id=n.id,
        type=n.type,
        reference_id=n.reference_id,
        actor=actor_summary,
        content=n.content,
        is_read=n.is_read,
        created_at=n.created_at,
    )
