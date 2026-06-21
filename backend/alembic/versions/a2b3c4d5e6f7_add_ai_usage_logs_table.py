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
    conn = op.get_bind()
    table_exists = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'ai_usage_logs'"
        )
    ).scalar()

    if not table_exists:
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

    # Indexes: IF NOT EXISTS via raw SQL to be idempotent
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_ai_usage_logs_user_id ON ai_usage_logs (user_id)"
    ))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_ai_usage_logs_feature ON ai_usage_logs (feature)"
    ))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_ai_usage_logs_created_at ON ai_usage_logs (created_at)"
    ))


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_usage_logs_created_at'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_feature'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_user_id'), table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')
