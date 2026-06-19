"""Unit tests for job_repository — mock-based DB interaction tests."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.repositories.job_repository import JobRepository


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _mock_scalar_or_none_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _mock_scalars_result(values):
    result = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = values
    result.scalars.return_value = scalars
    return result


@pytest.fixture
def repo(mock_db):
    return JobRepository(mock_db)


class TestJobRepoCreateJob:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        job = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create_job(job)
        mock_db.add.assert_called_once_with(job)
        assert result == job


class TestJobRepoGetJobById:
    @pytest.mark.asyncio
    async def test_get_existing(self, repo, mock_db):
        job = MagicMock()
        mock_db.get = AsyncMock(return_value=job)
        result = await repo.get_job_by_id(uuid4())
        assert result == job


class TestJobRepoDeleteJob:
    @pytest.mark.asyncio
    async def test_delete(self, repo, mock_db):
        job = MagicMock()
        mock_db.delete = AsyncMock()
        mock_db.flush = AsyncMock()
        await repo.delete_job(job)
        mock_db.delete.assert_called_once_with(job)


class TestJobRepoCountApplicationsForJob:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(3))
        result = await repo.count_applications_for_job(uuid4())
        assert result == 3


class TestJobRepoGetApplication:
    @pytest.mark.asyncio
    async def test_get(self, repo, mock_db):
        app = MagicMock()
        mock_db.execute = AsyncMock(return_value=_mock_scalar_or_none_result(app))
        result = await repo.get_application(uuid4(), uuid4())
        assert result == app


class TestJobRepoCreateApplication:
    @pytest.mark.asyncio
    async def test_create(self, repo, mock_db):
        app = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        result = await repo.create_application(app)
        mock_db.add.assert_called_once_with(app)
        assert result == app


class TestJobRepoIsSaved:
    @pytest.mark.asyncio
    async def test_saved(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(1))
        result = await repo.is_saved(uuid4(), uuid4())
        assert result is True

    @pytest.mark.asyncio
    async def test_not_saved(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(0))
        result = await repo.is_saved(uuid4(), uuid4())
        assert result is False


class TestJobRepoSaveJob:
    @pytest.mark.asyncio
    async def test_save(self, repo, mock_db):
        saved = MagicMock()
        mock_db.flush = AsyncMock()
        await repo.save_job(saved)
        mock_db.add.assert_called_once_with(saved)


class TestJobRepoCountSavedJobs:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(5))
        result = await repo.count_saved_jobs(uuid4())
        assert result == 5


class TestJobRepoCountApplicationsByUser:
    @pytest.mark.asyncio
    async def test_count(self, repo, mock_db):
        mock_db.execute = AsyncMock(return_value=_mock_scalar_result(2))
        result = await repo.count_applications_by_user(uuid4())
        assert result == 2


class TestJobRepoGetApplicationById:
    @pytest.mark.asyncio
    async def test_get(self, repo, mock_db):
        app = MagicMock()
        mock_db.get = AsyncMock(return_value=app)
        result = await repo.get_application_by_id(uuid4())
        assert result == app
