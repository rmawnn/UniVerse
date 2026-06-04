import hashlib
import logging
from datetime import datetime, timedelta, timezone
from threading import Lock

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Suppress noisy passlib warning about bcrypt version detection
# (passlib 1.7.4 doesn't recognize bcrypt >=4.1 but works correctly)
logging.getLogger("passlib").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, extra_claims: dict | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire, "type": "access"}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises JWTError on failure."""
    return jwt.decode(
        token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )


# ── Token blocklist (in-memory; swap for Redis in production) ──

_blocklist_lock = Lock()
_blocklist: dict[str, float] = {}  # token_hash -> expiry timestamp


def _hash_token(token: str) -> str:
    """Hash a token for blocklist storage (avoid storing raw JWTs)."""
    return hashlib.sha256(token.encode()).hexdigest()


def invalidate_token(token: str) -> None:
    """Add a token to the blocklist so it can no longer be used."""
    try:
        payload = decode_token(token)
        exp = payload.get("exp", 0)
    except JWTError:
        # Even if decode fails, add to blocklist for safety
        exp = (datetime.now(timezone.utc) + timedelta(days=7)).timestamp()

    token_hash = _hash_token(token)
    with _blocklist_lock:
        _blocklist[token_hash] = exp
        # Prune expired entries while we're here
        now = datetime.now(timezone.utc).timestamp()
        expired_keys = [k for k, v in _blocklist.items() if v < now]
        for k in expired_keys:
            del _blocklist[k]

    logger.debug("Token invalidated: %s...", token_hash[:12])


def is_token_invalidated(token: str) -> bool:
    """Check if a token has been blocklisted."""
    token_hash = _hash_token(token)
    with _blocklist_lock:
        return token_hash in _blocklist
