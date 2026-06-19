"""Unit tests for app.core.dependencies — auth dependency functions."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from jose import JWTError

from app.core.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_admin,
    require_verified_user,
)


def _make_user(**kwargs):
    user = MagicMock()
    user.id = kwargs.get("id", uuid4())
    user.username = kwargs.get("username", "testuser")
    user.email = kwargs.get("email", "test@example.com")
    user.is_active = kwargs.get("is_active", True)
    user.is_verified_student = kwargs.get("is_verified_student", False)
    user.role = kwargs.get("role", "student")
    return user


class TestGetCurrentUser:
    @pytest.mark.asyncio
    async def test_invalidated_token_raises(self):
        with patch("app.core.dependencies.is_token_invalidated", return_value=True):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token="some-token", db=AsyncMock())
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_jwt_raises(self):
        with (
            patch("app.core.dependencies.is_token_invalidated", return_value=False),
            patch("app.core.dependencies.decode_token", side_effect=JWTError("bad")),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token="bad-token", db=AsyncMock())
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_rejected(self):
        with (
            patch("app.core.dependencies.is_token_invalidated", return_value=False),
            patch("app.core.dependencies.decode_token", return_value={"type": "refresh", "sub": str(uuid4())}),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token="token", db=AsyncMock())
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_missing_sub_raises(self):
        with (
            patch("app.core.dependencies.is_token_invalidated", return_value=False),
            patch("app.core.dependencies.decode_token", return_value={"type": "access"}),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token="token", db=AsyncMock())
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_user_not_found_raises(self):
        uid = uuid4()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with (
            patch("app.core.dependencies.is_token_invalidated", return_value=False),
            patch("app.core.dependencies.decode_token", return_value={"type": "access", "sub": str(uid)}),
            patch("app.core.dependencies.UserRepository", return_value=mock_repo),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token="token", db=AsyncMock())
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_inactive_user_raises_403(self):
        uid = uuid4()
        user = _make_user(id=uid, is_active=False)
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with (
            patch("app.core.dependencies.is_token_invalidated", return_value=False),
            patch("app.core.dependencies.decode_token", return_value={"type": "access", "sub": str(uid)}),
            patch("app.core.dependencies.UserRepository", return_value=mock_repo),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token="token", db=AsyncMock())
            assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_valid_token_returns_user(self):
        uid = uuid4()
        user = _make_user(id=uid, is_active=True)
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with (
            patch("app.core.dependencies.is_token_invalidated", return_value=False),
            patch("app.core.dependencies.decode_token", return_value={"type": "access", "sub": str(uid)}),
            patch("app.core.dependencies.UserRepository", return_value=mock_repo),
        ):
            result = await get_current_user(token="token", db=AsyncMock())
            assert result == user


class TestGetCurrentUserOptional:
    @pytest.mark.asyncio
    async def test_no_token_returns_none(self):
        result = await get_current_user_optional(token=None, db=AsyncMock())
        assert result is None

    @pytest.mark.asyncio
    async def test_invalid_token_returns_none(self):
        with patch("app.core.dependencies.decode_token", side_effect=JWTError("bad")):
            result = await get_current_user_optional(token="bad", db=AsyncMock())
            assert result is None

    @pytest.mark.asyncio
    async def test_no_sub_returns_none(self):
        with patch("app.core.dependencies.decode_token", return_value={}):
            result = await get_current_user_optional(token="token", db=AsyncMock())
            assert result is None

    @pytest.mark.asyncio
    async def test_user_not_found_returns_none(self):
        uid = uuid4()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with (
            patch("app.core.dependencies.decode_token", return_value={"sub": str(uid)}),
            patch("app.core.dependencies.UserRepository", return_value=mock_repo),
        ):
            result = await get_current_user_optional(token="token", db=AsyncMock())
            assert result is None

    @pytest.mark.asyncio
    async def test_inactive_user_returns_none(self):
        uid = uuid4()
        user = _make_user(id=uid, is_active=False)
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with (
            patch("app.core.dependencies.decode_token", return_value={"sub": str(uid)}),
            patch("app.core.dependencies.UserRepository", return_value=mock_repo),
        ):
            result = await get_current_user_optional(token="token", db=AsyncMock())
            assert result is None

    @pytest.mark.asyncio
    async def test_valid_token_returns_user(self):
        uid = uuid4()
        user = _make_user(id=uid, is_active=True)
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=user)

        with (
            patch("app.core.dependencies.decode_token", return_value={"sub": str(uid)}),
            patch("app.core.dependencies.UserRepository", return_value=mock_repo),
        ):
            result = await get_current_user_optional(token="token", db=AsyncMock())
            assert result == user


class TestRequireVerifiedUser:
    @pytest.mark.asyncio
    async def test_unverified_raises_403(self):
        user = _make_user(is_verified_student=False)
        with pytest.raises(HTTPException) as exc_info:
            await require_verified_user(current_user=user)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_verified_returns_user(self):
        user = _make_user(is_verified_student=True)
        result = await require_verified_user(current_user=user)
        assert result == user


class TestRequireAdmin:
    @pytest.mark.asyncio
    async def test_non_admin_raises_403(self):
        user = _make_user(role="student")
        with pytest.raises(HTTPException) as exc_info:
            await require_admin(current_user=user)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_returns_user(self):
        user = _make_user(role="admin")
        result = await require_admin(current_user=user)
        assert result == user
