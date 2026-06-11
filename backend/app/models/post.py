import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Post(BaseModel):
    """
    A piece of content published inside a community.

    Soft-deleted via is_deleted — normal queries filter these out,
    but the data is preserved for moderation and audit.

    post_type:
      - "text"  — plain text post (default)
      - "image" — post with an attached image
      - "short" — short-form video post (Reels-lite)
    """

    __tablename__ = "posts"

    community_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("communities.id"),
        index=True,
        nullable=False,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    video_url: Mapped[str | None] = mapped_column(String(500))
    post_type: Mapped[str] = mapped_column(
        String(10), default="text", server_default="text", index=True,
    )
    category: Mapped[str | None] = mapped_column(String(20), index=True)
    is_deleted: Mapped[bool] = mapped_column(default=False)
