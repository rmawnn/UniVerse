"""add_saved_collections_tables

Revision ID: a7b8c9d0e1f2
Revises: 243b1bddcfc9
Create Date: 2026-05-13 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "243b1bddcfc9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_collections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_saved_collections_user_id"),
        "saved_collections",
        ["user_id"],
    )

    op.create_table(
        "saved_collection_items",
        sa.Column(
            "collection_id", postgresql.UUID(as_uuid=True), nullable=False,
        ),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["collection_id"],
            ["saved_collections.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
        sa.PrimaryKeyConstraint("collection_id", "post_id"),
        sa.UniqueConstraint(
            "collection_id", "post_id", name="uq_collection_item",
        ),
    )


def downgrade() -> None:
    op.drop_table("saved_collection_items")
    op.drop_index(
        op.f("ix_saved_collections_user_id"),
        table_name="saved_collections",
    )
    op.drop_table("saved_collections")
