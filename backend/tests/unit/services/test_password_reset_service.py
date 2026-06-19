"""Unit tests for password_reset_service — guard clauses and operations."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest
from app.services.password_reset_service import (
    _hash_reset_token,
    forgot_password,
    reset_password,
)


class TestHashResetToken:
    def test_deterministic(self):
        assert _hash_reset_token("test") == _hash_reset_token("test")

    def test_different_inputs(self):
        assert _hash_reset_token("a") != _hash_reset_token("b")


class TestForgotPassword:
    @pytest.mark.asyncio
    async def test_nonexistent_user(self, mock_db):
        mock_user_repo = MagicMock()
        mock_user_repo.get_by_email = AsyncMock(return_value=None)

        with patch("app.services.password_reset_service.UserRepository", return_value=mock_user_repo):
            result = await forgot_password(mock_db, "no@example.com")
            assert "message" in result

    @pytest.mark.asyncio
    async def test_inactive_user(self, mock_db):
        user = MagicMock()
        user.is_active = False
        mock_user_repo = MagicMock()
        mock_user_repo.get_by_email = AsyncMock(return_value=user)

        with patch("app.services.password_reset_service.UserRepository", return_value=mock_user_repo):
            result = await forgot_password(mock_db, "inactive@example.com")
            assert "message" in result

    @pytest.mark.asyncio
    async def test_active_user(self, mock_db):
        user = MagicMock()
        user.id = uuid4()
        user.is_active = True
        user.email = "user@example.com"

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_email = AsyncMock(return_value=user)

        mock_reset_repo = MagicMock()
        mock_reset_repo.create = AsyncMock()

        with (
            patch("app.services.password_reset_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.password_reset_service.PasswordResetRepository", return_value=mock_reset_repo),
            patch("app.services.password_reset_service.send_password_reset_email", new_callable=AsyncMock, return_value=True),
        ):
            result = await forgot_password(mock_db, "user@example.com")
            assert "message" in result
            mock_reset_repo.create.assert_called_once()


class TestResetPassword:
    @pytest.mark.asyncio
    async def test_invalid_token(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_token_hash = AsyncMock(return_value=None)

        with patch("app.services.password_reset_service.PasswordResetRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="Invalid or expired"):
                await reset_password(mock_db, "bad-token", "newpass123")

    @pytest.mark.asyncio
    async def test_used_token(self, mock_db):
        record = MagicMock()
        record.used_at = datetime.now(timezone.utc)
        record.id = uuid4()

        mock_repo = MagicMock()
        mock_repo.get_by_token_hash = AsyncMock(return_value=record)

        with patch("app.services.password_reset_service.PasswordResetRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="already been used"):
                await reset_password(mock_db, "used-token", "newpass123")

    @pytest.mark.asyncio
    async def test_expired_token(self, mock_db):
        record = MagicMock()
        record.used_at = None
        record.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        record.id = uuid4()

        mock_repo = MagicMock()
        mock_repo.get_by_token_hash = AsyncMock(return_value=record)

        with patch("app.services.password_reset_service.PasswordResetRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="expired"):
                await reset_password(mock_db, "expired-token", "newpass123")

    @pytest.mark.asyncio
    async def test_inactive_user(self, mock_db):
        record = MagicMock()
        record.used_at = None
        record.expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        record.user_id = uuid4()
        record.id = uuid4()

        user = MagicMock()
        user.is_active = False

        mock_reset_repo = MagicMock()
        mock_reset_repo.get_by_token_hash = AsyncMock(return_value=record)

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=user)

        with (
            patch("app.services.password_reset_service.PasswordResetRepository", return_value=mock_reset_repo),
            patch("app.services.password_reset_service.UserRepository", return_value=mock_user_repo),
        ):
            with pytest.raises(BadRequest, match="Invalid or expired"):
                await reset_password(mock_db, "token", "newpass123")

    @pytest.mark.asyncio
    async def test_success(self, mock_db):
        record = MagicMock()
        record.used_at = None
        record.expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        record.user_id = uuid4()
        record.id = uuid4()

        user = MagicMock()
        user.is_active = True
        user.id = record.user_id

        mock_reset_repo = MagicMock()
        mock_reset_repo.get_by_token_hash = AsyncMock(return_value=record)
        mock_reset_repo.mark_used = AsyncMock()
        mock_reset_repo.invalidate_all_for_user = AsyncMock()

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=user)
        mock_user_repo.update_password = AsyncMock()

        with (
            patch("app.services.password_reset_service.PasswordResetRepository", return_value=mock_reset_repo),
            patch("app.services.password_reset_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.password_reset_service.hash_password", return_value="hashed"),
        ):
            result = await reset_password(mock_db, "valid-token", "newpass123")
            assert "message" in result
            mock_reset_repo.mark_used.assert_called_once()
            mock_user_repo.update_password.assert_called_once()
