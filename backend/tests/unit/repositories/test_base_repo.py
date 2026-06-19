"""Unit tests for base_repository — generic CRUD operations."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.base_repository import BaseRepository
from app.models.user import User


class UserRepo(BaseRepository[User]):
    model = User


@pytest.fixture
def repo(mock_db):
    return UserRepo(mock_db)


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


class TestBaseRepoGetById:
    @pytest.mark.asyncio
    async def test_get_by_id(self, repo, mock_db):
        obj = MagicMock()
        mock_db.get = AsyncMock(return_value=obj)
        result = await repo.get_by_id(uuid4())
        assert result == obj


class TestBaseRepoGetAll:
    @pytest.mark.asyncio
    async def test_get_all(self, repo, mock_db):
        items = [MagicMock(), MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(items))
        result = await repo.get_all(skip=0, limit=20)
        assert len(result) == 2


class TestBaseRepoCount:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(10))
        result = await repo.count()
        assert result == 10


class TestBaseRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        obj = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(obj)
        mock_db.add.assert_called_once_with(obj)
        assert result == obj


class TestBaseRepoUpdate:
    @pytest.mark.asyncio
    async def test_update(self, repo, mock_db):
        obj = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.update(obj)
        assert result == obj


class TestBaseRepoDelete:
    @pytest.mark.asyncio
    async def test_delete(self, repo, mock_db):
        obj = MagicMock()
        mock_db.delete = AsyncMock()
        mock_db.flush = AsyncMock()
        await repo.delete(obj)
        mock_db.delete.assert_called_once_with(obj)
