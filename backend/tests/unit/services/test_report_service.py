"""Unit tests for report_service — guard clauses."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, NotFound
from app.services.report_service import create_report, update_report_status


class TestCreateReport:
    @pytest.mark.asyncio
    async def test_invalid_target_type(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="Invalid target type"):
            await create_report(mock_db, sample_user, "invalid_type", uuid4(), "Spam")

    @pytest.mark.asyncio
    async def test_empty_reason(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="Reason is required"):
            await create_report(mock_db, sample_user, "post", uuid4(), "")

    @pytest.mark.asyncio
    async def test_whitespace_reason(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="Reason is required"):
            await create_report(mock_db, sample_user, "post", uuid4(), "   ")

    @pytest.mark.asyncio
    async def test_self_report(self, mock_db, sample_user):
        mock_db.get = AsyncMock(return_value=sample_user)

        with pytest.raises(BadRequest, match="Cannot report yourself"):
            await create_report(mock_db, sample_user, "user", sample_user.id, "Testing")

    @pytest.mark.asyncio
    async def test_target_not_found(self, mock_db, sample_user):
        mock_db.get = AsyncMock(return_value=None)

        with pytest.raises(NotFound):
            await create_report(mock_db, sample_user, "post", uuid4(), "Spam")

    @pytest.mark.asyncio
    async def test_duplicate_report(self, mock_db, sample_user):
        mock_db.get = AsyncMock(return_value=MagicMock())

        mock_repo = MagicMock()
        mock_repo.find_existing = AsyncMock(return_value=MagicMock())

        with patch("app.services.report_service.ReportRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="already reported"):
                await create_report(mock_db, sample_user, "post", uuid4(), "Spam")


class TestCreateReportSuccess:
    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        target_id = uuid4()
        mock_db.get = AsyncMock(return_value=MagicMock())

        report_id = uuid4()
        created_report = MagicMock()
        created_report.id = report_id
        created_report.reporter_id = sample_user.id
        created_report.target_type = "post"
        created_report.target_id = target_id
        created_report.reason = "Spam content"
        created_report.status = "pending"
        created_report.created_at = MagicMock()

        mock_repo = MagicMock()
        mock_repo.find_existing = AsyncMock(return_value=None)
        mock_repo.create = AsyncMock(return_value=created_report)

        with patch("app.services.report_service.ReportRepository", return_value=mock_repo):
            result = await create_report(mock_db, sample_user, "post", target_id, "Spam content")
            assert result.reason == "Spam content"
            assert result.status == "pending"
            mock_repo.create.assert_called_once()


class TestUpdateReportStatus:
    @pytest.mark.asyncio
    async def test_invalid_status(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="Invalid status"):
            await update_report_status(mock_db, uuid4(), "bad_status", sample_user)

    @pytest.mark.asyncio
    async def test_report_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.report_service.ReportRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Report not found"):
                await update_report_status(mock_db, uuid4(), "reviewed", sample_user)

    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        report_id = uuid4()
        report = MagicMock()
        report.id = report_id
        report.reporter_id = uuid4()
        report.target_type = "post"
        report.target_id = uuid4()
        report.reason = "Spam"
        report.status = "pending"
        report.created_at = MagicMock()
        report.reviewed_at = None
        report.reviewed_by = None

        reporter = MagicMock()
        reporter.username = "reporter_user"

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=report)
        mock_repo.update = AsyncMock()

        mock_db.get = AsyncMock(side_effect=[reporter, MagicMock(content="Short post")])

        with patch("app.services.report_service.ReportRepository", return_value=mock_repo):
            result = await update_report_status(mock_db, report_id, "reviewed", sample_user)
            assert result.status == "reviewed"
            assert result.reporter_username == "reporter_user"
            mock_repo.update.assert_called_once()
