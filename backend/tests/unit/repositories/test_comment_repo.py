"""Unit tests for comment_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.comment_repository import CommentRepository


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _mock_scalar_or_none_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _mock_scalars_result(values):
    result = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = values
    result.scalars.return_value = scalars
    return result


@pytest.fixture
def repo(mock_db):
    return CommentRepository(mock_db)


class TestCommentRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        comment = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(comment)
        mock_db.add.assert_called_once_with(comment)
        assert result == comment


class TestCommentRepoGetById:
    @pytest.mark.asyncio
    async def test_get(self, repo, mock_db):
        comment = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(comment))
        result = await repo.get_by_id(uuid4())
        assert result == comment


class TestCommentRepoCountByPost:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(8))
        result = await repo.count_by_post(uuid4())
        assert result == 8


class TestCommentRepoListByPost:
    @pytest.mark.asyncio
    async def test_list(self, repo, mock_db):
        comments = [MagicMock(), MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(comments))
        result = await repo.list_top_level_by_post(uuid4(), skip=0, limit=20)
        assert len(result) == 2
