"""Unit tests for app.core.rate_limit — sliding window counter."""

import time

import pytest

from app.core.rate_limit import _buckets, _check_rate, _cleanup_bucket


class TestCheckRate:
    def setup_method(self):
        _buckets.clear()

    def test_first_request_allowed(self):
        allowed, remaining = _check_rate("test:ip1", max_calls=5, window_seconds=60)
        assert allowed is True
        assert remaining == 4

    def test_within_limit(self):
        for _ in range(4):
            allowed, _ = _check_rate("test:ip2", max_calls=5, window_seconds=60)
            assert allowed is True

    def test_exceeds_limit(self):
        for _ in range(5):
            _check_rate("test:ip3", max_calls=5, window_seconds=60)
        allowed, remaining = _check_rate("test:ip3", max_calls=5, window_seconds=60)
        assert allowed is False
        assert remaining == 0

    def test_different_keys_independent(self):
        for _ in range(5):
            _check_rate("test:a", max_calls=5, window_seconds=60)
        allowed, _ = _check_rate("test:b", max_calls=5, window_seconds=60)
        assert allowed is True

    def test_remaining_decrements(self):
        _, r1 = _check_rate("test:dec", max_calls=3, window_seconds=60)
        assert r1 == 2
        _, r2 = _check_rate("test:dec", max_calls=3, window_seconds=60)
        assert r2 == 1
        _, r3 = _check_rate("test:dec", max_calls=3, window_seconds=60)
        assert r3 == 0

    def test_single_call_limit(self):
        allowed, remaining = _check_rate("test:single", max_calls=1, window_seconds=60)
        assert allowed is True
        assert remaining == 0
        allowed, _ = _check_rate("test:single", max_calls=1, window_seconds=60)
        assert allowed is False


class TestCleanupBucket:
    def setup_method(self):
        _buckets.clear()

    def test_cleanup_removes_old_entries(self):
        now = time.time()
        _buckets["test:clean"] = [now - 7200, now - 3700, now - 100]
        _cleanup_bucket("test:clean", now)
        assert len(_buckets["test:clean"]) == 1

    def test_cleanup_keeps_recent(self):
        now = time.time()
        _buckets["test:keep"] = [now - 10, now - 5, now]
        _cleanup_bucket("test:keep", now)
        assert len(_buckets["test:keep"]) == 3

    def test_cleanup_empty_bucket(self):
        _buckets["test:empty"] = []
        _cleanup_bucket("test:empty", time.time())
        assert _buckets["test:empty"] == []
