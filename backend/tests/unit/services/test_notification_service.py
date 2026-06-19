"""Unit tests for app.services.notification_service — build_response and validation."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import Forbidden, NotFound
from app.services.notification_service import (
    _build_notification_response,
    mark_all_as_read,
    mark_as_read,
)


class TestBuildNotificationResponse:
    def _make_notification(self, **kwargs):
        n = MagicMock()
        n.id = kwargs.get("id", uuid4())
        n.type = kwargs.get("type", "like")
        n.reference_id = kwargs.get("reference_id", uuid4())
        n.actor_id = kwargs.get("actor_id", uuid4())
        n.content = kwargs.get("content", "User liked your post")
        n.is_read = kwargs.get("is_read", False)
        n.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        return n

    def _make_actor(self, **kwargs):
        a = MagicMock()
        a.id = kwargs.get("id", uuid4())
        a.username = "actor_user"
        a.full_name = "Actor User"
        a.profile_image_url = None
        return a

    def test_with_actor(self):
        n = self._make_notification()
        actor = self._make_actor()
        result = _build_notification_response(n, actor)
        assert result.type == "like"
        assert result.content == "User liked your post"
        assert result.actor is not None
        assert result.actor.username == "actor_user"

    def test_without_actor(self):
        n = self._make_notification()
        result = _build_notification_response(n, None)
        assert result.actor is None
        assert result.content == "User liked your post"

    def test_read_status(self):
        n = self._make_notification(is_read=True)
        result = _build_notification_response(n, None)
        assert result.is_read is True


class TestMarkAsRead:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.notification_service.NotificationRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Notification"):
                await mark_as_read(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_other_users_notification_forbidden(self, mock_db, sample_user):
        notification = MagicMock()
        notification.user_id = uuid4()  # different user
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=notification)

        with patch("app.services.notification_service.NotificationRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="your own"):
                await mark_as_read(mock_db, uuid4(), sample_user)


class TestMarkAsReadSuccess:
    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        notification = MagicMock()
        notification.user_id = sample_user.id
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=notification)
        mock_repo.mark_as_read = AsyncMock()
        mock_repo.count_unread = AsyncMock(return_value=3)

        with patch("app.services.notification_service.NotificationRepository", return_value=mock_repo):
            result = await mark_as_read(mock_db, uuid4(), sample_user)
            assert result.success is True
            assert result.unread_count == 3
            mock_repo.mark_as_read.assert_called_once()


class TestMarkAllAsRead:
    @pytest.mark.asyncio
    async def test_returns_zero_unread(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.mark_all_as_read = AsyncMock()

        with patch("app.services.notification_service.NotificationRepository", return_value=mock_repo):
            result = await mark_all_as_read(mock_db, sample_user)
            assert result.success is True
            assert result.unread_count == 0
