from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class University(BaseModel):
    """
    University entity — master data for verified institutions.

    Each row represents one university that UniVerse supports.
    Students are linked here via User.university_id after verification.

    This is the minimal version. Fields like address, website, logo_url,
    and student_count can be added when the universities module is built.
    """

    __tablename__ = "universities"

    name: Mapped[str] = mapped_column(
        String(200),
        unique=True,
        nullable=False,
    )
    domain: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="Email domain used for student verification (e.g. 'stanford.edu')",
    )
    country: Mapped[str | None] = mapped_column(String(100))
    logo_url: Mapped[str | None] = mapped_column(String(500))
