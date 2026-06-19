"""Unit tests for app.core.middleware — security headers and request logging."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware


def _make_request(path="/api/test", method="GET", forwarded=None, client_host="127.0.0.1"):
    request = MagicMock()
    request.url.path = path
    request.method = method
    request.headers = {}
    if forwarded:
        request.headers["X-Forwarded-For"] = forwarded
    request.client = MagicMock()
    request.client.host = client_host
    return request


def _make_response(status_code=200, headers=None):
    response = MagicMock()
    response.status_code = status_code
    response.headers = dict(headers or {})
    return response


class TestSecurityHeadersMiddleware:
    @pytest.mark.asyncio
    async def test_adds_xss_headers(self):
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request()
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert result.headers["X-Content-Type-Options"] == "nosniff"
        assert result.headers["X-Frame-Options"] == "DENY"
        assert result.headers["X-XSS-Protection"] == "1; mode=block"

    @pytest.mark.asyncio
    async def test_adds_referrer_policy(self):
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request()
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert result.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    @pytest.mark.asyncio
    async def test_adds_permissions_policy(self):
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request()
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert "camera=()" in result.headers["Permissions-Policy"]

    @pytest.mark.asyncio
    async def test_adds_csp_for_api_paths(self):
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request(path="/api/v1/users")
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert "Content-Security-Policy" in result.headers

    @pytest.mark.asyncio
    async def test_skips_csp_for_uploads(self):
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request(path="/uploads/image.jpg")
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert "Content-Security-Policy" not in result.headers

    @pytest.mark.asyncio
    async def test_removes_server_header(self):
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request()
        response = _make_response(headers={"server": "uvicorn"})
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert "server" not in result.headers

    @pytest.mark.asyncio
    @patch("app.core.middleware.settings")
    async def test_hsts_in_production(self, mock_settings):
        mock_settings.is_production = True
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request()
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert "Strict-Transport-Security" in result.headers

    @pytest.mark.asyncio
    @patch("app.core.middleware.settings")
    async def test_no_hsts_in_dev(self, mock_settings):
        mock_settings.is_production = False
        middleware = SecurityHeadersMiddleware(app=MagicMock())
        request = _make_request()
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert "Strict-Transport-Security" not in result.headers


class TestRequestLoggingMiddleware:
    @pytest.mark.asyncio
    async def test_skips_health_check(self):
        middleware = RequestLoggingMiddleware(app=MagicMock())
        request = _make_request(path="/api/v1/health")
        mock_response = _make_response()
        call_next = AsyncMock(return_value=mock_response)

        result = await middleware.dispatch(request, call_next)
        assert result == mock_response

    @pytest.mark.asyncio
    async def test_adds_request_id_header(self):
        middleware = RequestLoggingMiddleware(app=MagicMock())
        request = _make_request()
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        result = await middleware.dispatch(request, call_next)
        assert "X-Request-ID" in result.headers

    @pytest.mark.asyncio
    async def test_uses_forwarded_for_ip(self):
        middleware = RequestLoggingMiddleware(app=MagicMock())
        request = _make_request(forwarded="1.2.3.4, 5.6.7.8")
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            log_call = mock_logger.info.call_args
            assert "1.2.3.4" in str(log_call)

    @pytest.mark.asyncio
    async def test_exception_logged_and_reraised(self):
        middleware = RequestLoggingMiddleware(app=MagicMock())
        request = _make_request()
        call_next = AsyncMock(side_effect=RuntimeError("boom"))

        with patch("app.core.middleware.logger"):
            with pytest.raises(RuntimeError, match="boom"):
                await middleware.dispatch(request, call_next)

    @pytest.mark.asyncio
    async def test_no_client_uses_unknown(self):
        middleware = RequestLoggingMiddleware(app=MagicMock())
        request = _make_request()
        request.client = None
        request.headers = {}
        response = _make_response()
        call_next = AsyncMock(return_value=response)

        with patch("app.core.middleware.logger") as mock_logger:
            await middleware.dispatch(request, call_next)
            log_call = mock_logger.info.call_args
            assert "unknown" in str(log_call)
