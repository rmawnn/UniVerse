"""
Input sanitization utilities.

These functions strip potentially dangerous content from user inputs
to prevent XSS, injection, and other attacks. They are designed to be
used in Pydantic validators or service-layer logic.
"""

import re
import html


# HTML tag pattern (catches most common XSS vectors)
_HTML_TAG_RE = re.compile(r"<[^>]+>", re.IGNORECASE)

# Script/event handler patterns
_SCRIPT_RE = re.compile(
    r"(javascript|vbscript|data)\s*:",
    re.IGNORECASE,
)
_EVENT_HANDLER_RE = re.compile(
    r"on\w+\s*=",
    re.IGNORECASE,
)

# Null bytes (common in path traversal attacks)
_NULL_BYTE_RE = re.compile(r"\x00")

# Excessive whitespace
_MULTI_SPACE_RE = re.compile(r"\s{3,}")


def strip_html(text: str) -> str:
    """Remove all HTML tags from text."""
    return _HTML_TAG_RE.sub("", text)


def sanitize_text(text: str) -> str:
    """
    Sanitize user-provided text content.

    - Strips null bytes
    - HTML-escapes angle brackets
    - Removes event handlers (onclick=, etc.)
    - Strips javascript: URIs
    - Collapses excessive whitespace
    - Trims leading/trailing whitespace
    """
    text = _NULL_BYTE_RE.sub("", text)
    text = html.escape(text, quote=False)
    text = _EVENT_HANDLER_RE.sub("", text)
    text = _SCRIPT_RE.sub("", text)
    text = _MULTI_SPACE_RE.sub("  ", text)
    return text.strip()


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and shell injection.

    - Removes directory separators
    - Removes null bytes
    - Strips leading dots (hidden files)
    - Limits length
    """
    # Remove path separators and null bytes
    filename = filename.replace("/", "").replace("\\", "").replace("\x00", "")

    # Remove leading dots
    filename = filename.lstrip(".")

    # Limit length
    if len(filename) > 200:
        ext = filename[filename.rfind("."):]
        filename = filename[:200 - len(ext)] + ext

    return filename or "unnamed"


def is_safe_url(url: str) -> bool:
    """
    Check if a URL is safe (no javascript: or data: schemes).
    Used for validating user-provided URLs like image_url.
    """
    url = url.strip().lower()
    return not any(
        url.startswith(scheme)
        for scheme in ("javascript:", "data:", "vbscript:", "file:")
    )
