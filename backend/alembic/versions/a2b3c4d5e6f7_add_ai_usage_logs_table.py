"""add ai_usage_logs table

Revision ID: a2b3c4d5e6f7
Revises: 1d4f4fd3005b
Create Date: 2026-06-15 22:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '1d4f4fd3005b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('feature', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('latency_ms', sa.Integer(), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_ai_usage_logs_user_id'), 'ai_usage_logs', ['user_id'])
    op.create_index(op.f('ix_ai_usage_logs_feature'), 'ai_usage_logs', ['feature'])
    op.create_index(op.f('ix_ai_usage_logs_created_at'), 'ai_usage_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_usage_logs_created_at'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_feature'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_user_id'), table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')
