"""
In-memory rate limiter for FastAPI.

Provides per-IP and per-user rate limiting using a sliding window
counter stored in-process. For multi-instance deployments, replace
the in-memory store with Redis.

Usage in routes:
    from app.core.rate_limit import RateLimiter, rate_limit

    # As a dependency
    @router.post("/login")
    async def login(
        request: Request,
        _rl=Depends(RateLimiter(max_calls=5, window_seconds=300)),
    ): ...

    # Or as a decorator-style with the helper
    @router.post("/send")
    async def send(
        request: Request,
        current_user: User = Depends(get_current_user),
        _rl=Depends(RateLimiter(max_calls=3, window_seconds=60, use_user_id=True)),
    ): ...
"""

import time
import logging
from collections import defaultdict
from threading import Lock

from fastapi import Request, Depends, HTTPException, status

logger = logging.getLogger(__name__)

# ── Sliding window counter store ─────────────────────────────

_lock = Lock()
_buckets: dict[str, list[float]] = defaultdict(list)

# Periodic cleanup: remove entries older than max_window
_MAX_WINDOW = 3600  # 1 hour — no rate limit exceeds this


def _cleanup_bucket(key: str, now: float) -> None:
    """Remove timestamps older than _MAX_WINDOW from a bucket."""
    cutoff = now - _MAX_WINDOW
    _buckets[key] = [t for t in _buckets[key] if t > cutoff]


def _check_rate(key: str, max_calls: int, window_seconds: int) -> tuple[bool, int]:
    """
    Check if a request is allowed under the rate limit.
    Returns (allowed, remaining_calls).
    """
    now = time.time()
    cutoff = now - window_seconds

    with _lock:
        _cleanup_bucket(key, now)
        recent = [t for t in _buckets[key] if t > cutoff]

        if len(recent) >= max_calls:
            return False, 0

        _buckets[key].append(now)
        return True, max_calls - len(recent) - 1


# ── FastAPI dependency ────────────────────────────────────────


class RateLimiter:
    """
    FastAPI dependency for rate limiting.

    Parameters:
        max_calls:       Maximum number of calls allowed in the window.
        window_seconds:  Time window in seconds.
        use_user_id:     If True, rate limit per authenticated user instead of IP.
                         Falls back to IP if no user is authenticated.
        prefix:          Custom key prefix for grouping (e.g. "login", "verify").
                         Defaults to the route path.
    """

    def __init__(
        self,
        max_calls: int = 10,
        window_seconds: int = 60,
        *,
        use_user_id: bool = False,
        prefix: str = "",
    ):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.use_user_id = use_user_id
        self.prefix = prefix

    async def __call__(self, request: Request) -> None:
        # Build rate limit key
        if self.use_user_id:
            # Try to extract user_id from request state (set by auth dep)
            user = getattr(request.state, "user", None)
            identity = str(user.id) if user else self._get_client_ip(request)
        else:
            identity = self._get_client_ip(request)

        route_key = self.prefix or request.url.path
        key = f"rl:{route_key}:{identity}"

        allowed, remaining = _check_rate(key, self.max_calls, self.window_seconds)

        if not allowed:
            logger.warning(
                "Rate limit exceeded: key=%s max=%d window=%ds",
                key, self.max_calls, self.window_seconds,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in {self.window_seconds} seconds.",
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(self.max_calls),
                    "X-RateLimit-Remaining": "0",
                },
            )

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """Extract client IP, respecting X-Forwarded-For behind proxies."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
