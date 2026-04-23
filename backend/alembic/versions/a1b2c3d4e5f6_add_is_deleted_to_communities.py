"""add is_deleted to communities

Revision ID: a1b2c3d4e5f6
Revises: dfcdc4d59a9f
Create Date: 2026-04-24 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'dfcdc4d59a9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'communities',
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.create_index(op.f('ix_communities_is_deleted'), 'communities', ['is_deleted'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_communities_is_deleted'), table_name='communities')
    op.drop_column('communities', 'is_deleted')
