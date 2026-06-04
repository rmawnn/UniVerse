"""add cv_url to job_applications

Revision ID: e5f6a7b8c9d0
Revises: 51bceebde41e
Create Date: 2025-06-05 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: str = "51bceebde41e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "job_applications",
        sa.Column("cv_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("job_applications", "cv_url")
