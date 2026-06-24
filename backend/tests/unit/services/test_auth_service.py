"""Unit tests for app.services.auth_service — with mocked repositories."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AlreadyExists, BadRequest, Unauthorized
from app.services import auth_service


def _make_login_request(identifier="user@testuni.edu", password="Test1234"):
    req = MagicMock()
    req.identifier = identifier
    req.password = password
    return req


def _make_register_request(
    email="new@testuni.edu",
    password="StrongPass1",
    full_name="New User",
    username="newuser",
):
    req = MagicMock()
    req.email = email
    req.password = password
    req.full_name = full_name
    req.username = username
    return req


class TestLogin:
    @pytest.mark.asyncio
    async def test_login_with_email_success(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=sample_user)

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.auth_service.verify_password", return_value=True),
            patch("app.services.auth_service.create_access_token", return_value="access_tok"),
            patch("app.services.auth_service.create_refresh_token", return_value="refresh_tok"),
        ):
            result = await auth_service.login(mock_db, _make_login_request())
        assert result.access_token == "access_tok"
        assert result.refresh_token == "refresh_tok"

    @pytest.mark.asyncio
    async def test_login_with_username_success(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_username = AsyncMock(return_value=sample_user)

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.auth_service.verify_password", return_value=True),
            patch("app.services.auth_service.create_access_token", return_value="at"),
            patch("app.services.auth_service.create_refresh_token", return_value="rt"),
        ):
            result = await auth_service.login(mock_db, _make_login_request(identifier="testuser"))
        assert result.access_token == "at"

    @pytest.mark.asyncio
    async def test_login_email_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=None)

        with patch("app.services.auth_service.UserRepository", return_value=mock_repo):
            with pytest.raises(Unauthorized, match="No account found"):
                await auth_service.login(mock_db, _make_login_request())

    @pytest.mark.asyncio
    async def test_login_username_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_username = AsyncMock(return_value=None)

        with patch("app.services.auth_service.UserRepository", return_value=mock_repo):
            with pytest.raises(Unauthorized, match="No account found"):
                await auth_service.login(mock_db, _make_login_request(identifier="baduser"))

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=sample_user)

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.auth_service.verify_password", return_value=False),
        ):
            with pytest.raises(Unauthorized, match="Incorrect password"):
                await auth_service.login(mock_db, _make_login_request())

    @pytest.mark.asyncio
    async def test_login_deactivated_account(self, mock_db, sample_user):
        sample_user.is_active = False
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=sample_user)

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.auth_service.verify_password", return_value=True),
        ):
            with pytest.raises(Unauthorized, match="deactivated"):
                await auth_service.login(mock_db, _make_login_request())


class TestRegister:
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=MagicMock())

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.domain_validation_service.validate_university_email") as mock_val,
        ):
            mock_val.return_value = MagicMock(valid=True)
            with pytest.raises(AlreadyExists, match="email"):
                await auth_service.register(mock_db, _make_register_request())

    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=None)
        mock_repo.get_by_username = AsyncMock(return_value=MagicMock())

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.domain_validation_service.validate_university_email") as mock_val,
        ):
            mock_val.return_value = MagicMock(valid=True)
            with pytest.raises(AlreadyExists, match="username"):
                await auth_service.register(mock_db, _make_register_request())

    @pytest.mark.asyncio
    async def test_register_generic_email_rejected(self, mock_db):
        with patch("app.services.domain_validation_service.validate_university_email") as mock_val:
            mock_val.return_value = MagicMock(valid=False, reason="Generic email")
            with pytest.raises(BadRequest):
                await auth_service.register(
                    mock_db, _make_register_request(email="user@gmail.com")
                )


    @pytest.mark.asyncio
    async def test_register_rumeli_email_accepted(self, mock_db):
        user_id = uuid4()
        created_user = MagicMock()
        created_user.id = user_id
        created_user.email = "221201931@stu.rumeli.edu.tr"
        created_user.username = "rumeli_stu"
        created_user.full_name = "Test Student"
        created_user.university_id = None
        created_user.department = None
        created_user.academic_year = None
        created_user.bio = None
        created_user.profile_image_url = None
        created_user.cover_image_url = None
        created_user.is_active = True
        created_user.email_verified = False
        created_user.is_verified_student = False
        created_user.role = "student"
        created_user.created_at = MagicMock()
        created_user.updated_at = MagicMock()
        created_user.notify_job_applications = True
        created_user.notify_new_jobs = True

        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=None)
        mock_repo.get_by_username = AsyncMock(return_value=None)
        mock_repo.create = AsyncMock(return_value=created_user)

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.domain_validation_service.validate_university_email") as mock_val,
            patch("app.services.auth_service.hash_password", return_value="hashed"),
        ):
            mock_val.return_value = MagicMock(valid=True)
            result = await auth_service.register(
                mock_db,
                _make_register_request(email="221201931@stu.rumeli.edu.tr", username="rumeli_stu"),
            )
        assert result.email == "221201931@stu.rumeli.edu.tr"

    @pytest.mark.asyncio
    async def test_register_acibadem_email_accepted(self, mock_db):
        user_id = uuid4()
        created_user = MagicMock()
        created_user.id = user_id
        created_user.email = "aynaz@live.acibadem.edu.tr"
        created_user.username = "aynaz"
        created_user.full_name = "Aynaz K"
        created_user.university_id = None
        created_user.department = None
        created_user.academic_year = None
        created_user.bio = None
        created_user.profile_image_url = None
        created_user.cover_image_url = None
        created_user.is_active = True
        created_user.email_verified = False
        created_user.is_verified_student = False
        created_user.role = "student"
        created_user.created_at = MagicMock()
        created_user.updated_at = MagicMock()
        created_user.notify_job_applications = True
        created_user.notify_new_jobs = True

        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock(return_value=None)
        mock_repo.get_by_username = AsyncMock(return_value=None)
        mock_repo.create = AsyncMock(return_value=created_user)

        with (
            patch("app.services.auth_service.UserRepository", return_value=mock_repo),
            patch("app.services.domain_validation_service.validate_university_email") as mock_val,
            patch("app.services.auth_service.hash_password", return_value="hashed"),
        ):
            mock_val.return_value = MagicMock(valid=True)
            result = await auth_service.register(
                mock_db,
                _make_register_request(email="aynaz@live.acibadem.edu.tr", username="aynaz"),
            )
        assert result.email == "aynaz@live.acibadem.edu.tr"


class TestRegisterSchema:
    def test_valid_register_request(self):
        from app.schemas.auth import RegisterRequest
        req = RegisterRequest(
            email="test@university.edu.tr",
            password="StrongPass1",
            full_name="Test User",
            username="testuser",
        )
        assert req.email == "test@university.edu.tr"

    def test_password_missing_uppercase_gives_clear_error(self):
        from app.schemas.auth import RegisterRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="test@uni.edu",
                password="weakpass1",
                full_name="Test",
                username="testuser",
            )
        errors = exc_info.value.errors()
        assert any("uppercase" in e["msg"].lower() for e in errors)

    def test_password_missing_digit_gives_clear_error(self):
        from app.schemas.auth import RegisterRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="test@uni.edu",
                password="WeakPasss",
                full_name="Test",
                username="testuser",
            )
        errors = exc_info.value.errors()
        assert any("digit" in e["msg"].lower() for e in errors)

    def test_username_invalid_chars_gives_clear_error(self):
        from app.schemas.auth import RegisterRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="test@uni.edu",
                password="StrongPass1",
                full_name="Test",
                username="bad user!",
            )
        assert len(exc_info.value.errors()) > 0

    def test_password_too_short_gives_clear_error(self):
        from app.schemas.auth import RegisterRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="test@uni.edu",
                password="Ab1",
                full_name="Test",
                username="testuser",
            )
        assert len(exc_info.value.errors()) > 0


class TestRefresh:
    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, mock_db):
        from jose import JWTError
        with patch("app.services.auth_service.decode_token", side_effect=JWTError("bad")):
            with pytest.raises(Unauthorized, match="Invalid"):
                await auth_service.refresh(mock_db, "bad_token")

    @pytest.mark.asyncio
    async def test_refresh_not_refresh_type(self, mock_db):
        with patch("app.services.auth_service.decode_token", return_value={"type": "access", "sub": "u1"}):
            with pytest.raises(Unauthorized, match="not a refresh token"):
                await auth_service.refresh(mock_db, "some_token")

    @pytest.mark.asyncio
    async def test_refresh_revoked_token(self, mock_db):
        with (
            patch("app.services.auth_service.decode_token", return_value={"type": "refresh", "sub": "u1"}),
            patch("app.services.auth_service.is_token_invalidated", return_value=True),
        ):
            with pytest.raises(Unauthorized, match="revoked"):
                await auth_service.refresh(mock_db, "revoked_token")

    @pytest.mark.asyncio
    async def test_refresh_no_sub(self, mock_db):
        with (
            patch("app.services.auth_service.decode_token", return_value={"type": "refresh"}),
            patch("app.services.auth_service.is_token_invalidated", return_value=False),
        ):
            with pytest.raises(Unauthorized, match="Invalid token payload"):
                await auth_service.refresh(mock_db, "nosub_token")


class TestLogout:
    @pytest.mark.asyncio
    async def test_logout_calls_invalidate(self, mock_db):
        with patch("app.services.auth_service.invalidate_token") as mock_inv:
            await auth_service.logout(mock_db, "some_refresh_token")
            mock_inv.assert_called_once_with("some_refresh_token")
