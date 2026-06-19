"""Unit tests for app.services.job_service — response builders and guard clauses."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AlreadyExists, BadRequest, Forbidden, NotFound
from app.services.job_service import (
    _build_application_response,
    _build_job_response,
    _build_my_application_response,
    apply_to_job,
    create_job,
    delete_job,
    get_application_cv_url,
    get_job,
    get_job_activity,
    get_job_stats,
    list_job_applications,
    list_jobs,
    list_my_applications,
    list_saved_jobs,
    save_job,
    unsave_job,
    update_application_status,
)


def _make_user(**kwargs):
    user = MagicMock()
    user.id = kwargs.get("id", uuid4())
    user.username = kwargs.get("username", "jobuser")
    user.full_name = kwargs.get("full_name", "Job User")
    user.profile_image_url = kwargs.get("profile_image_url", None)
    user.is_active = kwargs.get("is_active", True)
    user.university_id = kwargs.get("university_id", None)
    user.notify_new_jobs = kwargs.get("notify_new_jobs", False)
    user.notify_job_applications = kwargs.get("notify_job_applications", False)
    return user


def _make_job(**kwargs):
    job = MagicMock()
    job.id = kwargs.get("id", uuid4())
    job.author_id = kwargs.get("author_id", uuid4())
    job.title = kwargs.get("title", "Test Job")
    job.description = kwargs.get("description", "A test job")
    job.company_name = kwargs.get("company_name", "TestCo")
    job.location = kwargs.get("location", "Remote")
    job.job_type = kwargs.get("job_type", "full_time")
    job.is_active = kwargs.get("is_active", True)
    job.created_at = kwargs.get("created_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
    job.updated_at = kwargs.get("updated_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
    return job


def _make_application(**kwargs):
    app = MagicMock()
    app.id = kwargs.get("id", uuid4())
    app.job_id = kwargs.get("job_id", uuid4())
    app.applicant_id = kwargs.get("applicant_id", uuid4())
    app.message = kwargs.get("message", "I'm interested")
    app.cv_url = kwargs.get("cv_url", None)
    app.status = kwargs.get("status", "pending")
    app.created_at = kwargs.get("created_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
    app.updated_at = kwargs.get("updated_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
    return app


class TestBuildJobResponse:
    def test_with_author(self):
        job = _make_job(title="Dev Role")
        author = _make_user(username="employer")
        result = _build_job_response(job, author, application_count=3, has_applied=True, saved_by_me=False)
        assert result.title == "Dev Role"
        assert result.author.username == "employer"
        assert result.application_count == 3
        assert result.has_applied is True

    def test_without_author(self):
        job = _make_job()
        result = _build_job_response(job, None)
        assert result.author.username == "[deleted]"
        assert result.author.full_name == "Deleted User"

    def test_defaults(self):
        job = _make_job()
        author = _make_user()
        result = _build_job_response(job, author)
        assert result.application_count == 0
        assert result.has_applied is False
        assert result.saved_by_me is False


class TestBuildApplicationResponse:
    def test_with_applicant(self):
        application = _make_application(message="Hire me")
        applicant = _make_user(username="applicant1")
        result = _build_application_response(application, applicant)
        assert result.applicant.username == "applicant1"
        assert result.message == "Hire me"

    def test_without_applicant(self):
        application = _make_application()
        result = _build_application_response(application, None)
        assert result.applicant.username == "[deleted]"


class TestBuildMyApplicationResponse:
    def test_with_job(self):
        application = _make_application()
        job = _make_job(title="SWE Intern", company_name="BigCo", job_type="internship")
        result = _build_my_application_response(application, job)
        assert result.job_title == "SWE Intern"
        assert result.company_name == "BigCo"

    def test_without_job(self):
        application = _make_application()
        result = _build_my_application_response(application, None)
        assert result.job_title == "[deleted]"
        assert result.job_type == "unknown"


class TestCreateJob:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db):
        user = _make_user(is_active=False)
        data = MagicMock()
        with pytest.raises(BadRequest, match="deactivated"):
            await create_job(mock_db, user, data)


class TestGetJob:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Job post"):
                await get_job(mock_db, uuid4())


class TestDeleteJob:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(NotFound, match="Job post"):
                await delete_job(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_not_author_forbidden(self, mock_db):
        job = _make_job(author_id=uuid4())
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(Forbidden, match="your own"):
                await delete_job(mock_db, uuid4(), user)


class TestGetJobStats:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(NotFound, match="Job post"):
                await get_job_stats(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_not_owner_forbidden(self, mock_db):
        job = _make_job(author_id=uuid4())
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(Forbidden, match="job owner"):
                await get_job_stats(mock_db, uuid4(), user)


class TestApplyToJob:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db):
        user = _make_user(is_active=False)
        data = MagicMock()
        with pytest.raises(BadRequest, match="deactivated"):
            await apply_to_job(mock_db, uuid4(), user, data)

    @pytest.mark.asyncio
    async def test_job_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            data = MagicMock()
            with pytest.raises(NotFound, match="Job post"):
                await apply_to_job(mock_db, uuid4(), user, data)

    @pytest.mark.asyncio
    async def test_inactive_job(self, mock_db):
        job = _make_job(is_active=False)
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            data = MagicMock()
            with pytest.raises(BadRequest, match="no longer accepting"):
                await apply_to_job(mock_db, uuid4(), user, data)

    @pytest.mark.asyncio
    async def test_cannot_apply_to_own_job(self, mock_db):
        user = _make_user()
        job = _make_job(author_id=user.id)
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            data = MagicMock()
            with pytest.raises(BadRequest, match="your own job"):
                await apply_to_job(mock_db, uuid4(), user, data)

    @pytest.mark.asyncio
    async def test_duplicate_application(self, mock_db):
        user = _make_user()
        job = _make_job(author_id=uuid4())
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)
        mock_repo.get_application = AsyncMock(return_value=MagicMock())

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            data = MagicMock()
            with pytest.raises(AlreadyExists, match="Application"):
                await apply_to_job(mock_db, uuid4(), user, data)


class TestUpdateApplicationStatus:
    @pytest.mark.asyncio
    async def test_application_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_application_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            data = MagicMock()
            data.status = "accepted"
            with pytest.raises(NotFound, match="Application"):
                await update_application_status(mock_db, uuid4(), user, data)

    @pytest.mark.asyncio
    async def test_not_job_owner(self, mock_db):
        application = _make_application()
        job = _make_job(author_id=uuid4())
        mock_repo = MagicMock()
        mock_repo.get_application_by_id = AsyncMock(return_value=application)
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            data = MagicMock()
            data.status = "accepted"
            with pytest.raises(Forbidden, match="job owner"):
                await update_application_status(mock_db, uuid4(), user, data)

    @pytest.mark.asyncio
    async def test_already_reviewed(self, mock_db):
        user = _make_user()
        application = _make_application(status="accepted")
        job = _make_job(author_id=user.id)
        mock_repo = MagicMock()
        mock_repo.get_application_by_id = AsyncMock(return_value=application)
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            data = MagicMock()
            data.status = "rejected"
            with pytest.raises(BadRequest, match="already been reviewed"):
                await update_application_status(mock_db, uuid4(), user, data)


class TestSaveJob:
    @pytest.mark.asyncio
    async def test_job_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(NotFound, match="Job post"):
                await save_job(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_inactive_job_cannot_save(self, mock_db):
        job = _make_job(is_active=False)
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(BadRequest, match="inactive"):
                await save_job(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_already_saved_returns_true(self, mock_db):
        job = _make_job()
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)
        mock_repo.is_saved = AsyncMock(return_value=True)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            result = await save_job(mock_db, uuid4(), user)
            assert result.saved is True


class TestUnsaveJob:
    @pytest.mark.asyncio
    async def test_unsave_returns_false(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.unsave_job = AsyncMock()

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            result = await unsave_job(mock_db, uuid4(), user)
            assert result.saved is False


class TestGetJobActivity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(NotFound, match="Job post"):
                await get_job_activity(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_not_owner(self, mock_db):
        job = _make_job(author_id=uuid4())
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(Forbidden, match="job owner"):
                await get_job_activity(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_empty_applications(self, mock_db):
        user = _make_user()
        job = _make_job(author_id=user.id)
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)
        mock_repo.list_applications_for_activity = AsyncMock(return_value=[])

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            result = await get_job_activity(mock_db, uuid4(), user)
            assert result == []


class TestListJobApplications:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(NotFound, match="Job post"):
                await list_job_applications(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_not_owner(self, mock_db):
        job = _make_job(author_id=uuid4())
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(Forbidden, match="job owner"):
                await list_job_applications(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        user = _make_user()
        job = _make_job(author_id=user.id)
        mock_repo = MagicMock()
        mock_repo.get_job_by_id = AsyncMock(return_value=job)
        mock_repo.count_applications_for_job = AsyncMock(return_value=0)
        mock_repo.list_applications_for_job = AsyncMock(return_value=[])

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            result = await list_job_applications(mock_db, uuid4(), user)
            assert result.total == 0
            assert result.items == []


class TestGetApplicationCvUrl:
    @pytest.mark.asyncio
    async def test_app_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_application_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(NotFound, match="Application"):
                await get_application_cv_url(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_job_not_found(self, mock_db):
        application = _make_application()
        mock_repo = MagicMock()
        mock_repo.get_application_by_id = AsyncMock(return_value=application)
        mock_repo.get_job_by_id = AsyncMock(return_value=None)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(NotFound, match="Job post"):
                await get_application_cv_url(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_not_owner(self, mock_db):
        application = _make_application()
        job = _make_job(author_id=uuid4())
        mock_repo = MagicMock()
        mock_repo.get_application_by_id = AsyncMock(return_value=application)
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            with pytest.raises(Forbidden, match="job owner"):
                await get_application_cv_url(mock_db, uuid4(), user)

    @pytest.mark.asyncio
    async def test_no_cv(self, mock_db):
        user = _make_user()
        application = _make_application(cv_url=None)
        job = _make_job(author_id=user.id)
        mock_repo = MagicMock()
        mock_repo.get_application_by_id = AsyncMock(return_value=application)
        mock_repo.get_job_by_id = AsyncMock(return_value=job)

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="No CV"):
                await get_application_cv_url(mock_db, uuid4(), user)


class TestListMyApplications:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_applications_by_user = AsyncMock(return_value=0)
        mock_repo.list_applications_by_user = AsyncMock(return_value=[])

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            result = await list_my_applications(mock_db, user)
            assert result.total == 0
            assert result.items == []


class TestListSavedJobs:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_saved_jobs = AsyncMock(return_value=0)
        mock_repo.list_saved_jobs = AsyncMock(return_value=[])

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            user = _make_user()
            result = await list_saved_jobs(mock_db, user)
            assert result.total == 0
            assert result.items == []


class TestListJobs:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_jobs = AsyncMock(return_value=0)
        mock_repo.list_jobs = AsyncMock(return_value=[])

        with patch("app.services.job_service.JobRepository", return_value=mock_repo):
            result = await list_jobs(mock_db)
            assert result.total == 0
            assert result.items == []
