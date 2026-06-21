"""fix uuid defaults and university data

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-06-21 00:00:00.000000

Fixes:
  1. Add server_default gen_random_uuid() to all id columns so raw SQL
     INSERT works without explicit ids.
  2. Correct universities.domain: iru.edu.tr → rumeli.edu.tr
  3. Add ON DELETE SET NULL to users.university_id FK so university
     rows can be safely removed without cascading user deletes.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Every table that inherits BaseModel and needs the UUID server_default.
def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Add server_default to all UUID primary keys ──────────
    #    Query the actual schema to find tables that have an "id" column,
    #    so we don't break on junction tables with composite PKs.
    rows = conn.execute(
        sa.text(
            "SELECT table_name FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "AND column_name = 'id' "
            "AND table_name NOT IN ('alembic_version')"
        )
    ).fetchall()
    tables_with_id = [r[0] for r in rows]

    for table in tables_with_id:
        op.alter_column(
            table, "id",
            server_default=sa.text("gen_random_uuid()"),
        )

    # ── 2. Fix university domain: iru.edu.tr → rumeli.edu.tr ───
    op.execute(
        sa.text(
            "UPDATE universities SET domain = 'rumeli.edu.tr' "
            "WHERE domain = 'iru.edu.tr'"
        )
    )

    # ── 3. Fix FK: users.university_id → ON DELETE SET NULL ────
    fk_users = conn.execute(
        sa.text(
            "SELECT confdeltype FROM pg_constraint "
            "WHERE conname = 'users_university_id_fkey'"
        )
    ).scalar()
    if fk_users and fk_users != 'n':
        op.drop_constraint(
            "users_university_id_fkey", "users", type_="foreignkey"
        )
        op.create_foreign_key(
            "users_university_id_fkey",
            "users", "universities",
            ["university_id"], ["id"],
            ondelete="SET NULL",
        )

    # ── 4. Fix FK: verification_requests.university_id → SET NULL
    fk_vr = conn.execute(
        sa.text(
            "SELECT confdeltype FROM pg_constraint "
            "WHERE conname = 'verification_requests_university_id_fkey'"
        )
    ).scalar()
    if fk_vr and fk_vr != 'n':
        op.drop_constraint(
            "verification_requests_university_id_fkey",
            "verification_requests",
            type_="foreignkey",
        )
        op.create_foreign_key(
            "verification_requests_university_id_fkey",
            "verification_requests", "universities",
            ["university_id"], ["id"],
            ondelete="SET NULL",
        )
    op.alter_column(
        "verification_requests", "university_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    # Reverse FK changes
    op.alter_column(
        "verification_requests", "university_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
    op.drop_constraint(
        "verification_requests_university_id_fkey",
        "verification_requests",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "verification_requests_university_id_fkey",
        "verification_requests", "universities",
        ["university_id"], ["id"],
    )

    op.drop_constraint(
        "users_university_id_fkey", "users", type_="foreignkey"
    )
    op.create_foreign_key(
        "users_university_id_fkey",
        "users", "universities",
        ["university_id"], ["id"],
    )

    # Reverse domain change
    op.execute(
        sa.text(
            "UPDATE universities SET domain = 'iru.edu.tr' "
            "WHERE domain = 'rumeli.edu.tr'"
        )
    )

    # Remove server_default from tables that have an id column
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT table_name FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "AND column_name = 'id' "
            "AND table_name NOT IN ('alembic_version')"
        )
    ).fetchall()
    for row in rows:
        op.alter_column(
            row[0], "id",
            server_default=None,
        )
