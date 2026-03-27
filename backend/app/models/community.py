import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, BaseModel
from app.utils.constants import CommunityRole


class Community(BaseModel):
    """
    A group space where verified students gather, post, and interact.

    Every community belongs to a university and was created by a specific user.
    """

    __tablename__ = "communities"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    university_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("universities.id"),
        index=True,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    is_public: Mapped[bool] = mapped_column(default=True)


class CommunityMember(Base):
    """
    Junction table: which user belongs to which community and in what role.

    Uses a composite PK (user_id, community_id) — no surrogate id needed.
    Inherits from Base (not BaseModel) because it doesn't need UUID id
    or updated_at. It's a lightweight association row.
    """

    __tablename__ = "community_members"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        primary_key=True,
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        default=CommunityRole.MEMBER.value,
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
