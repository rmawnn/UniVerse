import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExists, BadRequest, NotFound
from app.models.community import Community, CommunityMember
from app.models.user import User
from app.repositories.community_repository import CommunityRepository
from app.schemas.common import PaginatedResponse
from app.schemas.community import (
    CommunityCreateRequest,
    CommunityDetailResponse,
    CommunityResponse,
)
from app.utils.constants import CommunityRole


async def create_community(
    db: AsyncSession,
    current_user: User,
    data: CommunityCreateRequest,
) -> CommunityDetailResponse:
    """
    Create a community scoped to the user's university.
    The creator automatically becomes the community admin.
    """
    if not current_user.university_id:
        raise BadRequest("You must be linked to a university to create a community")

    repo = CommunityRepository(db)

    # Create the community
    community = Community(
        name=data.name,
        description=data.description,
        university_id=current_user.university_id,
        created_by=current_user.id,
        is_public=data.is_public,
    )
    community = await repo.create(community)

    # Creator becomes admin
    membership = CommunityMember(
        user_id=current_user.id,
        community_id=community.id,
        role=CommunityRole.ADMIN.value,
    )
    await repo.add_member(membership)

    return CommunityDetailResponse(
        **_community_to_dict(community),
        member_count=1,
        is_member=True,
        my_role=CommunityRole.ADMIN.value,
    )


async def get_community(
    db: AsyncSession,
    community_id: UUID,
    current_user: User | None = None,
) -> CommunityDetailResponse:
    """Get a single community with membership context for the caller."""
    repo = CommunityRepository(db)
    community = await repo.get_by_id(community_id)

    if not community:
        raise NotFound("Community")

    count = await repo.member_count(community_id)
    is_member = False
    my_role = None

    if current_user:
        member = await repo.get_member(community_id, current_user.id)
        if member:
            is_member = True
            my_role = member.role

    return CommunityDetailResponse(
        **_community_to_dict(community),
        member_count=count,
        is_member=is_member,
        my_role=my_role,
    )


async def list_communities(
    db: AsyncSession,
    university_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[CommunityResponse]:
    """List communities for a specific university, paginated."""
    repo = CommunityRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_by_university(university_id)
    communities = await repo.list_by_university(
        university_id, skip=skip, limit=page_size,
    )

    items = []
    for c in communities:
        count = await repo.member_count(c.id)
        items.append(CommunityResponse(
            **_community_to_dict(c),
            member_count=count,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def join_community(
    db: AsyncSession,
    community_id: UUID,
    current_user: User,
) -> CommunityDetailResponse:
    """Join an existing public community."""
    repo = CommunityRepository(db)
    community = await repo.get_by_id(community_id)

    if not community:
        raise NotFound("Community")

    if not community.is_public:
        raise BadRequest("This community is not open for joining")

    if await repo.is_member(community_id, current_user.id):
        raise AlreadyExists("You are already a member of this community")

    membership = CommunityMember(
        user_id=current_user.id,
        community_id=community_id,
        role=CommunityRole.MEMBER.value,
    )
    await repo.add_member(membership)

    count = await repo.member_count(community_id)

    return CommunityDetailResponse(
        **_community_to_dict(community),
        member_count=count,
        is_member=True,
        my_role=CommunityRole.MEMBER.value,
    )


def _community_to_dict(community: Community) -> dict:
    """Convert a Community ORM object to a dict for schema construction."""
    return {
        "id": community.id,
        "name": community.name,
        "description": community.description,
        "university_id": community.university_id,
        "created_by": community.created_by,
        "is_public": community.is_public,
        "created_at": community.created_at,
        "updated_at": community.updated_at,
    }
