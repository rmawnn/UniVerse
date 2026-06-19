"""Unit tests for storage_service — helper functions."""

import pytest

from app.services.storage_service import _guess_content_type, _safe_filename


class TestGuessContentType:
    def test_jpg(self):
        assert _guess_content_type("photo.jpg") == "image/jpeg"

    def test_jpeg(self):
        assert _guess_content_type("photo.jpeg") == "image/jpeg"

    def test_png(self):
        assert _guess_content_type("image.png") == "image/png"

    def test_webp(self):
        assert _guess_content_type("image.webp") == "image/webp"

    def test_pdf(self):
        assert _guess_content_type("doc.pdf") == "application/pdf"

    def test_docx(self):
        result = _guess_content_type("file.docx")
        assert "document" in result

    def test_mp4(self):
        assert _guess_content_type("video.mp4") == "video/mp4"

    def test_webm(self):
        assert _guess_content_type("video.webm") == "video/webm"

    def test_unknown(self):
        assert _guess_content_type("file.xyz") == "application/octet-stream"

    def test_case_insensitive(self):
        assert _guess_content_type("PHOTO.JPG") == "image/jpeg"


class TestSafeFilename:
    def test_preserves_extension(self):
        result = _safe_filename("my photo.jpg")
        assert result.endswith(".jpg")

    def test_unique(self):
        a = _safe_filename("photo.jpg")
        b = _safe_filename("photo.jpg")
        assert a != b

    def test_no_spaces(self):
        result = _safe_filename("my file name.png")
        assert " " not in result

    def test_uppercase_extension(self):
        result = _safe_filename("PHOTO.PNG")
        assert result.endswith(".png")
