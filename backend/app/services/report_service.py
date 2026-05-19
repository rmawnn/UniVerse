import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.comment import Comment
from app.models.community import Community
from app.models.job_post import JobPost
from app.models.post import Post
from app.models.report import Report
from app.models.user import User
from app.repositories.report_repository import ReportRepository
from app.schemas.report import AdminReportResponse, ReportResponse

VALID_TARGET_TYPES = {"post", "comment", "community", "job", "user"}
VALID_STATUSES = {"reviewed", "dismissed", "action_taken"}


async def create_report(
    db: AsyncSession,
    reporter: User,
    target_type: str,
    target_id: UUID,
    reason: str,
) -> ReportResponse:
    if target_type not in VALID_TARGET_TYPES:
        raise BadRequest(f"Invalid target type: {target_type}")

    if not reason or not reason.strip():
        raise BadRequest("Reason is required")

    # Validate target exists
    await _validate_target(db, target_type, target_id)

    # Prevent self-reporting for user type
    if target_type == "user" and target_id == reporter.id:
        raise BadRequest("Cannot report yourself")

    repo = ReportRepository(db)

    # Check for duplicate
    existing = await repo.find_existing(reporter.id, target_type, target_id)
    if existing:
        raise BadRequest("You have already reported this content")

    report = Report(
        reporter_id=reporter.id,
        target_type=target_type,
        target_id=target_id,
        reason=reason.strip(),
        status="pending",
    )
    created = await repo.create(report)

    return ReportResponse.model_validate(created)


async def _validate_target(db: AsyncSession, target_type: str, target_id: UUID) -> None:
    model_map = {
        "post": Post,
        "comment": Comment,
        "community": Community,
        "job": JobPost,
        "user": User,
    }
    model = model_map[target_type]
    obj = await db.get(model, target_id)
    if obj is None:
        raise NotFound(f"{target_type.capitalize()} not found")


# ── Admin ────────────────────────────────────────────────────


async def list_reports(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    status: str | None = None,
    target_type: str | None = None,
) -> dict:
    repo = ReportRepository(db)
    skip = (page - 1) * page_size

    items, total = await repo.list_reports(
        skip=skip, limit=page_size, status=status, target_type=target_type,
    )

    # Batch-load reporter usernames
    reporter_ids = {r.reporter_id for r in items}
    if reporter_ids:
        stmt = select(User.id, User.username).where(User.id.in_(reporter_ids))
        result = await db.execute(stmt)
        username_map = {row.id: row.username for row in result}
    else:
        username_map = {}

    # Batch-load target labels
    enriched = []
    for r in items:
        label = await _get_target_label(db, r.target_type, r.target_id)
        enriched.append(
            AdminReportResponse(
                id=r.id,
                reporter_id=r.reporter_id,
                reporter_username=username_map.get(r.reporter_id, "unknown"),
                target_type=r.target_type,
                target_id=r.target_id,
                target_label=label,
                reason=r.reason,
                status=r.status,
                created_at=r.created_at,
                reviewed_at=r.reviewed_at,
                reviewed_by=r.reviewed_by,
            )
        )

    return {
        "items": enriched,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
    }


async def update_report_status(
    db: AsyncSession,
    report_id: UUID,
    new_status: str,
    admin_user: User,
) -> AdminReportResponse:
    if new_status not in VALID_STATUSES:
        raise BadRequest(f"Invalid status: {new_status}")

    repo = ReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise NotFound("Report not found")

    report.status = new_status
    report.reviewed_at = datetime.now(timezone.utc)
    report.reviewed_by = admin_user.id
    await repo.update(report)

    # Load reporter username
    reporter = await db.get(User, report.reporter_id)
    label = await _get_target_label(db, report.target_type, report.target_id)

    return AdminReportResponse(
        id=report.id,
        reporter_id=report.reporter_id,
        reporter_username=reporter.username if reporter else "unknown",
        target_type=report.target_type,
        target_id=report.target_id,
        target_label=label,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        reviewed_at=report.reviewed_at,
        reviewed_by=report.reviewed_by,
    )


async def _get_target_label(db: AsyncSession, target_type: str, target_id: UUID) -> str:
    if target_type == "post":
        post = await db.get(Post, target_id)
        if post:
            return post.content[:80] + ("..." if len(post.content) > 80 else "")
        return "[Deleted post]"
    elif target_type == "comment":
        comment = await db.get(Comment, target_id)
        if comment:
            return comment.content[:80] + ("..." if len(comment.content) > 80 else "")
        return "[Deleted comment]"
    elif target_type == "community":
        community = await db.get(Community, target_id)
        return community.name if community else "[Deleted community]"
    elif target_type == "job":
        job = await db.get(JobPost, target_id)
        return job.title if job else "[Deleted job]"
    elif target_type == "user":
        user = await db.get(User, target_id)
        return f"@{user.username}" if user else "[Deleted user]"
    return "[Unknown]"
