"""Unit tests for notification_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.notification_repository import NotificationRepository


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


@pytest.fixture
def repo(mock_db):
    return NotificationRepository(mock_db)


class TestNotificationRepoCreate:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        notification = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create(notification)
        mock_db.add.assert_called_once_with(notification)
        assert result == notification


class TestNotificationRepoGetById:
    @pytest.mark.asyncio
    async def test_get_by_id(self, repo, mock_db):
        notif = MagicMock()
        mock_db.get = AsyncMock(return_value=notif)
        result = await repo.get_by_id(uuid4())
        assert result == notif


class TestNotificationRepoListByUser:
    @pytest.mark.asyncio
    async def test_list_by_user(self, repo, mock_db):
        items = [MagicMock(), MagicMock()]
        mock_db.execute = AsyncMock(return_value=_mock_scalars_result(items))
        result = await repo.list_by_user(uuid4(), skip=0, limit=20)
        assert len(result) == 2


class TestNotificationRepoCountByUser:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(5))
        result = await repo.count_by_user(uuid4())
        assert result == 5


class TestNotificationRepoCountUnread:
    @pytest.mark.asyncio
    async def test_count_unread(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(3))
        result = await repo.count_unread(uuid4())
        assert result == 3


class TestNotificationRepoExistsDuplicate:
    @pytest.mark.asyncio
    async def test_exists(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(1))
        result = await repo.exists_duplicate(
            user_id=uuid4(), actor_id=uuid4(), type="like", reference_id=uuid4(),
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_not_exists(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(0))
        result = await repo.exists_duplicate(
            user_id=uuid4(), actor_id=uuid4(), type="like", reference_id=uuid4(),
        )
        assert result is False


class TestNotificationRepoMarkAsRead:
    @pytest.mark.asyncio
    async def test_mark_as_read(self, repo, mock_db):
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()
        await repo.mark_as_read(uuid4())
        assert mock_db.execute.called


class TestNotificationRepoMarkAllAsRead:
    @pytest.mark.asyncio
    async def test_mark_all_as_read(self, repo, mock_db):
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()
        await repo.mark_all_as_read(uuid4())
        assert mock_db.execute.called
