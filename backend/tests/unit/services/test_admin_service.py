"""Unit tests for app.services.admin_service — pure helpers and simple admin ops."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, NotFound
from app.services.admin_service import (
    _user_response,
    _verification_response,
    activate_user,
    change_role,
    deactivate_user,
    verify_user_manually,
)


def _make_user(**kwargs):
    user = MagicMock()
    user.id = kwargs.get("id", uuid4())
    user.username = kwargs.get("username", "adminuser")
    user.email = kwargs.get("email", "admin@example.com")
    user.full_name = kwargs.get("full_name", "Admin User")
    user.is_active = kwargs.get("is_active", True)
    user.is_verified_student = kwargs.get("is_verified_student", False)
    user.role = kwargs.get("role", "student")
    user.university_id = kwargs.get("university_id", None)
    user.created_at = kwargs.get("created_at", datetime(2024, 1, 1, tzinfo=timezone.utc))
    return user


class TestUserResponse:
    def test_basic(self):
        user = _make_user(username="testadmin", email="test@uni.edu", role="admin")
        result = _user_response(user)
        assert result.username == "testadmin"
        assert result.email == "test@uni.edu"
        assert result.role == "admin"


class TestVerificationResponse:
    def test_with_document(self):
        req = MagicMock()
        req.id = uuid4()
        req.user_id = uuid4()
        req.verification_method = "document"
        req.university_email = None
        req.document_url = "/uploads/doc.pdf"
        req.university_id = uuid4()
        req.status = "pending"
        req.rejection_reason = None
        req.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        req.expires_at = None
        req.verified_at = None

        user = _make_user(username="student1")
        university = MagicMock()
        university.name = "Test Uni"

        result = _verification_response(req, user, university)
        assert result.username == "student1"
        assert result.university_name == "Test Uni"
        assert result.document_url == f"/api/v1/verification/document/{req.id}"

    def test_without_document(self):
        req = MagicMock()
        req.id = uuid4()
        req.user_id = uuid4()
        req.verification_method = "email"
        req.university_email = "student@uni.edu"
        req.document_url = None
        req.university_id = uuid4()
        req.status = "verified"
        req.rejection_reason = None
        req.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        req.expires_at = None
        req.verified_at = datetime(2024, 2, 1, tzinfo=timezone.utc)

        result = _verification_response(req, None, None)
        assert result.username == "deleted"
        assert result.document_url is None
        assert result.university_name is None


class TestDeactivateUser:
    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            admin = _make_user()
            with pytest.raises(NotFound, match="User"):
                await deactivate_user(mock_db, uuid4(), admin)

    @pytest.mark.asyncio
    async def test_cannot_deactivate_self(self, mock_db):
        admin = _make_user()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=admin)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="yourself"):
                await deactivate_user(mock_db, admin.id, admin)

    @pytest.mark.asyncio
    async def test_deactivate_success(self, mock_db):
        admin = _make_user(id=uuid4())
        target = _make_user(id=uuid4(), username="target")
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=target)
        mock_repo.update = AsyncMock()

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            result = await deactivate_user(mock_db, target.id, admin)
            assert result.username == "target"
            mock_repo.update.assert_called_once()


class TestActivateUser:
    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await activate_user(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_activate_success(self, mock_db):
        user = _make_user(username="reactivated")
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)
        mock_repo.update = AsyncMock()

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            result = await activate_user(mock_db, user.id)
            assert result.username == "reactivated"


class TestChangeRole:
    @pytest.mark.asyncio
    async def test_invalid_role(self, mock_db):
        admin = _make_user()
        with pytest.raises(BadRequest, match="Invalid role"):
            await change_role(mock_db, uuid4(), "superadmin", admin)

    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            admin = _make_user()
            with pytest.raises(NotFound, match="User"):
                await change_role(mock_db, uuid4(), "student", admin)

    @pytest.mark.asyncio
    async def test_cannot_remove_own_admin(self, mock_db):
        admin = _make_user(role="admin")
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=admin)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="your own admin"):
                await change_role(mock_db, admin.id, "student", admin)

    @pytest.mark.asyncio
    async def test_change_role_success(self, mock_db):
        admin = _make_user(id=uuid4())
        target = _make_user(id=uuid4(), role="student")
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=target)
        mock_repo.update = AsyncMock()

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            result = await change_role(mock_db, target.id, "moderator", admin)
            assert result is not None


class TestVerifyUserManually:
    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await verify_user_manually(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_already_verified(self, mock_db):
        user = _make_user(is_verified_student=True)
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="already verified"):
                await verify_user_manually(mock_db, user.id)

    @pytest.mark.asyncio
    async def test_verify_success(self, mock_db):
        user = _make_user(is_verified_student=False)
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)
        mock_repo.update = AsyncMock()

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            result = await verify_user_manually(mock_db, user.id)
            assert result is not None
