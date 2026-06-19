"""Unit tests for verification_service pure helper functions."""

import pytest

from app.services.verification_service import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    MIN_FILE_SIZE,
    VERIFICATION_CODE_LENGTH,
    VERIFICATION_EXPIRY_MINUTES,
    _detect_content_type,
    _extract_domain,
    _generate_code,
    _hash_code,
    _hash_file,
)


class TestGenerateCode:
    def test_length(self):
        code = _generate_code()
        assert len(code) == VERIFICATION_CODE_LENGTH

    def test_numeric_only(self):
        code = _generate_code()
        assert code.isdigit()

    def test_randomness(self):
        codes = {_generate_code() for _ in range(100)}
        assert len(codes) > 50


class TestHashCode:
    def test_deterministic(self):
        assert _hash_code("123456") == _hash_code("123456")

    def test_different_codes_different_hashes(self):
        assert _hash_code("111111") != _hash_code("222222")

    def test_sha256_length(self):
        h = _hash_code("999999")
        assert len(h) == 64  # SHA-256 hex digest


class TestHashFile:
    def test_deterministic(self):
        content = b"file content here"
        assert _hash_file(content) == _hash_file(content)

    def test_different_content(self):
        assert _hash_file(b"aaa") != _hash_file(b"bbb")

    def test_empty_content(self):
        h = _hash_file(b"")
        assert len(h) == 64


class TestExtractDomain:
    def test_simple_email(self):
        assert _extract_domain("user@example.com") == "example.com"

    def test_includes_full_domain(self):
        assert "mit" in _extract_domain("user@MIT.EDU").lower()

    def test_subdomain(self):
        assert _extract_domain("x@stu.rumeli.edu.tr") == "stu.rumeli.edu.tr"


class TestDetectContentType:
    def test_jpg(self):
        assert _detect_content_type("photo.jpg") == "image/jpeg"

    def test_jpeg(self):
        assert _detect_content_type("photo.jpeg") == "image/jpeg"

    def test_png(self):
        assert _detect_content_type("screenshot.png") == "image/png"

    def test_pdf(self):
        assert _detect_content_type("document.pdf") == "application/pdf"

    def test_unknown_extension(self):
        assert _detect_content_type("file.xyz") == "application/octet-stream"

    def test_case_insensitive(self):
        assert _detect_content_type("photo.JPG") == "image/jpeg"

    def test_no_extension(self):
        assert _detect_content_type("noext") == "application/octet-stream"


class TestConstants:
    def test_code_length(self):
        assert VERIFICATION_CODE_LENGTH == 6

    def test_expiry_minutes(self):
        assert VERIFICATION_EXPIRY_MINUTES == 10

    def test_allowed_extensions(self):
        assert ".jpg" in ALLOWED_EXTENSIONS
        assert ".pdf" in ALLOWED_EXTENSIONS
        assert ".png" in ALLOWED_EXTENSIONS

    def test_file_size_limits(self):
        assert MAX_FILE_SIZE == 5 * 1024 * 1024
        assert MIN_FILE_SIZE == 1024
