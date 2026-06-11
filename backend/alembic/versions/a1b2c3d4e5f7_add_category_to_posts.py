"""add_category_to_posts

Revision ID: a1b2c3d4e5f7
Revises: 9485505abcee
Create Date: 2026-06-11 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = '9485505abcee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('posts', sa.Column('category', sa.String(length=20), nullable=True))
    op.create_index(op.f('ix_posts_category'), 'posts', ['category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_posts_category'), table_name='posts')
    op.drop_column('posts', 'category')
