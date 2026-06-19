"""Unit tests for post_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.post_repository import PostRepository


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
    return PostRepository(mock_db)


class TestPostRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        post = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(post)
        mock_db.add.assert_called_once_with(post)
        assert result == post


class TestPostRepoGetById:
    @pytest.mark.asyncio
    async def test_get_existing(self, repo, mock_db):
        post = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(post))
        result = await repo.get_by_id(uuid4())
        assert result == post


class TestPostRepoCountByAuthor:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(5))
        result = await repo.count_by_author(uuid4())
        assert result == 5


class TestPostRepoCountByCommunity:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(12))
        result = await repo.count_by_community(uuid4())
        assert result == 12


class TestPostRepoListByAuthor:
    @pytest.mark.asyncio
    async def test_list(self, repo, mock_db):
        posts = [MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(posts))
        result = await repo.list_by_author(uuid4(), skip=0, limit=10)
        assert len(result) == 1


class TestPostRepoListByCommunity:
    @pytest.mark.asyncio
    async def test_list(self, repo, mock_db):
        posts = [MagicMock(), MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(posts))
        result = await repo.list_by_community(uuid4(), skip=0, limit=20)
        assert len(result) == 2


class TestPostRepoSetDeleted:
    @pytest.mark.asyncio
    async def test_set_deleted(self, repo, mock_db):
        post = MagicMock()
        mock_db.flush = AsyncMock()
        await repo.set_deleted(post, True)
        assert post.is_deleted is True
