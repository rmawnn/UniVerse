from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.verification_request import VerificationRequest
from app.utils.constants import VerificationStatus


class VerificationRepository:
    """Database access for VerificationRequest entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, request: VerificationRequest) -> VerificationRequest:
        self.db.add(request)
        await self.db.flush()
        await self.db.refresh(request)
        return request

    async def get_by_id(self, request_id: UUID) -> VerificationRequest | None:
        return await self.db.get(VerificationRequest, request_id)

    async def get_latest_pending(
        self, user_id: UUID,
    ) -> VerificationRequest | None:
        """Find the most recent pending request for this user."""
        stmt = (
            select(VerificationRequest)
            .where(
                VerificationRequest.user_id == user_id,
                VerificationRequest.status == VerificationStatus.PENDING.value,
            )
            .order_by(VerificationRequest.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def cancel_pending_for_user(self, user_id: UUID) -> None:
        """Cancel all pending requests for a user (called before creating a new one)."""
        stmt = (
            update(VerificationRequest)
            .where(
                VerificationRequest.user_id == user_id,
                VerificationRequest.status == VerificationStatus.PENDING.value,
            )
            .values(status=VerificationStatus.CANCELLED.value)
        )
        await self.db.execute(stmt)

    async def mark_verified(self, request: VerificationRequest) -> None:
        """Mark a request as verified with a timestamp."""
        request.status = VerificationStatus.VERIFIED.value
        request.verified_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def mark_rejected(
        self, request: VerificationRequest, reason: str | None = None,
    ) -> None:
        request.status = VerificationStatus.REJECTED.value
        request.rejection_reason = reason
        await self.db.flush()

    async def get_latest_for_user(self, user_id: UUID) -> VerificationRequest | None:
        """Get the most recent verification request for a user (any status)."""
        stmt = (
            select(VerificationRequest)
            .where(VerificationRequest.user_id == user_id)
            .order_by(VerificationRequest.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    # ── Admin listing ────────────────────────────────────────

    def _apply_admin_filters(self, stmt, *, status, method, university_id, search):
        """Shared filter logic for admin list and count queries."""
        if status:
            stmt = stmt.where(VerificationRequest.status == status)
        if method:
            stmt = stmt.where(VerificationRequest.verification_method == method)
        if university_id:
            stmt = stmt.where(VerificationRequest.university_id == university_id)
        if search:
            pattern = f"%{search}%"
            user_ids_sub = (
                select(User.id)
                .where(
                    or_(
                        User.username.ilike(pattern),
                        User.email.ilike(pattern),
                        User.full_name.ilike(pattern),
                    )
                )
            )
            stmt = stmt.where(
                or_(
                    VerificationRequest.user_id.in_(user_ids_sub),
                    VerificationRequest.university_email.ilike(pattern),
                )
            )
        return stmt

    async def list_all(
        self,
        *,
        status: str | None = None,
        method: str | None = None,
        university_id: UUID | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[VerificationRequest]:
        stmt = (
            select(VerificationRequest)
            .order_by(VerificationRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        stmt = self._apply_admin_filters(
            stmt, status=status, method=method,
            university_id=university_id, search=search,
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_all(
        self,
        *,
        status: str | None = None,
        method: str | None = None,
        university_id: UUID | None = None,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(VerificationRequest)
        stmt = self._apply_admin_filters(
            stmt, status=status, method=method,
            university_id=university_id, search=search,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
