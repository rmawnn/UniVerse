"""Unit tests for ai_usage_service — log, list, and summary."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.ai_usage_service import (
    get_ai_usage_logs,
    get_ai_usage_summary,
    log_ai_usage,
)


class TestLogAiUsage:
    @pytest.mark.asyncio
    async def test_log(self, mock_db):
        mock_db.flush = AsyncMock()
        await log_ai_usage(
            mock_db,
            user_id=uuid4(),
            feature="categorization",
            provider="openai",
            latency_ms=150,
            success=True,
        )
        mock_db.add.assert_called_once()


class TestGetAiUsageLogs:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        count_result = MagicMock()
        count_result.scalar.return_value = 0

        rows_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        rows_result.scalars.return_value = scalars

        mock_db.execute = AsyncMock(side_effect=[count_result, rows_result])

        result = await get_ai_usage_logs(mock_db)
        assert result["total"] == 0
        assert result["items"] == []

    @pytest.mark.asyncio
    async def test_with_filter(self, mock_db):
        count_result = MagicMock()
        count_result.scalar.return_value = 0

        rows_result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = []
        rows_result.scalars.return_value = scalars

        mock_db.execute = AsyncMock(side_effect=[count_result, rows_result])

        result = await get_ai_usage_logs(mock_db, feature="categorization")
        assert result["total"] == 0


class TestGetAiUsageSummary:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        total_result = MagicMock()
        total_result.scalar.return_value = 0

        success_result = MagicMock()
        success_result.scalar.return_value = 0

        avg_result = MagicMock()
        avg_result.scalar.return_value = None

        by_feature_result = MagicMock()
        by_feature_result.all.return_value = []

        mock_db.execute = AsyncMock(
            side_effect=[total_result, success_result, avg_result, by_feature_result]
        )

        result = await get_ai_usage_summary(mock_db)
        assert result["total_requests"] == 0
        assert result["success_rate"] == 0
        assert result["avg_latency_ms"] == 0
        assert result["by_feature"] == []
