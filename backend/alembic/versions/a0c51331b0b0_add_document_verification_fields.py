"""add_document_verification_fields

Revision ID: a0c51331b0b0
Revises: 2fae1cf69df0
Create Date: 2026-05-18 23:56:46.108308
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a0c51331b0b0'
down_revision: Union[str, None] = '2fae1cf69df0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('verification_requests', sa.Column('verification_method', sa.String(length=20), server_default='email', nullable=False))
    op.add_column('verification_requests', sa.Column('document_url', sa.String(length=500), nullable=True))
    op.add_column('verification_requests', sa.Column('code_hash', sa.String(length=128), nullable=True))
    op.alter_column('verification_requests', 'university_email',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.alter_column('verification_requests', 'expires_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               nullable=True)
    # Migrate existing raw codes to code_hash column, then drop old column
    op.execute("UPDATE verification_requests SET code_hash = verification_code WHERE verification_code IS NOT NULL")
    op.drop_column('verification_requests', 'verification_code')


def downgrade() -> None:
    op.add_column('verification_requests', sa.Column('verification_code', sa.VARCHAR(length=6), autoincrement=False, nullable=True))
    op.execute("UPDATE verification_requests SET verification_code = code_hash WHERE code_hash IS NOT NULL")
    op.execute("UPDATE verification_requests SET verification_code = '000000' WHERE verification_code IS NULL")
    op.alter_column('verification_requests', 'verification_code', nullable=False)
    op.alter_column('verification_requests', 'expires_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               nullable=False)
    op.alter_column('verification_requests', 'university_email',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.drop_column('verification_requests', 'code_hash')
    op.drop_column('verification_requests', 'document_url')
    op.drop_column('verification_requests', 'verification_method')
