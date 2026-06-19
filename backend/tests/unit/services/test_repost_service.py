"""Unit tests for app.services.repost_service — toggle_repost guard clauses."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.repost_service import toggle_repost


class TestToggleRepost:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db, sample_user):
        sample_user.is_active = False
        with pytest.raises(BadRequest, match="deactivated"):
            await toggle_repost(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.repost_service.PostRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Post"):
                await toggle_repost(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_cannot_repost_own_post(self, mock_db, sample_user):
        post = MagicMock()
        post.author_id = sample_user.id
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=post)

        with patch("app.services.repost_service.PostRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="your own post"):
                await toggle_repost(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_non_member_forbidden(self, mock_db, sample_user):
        post = MagicMock()
        post.author_id = uuid4()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=False)

        with (
            patch("app.services.repost_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.repost_service.CommunityRepository", return_value=mock_comm_repo),
        ):
            with pytest.raises(Forbidden, match="member"):
                await toggle_repost(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_toggle_create_repost(self, mock_db, sample_user):
        post = MagicMock()
        post.author_id = uuid4()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_repost_repo = MagicMock()
        mock_repost_repo.get = AsyncMock(return_value=None)
        mock_repost_repo.create = AsyncMock()
        mock_repost_repo.count_by_post = AsyncMock(return_value=1)

        with (
            patch("app.services.repost_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.repost_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.repost_service.RepostRepository", return_value=mock_repost_repo),
        ):
            result = await toggle_repost(mock_db, uuid4(), sample_user)
            assert result.reposted is True
            assert result.repost_count == 1

    @pytest.mark.asyncio
    async def test_toggle_remove_repost(self, mock_db, sample_user):
        post = MagicMock()
        post.author_id = uuid4()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_repost_repo = MagicMock()
        mock_repost_repo.get = AsyncMock(return_value=MagicMock())
        mock_repost_repo.delete = AsyncMock()
        mock_repost_repo.count_by_post = AsyncMock(return_value=0)

        with (
            patch("app.services.repost_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.repost_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.repost_service.RepostRepository", return_value=mock_repost_repo),
        ):
            result = await toggle_repost(mock_db, uuid4(), sample_user)
            assert result.reposted is False
            assert result.repost_count == 0
