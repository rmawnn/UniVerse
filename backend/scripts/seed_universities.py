"""
Idempotent university seed script.

Inserts required universities into the database. Uses ON CONFLICT DO NOTHING
so it's safe to run multiple times. Existing rows are never modified.

Usage:
    cd backend
    python -m scripts.seed_universities
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine as async_engine, async_session_factory as async_session


UNIVERSITIES = [
    ("İstanbul Rumeli Üniversitesi", "rumeli.edu.tr", "Turkey"),
    ("Acıbadem Mehmet Ali Aydınlar Üniversitesi", "acibadem.edu.tr", "Turkey"),
    ("İstanbul Teknik Üniversitesi", "itu.edu.tr", "Turkey"),
    ("Boğaziçi Üniversitesi", "boun.edu.tr", "Turkey"),
    ("İstanbul Üniversitesi", "istanbul.edu.tr", "Turkey"),
    ("Orta Doğu Teknik Üniversitesi", "metu.edu.tr", "Turkey"),
    ("Koç Üniversitesi", "ku.edu.tr", "Turkey"),
    ("Hacettepe Üniversitesi", "hacettepe.edu.tr", "Turkey"),
    ("Ankara Üniversitesi", "ankara.edu.tr", "Turkey"),
    ("Gazi Üniversitesi", "gazi.edu.tr", "Turkey"),
    ("Yeditepe Üniversitesi", "yeditepe.edu.tr", "Turkey"),
    ("İstanbul Medipol Üniversitesi", "medipol.edu.tr", "Turkey"),
    ("Stanford University", "stanford.edu", "USA"),
    ("MIT", "mit.edu", "USA"),
]


async def seed():
    async with async_session() as session:
        inserted = 0
        skipped = 0

        for name, domain, country in UNIVERSITIES:
            result = await session.execute(
                text(
                    "INSERT INTO universities (id, name, domain, country, created_at, updated_at) "
                    "VALUES (gen_random_uuid(), :name, :domain, :country, now(), now()) "
                    "ON CONFLICT (domain) DO NOTHING "
                    "RETURNING id"
                ),
                {"name": name, "domain": domain, "country": country},
            )
            row = result.fetchone()
            if row:
                print(f"  + {name} ({domain})")
                inserted += 1
            else:
                print(f"  = {name} ({domain}) — already exists")
                skipped += 1

        await session.commit()
        print(f"\nDone: {inserted} inserted, {skipped} already existed.")


if __name__ == "__main__":
    print("Seeding universities...\n")
    asyncio.run(seed())
