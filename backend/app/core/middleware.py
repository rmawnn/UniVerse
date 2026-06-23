"""
Production security and observability middleware.

SecurityHeadersMiddleware: Adds HTTP security headers to every response.
RequestLoggingMiddleware: Structured request/response logging with timing.
"""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.

    These headers protect against XSS, clickjacking, MIME sniffing,
    and other common web vulnerabilities.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Enable browser XSS filter
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy (restrict browser features)
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        # Content Security Policy (API-only — no inline scripts needed)
        if not request.url.path.startswith("/uploads"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; frame-ancestors 'none'"
            )

        # Strict Transport Security (only in production, behind HTTPS)
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

        # Remove server identification header
        if "server" in response.headers:
            del response.headers["server"]

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured request logging with timing and correlation IDs.

    Logs: method, path, status, duration, client IP, request ID.
    Skips health check endpoint to reduce noise.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip logging for health checks
        if request.url.path.endswith("/health"):
            return await call_next(request)

        # Generate request correlation ID
        request_id = str(uuid.uuid4())[:8]
        start = time.monotonic()

        # Extract client IP
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else "unknown")
        )

        try:
            response = await call_next(request)
            duration_ms = (time.monotonic() - start) * 1000

            # Log level based on status code
            status_code = response.status_code
            if status_code >= 500:
                log_fn = logger.error
            elif status_code >= 400:
                log_fn = logger.warning
            else:
                log_fn = logger.info

            log_fn(
                "[%s] %s %s → %d (%.1fms) ip=%s",
                request_id,
                request.method,
                request.url.path,
                status_code,
                duration_ms,
                client_ip,
            )

            if duration_ms > 2000:
                logger.warning("[%s] SLOW REQUEST: %s %s took %.1fms", request_id, request.method, request.url.path, duration_ms)

            # Add request ID to response for client-side debugging
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as exc:
            duration_ms = (time.monotonic() - start) * 1000
            logger.error(
                "[%s] %s %s → EXCEPTION (%.1fms) ip=%s error=%s",
                request_id,
                request.method,
                request.url.path,
                duration_ms,
                client_ip,
                str(exc),
            )
            raise
