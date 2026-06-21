"""seed universities

Revision ID: e1f2a3b4c5d6
Revises: c4d5e6f7a8b9
Create Date: 2026-06-21 12:30:00.000000

Seeds the universities table with Turkish and US universities.
Also fixes iru.edu.tr → rumeli.edu.tr if the previous migration
didn't reach production.

Idempotent: uses ON CONFLICT DO NOTHING for inserts,
and a WHERE clause for the domain update.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

UNIVERSITIES = [
    ("Istanbul Rumeli University", "rumeli.edu.tr", "Turkey"),
    ("Acibadem University", "acibadem.edu.tr", "Turkey"),
    ("Istanbul Technical University", "itu.edu.tr", "Turkey"),
    ("Middle East Technical University", "metu.edu.tr", "Turkey"),
    ("Bogazici University", "boun.edu.tr", "Turkey"),
    ("Koc University", "ku.edu.tr", "Turkey"),
    ("Hacettepe University", "hacettepe.edu.tr", "Turkey"),
    ("Istanbul University", "istanbul.edu.tr", "Turkey"),
    ("Ankara University", "ankara.edu.tr", "Turkey"),
    ("Gazi University", "gazi.edu.tr", "Turkey"),
    ("Yeditepe University", "yeditepe.edu.tr", "Turkey"),
    ("Istanbul Medipol University", "medipol.edu.tr", "Turkey"),
    ("Stanford University", "stanford.edu", "USA"),
    ("MIT", "mit.edu", "USA"),
]


def upgrade() -> None:
    # Fix stale domain if previous migration didn't reach production
    op.execute(
        sa.text(
            "UPDATE universities SET domain = 'rumeli.edu.tr' "
            "WHERE domain = 'iru.edu.tr'"
        )
    )

    for name, domain, country in UNIVERSITIES:
        op.execute(
            sa.text(
                "INSERT INTO universities (id, name, domain, country, created_at, updated_at) "
                "VALUES (gen_random_uuid(), :name, :domain, :country, now(), now()) "
                "ON CONFLICT (domain) DO NOTHING"
            ).bindparams(name=name, domain=domain, country=country)
        )


def downgrade() -> None:
    # Don't delete universities on downgrade — data is valuable
    pass
