"""Unit tests for app.services.user_service — with mocked repositories."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import BadRequest, NotFound, Unauthorized
from app.services import user_service


class TestChangePassword:
    @pytest.mark.asyncio
    async def test_wrong_current_password(self, mock_db, sample_user):
        req = MagicMock()
        req.current_password = "wrong"
        req.new_password = "NewPass123"

        with patch("app.services.user_service.verify_password", return_value=False):
            with pytest.raises(Unauthorized, match="Current password is incorrect"):
                await user_service.change_password(mock_db, sample_user, req)

    @pytest.mark.asyncio
    async def test_success_updates_password(self, mock_db, sample_user):
        req = MagicMock()
        req.current_password = "correct"
        req.new_password = "NewPass123"

        mock_repo = MagicMock()
        mock_repo.update_password = AsyncMock()

        with (
            patch("app.services.user_service.verify_password", return_value=True),
            patch("app.services.user_service.hash_password", return_value="new_hash"),
            patch("app.services.user_service.UserRepository", return_value=mock_repo),
        ):
            await user_service.change_password(mock_db, sample_user, req)
            mock_repo.update_password.assert_called_once_with(sample_user, "new_hash")


class TestUpdateProfile:
    @pytest.mark.asyncio
    async def test_empty_update_raises(self, mock_db, sample_user):
        req = MagicMock()
        req.model_dump.return_value = {}

        with pytest.raises(BadRequest, match="No fields"):
            await user_service.update_profile(mock_db, sample_user, req)

    @pytest.mark.asyncio
    async def test_valid_update(self, mock_db, sample_user):
        req = MagicMock()
        req.model_dump.return_value = {"bio": "Updated bio"}

        mock_repo = MagicMock()
        updated_user = MagicMock()
        mock_repo.update = AsyncMock(return_value=updated_user)

        with (
            patch("app.services.user_service.UserRepository", return_value=mock_repo),
            patch("app.services.user_service.UserResponse") as mock_response,
        ):
            mock_response.model_validate.return_value = MagicMock()
            await user_service.update_profile(mock_db, sample_user, req)
            mock_repo.update.assert_called_once_with(sample_user, bio="Updated bio")


class TestSearchUsers:
    @pytest.mark.asyncio
    async def test_short_query_raises(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="at least 2"):
            await user_service.search_users(mock_db, sample_user, "a")

    @pytest.mark.asyncio
    async def test_whitespace_only_query_raises(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="at least 2"):
            await user_service.search_users(mock_db, sample_user, "  a  ")


class TestGetPublicProfile:
    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db, sample_user_id):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.user_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await user_service.get_public_profile(mock_db, sample_user_id)

    @pytest.mark.asyncio
    async def test_inactive_user_not_found(self, mock_db, sample_user_id):
        inactive = MagicMock()
        inactive.is_active = False
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=inactive)

        with patch("app.services.user_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await user_service.get_public_profile(mock_db, sample_user_id)


class TestGetNotificationSettings:
    @pytest.mark.asyncio
    async def test_returns_settings(self, sample_user):
        with patch("app.services.user_service.NotificationSettingsResponse") as mock_cls:
            mock_cls.model_validate.return_value = MagicMock()
            result = await user_service.get_notification_settings(sample_user)
            mock_cls.model_validate.assert_called_once_with(sample_user)


class TestUpdateNotificationSettings:
    @pytest.mark.asyncio
    async def test_empty_update_raises(self, mock_db, sample_user):
        req = MagicMock()
        req.model_dump.return_value = {}

        with pytest.raises(BadRequest, match="No fields"):
            await user_service.update_notification_settings(mock_db, sample_user, req)
