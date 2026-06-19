"""Unit tests for follow_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.follow_repository import FollowRepository


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _mock_scalars_result(values):
    result = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = values
    result.scalars.return_value = scalars
    return result


def _mock_rowcount_result(count):
    result = MagicMock()
    result.rowcount = count
    return result


@pytest.fixture
def repo(mock_db):
    return FollowRepository(mock_db)


class TestFollowRepoExists:
    @pytest.mark.asyncio
    async def test_exists_true(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(True))
        result = await repo.exists(uuid4(), uuid4())
        assert result is True

    @pytest.mark.asyncio
    async def test_exists_false(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(False))
        result = await repo.exists(uuid4(), uuid4())
        assert result is False


class TestFollowRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        mock_db.flush = AsyncMock()
        result = await repo.create(uuid4(), uuid4())
        mock_db.add.assert_called_once()


class TestFollowRepoDelete:
    @pytest.mark.asyncio
    async def test_delete_existing(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_rowcount_result(1))
        mock_db.flush = AsyncMock()
        result = await repo.delete(uuid4(), uuid4())
        assert result is True

    @pytest.mark.asyncio
    async def test_delete_not_existing(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_rowcount_result(0))
        mock_db.flush = AsyncMock()
        result = await repo.delete(uuid4(), uuid4())
        assert result is False


class TestFollowRepoCountFollowers:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(10))
        result = await repo.count_followers(uuid4())
        assert result == 10


class TestFollowRepoCountFollowing:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(7))
        result = await repo.count_following(uuid4())
        assert result == 7


class TestFollowRepoGetFollowerIds:
    @pytest.mark.asyncio
    async def test_get_ids(self, repo, mock_db):
        uid1, uid2 = uuid4(), uuid4()
        row1 = (uid1,)
        row2 = (uid2,)
        mock_result = MagicMock()
        mock_result.all.return_value = [row1, row2]
        mock_db.execute = AsyncMock(return_value=mock_result)
        result = await repo.get_follower_ids(uuid4())
        assert len(result) == 2
        assert uid1 in result
