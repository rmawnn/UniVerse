"""Unit tests for community_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.community_repository import CommunityRepository


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
    return CommunityRepository(mock_db)


class TestCommunityRepoGetById:
    @pytest.mark.asyncio
    async def test_get_existing(self, repo, mock_db):
        comm = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(comm))
        result = await repo.get_by_id(uuid4())
        assert result == comm

    @pytest.mark.asyncio
    async def test_get_missing(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(None))
        result = await repo.get_by_id(uuid4())
        assert result is None


class TestCommunityRepoIsMember:
    @pytest.mark.asyncio
    async def test_is_member_true(self, repo, mock_db):
        mock_db.get = AsyncMock(return_value=MagicMock())
        result = await repo.is_member(uuid4(), uuid4())
        assert result is True

    @pytest.mark.asyncio
    async def test_is_member_false(self, repo, mock_db):
        mock_db.get = AsyncMock(return_value=None)
        result = await repo.is_member(uuid4(), uuid4())
        assert result is False


class TestCommunityRepoMemberCount:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(25))
        result = await repo.member_count(uuid4())
        assert result == 25


class TestCommunityRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        comm = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(comm)
        mock_db.add.assert_called_once_with(comm)
        assert result == comm


class TestCommunityRepoSoftDelete:
    @pytest.mark.asyncio
    async def test_soft_delete(self, repo, mock_db):
        comm = MagicMock()
        mock_db.flush = AsyncMock()
        await repo.soft_delete(comm)
        assert comm.is_deleted is True


class TestCommunityRepoSearch:
    @pytest.mark.asyncio
    async def test_search(self, repo, mock_db):
        communities = [MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(communities))
        result = await repo.search("test", skip=0, limit=10)
        assert len(result) == 1


class TestCommunityRepoCountAll:
    @pytest.mark.asyncio
    async def test_count_all_admin(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(50))
        result = await repo.count_all_admin()
        assert result == 50
