"""Unit tests for password_reset_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.password_reset_repository import PasswordResetRepository


def _mock_scalar_or_none_result(value):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    return r


@pytest.fixture
def repo(mock_db):
    return PasswordResetRepository(mock_db)


class TestCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        token = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(token)
        mock_db.add.assert_called_once_with(token)
        assert result == token


class TestGetByTokenHash:
    @pytest.mark.asyncio
    async def test_found(self, repo, mock_db):
        token = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(token))
        result = await repo.get_by_token_hash("hashed-token")
        assert result == token

    @pytest.mark.asyncio
    async def test_not_found(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(None))
        result = await repo.get_by_token_hash("bad-hash")
        assert result is None


class TestMarkUsed:
    @pytest.mark.asyncio
    async def test_mark_used(self, repo, mock_db):
        token = MagicMock()
        mock_db.flush = AsyncMock()
        await repo.mark_used(token)
        assert token.used_at is not None


class TestInvalidateAllForUser:
    @pytest.mark.asyncio
    async def test_invalidate(self, repo, mock_db):
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()
        await repo.invalidate_all_for_user(uuid4())
        mock_db.execute.assert_called_once()
