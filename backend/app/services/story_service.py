from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.story import Story
from app.models.user import User
from app.repositories.story_repository import StoryRepository
from app.repositories.user_repository import UserRepository
from app.schemas.story import (
    StoryAuthorSummary,
    StoryCreateRequest,
    StoryResponse,
    UserStoriesResponse,
)

STORY_LIFETIME_HOURS = 24


def _build_author(user: User) -> StoryAuthorSummary:
    return StoryAuthorSummary(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        profile_image_url=user.profile_image_url,
    )


def _build_response(story: Story, author: StoryAuthorSummary) -> StoryResponse:
    return StoryResponse(
        id=story.id,
        author=author,
        image_url=story.image_url,
        created_at=story.created_at,
        expires_at=story.expires_at,
    )


async def create_story(
    db: AsyncSession,
    current_user: User,
    data: StoryCreateRequest,
) -> StoryResponse:
    """Create a new story that expires in 24 hours."""
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=STORY_LIFETIME_HOURS)

    story = Story(
        user_id=current_user.id,
        image_url=data.image_url,
        expires_at=expires_at,
    )

    repo = StoryRepository(db)
    story = await repo.create(story)

    author = _build_author(current_user)
    return _build_response(story, author)


async def list_active_stories(
    db: AsyncSession,
) -> list[UserStoriesResponse]:
    """Get all active stories grouped by user."""
    repo = StoryRepository(db)
    grouped = await repo.list_active_grouped()

    result = []
    for user, stories in grouped:
        author = _build_author(user)
        result.append(
            UserStoriesResponse(
                user=author,
                stories=[_build_response(s, author) for s in stories],
            )
        )
    return result


async def get_user_stories(
    db: AsyncSession,
    target_user_id: UUID,
) -> UserStoriesResponse:
    """Get active stories for a specific user."""
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(target_user_id)

    if not user or not user.is_active:
        raise NotFound("User")

    story_repo = StoryRepository(db)
    stories = await story_repo.get_active_by_user(target_user_id)

    author = _build_author(user)
    return UserStoriesResponse(
        user=author,
        stories=[_build_response(s, author) for s in stories],
    )
