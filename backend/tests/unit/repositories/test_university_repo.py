"""Unit tests for university_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.university_repository import UniversityRepository


def _mock_scalar_result(value):
    r = MagicMock()
    r.scalar_one.return_value = value
    return r


def _mock_scalar_or_none_result(value):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    return r


def _mock_scalars_result(values):
    r = MagicMock()
    s = MagicMock()
    s.all.return_value = values
    r.scalars.return_value = s
    return r


@pytest.fixture
def repo(mock_db):
    return UniversityRepository(mock_db)


class TestGetById:
    @pytest.mark.asyncio
    async def test_get(self, repo, mock_db):
        uni = MagicMock()
        mock_db.get = AsyncMock(return_value=uni)
        result = await repo.get_by_id(uuid4())
        assert result == uni


class TestGetByDomain:
    @pytest.mark.asyncio
    async def test_get(self, repo, mock_db):
        uni = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(uni))
        result = await repo.get_by_domain("example.edu")
        assert result == uni


class TestGetAll:
    @pytest.mark.asyncio
    async def test_list(self, repo, mock_db):
        unis = [MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(unis))
        result = await repo.get_all()
        assert len(result) == 1


class TestCount:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(5))
        result = await repo.count()
        assert result == 5
