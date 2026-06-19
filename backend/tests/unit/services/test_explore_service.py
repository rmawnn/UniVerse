"""Unit tests for explore_service — explore page data."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.explore_service import get_explore


class TestGetExplore:
    @pytest.mark.asyncio
    async def test_empty_explore(self, mock_db):
        mock_post_repo = MagicMock()
        mock_post_repo.list_trending = AsyncMock(return_value=[])

        mock_community_repo = MagicMock()
        mock_community_repo.list_trending = AsyncMock(return_value=[])
        mock_community_repo.member_counts_batch = AsyncMock(return_value={})

        with (
            patch("app.services.explore_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.explore_service.CommunityRepository", return_value=mock_community_repo),
        ):
            result = await get_explore(mock_db, current_user=None)
            assert result.trending_posts == []
            assert result.suggested_communities == []
            assert result.suggested_users == []

    @pytest.mark.asyncio
    async def test_with_user(self, mock_db, sample_user):
        mock_post_repo = MagicMock()
        mock_post_repo.list_trending = AsyncMock(return_value=[])

        mock_community_repo = MagicMock()
        mock_community_repo.list_trending = AsyncMock(return_value=[])
        mock_community_repo.get_joined_ids = AsyncMock(return_value=[])
        mock_community_repo.member_counts_batch = AsyncMock(return_value={})

        mock_user_repo = MagicMock()
        mock_user_repo.list_suggested = AsyncMock(return_value=[])

        with (
            patch("app.services.explore_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.explore_service.CommunityRepository", return_value=mock_community_repo),
            patch("app.services.explore_service.UserRepository", return_value=mock_user_repo),
        ):
            result = await get_explore(mock_db, current_user=sample_user)
            assert result.trending_posts == []
            assert result.suggested_users == []
