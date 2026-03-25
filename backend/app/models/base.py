import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base.

    All ORM models ultimately inherit from this so that Base.metadata
    holds every table — which is what Alembic reads for autogenerate.

    Do NOT add columns here. Use BaseModel for domain entities.
    This class exists separately so that junction / association tables
    can inherit Base directly without being forced into the
    id + timestamps contract.
    """

    def __repr__(self) -> str:
        cols = {c.key: getattr(self, c.key, None) for c in self.__table__.columns}
        col_str = ", ".join(f"{k}={v!r}" for k, v in cols.items())
        return f"<{type(self).__name__}({col_str})>"


class BaseModel(Base):
    """
    Abstract base for every domain entity (User, Post, Community, …).

    Provides three columns automatically:
      id         — UUID v4 primary key, generated in Python before INSERT
      created_at — timezone-aware, set by PostgreSQL on INSERT
      updated_at — timezone-aware, set by PostgreSQL on INSERT,
                   updated by SQLAlchemy ORM on flush

    Usage:
        class User(BaseModel):
            __tablename__ = "users"
            email: Mapped[str] = mapped_column(unique=True)
    """

    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
