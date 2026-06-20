"""Extended tests for verification_service — guard clauses and status."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.verification_service import (
    confirm_verification_code,
    get_verification_status,
    send_verification_code,
    get_verification_history,
)


class TestSendVerificationCode:
    @pytest.mark.asyncio
    async def test_already_verified(self, mock_db, sample_user):
        sample_user.is_verified_student = True
        with pytest.raises(BadRequest, match="already a verified"):
            await send_verification_code(mock_db, sample_user, "student@uni.edu")

    @pytest.mark.asyncio
    async def test_invalid_email_domain(self, mock_db, sample_user):
        sample_user.is_verified_student = False
        mock_result = MagicMock()
        mock_result.valid = False
        mock_result.reason = "Not a recognized university domain"

        with patch("app.services.verification_service.validate_university_email", return_value=mock_result):
            with pytest.raises(BadRequest, match="university"):
                await send_verification_code(mock_db, sample_user, "user@gmail.com")


    @pytest.mark.asyncio
    async def test_university_not_found_raises(self, mock_db, sample_user):
        """Unknown domain raises NotFound after all lookup strategies fail."""
        sample_user.is_verified_student = False
        mock_valid = MagicMock(valid=True, domain="unknown.edu.tr")

        mock_uni_repo = MagicMock()
        mock_uni_repo.get_by_domain = AsyncMock(return_value=None)
        mock_uni_repo.get_by_domain_suffix = AsyncMock(return_value=None)

        with patch("app.services.verification_service.validate_university_email", return_value=mock_valid), \
             patch("app.services.verification_service.UniversityRepository", return_value=mock_uni_repo):
            with pytest.raises(NotFound, match="No university found"):
                await send_verification_code(mock_db, sample_user, "student@unknown.edu.tr")

    @pytest.mark.asyncio
    async def test_university_subdomain_tries_base_domain(self, mock_db, sample_user):
        """stu.rumeli.edu.tr → exact miss → falls back to base domain lookup."""
        sample_user.is_verified_student = False
        mock_valid = MagicMock(valid=True, domain="stu.rumeli.edu.tr")

        mock_uni_repo = MagicMock()
        mock_uni_repo.get_by_domain = AsyncMock(return_value=None)
        mock_uni_repo.get_by_domain_suffix = AsyncMock(return_value=None)

        with patch("app.services.verification_service.validate_university_email", return_value=mock_valid), \
             patch("app.services.verification_service.UniversityRepository", return_value=mock_uni_repo):
            with pytest.raises(NotFound):
                await send_verification_code(mock_db, sample_user, "student@stu.rumeli.edu.tr")
            # Verify it tried both exact and base domain lookups
            calls = mock_uni_repo.get_by_domain.call_args_list
            assert len(calls) == 2
            assert calls[0].args[0] == "stu.rumeli.edu.tr"
            assert calls[1].args[0] == "rumeli.edu.tr"

    @pytest.mark.asyncio
    async def test_university_subdomain_tries_suffix_search(self, mock_db, sample_user):
        """live.acibadem.edu.tr → exact miss → base miss → suffix search attempted."""
        sample_user.is_verified_student = False
        mock_valid = MagicMock(valid=True, domain="live.acibadem.edu.tr")

        mock_uni_repo = MagicMock()
        mock_uni_repo.get_by_domain = AsyncMock(return_value=None)
        mock_uni_repo.get_by_domain_suffix = AsyncMock(return_value=None)

        with patch("app.services.verification_service.validate_university_email", return_value=mock_valid), \
             patch("app.services.verification_service.UniversityRepository", return_value=mock_uni_repo):
            with pytest.raises(NotFound):
                await send_verification_code(mock_db, sample_user, "student@live.acibadem.edu.tr")
            # Verify suffix search was called with the base domain
            mock_uni_repo.get_by_domain_suffix.assert_called_once_with("acibadem.edu.tr")


class TestConfirmVerificationCode:
    @pytest.mark.asyncio
    async def test_already_verified(self, mock_db, sample_user):
        sample_user.is_verified_student = True
        with pytest.raises(BadRequest, match="already a verified"):
            await confirm_verification_code(mock_db, sample_user, uuid4(), "123456")

    @pytest.mark.asyncio
    async def test_request_not_found(self, mock_db, sample_user):
        sample_user.is_verified_student = False
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.verification_service.VerificationRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Verification request"):
                await confirm_verification_code(mock_db, sample_user, uuid4(), "123456")

    @pytest.mark.asyncio
    async def test_wrong_user(self, mock_db, sample_user):
        sample_user.is_verified_student = False
        req = MagicMock()
        req.user_id = uuid4()

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=req)

        with patch("app.services.verification_service.VerificationRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="does not belong"):
                await confirm_verification_code(mock_db, sample_user, uuid4(), "123456")

    @pytest.mark.asyncio
    async def test_not_pending(self, mock_db, sample_user):
        sample_user.is_verified_student = False
        req = MagicMock()
        req.user_id = sample_user.id
        req.status = "expired"

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=req)

        with patch("app.services.verification_service.VerificationRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="no longer pending"):
                await confirm_verification_code(mock_db, sample_user, uuid4(), "123456")

    @pytest.mark.asyncio
    async def test_not_email_method(self, mock_db, sample_user):
        sample_user.is_verified_student = False
        req = MagicMock()
        req.user_id = sample_user.id
        req.status = "pending"
        req.verification_method = "document"

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=req)

        with patch("app.services.verification_service.VerificationRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="not an email"):
                await confirm_verification_code(mock_db, sample_user, uuid4(), "123456")


class TestGetVerificationStatus:
    @pytest.mark.asyncio
    async def test_no_university(self, mock_db, sample_user):
        sample_user.university_id = None
        sample_user.is_verified_student = False

        mock_ver_repo = MagicMock()
        mock_ver_repo.get_latest_for_user = AsyncMock(return_value=None)
        mock_ver_repo.get_user_history = AsyncMock(return_value=[])

        with patch("app.services.verification_service.VerificationRepository", return_value=mock_ver_repo):
            result = await get_verification_status(mock_db, sample_user)
            assert result.is_verified_student is False
            assert result.university_name is None


class TestGetVerificationHistory:
    @pytest.mark.asyncio
    async def test_empty_history(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_user_history = AsyncMock(return_value=[])

        with patch("app.services.verification_service.VerificationRepository", return_value=mock_repo):
            result = await get_verification_history(mock_db, sample_user)
            assert result == []

    @pytest.mark.asyncio
    async def test_with_history(self, mock_db, sample_user):
        entry = MagicMock()
        entry.id = uuid4()
        entry.verification_method = "email"
        entry.status = "verified"
        entry.created_at = MagicMock()
        entry.created_at.isoformat.return_value = "2024-01-01T00:00:00"
        entry.verified_at = MagicMock()
        entry.verified_at.isoformat.return_value = "2024-01-01T01:00:00"
        entry.rejection_reason = None
        entry.ai_confidence = None
        entry.ai_flags = None
        entry.attempt_number = 1

        mock_repo = MagicMock()
        mock_repo.get_user_history = AsyncMock(return_value=[entry])

        with patch("app.services.verification_service.VerificationRepository", return_value=mock_repo):
            result = await get_verification_history(mock_db, sample_user)
            assert len(result) == 1
            assert result[0]["method"] == "email"
            assert result[0]["status"] == "verified"
