"""Unit tests for search_service — unified search."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.search_service import unified_search


class TestUnifiedSearch:
    @pytest.mark.asyncio
    async def test_empty_results(self, mock_db):
        mock_user_repo = MagicMock()
        mock_user_repo.search = AsyncMock(return_value=[])
        mock_user_repo.count_search = AsyncMock(return_value=0)

        mock_comm_repo = MagicMock()
        mock_comm_repo.search = AsyncMock(return_value=[])
        mock_comm_repo.count_search = AsyncMock(return_value=0)
        mock_comm_repo.member_counts_batch = AsyncMock(return_value={})

        mock_post_repo = MagicMock()
        mock_post_repo.search = AsyncMock(return_value=[])
        mock_post_repo.count_search = AsyncMock(return_value=0)

        mock_job_repo = MagicMock()
        mock_job_repo.list_jobs = AsyncMock(return_value=[])
        mock_job_repo.count_jobs = AsyncMock(return_value=0)

        with (
            patch("app.services.search_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.search_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.search_service.PostRepository", return_value=mock_post_repo),
            patch("app.repositories.job_repository.JobRepository", return_value=mock_job_repo),
        ):
            result = await unified_search(mock_db, "nonexistent")
            assert result.users == []
            assert result.communities == []
            assert result.posts == []
            assert result.users_total == 0

    @pytest.mark.asyncio
    async def test_with_user_results(self, mock_db):
        user = MagicMock()
        user.id = uuid4()
        user.username = "testuser"
        user.full_name = "Test User"
        user.profile_image_url = None
        user.is_verified_student = False

        mock_user_repo = MagicMock()
        mock_user_repo.search = AsyncMock(return_value=[user])
        mock_user_repo.count_search = AsyncMock(return_value=1)

        mock_comm_repo = MagicMock()
        mock_comm_repo.search = AsyncMock(return_value=[])
        mock_comm_repo.count_search = AsyncMock(return_value=0)
        mock_comm_repo.member_counts_batch = AsyncMock(return_value={})

        mock_post_repo = MagicMock()
        mock_post_repo.search = AsyncMock(return_value=[])
        mock_post_repo.count_search = AsyncMock(return_value=0)

        mock_job_repo = MagicMock()
        mock_job_repo.list_jobs = AsyncMock(return_value=[])
        mock_job_repo.count_jobs = AsyncMock(return_value=0)

        with (
            patch("app.services.search_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.search_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.search_service.PostRepository", return_value=mock_post_repo),
            patch("app.repositories.job_repository.JobRepository", return_value=mock_job_repo),
        ):
            result = await unified_search(mock_db, "test")
            assert len(result.users) == 1
            assert result.users[0].username == "testuser"
            assert result.users_total == 1
