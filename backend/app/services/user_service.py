import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound, Unauthorized
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.community_repository import CommunityRepository
from app.repositories.follow_repository import FollowRepository
from app.repositories.university_repository import UniversityRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.repositories.post_repository import PostRepository
from app.repositories.comment_repository import CommentRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.schemas.user import (
    ChangePasswordRequest,
    CommunitySummary,
    MyProfileResponse,
    NotificationSettingsResponse,
    NotificationSettingsUpdateRequest,
    PublicUserProfileResponse,
    UserInsightsResponse,
    UserSearchResponse,
    UserUpdateRequest,
    UserResponse,
)


async def change_password(
    db: AsyncSession,
    current_user: User,
    data: ChangePasswordRequest,
) -> None:
    """Verify the current password, then replace it with the new one.

    Raises Unauthorized if current_password doesn't match.
    The schema already enforces that new != current at the string level.
    """
    if not verify_password(data.current_password, current_user.password_hash):
        raise Unauthorized("Current password is incorrect")

    new_hash = hash_password(data.new_password)
    repo = UserRepository(db)
    await repo.update_password(current_user, new_hash)


async def update_profile(
    db: AsyncSession,
    current_user: User,
    data: UserUpdateRequest,
) -> UserResponse:
    """Apply a partial update to the authenticated user's own profile.

    Only fields explicitly sent by the client are written — omitted fields
    stay unchanged.  Raises BadRequest if the payload is entirely empty.
    """
    fields = data.model_dump(exclude_unset=True)

    if not fields:
        raise BadRequest("No fields provided to update")

    repo = UserRepository(db)
    user = await repo.update(current_user, **fields)
    return UserResponse.model_validate(user)


async def get_my_profile(
    db: AsyncSession,
    current_user: User,
) -> MyProfileResponse:
    """Build the authenticated user's own profile with counts."""
    # Resolve university name
    university_name: str | None = None
    if current_user.university_id:
        uni_repo = UniversityRepository(db)
        university = await uni_repo.get_by_id(current_user.university_id)
        if university:
            university_name = university.name

    post_repo = PostRepository(db)
    posts_count = await post_repo.count_by_author(current_user.id)

    follow_repo = FollowRepository(db)
    followers_count = await follow_repo.count_followers(current_user.id)
    following_count = await follow_repo.count_following(current_user.id)

    community_repo = CommunityRepository(db)
    communities_count = await community_repo.count_by_user(current_user.id)

    return MyProfileResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        university_id=current_user.university_id,
        university_name=university_name,
        department=current_user.department,
        academic_year=current_user.academic_year,
        bio=current_user.bio,
        profile_image_url=current_user.profile_image_url,
        skills=current_user.skills or [],
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        is_verified_student=current_user.is_verified_student,
        role=current_user.role,
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        communities_count=communities_count,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


async def search_users(
    db: AsyncSession,
    current_user: User,
    query: str,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserSearchResponse]:
    """Search users by username or full_name.

    Excludes the current user from results.
    Rejects queries shorter than 2 characters.
    """
    query = query.strip()
    if len(query) < 2:
        raise BadRequest("Search query must be at least 2 characters")

    repo = UserRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_search(query, exclude_user_id=current_user.id)
    users = await repo.search(query, exclude_user_id=current_user.id, skip=skip, limit=page_size)

    items = [UserSearchResponse.model_validate(u) for u in users]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def get_public_profile_by_username(
    db: AsyncSession,
    username: str,
    current_user_id: UUID | None = None,
) -> PublicUserProfileResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_username(username)
    if not user or not user.is_active:
        raise NotFound("User")
    return await _build_public_profile(db, user, current_user_id)


async def get_public_profile(
    db: AsyncSession,
    target_user_id: UUID,
    current_user_id: UUID | None = None,
) -> PublicUserProfileResponse:
    """Fetch a user's public profile with university name and communities.

    Only active users are visible. Inactive or non-existent users return 404.
    """
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(target_user_id)

    if not user or not user.is_active:
        raise NotFound("User")

    return await _build_public_profile(db, user, current_user_id)


async def _build_public_profile(
    db: AsyncSession,
    user: User,
    current_user_id: UUID | None = None,
) -> PublicUserProfileResponse:
    university_name: str | None = None
    if user.university_id:
        uni_repo = UniversityRepository(db)
        university = await uni_repo.get_by_id(user.university_id)
        if university:
            university_name = university.name

    community_repo = CommunityRepository(db)
    communities = await community_repo.list_by_user(user.id)
    community_summaries = [
        CommunitySummary(id=c.id, name=c.name) for c in communities
    ]

    post_repo = PostRepository(db)
    posts_count = await post_repo.count_by_author(user.id)

    follow_repo = FollowRepository(db)
    followers_count = await follow_repo.count_followers(user.id)
    following_count = await follow_repo.count_following(user.id)

    is_following = False
    if current_user_id and current_user_id != user.id:
        is_following = await follow_repo.exists(current_user_id, user.id)

    return PublicUserProfileResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        profile_image_url=user.profile_image_url,
        bio=user.bio,
        department=user.department,
        academic_year=user.academic_year,
        university_id=user.university_id,
        university_name=university_name,
        is_verified_student=user.is_verified_student,
        skills=user.skills or [],
        communities=community_summaries,
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        communities_count=len(community_summaries),
        is_following=is_following,
        created_at=user.created_at,
    )


async def get_user_insights(
    db: AsyncSession,
    current_user: User,
) -> UserInsightsResponse:
    """Aggregate simple activity insights for the authenticated user.

    Three counts, each a single aggregation query:
      - total_posts: non-deleted posts authored
      - total_likes_received: likes on non-deleted posts authored
      - total_comments_received: comments by others on non-deleted posts authored
    """
    post_repo = PostRepository(db)
    total_posts = await post_repo.count_by_author(current_user.id)

    like_repo = PostLikeRepository(db)
    total_likes_received = await like_repo.count_received_by_author(current_user.id)

    comment_repo = CommentRepository(db)
    total_comments_received = await comment_repo.count_received_by_author(current_user.id)

    return UserInsightsResponse(
        total_posts=total_posts,
        total_likes_received=total_likes_received,
        total_comments_received=total_comments_received,
    )


async def get_follow_suggestions(
    db: AsyncSession,
    current_user: User,
    *,
    limit: int = 10,
) -> list[UserSearchResponse]:
    """Return users the current user might want to follow.

    Prioritises same-university, then verified students, with a random
    tiebreaker so each request feels fresh.
    """
    user_repo = UserRepository(db)
    users = await user_repo.list_suggested(
        current_user.id,
        university_id=current_user.university_id,
        limit=limit,
    )
    return [UserSearchResponse.model_validate(u) for u in users]


async def get_notification_settings(
    current_user: User,
) -> NotificationSettingsResponse:
    """Return the current user's notification preferences."""
    return NotificationSettingsResponse.model_validate(current_user)


async def update_notification_settings(
    db: AsyncSession,
    current_user: User,
    data: NotificationSettingsUpdateRequest,
) -> NotificationSettingsResponse:
    """Update the current user's notification preferences."""
    fields = data.model_dump(exclude_unset=True)
    if not fields:
        raise BadRequest("No fields provided to update")

    repo = UserRepository(db)
    user = await repo.update(current_user, **fields)
    return NotificationSettingsResponse.model_validate(user)
