"""Unit tests for post_like_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.post_like_repository import PostLikeRepository


def _mock_scalar_result(value):
    r = MagicMock()
    r.scalar_one.return_value = value
    return r


def _mock_rowcount_result(count):
    r = MagicMock()
    r.rowcount = count
    return r


@pytest.fixture
def repo(mock_db):
    return PostLikeRepository(mock_db)


class TestGetLike:
    @pytest.mark.asyncio
    async def test_exists(self, repo, mock_db):
        like = MagicMock()
        mock_db.get = AsyncMock(return_value=like)
        result = await repo.get_like(uuid4(), uuid4())
        assert result == like

    @pytest.mark.asyncio
    async def test_not_exists(self, repo, mock_db):
        mock_db.get = AsyncMock(return_value=None)
        result = await repo.get_like(uuid4(), uuid4())
        assert result is None


class TestCreateLike:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        mock_db.flush = AsyncMock()
        await repo.create_like(uuid4(), uuid4())
        mock_db.add.assert_called_once()


class TestDeleteLike:
    @pytest.mark.asyncio
    async def test_delete(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_rowcount_result(1))
        mock_db.flush = AsyncMock()
        await repo.delete_like(uuid4(), uuid4())
        assert mock_db.execute.called


class TestCountByPost:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(10))
        result = await repo.count_by_post(uuid4())
        assert result == 10
