from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.community import Community, CommunityMember


class CommunityRepository:
    """Database access for Community and CommunityMember entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Community CRUD ────────────────────────────────────────

    async def create(self, community: Community) -> Community:
        self.db.add(community)
        await self.db.flush()
        await self.db.refresh(community)
        return community

    async def get_by_id(self, community_id: UUID) -> Community | None:
        return await self.db.get(Community, community_id)

    async def list_by_university(
        self, university_id: UUID, *, skip: int = 0, limit: int = 50,
    ) -> list[Community]:
        stmt = (
            select(Community)
            .where(Community.university_id == university_id)
            .order_by(Community.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_university(self, university_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Community)
            .where(Community.university_id == university_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    # ── Membership ────────────────────────────────────────────

    async def add_member(self, member: CommunityMember) -> CommunityMember:
        self.db.add(member)
        await self.db.flush()
        return member

    async def get_member(
        self, community_id: UUID, user_id: UUID,
    ) -> CommunityMember | None:
        return await self.db.get(CommunityMember, (user_id, community_id))

    async def is_member(self, community_id: UUID, user_id: UUID) -> bool:
        member = await self.get_member(community_id, user_id)
        return member is not None

    async def member_count(self, community_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(CommunityMember)
            .where(CommunityMember.community_id == community_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
