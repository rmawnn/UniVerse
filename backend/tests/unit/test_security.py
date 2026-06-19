"""Unit tests for app.core.security — JWT, password hashing, token blocklist."""

import pytest
from jose import JWTError

from app.core.security import (
    _blocklist,
    _hash_token,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    invalidate_token,
    is_token_invalidated,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        raw = "SecurePassword123!"
        hashed = hash_password(raw)
        assert hashed != raw
        assert verify_password(raw, hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("correct_password")
        assert verify_password("wrong_password", hashed) is False

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt uses random salt

    def test_empty_password_hashes(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True
        assert verify_password("notempty", hashed) is False


class TestAccessToken:
    def test_create_and_decode(self):
        token = create_access_token(subject="user-123")
        payload = decode_token(token)
        assert payload["sub"] == "user-123"
        assert payload["type"] == "access"

    def test_extra_claims_included(self):
        token = create_access_token(
            subject="user-456", extra_claims={"role": "admin"}
        )
        payload = decode_token(token)
        assert payload["role"] == "admin"
        assert payload["sub"] == "user-456"

    def test_token_has_expiry(self):
        token = create_access_token(subject="u1")
        payload = decode_token(token)
        assert "exp" in payload


class TestRefreshToken:
    def test_create_and_decode(self):
        token = create_refresh_token(subject="user-789")
        payload = decode_token(token)
        assert payload["sub"] == "user-789"
        assert payload["type"] == "refresh"

    def test_refresh_distinct_from_access(self):
        access = create_access_token(subject="u1")
        refresh = create_refresh_token(subject="u1")
        assert access != refresh
        assert decode_token(access)["type"] == "access"
        assert decode_token(refresh)["type"] == "refresh"


class TestDecodeToken:
    def test_invalid_token_raises(self):
        with pytest.raises(JWTError):
            decode_token("not.a.valid.token")

    def test_tampered_token_raises(self):
        token = create_access_token(subject="u1")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)


class TestTokenBlocklist:
    def setup_method(self):
        _blocklist.clear()

    def test_invalidate_and_check(self):
        token = create_refresh_token(subject="u1")
        assert is_token_invalidated(token) is False
        invalidate_token(token)
        assert is_token_invalidated(token) is True

    def test_non_invalidated_token_allowed(self):
        token = create_refresh_token(subject="u2")
        assert is_token_invalidated(token) is False

    def test_invalid_token_still_blocklisted(self):
        bad = "garbage.token.here"
        invalidate_token(bad)
        assert is_token_invalidated(bad) is True

    def test_hash_token_deterministic(self):
        assert _hash_token("abc") == _hash_token("abc")
        assert _hash_token("abc") != _hash_token("def")
