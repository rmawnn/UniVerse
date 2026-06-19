"""Unit tests for notification_service.notify — the notification creation function."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.notification_service import list_notifications, notify


class TestNotify:
    @pytest.mark.asyncio
    async def test_skips_duplicate(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.exists_duplicate = AsyncMock(return_value=True)
        mock_repo.create = AsyncMock()

        with patch("app.services.notification_service.NotificationRepository", return_value=mock_repo):
            await notify(
                mock_db,
                user_id=uuid4(),
                actor_id=uuid4(),
                type="like",
                content="X liked your post",
                reference_id=uuid4(),
            )
            mock_repo.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_creates_notification(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.exists_duplicate = AsyncMock(return_value=False)
        mock_repo.create = AsyncMock()

        mock_user_repo = MagicMock()
        actor = MagicMock()
        actor.id = uuid4()
        actor.username = "actor"
        actor.full_name = "Actor"
        actor.profile_image_url = None
        mock_user_repo.get_by_id = AsyncMock(return_value=actor)

        with (
            patch("app.services.notification_service.NotificationRepository", return_value=mock_repo),
            patch("app.services.notification_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.notification_service.ws_manager") as mock_ws,
        ):
            mock_ws.send_to_user = AsyncMock()
            await notify(
                mock_db,
                user_id=uuid4(),
                actor_id=uuid4(),
                type="comment",
                content="Someone commented",
                reference_id=uuid4(),
            )
            mock_repo.create.assert_called_once()
            mock_ws.send_to_user.assert_called_once()

    @pytest.mark.asyncio
    async def test_creates_without_actor(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.create = AsyncMock()

        with (
            patch("app.services.notification_service.NotificationRepository", return_value=mock_repo),
            patch("app.services.notification_service.ws_manager") as mock_ws,
        ):
            mock_ws.send_to_user = AsyncMock()
            await notify(
                mock_db,
                user_id=uuid4(),
                actor_id=None,
                type="system",
                content="System notification",
            )
            mock_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_reference_skips_dedup_check(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.exists_duplicate = AsyncMock()
        mock_repo.create = AsyncMock()

        with (
            patch("app.services.notification_service.NotificationRepository", return_value=mock_repo),
            patch("app.services.notification_service.ws_manager") as mock_ws,
        ):
            mock_ws.send_to_user = AsyncMock()
            await notify(
                mock_db,
                user_id=uuid4(),
                actor_id=uuid4(),
                type="follow",
                content="X followed you",
                reference_id=None,
            )
            mock_repo.exists_duplicate.assert_not_called()
            mock_repo.create.assert_called_once()


class TestListNotifications:
    @pytest.mark.asyncio
    async def test_empty_list(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.count_by_user = AsyncMock(return_value=0)
        mock_repo.list_by_user = AsyncMock(return_value=[])

        with patch("app.services.notification_service.NotificationRepository", return_value=mock_repo):
            result = await list_notifications(mock_db, sample_user)
            assert result.total == 0
            assert result.items == []

    @pytest.mark.asyncio
    async def test_with_actor(self, mock_db, sample_user):
        actor_id = uuid4()
        notification = MagicMock()
        notification.id = uuid4()
        notification.type = "like"
        notification.reference_id = uuid4()
        notification.actor_id = actor_id
        notification.content = "Someone liked your post"
        notification.is_read = False
        notification.created_at = MagicMock()

        actor = MagicMock()
        actor.id = actor_id
        actor.username = "liker"
        actor.full_name = "Liker User"
        actor.profile_image_url = None

        mock_repo = MagicMock()
        mock_repo.count_by_user = AsyncMock(return_value=1)
        mock_repo.list_by_user = AsyncMock(return_value=[notification])

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=actor)

        with (
            patch("app.services.notification_service.NotificationRepository", return_value=mock_repo),
            patch("app.services.notification_service.UserRepository", return_value=mock_user_repo),
        ):
            result = await list_notifications(mock_db, sample_user)
            assert result.total == 1
            assert len(result.items) == 1
            assert result.items[0].actor.username == "liker"
