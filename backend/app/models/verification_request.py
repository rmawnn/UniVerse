import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.utils.constants import VerificationStatus


class VerificationRequest(BaseModel):
    """
    Tracks a student email verification attempt.

    Lifecycle:
      1. User submits university email → row created with status=PENDING
      2. User submits the 6-digit code before expiry → status=VERIFIED,
         User.is_verified_student set to True, User.university_id linked
      3. If expiry passes without confirmation → status=EXPIRED
      4. If a new code is requested → old pending rows become CANCELLED
    """

    __tablename__ = "verification_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    university_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("universities.id"),
        nullable=False,
    )
    university_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    verification_code: Mapped[str] = mapped_column(
        String(6),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default=VerificationStatus.PENDING.value,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
