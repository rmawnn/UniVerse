"""add user skills column

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-06-21 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = "f2a3b4c5d6e7"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    col_exists = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "AND table_name = 'users' "
            "AND column_name = 'skills'"
        )
    ).fetchone()

    if not col_exists:
        op.add_column(
            "users",
            sa.Column("skills", ARRAY(sa.String(100)), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("users", "skills")
