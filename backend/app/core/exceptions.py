import logging

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base exception for all domain errors."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class NotFound(AppException):
    def __init__(self, entity: str = "Resource"):
        super().__init__(404, f"{entity} not found")


class AlreadyExists(AppException):
    def __init__(self, entity: str = "Resource"):
        super().__init__(409, f"{entity} already exists")


class Unauthorized(AppException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(401, detail)


class Forbidden(AppException):
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(403, detail)


class BadRequest(AppException):
    def __init__(self, detail: str = "Bad request"):
        super().__init__(400, detail)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Global handler that converts AppException subclasses to JSON responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unhandled exceptions so CORS headers are always present."""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
