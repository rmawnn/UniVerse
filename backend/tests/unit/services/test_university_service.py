"""Unit tests for university_service — list and get."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import NotFound
from app.services.university_service import get_university, list_universities


class TestListUniversities:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count = AsyncMock(return_value=0)
        mock_repo.get_all = AsyncMock(return_value=[])

        with patch("app.services.university_service.UniversityRepository", return_value=mock_repo):
            result = await list_universities(mock_db)
            assert result.total == 0
            assert result.items == []


class TestGetUniversity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.university_service.UniversityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="University"):
                await get_university(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_found(self, mock_db):
        uid = uuid4()
        uni = MagicMock()
        uni.id = uid
        uni.name = "Test Uni"
        uni.domain = "test.edu"
        uni.country = "US"
        uni.created_at = MagicMock()

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=uni)

        with (
            patch("app.services.university_service.UniversityRepository", return_value=mock_repo),
            patch("app.services.university_service.UniversityResponse") as mock_response_cls,
        ):
            mock_response_cls.model_validate.return_value = MagicMock()
            result = await get_university(mock_db, uid)
            mock_response_cls.model_validate.assert_called_once_with(uni)
