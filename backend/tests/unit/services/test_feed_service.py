"""Unit tests for feed_service — home feed generation."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.feed_service import get_home_feed


class TestGetHomeFeed:
    @pytest.mark.asyncio
    async def test_no_communities(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_joined_ids = AsyncMock(return_value=[])

        with patch("app.services.feed_service.CommunityRepository", return_value=mock_repo):
            result = await get_home_feed(mock_db, sample_user)
            assert result.total == 0
            assert result.items == []

    @pytest.mark.asyncio
    async def test_no_candidates(self, mock_db, sample_user):
        mock_community_repo = MagicMock()
        mock_community_repo.get_joined_ids = AsyncMock(return_value=[uuid4()])

        mock_post_repo = MagicMock()
        mock_post_repo.count_by_communities = AsyncMock(return_value=0)
        mock_post_repo.list_candidates = AsyncMock(return_value=[])

        with (
            patch("app.services.feed_service.CommunityRepository", return_value=mock_community_repo),
            patch("app.services.feed_service.PostRepository", return_value=mock_post_repo),
        ):
            result = await get_home_feed(mock_db, sample_user)
            assert result.total == 0
            assert result.items == []
