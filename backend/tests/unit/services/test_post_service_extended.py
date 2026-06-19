"""Extended tests for post_service — get_post, list_posts, delete, additional guards."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import NotFound
from app.services.post_service import get_post, list_posts, list_user_posts


class TestGetPost:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.post_service.PostRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Post"):
                await get_post(mock_db, uuid4())


class TestListPosts:
    @pytest.mark.asyncio
    async def test_community_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.post_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await list_posts(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_empty_community(self, mock_db):
        mock_comm_repo = MagicMock()
        mock_comm_repo.get_by_id = AsyncMock(return_value=MagicMock())

        mock_post_repo = MagicMock()
        mock_post_repo.count_by_community = AsyncMock(return_value=0)
        mock_post_repo.list_by_community = AsyncMock(return_value=[])

        with (
            patch("app.services.post_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.post_service.PostRepository", return_value=mock_post_repo),
        ):
            result = await list_posts(mock_db, uuid4())
            assert result.total == 0
            assert result.items == []


class TestListUserPosts:
    @pytest.mark.asyncio
    async def test_no_posts(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_by_author = AsyncMock(return_value=0)
        mock_repo.list_by_author = AsyncMock(return_value=[])

        with patch("app.services.post_service.PostRepository", return_value=mock_repo):
            result = await list_user_posts(mock_db, uuid4())
            assert result.total == 0
            assert result.items == []
