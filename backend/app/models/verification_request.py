import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
      2. OCR pipeline extracts text → ocr_extracted_data populated
      3. AI validator scores the submission → ai_confidence, ai_flags populated
      4. High confidence → auto-verified (status=verified)
      5. Low confidence → admin review (status=under_review)
      6. Suspicious → status=suspicious, added to moderation queue
      7. Admin approves → status=verified
      8. Admin rejects → status=rejected
    """

    __tablename__ = "verification_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    university_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("universities.id", ondelete="SET NULL"),
        nullable=True,
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

    # ── OCR extracted data ──────────────────────────────────
    ocr_extracted_data: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="OCR-extracted fields: student_name, student_number, university_name, department, expiration_date",
    )
    ocr_raw_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Full raw OCR text output from the document",
    )

    # ── AI validation results ───────────────────────────────
    ai_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="AI confidence score 0.0–1.0. >0.85 auto-approve, <0.4 suspicious",
    )
    ai_flags: Mapped[list | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="List of AI-detected issues: name_mismatch, blurry, possibly_edited, etc.",
    )
    ai_validation_details: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Detailed AI validation breakdown with individual scores",
    )

    # ── Review metadata ─────────────────────────────────────
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    attempt_number: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
        comment="Which attempt this is for this user (1st, 2nd, etc.)",
    )

    # ── File metadata ───────────────────────────────────────
    file_size_bytes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    file_content_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    file_hash: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment="SHA-256 hash of uploaded file for duplicate detection",
    )
