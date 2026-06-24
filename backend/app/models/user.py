import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.utils.constants import UserRole


class User(BaseModel):
    """
    Core user entity for UniVerse.

    Every registered person on the platform has exactly one User row.
    Authentication fields (email, password_hash) and profile fields
    (full_name, bio, etc.) live together intentionally — splitting into
    separate User + UserProfile tables adds a JOIN to every authenticated
    request for zero practical benefit at this scale.

    University reference:
      university_id is a nullable UUID FK pointing to the universities table.
      Nullable because the user is created at registration before verification
      links them to a university. Once verified, this gets populated.
    """

    __tablename__ = "users"

    # ── Authentication ───────────────────────────────────────────
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # ── Identity ─────────────────────────────────────────────────
    username: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        index=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # ── Academic info ────────────────────────────────────────────
    university_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("universities.id", ondelete="SET NULL"),
        index=True,
    )
    department: Mapped[str | None] = mapped_column(String(150))
    academic_year: Mapped[int | None] = mapped_column()

    # ── Profile ──────────────────────────────────────────────────
    bio: Mapped[str | None] = mapped_column(Text)
    profile_image_url: Mapped[str | None] = mapped_column(String(500))
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    skills: Mapped[list[str] | None] = mapped_column(ARRAY(String(100)))

    # ── Status & permissions ─────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(default=True)
    email_verified: Mapped[bool] = mapped_column(default=False)
    is_verified_student: Mapped[bool] = mapped_column(default=False)
    role: Mapped[str] = mapped_column(
        String(20),
        default=UserRole.STUDENT.value,
    )

    # ── Notification preferences ─────────────────────────────────
    notify_job_applications: Mapped[bool] = mapped_column(default=True, server_default="true")
    notify_new_jobs: Mapped[bool] = mapped_column(default=True, server_default="true")

    # ── Relationships (loaded lazily — defined here, queried in repos) ──
    # university = relationship("University", back_populates="students", lazy="raise")
