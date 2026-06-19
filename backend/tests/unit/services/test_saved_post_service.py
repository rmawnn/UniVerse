"""Unit tests for saved_post_service — save, unsave, list."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import NotFound
from app.services.saved_post_service import save_post, unsave_post, list_saved_posts


class TestSavePost:
    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.saved_post_service.PostRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Post"):
                await save_post(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_save_new(self, mock_db, sample_user):
        post = MagicMock()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_save_repo = MagicMock()
        mock_save_repo.exists = AsyncMock(return_value=False)
        mock_save_repo.create = AsyncMock()

        with (
            patch("app.services.saved_post_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.saved_post_service.SavedPostRepository", return_value=mock_save_repo),
        ):
            result = await save_post(mock_db, uuid4(), sample_user)
            assert result["saved"] is True
            mock_save_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_save_already_saved(self, mock_db, sample_user):
        post = MagicMock()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_save_repo = MagicMock()
        mock_save_repo.exists = AsyncMock(return_value=True)

        with (
            patch("app.services.saved_post_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.saved_post_service.SavedPostRepository", return_value=mock_save_repo),
        ):
            result = await save_post(mock_db, uuid4(), sample_user)
            assert result["saved"] is True
            mock_save_repo.create.assert_not_called()


class TestUnsavePost:
    @pytest.mark.asyncio
    async def test_unsave(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.delete = AsyncMock()

        with patch("app.services.saved_post_service.SavedPostRepository", return_value=mock_repo):
            result = await unsave_post(mock_db, uuid4(), sample_user)
            assert result["saved"] is False
            mock_repo.delete.assert_called_once()


class TestListSavedPosts:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.count_by_user = AsyncMock(return_value=0)
        mock_repo.list_by_user = AsyncMock(return_value=[])

        with patch("app.services.saved_post_service.SavedPostRepository", return_value=mock_repo):
            result = await list_saved_posts(mock_db, sample_user)
            assert result.total == 0
            assert result.items == []
