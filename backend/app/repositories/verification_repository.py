from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

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

    async def get_latest_pending(
        self, user_id: UUID, university_email: str,
    ) -> VerificationRequest | None:
        """Find the most recent pending request for this user + email."""
        stmt = (
            select(VerificationRequest)
            .where(
                VerificationRequest.user_id == user_id,
                VerificationRequest.university_email == university_email,
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

    async def get_by_id(self, request_id: UUID) -> VerificationRequest | None:
        return await self.db.get(VerificationRequest, request_id)

    async def list_all(
        self,
        *,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[VerificationRequest]:
        stmt = (
            select(VerificationRequest)
            .order_by(VerificationRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if status:
            stmt = stmt.where(VerificationRequest.status == status)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_all(self, *, status: str | None = None) -> int:
        stmt = select(func.count()).select_from(VerificationRequest)
        if status:
            stmt = stmt.where(VerificationRequest.status == status)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def mark_rejected(
        self, request: VerificationRequest, reason: str | None = None,
    ) -> None:
        request.status = VerificationStatus.REJECTED.value
        request.rejection_reason = reason
        await self.db.flush()
