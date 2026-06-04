import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class JobApplication(BaseModel):
    """
    A user's application to a job post.

    Unique constraint: one application per (job_id, applicant_id).
    Status: pending → accepted | rejected
    """

    __tablename__ = "job_applications"

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_posts.id"),
        index=True,
        nullable=False,
    )
    applicant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    message: Mapped[str | None] = mapped_column(Text)
    cv_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("job_id", "applicant_id", name="uq_job_application"),
    )
