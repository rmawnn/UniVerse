"""Unit tests for user_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.repositories.user_repository import UserRepository


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
    return UserRepository(mock_db)


class TestUserRepoGetById:
    @pytest.mark.asyncio
    async def test_get_existing(self, repo, mock_db):
        user = MagicMock()
        mock_db.get = AsyncMock(return_value=user)
        result = await repo.get_by_id(uuid4())
        assert result == user

    @pytest.mark.asyncio
    async def test_get_missing(self, repo, mock_db):
        mock_db.get = AsyncMock(return_value=None)
        result = await repo.get_by_id(uuid4())
        assert result is None


class TestUserRepoGetByEmail:
    @pytest.mark.asyncio
    async def test_get_by_email(self, repo, mock_db):
        user = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(user))
        result = await repo.get_by_email("test@example.com")
        assert result == user


class TestUserRepoGetByUsername:
    @pytest.mark.asyncio
    async def test_get_by_username(self, repo, mock_db):
        user = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(user))
        result = await repo.get_by_username("testuser")
        assert result == user


class TestUserRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        user = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(user)
        mock_db.add.assert_called_once_with(user)
        assert result == user


class TestUserRepoUpdate:
    @pytest.mark.asyncio
    async def test_update_fields(self, repo, mock_db):
        user = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.update(user, full_name="New Name", bio="Updated bio")
        assert result == user


class TestUserRepoSearch:
    @pytest.mark.asyncio
    async def test_search(self, repo, mock_db):
        users = [MagicMock(), MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(users))
        result = await repo.search("test", skip=0, limit=10)
        assert len(result) == 2
