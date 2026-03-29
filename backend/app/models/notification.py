import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Notification(BaseModel):
    """
    A notification delivered to a user.

    Types (MVP):
      - "like"    — someone liked your post
      - "comment" — someone commented on your post
      - "message" — someone sent you a DM

    reference_id is polymorphic: it points to the post, comment, or
    conversation that triggered the notification. The type field
    disambiguates what it refers to.
    """

    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    reference_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(default=False, index=True)
