"""Unit tests for report_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.report_repository import ReportRepository


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
    return ReportRepository(mock_db)


class TestCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        report = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(report)
        mock_db.add.assert_called_once_with(report)
        assert result == report


class TestFindExisting:
    @pytest.mark.asyncio
    async def test_found(self, repo, mock_db):
        report = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(report))
        result = await repo.find_existing(uuid4(), "post", uuid4())
        assert result == report

    @pytest.mark.asyncio
    async def test_not_found(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(None))
        result = await repo.find_existing(uuid4(), "post", uuid4())
        assert result is None
