"""Unit tests for app.services.follow_service — guard clauses and validation."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AlreadyExists, BadRequest, NotFound
from app.services.follow_service import (
    follow_user,
    list_followers,
    list_following,
    unfollow_user,
)


class TestFollowUser:
    @pytest.mark.asyncio
    async def test_cannot_follow_yourself(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="cannot follow yourself"):
            await follow_user(mock_db, sample_user, sample_user.id)

    @pytest.mark.asyncio
    async def test_target_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.follow_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await follow_user(mock_db, sample_user, uuid4())

    @pytest.mark.asyncio
    async def test_inactive_target_not_found(self, mock_db, sample_user):
        target = MagicMock()
        target.is_active = False
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=target)

        with patch("app.services.follow_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await follow_user(mock_db, sample_user, uuid4())

    @pytest.mark.asyncio
    async def test_duplicate_follow_raises(self, mock_db, sample_user):
        target = MagicMock()
        target.is_active = True
        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=target)

        mock_follow_repo = MagicMock()
        mock_follow_repo.exists = AsyncMock(return_value=True)

        with (
            patch("app.services.follow_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.follow_service.FollowRepository", return_value=mock_follow_repo),
        ):
            with pytest.raises(AlreadyExists, match="Follow"):
                await follow_user(mock_db, sample_user, uuid4())

    @pytest.mark.asyncio
    async def test_successful_follow(self, mock_db, sample_user):
        target_id = uuid4()
        target = MagicMock()
        target.is_active = True
        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=target)

        mock_follow_repo = MagicMock()
        mock_follow_repo.exists = AsyncMock(return_value=False)
        mock_follow_repo.create = AsyncMock()
        mock_follow_repo.count_followers = AsyncMock(return_value=5)
        mock_follow_repo.count_following = AsyncMock(return_value=3)

        with (
            patch("app.services.follow_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.follow_service.FollowRepository", return_value=mock_follow_repo),
            patch("app.services.follow_service.notification_service") as mock_notif,
        ):
            mock_notif.notify = AsyncMock()
            result = await follow_user(mock_db, sample_user, target_id)
            assert result["is_following"] is True
            assert result["followers_count"] == 5
            assert result["following_count"] == 3


class TestUnfollowUser:
    @pytest.mark.asyncio
    async def test_cannot_unfollow_yourself(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="cannot unfollow yourself"):
            await unfollow_user(mock_db, sample_user, sample_user.id)

    @pytest.mark.asyncio
    async def test_target_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.follow_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await unfollow_user(mock_db, sample_user, uuid4())

    @pytest.mark.asyncio
    async def test_not_following_raises(self, mock_db, sample_user):
        target = MagicMock()
        target.is_active = True
        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=target)

        mock_follow_repo = MagicMock()
        mock_follow_repo.delete = AsyncMock(return_value=False)

        with (
            patch("app.services.follow_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.follow_service.FollowRepository", return_value=mock_follow_repo),
        ):
            with pytest.raises(NotFound, match="Follow"):
                await unfollow_user(mock_db, sample_user, uuid4())

    @pytest.mark.asyncio
    async def test_successful_unfollow(self, mock_db, sample_user):
        target = MagicMock()
        target.is_active = True
        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=target)

        mock_follow_repo = MagicMock()
        mock_follow_repo.delete = AsyncMock(return_value=True)
        mock_follow_repo.count_followers = AsyncMock(return_value=4)
        mock_follow_repo.count_following = AsyncMock(return_value=2)

        with (
            patch("app.services.follow_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.follow_service.FollowRepository", return_value=mock_follow_repo),
        ):
            result = await unfollow_user(mock_db, sample_user, uuid4())
            assert result["is_following"] is False


class TestListFollowers:
    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.follow_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await list_followers(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_inactive_user(self, mock_db):
        user = MagicMock()
        user.is_active = False
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with patch("app.services.follow_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await list_followers(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        user = MagicMock()
        user.is_active = True

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=user)

        mock_follow_repo = MagicMock()
        mock_follow_repo.count_active_followers = AsyncMock(return_value=0)
        mock_follow_repo.list_followers = AsyncMock(return_value=[])

        with (
            patch("app.services.follow_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.follow_service.FollowRepository", return_value=mock_follow_repo),
        ):
            result = await list_followers(mock_db, uuid4())
            assert result.total == 0
            assert result.items == []


class TestListFollowing:
    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.follow_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await list_following(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_inactive_user(self, mock_db):
        user = MagicMock()
        user.is_active = False
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with patch("app.services.follow_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await list_following(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        user = MagicMock()
        user.is_active = True

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=user)

        mock_follow_repo = MagicMock()
        mock_follow_repo.count_active_following = AsyncMock(return_value=0)
        mock_follow_repo.list_following = AsyncMock(return_value=[])

        with (
            patch("app.services.follow_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.follow_service.FollowRepository", return_value=mock_follow_repo),
        ):
            result = await list_following(mock_db, uuid4())
            assert result.total == 0
            assert result.items == []
