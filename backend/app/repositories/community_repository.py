from uuid import UUID

from sqlalchemy import select, func, case, or_
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
        stmt = select(Community).where(
            Community.id == community_id,
            Community.is_deleted == False,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, community: Community, **fields) -> Community:
        for key, value in fields.items():
            setattr(community, key, value)
        await self.db.flush()
        await self.db.refresh(community)
        return community

    async def soft_delete(self, community: Community) -> Community:
        community.is_deleted = True
        await self.db.flush()
        await self.db.refresh(community)
        return community

    async def list_by_university(
        self, university_id: UUID, *, skip: int = 0, limit: int = 50,
    ) -> list[Community]:
        stmt = (
            select(Community)
            .where(
                Community.university_id == university_id,
                Community.is_deleted == False,  # noqa: E712
            )
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
            .where(
                Community.university_id == university_id,
                Community.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    # ── Search ──────────────────────────────────────────────

    async def search(
        self,
        query: str,
        *,
        university_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Community]:
        """Search communities by name or description (ILIKE).

        Ordering: exact name match first, then by member count (popular first).
        """
        pattern = f"%{query}%"

        # Subquery for member counts
        member_counts = (
            select(
                CommunityMember.community_id,
                func.count().label("cnt"),
            )
            .group_by(CommunityMember.community_id)
        ).subquery()

        stmt = (
            select(Community)
            .outerjoin(member_counts, member_counts.c.community_id == Community.id)
            .where(
                Community.is_deleted == False,  # noqa: E712
                or_(
                    Community.name.ilike(pattern),
                    Community.description.ilike(pattern),
                ),
            )
            .order_by(
                case(
                    (func.lower(Community.name) == query.lower(), 0),
                    else_=1,
                ),
                func.coalesce(member_counts.c.cnt, 0).desc(),
                Community.name.asc(),
            )
            .offset(skip)
            .limit(limit)
        )

        if university_id is not None:
            stmt = stmt.where(Community.university_id == university_id)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self,
        query: str,
        *,
        university_id: UUID | None = None,
    ) -> int:
        pattern = f"%{query}%"

        stmt = (
            select(func.count())
            .select_from(Community)
            .where(
                Community.is_deleted == False,  # noqa: E712
                or_(
                    Community.name.ilike(pattern),
                    Community.description.ilike(pattern),
                ),
            )
        )

        if university_id is not None:
            stmt = stmt.where(Community.university_id == university_id)

        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def member_counts_batch(self, community_ids: list[UUID]) -> dict[UUID, int]:
        """Batch load member counts for multiple communities."""
        if not community_ids:
            return {}
        stmt = (
            select(CommunityMember.community_id, func.count())
            .where(CommunityMember.community_id.in_(community_ids))
            .group_by(CommunityMember.community_id)
        )
        result = await self.db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}
        return {cid: counts.get(cid, 0) for cid in community_ids}

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

    async def get_joined_ids(self, user_id: UUID) -> list[UUID]:
        """Return community IDs the user has joined, excluding deleted communities."""
        stmt = (
            select(CommunityMember.community_id)
            .join(Community, Community.id == CommunityMember.community_id)
            .where(
                CommunityMember.user_id == user_id,
                Community.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]

    async def list_by_user(self, user_id: UUID) -> list[Community]:
        """List communities a user belongs to (for profile display)."""
        stmt = (
            select(Community)
            .join(CommunityMember, CommunityMember.community_id == Community.id)
            .where(
                CommunityMember.user_id == user_id,
                Community.is_deleted == False,  # noqa: E712
            )
            .order_by(Community.name.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def member_count(self, community_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(CommunityMember)
            .where(CommunityMember.community_id == community_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
