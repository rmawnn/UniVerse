"""Unit tests for story_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.story_repository import StoryRepository


def _mock_scalars_result(values):
    result = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = values
    result.scalars.return_value = scalars
    return result


@pytest.fixture
def repo(mock_db):
    return StoryRepository(mock_db)


class TestStoryRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        story = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(story)
        mock_db.add.assert_called_once_with(story)
        assert result == story


class TestStoryRepoGetActiveByUser:
    @pytest.mark.asyncio
    async def test_get_active(self, repo, mock_db):
        stories = [MagicMock(), MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(stories))
        result = await repo.get_active_by_user(uuid4())
        assert len(result) == 2
