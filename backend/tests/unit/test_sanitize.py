"""Unit tests for app.utils.sanitize — XSS/injection prevention helpers."""

import pytest

from app.utils.sanitize import is_safe_url, sanitize_filename, sanitize_text, strip_html


class TestStripHtml:
    def test_removes_simple_tags(self):
        assert strip_html("<b>bold</b>") == "bold"

    def test_removes_script_tags(self):
        assert strip_html('<script>alert("xss")</script>') == 'alert("xss")'

    def test_no_tags_unchanged(self):
        assert strip_html("plain text") == "plain text"

    def test_nested_tags(self):
        assert strip_html("<div><p>text</p></div>") == "text"

    def test_self_closing_tags(self):
        assert strip_html("before<br/>after") == "beforeafter"


class TestSanitizeText:
    def test_strips_null_bytes(self):
        assert "\x00" not in sanitize_text("hello\x00world")

    def test_escapes_angle_brackets(self):
        result = sanitize_text("<script>alert('xss')</script>")
        assert "<script>" not in result

    def test_removes_event_handlers(self):
        result = sanitize_text('onclick=alert(1)')
        assert "onclick=" not in result

    def test_removes_javascript_uri(self):
        result = sanitize_text("javascript:alert(1)")
        assert "javascript:" not in result

    def test_collapses_whitespace(self):
        result = sanitize_text("a     b")
        assert "     " not in result
        assert "a" in result and "b" in result

    def test_strips_leading_trailing(self):
        assert sanitize_text("  hello  ") == "hello"

    def test_plain_text_unchanged(self):
        assert sanitize_text("normal text") == "normal text"


class TestSanitizeFilename:
    def test_removes_path_separators(self):
        assert "/" not in sanitize_filename("../../etc/passwd")
        assert "\\" not in sanitize_filename("..\\..\\windows\\system32")

    def test_strips_leading_dots(self):
        assert not sanitize_filename(".hidden").startswith(".")

    def test_removes_null_bytes(self):
        assert "\x00" not in sanitize_filename("file\x00.txt")

    def test_limits_length(self):
        long_name = "a" * 300 + ".txt"
        result = sanitize_filename(long_name)
        assert len(result) <= 200

    def test_preserves_extension_on_truncation(self):
        long_name = "a" * 300 + ".pdf"
        result = sanitize_filename(long_name)
        assert result.endswith(".pdf")

    def test_empty_becomes_unnamed(self):
        assert sanitize_filename("") == "unnamed"

    def test_only_dots_becomes_unnamed(self):
        assert sanitize_filename("...") == "unnamed"

    def test_normal_filename_unchanged(self):
        assert sanitize_filename("document.pdf") == "document.pdf"


class TestIsSafeUrl:
    def test_http_safe(self):
        assert is_safe_url("http://example.com") is True

    def test_https_safe(self):
        assert is_safe_url("https://example.com/path") is True

    def test_javascript_unsafe(self):
        assert is_safe_url("javascript:alert(1)") is False

    def test_data_unsafe(self):
        assert is_safe_url("data:text/html,<script>") is False

    def test_vbscript_unsafe(self):
        assert is_safe_url("vbscript:msgbox") is False

    def test_file_unsafe(self):
        assert is_safe_url("file:///etc/passwd") is False

    def test_case_insensitive(self):
        assert is_safe_url("JAVASCRIPT:alert(1)") is False

    def test_leading_whitespace_stripped(self):
        assert is_safe_url("  javascript:alert(1)") is False
