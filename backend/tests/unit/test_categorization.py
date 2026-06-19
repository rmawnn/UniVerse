"""Unit tests for app.services.categorization_service."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.categorization_service import VALID_CATEGORIES, categorize_post


class TestValidCategories:
    def test_has_all_expected_categories(self):
        expected = {"academic", "research", "internship", "job",
                    "housing", "event", "marketplace", "general"}
        assert set(VALID_CATEGORIES) == expected

    def test_is_tuple(self):
        assert isinstance(VALID_CATEGORIES, tuple)


class TestCategorizePost:
    @pytest.mark.asyncio
    async def test_valid_category_returned(self):
        mock_provider = MagicMock()
        mock_provider.classify = AsyncMock(return_value="academic")
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()

        with patch("app.services.categorization_service.get_llm_provider", return_value=mock_provider):
            result = await categorize_post(mock_db, uuid4(), "Research paper on AI")
        assert result == "academic"

    @pytest.mark.asyncio
    async def test_invalid_category_defaults_to_general(self):
        mock_provider = MagicMock()
        mock_provider.classify = AsyncMock(return_value="nonsense_category")
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()

        with patch("app.services.categorization_service.get_llm_provider", return_value=mock_provider):
            result = await categorize_post(mock_db, uuid4(), "Some content")
        assert result == "general"

    @pytest.mark.asyncio
    async def test_llm_exception_defaults_to_general(self):
        mock_provider = MagicMock()
        mock_provider.classify = AsyncMock(side_effect=RuntimeError("API down"))
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()

        with patch("app.services.categorization_service.get_llm_provider", return_value=mock_provider):
            result = await categorize_post(mock_db, uuid4(), "Content")
        assert result == "general"

    @pytest.mark.asyncio
    async def test_db_update_called(self):
        mock_provider = MagicMock()
        mock_provider.classify = AsyncMock(return_value="job")
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()

        with patch("app.services.categorization_service.get_llm_provider", return_value=mock_provider):
            await categorize_post(mock_db, uuid4(), "Job posting")
        mock_db.execute.assert_called_once()
        mock_db.flush.assert_called_once()
