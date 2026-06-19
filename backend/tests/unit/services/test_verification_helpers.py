"""Unit tests for verification_service helper functions."""

import pytest

from app.services.verification_service import (
    _detect_content_type,
    _extract_domain,
    _generate_code,
    _hash_code,
    _hash_file,
    VERIFICATION_CODE_LENGTH,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    MIN_FILE_SIZE,
)


class TestGenerateCode:
    def test_length(self):
        code = _generate_code()
        assert len(code) == VERIFICATION_CODE_LENGTH

    def test_digits_only(self):
        code = _generate_code()
        assert code.isdigit()

    def test_uniqueness(self):
        codes = {_generate_code() for _ in range(10)}
        assert len(codes) > 1


class TestHashCode:
    def test_deterministic(self):
        assert _hash_code("123456") == _hash_code("123456")

    def test_different_inputs(self):
        assert _hash_code("123456") != _hash_code("654321")

    def test_returns_hex(self):
        result = _hash_code("test")
        assert all(c in "0123456789abcdef" for c in result)


class TestHashFile:
    def test_deterministic(self):
        content = b"test file content"
        assert _hash_file(content) == _hash_file(content)

    def test_different_content(self):
        assert _hash_file(b"a") != _hash_file(b"b")


class TestExtractDomain:
    def test_basic(self):
        assert _extract_domain("user@example.com") == "example.com"

    def test_case_insensitive(self):
        assert _extract_domain("User@EXAMPLE.COM") == "example.com"


class TestDetectContentType:
    def test_jpg(self):
        assert _detect_content_type("photo.jpg") == "image/jpeg"

    def test_jpeg(self):
        assert _detect_content_type("photo.jpeg") == "image/jpeg"

    def test_png(self):
        assert _detect_content_type("doc.png") == "image/png"

    def test_pdf(self):
        assert _detect_content_type("doc.pdf") == "application/pdf"

    def test_unknown(self):
        assert _detect_content_type("file.xyz") == "application/octet-stream"

    def test_case_insensitive(self):
        assert _detect_content_type("PHOTO.JPG") == "image/jpeg"


class TestConstants:
    def test_allowed_extensions(self):
        assert ".jpg" in ALLOWED_EXTENSIONS
        assert ".pdf" in ALLOWED_EXTENSIONS

    def test_file_sizes(self):
        assert MAX_FILE_SIZE == 5 * 1024 * 1024
        assert MIN_FILE_SIZE == 1024
