import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.utils.constants import VerificationStatus


class VerificationRequest(BaseModel):
    """
    Tracks a student verification attempt (email or document).

    Lifecycle (email):
      1. User submits university email → row created (method=email, status=pending)
      2. User submits the 6-digit code before expiry → status=verified
      3. Expiry passes → status=expired
      4. New request → old pending rows become cancelled

    Lifecycle (document):
      1. User uploads document + selects university → row created (method=document, status=pending)
      2. Admin approves → status=verified
      3. Admin rejects → status=rejected
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
    verification_method: Mapped[str] = mapped_column(
        String(20),
        default="email",
        server_default="email",
        nullable=False,
    )
    university_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    document_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    code_hash: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default=VerificationStatus.PENDING.value,
        nullable=False,
    )
    rejection_reason: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
