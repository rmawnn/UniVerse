import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class JobPost(BaseModel):
    """
    A job or internship opportunity posted by a user.

    job_type: internship | part-time | full-time | freelance
    is_active: soft toggle — inactive jobs cannot receive new applications.
    """

    __tablename__ = "job_posts"

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(200))
    job_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True,
    )
    is_active: Mapped[bool] = mapped_column(default=True)
