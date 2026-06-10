from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.password_reset import PasswordResetToken


class PasswordResetRepository:
    """Database access for PasswordResetToken entities.

    All methods receive an AsyncSession from the caller (service layer).
    None of them call commit() — transaction boundaries are owned by
    the get_db dependency at the request level.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, token: PasswordResetToken) -> PasswordResetToken:
        self.db.add(token)
        await self.db.flush()
        await self.db.refresh(token)
        return token

    async def get_by_token_hash(self, token_hash: str) -> PasswordResetToken | None:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_used(self, token: PasswordResetToken) -> None:
        """Mark a token as used so it cannot be replayed."""
        token.used_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def invalidate_all_for_user(self, user_id: UUID) -> None:
        """Mark all unused tokens for a user as used (e.g. after successful reset)."""
        stmt = (
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(timezone.utc))
        )
        await self.db.execute(stmt)
        await self.db.flush()
