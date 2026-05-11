from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.story import StoryCreateRequest, StoryResponse, UserStoriesResponse
from app.services import story_service

router = APIRouter()


@router.post("", response_model=StoryResponse, status_code=201)
async def create_story(
    data: StoryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new story (expires in 24 hours)."""
    return await story_service.create_story(db, current_user, data)


@router.get("", response_model=list[UserStoriesResponse])
async def list_stories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all active stories, grouped by user."""
    return await story_service.list_active_stories(db)


@router.get("/{user_id}", response_model=UserStoriesResponse)
async def get_user_stories(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get active stories for a specific user."""
    return await story_service.get_user_stories(db, user_id)
