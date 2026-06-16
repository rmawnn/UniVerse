"""add fk ai_usage_logs user_id

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-06-15 23:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('ai_usage_logs', 'user_id', nullable=True)
    op.create_foreign_key(
        'fk_ai_usage_logs_user_id',
        'ai_usage_logs',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_ai_usage_logs_user_id', 'ai_usage_logs', type_='foreignkey')
    op.alter_column('ai_usage_logs', 'user_id', nullable=False)
