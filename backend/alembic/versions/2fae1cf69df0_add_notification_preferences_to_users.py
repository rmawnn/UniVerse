"""add_notification_preferences_to_users

Revision ID: 2fae1cf69df0
Revises: 97aa02549ab1
Create Date: 2026-05-18 00:36:20.190592
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fae1cf69df0'
down_revision: Union[str, None] = '97aa02549ab1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('notify_job_applications', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('users', sa.Column('notify_new_jobs', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'notify_new_jobs')
    op.drop_column('users', 'notify_job_applications')
