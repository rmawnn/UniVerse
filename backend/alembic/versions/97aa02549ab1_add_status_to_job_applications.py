"""add_status_to_job_applications

Revision ID: 97aa02549ab1
Revises: 2b9ac721a970
Create Date: 2026-05-18 00:23:29.076827
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '97aa02549ab1'
down_revision: Union[str, None] = '2b9ac721a970'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('job_applications', sa.Column('status', sa.String(length=20), server_default='pending', nullable=False))


def downgrade() -> None:
    op.drop_column('job_applications', 'status')
