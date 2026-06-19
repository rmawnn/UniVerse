"""Unit tests for app.services.post_like_service — toggle_like guard clauses."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.post_like_service import toggle_like


class TestToggleLike:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db, sample_user):
        sample_user.is_active = False
        with pytest.raises(BadRequest, match="deactivated"):
            await toggle_like(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db, sample_user):
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.post_like_service.PostRepository", return_value=mock_post_repo):
            with pytest.raises(NotFound, match="Post"):
                await toggle_like(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_non_member_forbidden(self, mock_db, sample_user):
        post = MagicMock()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=False)

        with (
            patch("app.services.post_like_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.post_like_service.CommunityRepository", return_value=mock_comm_repo),
        ):
            with pytest.raises(Forbidden, match="member"):
                await toggle_like(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_unlike_existing(self, mock_db, sample_user):
        post = MagicMock()
        post.community_id = uuid4()
        post.author_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_like_repo = MagicMock()
        mock_like_repo.get_like = AsyncMock(return_value=MagicMock())
        mock_like_repo.delete_like = AsyncMock()
        mock_like_repo.count_by_post = AsyncMock(return_value=4)

        with (
            patch("app.services.post_like_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.post_like_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.post_like_service.PostLikeRepository", return_value=mock_like_repo),
        ):
            result = await toggle_like(mock_db, uuid4(), sample_user)
            assert result.liked is False
            assert result.like_count == 4

    @pytest.mark.asyncio
    async def test_like_new(self, mock_db, sample_user):
        post = MagicMock()
        post.community_id = uuid4()
        post.author_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_like_repo = MagicMock()
        mock_like_repo.get_like = AsyncMock(return_value=None)
        mock_like_repo.create_like = AsyncMock()
        mock_like_repo.count_by_post = AsyncMock(return_value=5)

        with (
            patch("app.services.post_like_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.post_like_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.post_like_service.PostLikeRepository", return_value=mock_like_repo),
            patch("app.services.post_like_service.notification_service") as mock_notif,
        ):
            mock_notif.notify = AsyncMock()
            result = await toggle_like(mock_db, uuid4(), sample_user)
            assert result.liked is True
            assert result.like_count == 5
