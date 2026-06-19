"""Unit tests for saved_post_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.saved_post_repository import SavedPostRepository


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
    return SavedPostRepository(mock_db)


class TestExists:
    @pytest.mark.asyncio
    async def test_exists_true(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(1))
        result = await repo.exists(uuid4(), uuid4())
        assert result is True

    @pytest.mark.asyncio
    async def test_exists_false(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(0))
        result = await repo.exists(uuid4(), uuid4())
        assert result is False


class TestCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        saved = MagicMock()
        mock_db.flush = AsyncMock()
        result = await repo.create(saved)
        mock_db.add.assert_called_once_with(saved)
        assert result == saved


class TestDelete:
    @pytest.mark.asyncio
    async def test_delete(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_rowcount_result(1))
        mock_db.flush = AsyncMock()
        result = await repo.delete(uuid4(), uuid4())
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_not_found(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_rowcount_result(0))
        mock_db.flush = AsyncMock()
        result = await repo.delete(uuid4(), uuid4())
        assert result is False
