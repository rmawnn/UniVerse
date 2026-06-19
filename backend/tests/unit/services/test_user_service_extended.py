"""Extended tests for user_service — profile, search, insights, follow suggestions."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, NotFound, Unauthorized
from app.services.user_service import (
    change_password,
    get_follow_suggestions,
    get_my_profile,
    get_notification_settings,
    get_public_profile,
    get_user_insights,
    search_users,
    update_notification_settings,
    update_profile,
)


class TestChangePassword:
    @pytest.mark.asyncio
    async def test_wrong_current_password(self, mock_db, sample_user):
        data = MagicMock()
        data.current_password = "wrong"

        with patch("app.services.user_service.verify_password", return_value=False):
            with pytest.raises(Unauthorized, match="Current password"):
                await change_password(mock_db, sample_user, data)

    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        data = MagicMock()
        data.current_password = "correct"
        data.new_password = "newpass123"

        mock_repo = MagicMock()
        mock_repo.update_password = AsyncMock()

        with (
            patch("app.services.user_service.verify_password", return_value=True),
            patch("app.services.user_service.hash_password", return_value="hashed"),
            patch("app.services.user_service.UserRepository", return_value=mock_repo),
        ):
            await change_password(mock_db, sample_user, data)
            mock_repo.update_password.assert_called_once()


class TestUpdateProfile:
    @pytest.mark.asyncio
    async def test_empty_update(self, mock_db, sample_user):
        data = MagicMock()
        data.model_dump.return_value = {}

        with pytest.raises(BadRequest, match="No fields"):
            await update_profile(mock_db, sample_user, data)


class TestSearchUsers:
    @pytest.mark.asyncio
    async def test_short_query(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="at least 2"):
            await search_users(mock_db, sample_user, "x")

    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.count_search = AsyncMock(return_value=0)
        mock_repo.search = AsyncMock(return_value=[])

        with patch("app.services.user_service.UserRepository", return_value=mock_repo):
            result = await search_users(mock_db, sample_user, "test")
            assert result.total == 0
            assert result.items == []


class TestGetPublicProfile:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.user_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await get_public_profile(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_inactive_user(self, mock_db):
        user = MagicMock()
        user.is_active = False
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with patch("app.services.user_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await get_public_profile(mock_db, uuid4())


class TestGetUserInsights:
    @pytest.mark.asyncio
    async def test_insights(self, mock_db, sample_user):
        mock_post_repo = MagicMock()
        mock_post_repo.count_by_author = AsyncMock(return_value=10)

        mock_like_repo = MagicMock()
        mock_like_repo.count_received_by_author = AsyncMock(return_value=25)

        mock_comment_repo = MagicMock()
        mock_comment_repo.count_received_by_author = AsyncMock(return_value=5)

        with (
            patch("app.services.user_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.user_service.PostLikeRepository", return_value=mock_like_repo),
            patch("app.services.user_service.CommentRepository", return_value=mock_comment_repo),
        ):
            result = await get_user_insights(mock_db, sample_user)
            assert result.total_posts == 10
            assert result.total_likes_received == 25
            assert result.total_comments_received == 5


class TestGetFollowSuggestions:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.list_suggested = AsyncMock(return_value=[])

        with patch("app.services.user_service.UserRepository", return_value=mock_repo):
            result = await get_follow_suggestions(mock_db, sample_user)
            assert result == []


class TestGetNotificationSettings:
    @pytest.mark.asyncio
    async def test_settings(self, sample_user):
        sample_user.notify_likes = True
        sample_user.notify_comments = True
        sample_user.notify_follows = True
        sample_user.notify_messages = True

        with patch("app.services.user_service.NotificationSettingsResponse") as mock_cls:
            mock_cls.model_validate.return_value = MagicMock()
            await get_notification_settings(sample_user)
            mock_cls.model_validate.assert_called_once_with(sample_user)


class TestUpdateNotificationSettings:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        data = MagicMock()
        data.model_dump.return_value = {}

        with pytest.raises(BadRequest, match="No fields"):
            await update_notification_settings(mock_db, sample_user, data)
