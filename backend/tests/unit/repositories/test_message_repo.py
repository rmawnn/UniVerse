"""Unit tests for message_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.message_repository import MessageRepository


def _mock_scalar_result(value):
    r = MagicMock()
    r.scalar_one.return_value = value
    return r


def _mock_scalars_result(values):
    r = MagicMock()
    s = MagicMock()
    s.all.return_value = values
    r.scalars.return_value = s
    return r


@pytest.fixture
def repo(mock_db):
    return MessageRepository(mock_db)


class TestCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        msg = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(msg)
        mock_db.add.assert_called_once_with(msg)
        assert result == msg


class TestCountByConversation:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(15))
        result = await repo.count_by_conversation(uuid4())
        assert result == 15


class TestListByConversation:
    @pytest.mark.asyncio
    async def test_list(self, repo, mock_db):
        msgs = [MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(msgs))
        result = await repo.list_by_conversation(uuid4(), skip=0, limit=20)
        assert len(result) == 1
