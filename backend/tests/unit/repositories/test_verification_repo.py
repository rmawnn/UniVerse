"""Unit tests for verification_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.verification_repository import VerificationRepository


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
    return VerificationRepository(mock_db)


class TestVerRepoGetById:
    @pytest.mark.asyncio
    async def test_get(self, repo, mock_db):
        req = MagicMock()
        mock_db.get = AsyncMock(return_value=req)
        result = await repo.get_by_id(uuid4())
        assert result == req


class TestVerRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        req = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(req)
        mock_db.add.assert_called_once_with(req)
        assert result == req


class TestVerRepoCountAll:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(15))
        result = await repo.count_all()
        assert result == 15

    @pytest.mark.asyncio
    async def test_count_with_status(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(3))
        result = await repo.count_all(status="pending")
        assert result == 3


class TestVerRepoListAll:
    @pytest.mark.asyncio
    async def test_list(self, repo, mock_db):
        reqs = [MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(reqs))
        result = await repo.list_all(skip=0, limit=20)
        assert len(result) == 1


class TestVerRepoMarkVerified:
    @pytest.mark.asyncio
    async def test_mark_verified(self, repo, mock_db):
        req = MagicMock()
        mock_db.flush = AsyncMock()
        await repo.mark_verified(req)
        assert req.status == "verified"


class TestVerRepoMarkRejected:
    @pytest.mark.asyncio
    async def test_mark_rejected(self, repo, mock_db):
        req = MagicMock()
        mock_db.flush = AsyncMock()
        await repo.mark_rejected(req, reason="Fake document")
        assert req.status == "rejected"
        assert req.rejection_reason == "Fake document"
