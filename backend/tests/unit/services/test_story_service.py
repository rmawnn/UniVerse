"""Unit tests for app.services.story_service — helpers and create_story."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, NotFound
from app.services.story_service import (
    STORY_LIFETIME_HOURS,
    _build_author,
    _build_response,
    create_story,
    get_user_stories,
    list_active_stories,
)


def _make_user(**kwargs):
    user = MagicMock()
    user.id = kwargs.get("id", uuid4())
    user.username = kwargs.get("username", "storyuser")
    user.full_name = kwargs.get("full_name", "Story User")
    user.profile_image_url = kwargs.get("profile_image_url", None)
    user.is_active = kwargs.get("is_active", True)
    return user


class TestBuildAuthor:
    def test_basic(self):
        user = _make_user(username="alice", full_name="Alice Smith")
        result = _build_author(user)
        assert result.username == "alice"
        assert result.full_name == "Alice Smith"


class TestBuildResponse:
    def test_basic(self):
        from app.schemas.story import StoryAuthorSummary

        story = MagicMock()
        story.id = uuid4()
        story.image_url = "http://img.example.com/s.jpg"
        story.created_at = datetime(2024, 6, 1, tzinfo=timezone.utc)
        story.expires_at = datetime(2024, 6, 2, tzinfo=timezone.utc)

        author = StoryAuthorSummary(
            id=uuid4(), username="bob", full_name="Bob", profile_image_url=None,
        )
        result = _build_response(story, author)
        assert result.image_url == "http://img.example.com/s.jpg"
        assert result.author.username == "bob"


class TestCreateStory:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db):
        user = _make_user(is_active=False)
        data = MagicMock()
        data.image_url = "http://img.example.com/s.jpg"

        with pytest.raises(BadRequest, match="deactivated"):
            await create_story(mock_db, user, data)

    @pytest.mark.asyncio
    async def test_successful_creation(self, mock_db):
        user = _make_user()
        data = MagicMock()
        data.image_url = "http://img.example.com/new.jpg"

        created_story = MagicMock()
        created_story.id = uuid4()
        created_story.user_id = user.id
        created_story.image_url = data.image_url
        created_story.created_at = datetime.now(timezone.utc)
        created_story.expires_at = datetime.now(timezone.utc)

        mock_repo = MagicMock()
        mock_repo.create = AsyncMock(return_value=created_story)

        with patch("app.services.story_service.StoryRepository", return_value=mock_repo):
            result = await create_story(mock_db, user, data)
            assert result.image_url == data.image_url
            assert result.author.username == user.username


class TestListActiveStories:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.list_active_grouped = AsyncMock(return_value=[])

        with patch("app.services.story_service.StoryRepository", return_value=mock_repo):
            result = await list_active_stories(mock_db)
            assert result == []

    @pytest.mark.asyncio
    async def test_with_stories(self, mock_db):
        user = _make_user(username="storyteller")
        story = MagicMock()
        story.id = uuid4()
        story.image_url = "http://img.example.com/1.jpg"
        story.created_at = datetime.now(timezone.utc)
        story.expires_at = datetime.now(timezone.utc)

        mock_repo = MagicMock()
        mock_repo.list_active_grouped = AsyncMock(return_value=[(user, [story])])

        with patch("app.services.story_service.StoryRepository", return_value=mock_repo):
            result = await list_active_stories(mock_db)
            assert len(result) == 1
            assert result[0].user.username == "storyteller"
            assert len(result[0].stories) == 1


class TestGetUserStories:
    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.story_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await get_user_stories(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_inactive_user(self, mock_db):
        user = _make_user(is_active=False)
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with patch("app.services.story_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await get_user_stories(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_success(self, mock_db):
        user = _make_user(username="storymaker")
        story = MagicMock()
        story.id = uuid4()
        story.image_url = "http://img.example.com/2.jpg"
        story.created_at = datetime.now(timezone.utc)
        story.expires_at = datetime.now(timezone.utc)

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=user)

        mock_story_repo = MagicMock()
        mock_story_repo.get_active_by_user = AsyncMock(return_value=[story])

        with (
            patch("app.services.story_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.story_service.StoryRepository", return_value=mock_story_repo),
        ):
            result = await get_user_stories(mock_db, uuid4())
            assert result.user.username == "storymaker"
            assert len(result.stories) == 1


class TestConstants:
    def test_lifetime(self):
        assert STORY_LIFETIME_HOURS == 24
