import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AlreadyExists, BadRequest, Forbidden, NotFound
from app.models.community import Community, CommunityMember
from app.models.user import User
from app.repositories.community_repository import CommunityRepository
from app.schemas.common import PaginatedResponse
from app.schemas.community import (
    CommunityCreateRequest,
    CommunityDetailResponse,
    CommunityMemberResponse,
    CommunityResponse,
    CommunitySearchResponse,
    CommunityUpdateRequest,
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


async def update_community(
    db: AsyncSession,
    community_id: UUID,
    current_user: User,
    data: CommunityUpdateRequest,
) -> CommunityDetailResponse:
    """Update a community. Only the creator (admin) can edit."""
    repo = CommunityRepository(db)
    community = await repo.get_by_id(community_id)

    if not community:
        raise NotFound("Community")

    if community.created_by != current_user.id:
        raise Forbidden("Only the community creator can edit this community")

    # Build update dict from non-None fields
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise BadRequest("No fields to update")

    community = await repo.update(community, **updates)

    count = await repo.member_count(community_id)
    member = await repo.get_member(community_id, current_user.id)

    return CommunityDetailResponse(
        **_community_to_dict(community),
        member_count=count,
        is_member=member is not None,
        my_role=member.role if member else None,
    )


async def delete_community(
    db: AsyncSession,
    community_id: UUID,
    current_user: User,
) -> None:
    """Soft-delete a community. Only the creator (admin) can delete."""
    repo = CommunityRepository(db)
    community = await repo.get_by_id(community_id)

    if not community:
        raise NotFound("Community")

    if community.created_by != current_user.id:
        raise Forbidden("Only the community creator can delete this community")

    await repo.soft_delete(community)


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


async def leave_community(
    db: AsyncSession,
    community_id: UUID,
    current_user: User,
) -> None:
    """Leave a community. Blocks if the user is the only admin."""
    repo = CommunityRepository(db)
    community = await repo.get_by_id(community_id)

    if not community:
        raise NotFound("Community")

    member = await repo.get_member(community_id, current_user.id)
    if not member:
        raise BadRequest("You are not a member of this community")

    # Block leaving if user is the sole admin
    if member.role == CommunityRole.ADMIN.value:
        admin_count = await repo.count_admins(community_id)
        if admin_count <= 1:
            raise BadRequest(
                "You are the only admin. Transfer ownership or delete the community instead."
            )

    await repo.remove_member(member)


async def list_members(
    db: AsyncSession,
    community_id: UUID,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 50,
) -> PaginatedResponse[CommunityMemberResponse]:
    """List members of a community. Requires the caller to be a member."""
    repo = CommunityRepository(db)
    community = await repo.get_by_id(community_id)

    if not community:
        raise NotFound("Community")

    if not await repo.is_member(community_id, current_user.id):
        raise Forbidden("You must be a member to view the member list")

    total = await repo.member_count(community_id)
    skip = (page - 1) * page_size
    rows = await repo.list_members(community_id, skip=skip, limit=page_size)

    items = [
        CommunityMemberResponse(
            user_id=user.id,
            username=user.username,
            full_name=user.full_name,
            profile_image_url=user.profile_image_url,
            role=member.role,
            joined_at=member.joined_at,
        )
        for member, user in rows
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def remove_member(
    db: AsyncSession,
    community_id: UUID,
    target_user_id: UUID,
    current_user: User,
) -> None:
    """Remove a member from a community. Only admin/creator can remove."""
    repo = CommunityRepository(db)
    community = await repo.get_by_id(community_id)

    if not community:
        raise NotFound("Community")

    # Only the admin/creator can remove members
    caller_member = await repo.get_member(community_id, current_user.id)
    if not caller_member or caller_member.role != CommunityRole.ADMIN.value:
        raise Forbidden("Only the community admin can remove members")

    # Prevent admin from removing themselves if they're the only admin
    if target_user_id == current_user.id:
        admin_count = await repo.count_admins(community_id)
        if admin_count <= 1:
            raise BadRequest("Cannot remove the only admin from the community")

    target_member = await repo.get_member(community_id, target_user_id)
    if not target_member:
        raise NotFound("Member")

    await repo.remove_member(target_member)


async def search_communities(
    db: AsyncSession,
    query: str,
    *,
    university_id: UUID | None = None,
    current_user: User | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[CommunitySearchResponse]:
    """Search communities by name or description.

    Optionally filter by university. If authenticated, enriches with is_member.
    """
    query = query.strip()
    if len(query) < 2:
        raise BadRequest("Search query must be at least 2 characters")

    repo = CommunityRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_search(query, university_id=university_id)
    communities = await repo.search(
        query, university_id=university_id, skip=skip, limit=page_size,
    )

    if not communities:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch load member counts
    community_ids = [c.id for c in communities]
    member_counts = await repo.member_counts_batch(community_ids)

    # Batch load membership for current user
    joined_ids: set[UUID] = set()
    if current_user:
        joined_ids = set(await repo.get_joined_ids(current_user.id))

    items = [
        CommunitySearchResponse(
            **_community_to_dict(c),
            member_count=member_counts.get(c.id, 0),
            is_member=(c.id in joined_ids) if current_user else None,
        )
        for c in communities
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
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
