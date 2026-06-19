"""Unit tests for app.core.exceptions — exception hierarchy and handler."""

import pytest
from unittest.mock import MagicMock

from app.core.exceptions import (
    AlreadyExists,
    AppException,
    BadRequest,
    Forbidden,
    NotFound,
    Unauthorized,
    app_exception_handler,
)


class TestExceptionHierarchy:
    def test_not_found_defaults(self):
        exc = NotFound()
        assert exc.status_code == 404
        assert "Resource" in exc.detail

    def test_not_found_custom_entity(self):
        exc = NotFound("Post")
        assert exc.status_code == 404
        assert "Post" in exc.detail

    def test_already_exists(self):
        exc = AlreadyExists("User")
        assert exc.status_code == 409
        assert "User" in exc.detail

    def test_unauthorized_default(self):
        exc = Unauthorized()
        assert exc.status_code == 401
        assert "Not authenticated" in exc.detail

    def test_unauthorized_custom(self):
        exc = Unauthorized("Token expired")
        assert exc.status_code == 401
        assert exc.detail == "Token expired"

    def test_forbidden(self):
        exc = Forbidden("Admin only")
        assert exc.status_code == 403
        assert exc.detail == "Admin only"

    def test_bad_request(self):
        exc = BadRequest("Invalid input")
        assert exc.status_code == 400
        assert exc.detail == "Invalid input"

    def test_all_inherit_from_app_exception(self):
        for cls in (NotFound, AlreadyExists, Unauthorized, Forbidden, BadRequest):
            assert issubclass(cls, AppException)

    def test_app_exception_is_exception(self):
        assert issubclass(AppException, Exception)


class TestExceptionHandler:
    @pytest.mark.asyncio
    async def test_handler_returns_json(self):
        request = MagicMock()
        exc = NotFound("Community")
        response = await app_exception_handler(request, exc)
        assert response.status_code == 404
        assert b"Community" in response.body

    @pytest.mark.asyncio
    async def test_handler_bad_request(self):
        request = MagicMock()
        exc = BadRequest("Missing field")
        response = await app_exception_handler(request, exc)
        assert response.status_code == 400
