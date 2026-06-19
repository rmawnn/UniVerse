"""Extended tests for admin_service — list users and guard clauses."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import NotFound
from app.services.admin_service import (
    _user_response,
    _verification_response,
    get_user_detail,
    list_users,
)


class TestListUsers:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_all_filtered = AsyncMock(return_value=0)
        mock_repo.list_all_filtered = AsyncMock(return_value=[])

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            result = await list_users(mock_db)
            assert result.total == 0
            assert result.items == []

    @pytest.mark.asyncio
    async def test_with_users(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.count_all_filtered = AsyncMock(return_value=1)
        mock_repo.list_all_filtered = AsyncMock(return_value=[sample_user])

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            result = await list_users(mock_db)
            assert result.total == 1
            assert len(result.items) == 1

    @pytest.mark.asyncio
    async def test_with_filters(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_all_filtered = AsyncMock(return_value=0)
        mock_repo.list_all_filtered = AsyncMock(return_value=[])

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            result = await list_users(mock_db, search="test", is_active=True, role="admin")
            assert result.total == 0
            mock_repo.count_all_filtered.assert_called_once_with(
                search="test", is_active=True, is_verified=None, role="admin",
            )


class TestGetUserDetail:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.admin_service.UserRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="User"):
                await get_user_detail(mock_db, uuid4())


class TestUserResponseHelper:
    def test_builds_response(self, sample_user):
        result = _user_response(sample_user)
        assert result.username == sample_user.username
        assert result.email == sample_user.email


class TestVerificationResponseHelper:
    def test_with_document(self):
        req = MagicMock()
        req.id = uuid4()
        req.user_id = uuid4()
        req.verification_method = "document"
        req.university_email = None
        req.document_url = "/some/path"
        req.university_id = uuid4()
        req.status = "pending"
        req.rejection_reason = None
        req.created_at = MagicMock()
        req.expires_at = None
        req.verified_at = None

        user = MagicMock()
        user.username = "test"
        user.full_name = "Test User"

        uni = MagicMock()
        uni.name = "Test University"

        result = _verification_response(req, user, uni)
        assert result.university_name == "Test University"
        assert "/document/" in result.document_url

    def test_without_document(self):
        req = MagicMock()
        req.id = uuid4()
        req.user_id = uuid4()
        req.verification_method = "email"
        req.university_email = "test@uni.edu"
        req.document_url = None
        req.university_id = uuid4()
        req.status = "verified"
        req.rejection_reason = None
        req.created_at = MagicMock()
        req.expires_at = None
        req.verified_at = MagicMock()

        result = _verification_response(req, None, None)
        assert result.username == "deleted"
        assert result.document_url is None
