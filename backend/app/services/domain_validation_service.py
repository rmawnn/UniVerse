"""
University email domain validation service.

Validates that an email belongs to a recognized university domain pattern.
Any subdomain of a recognized academic TLD (.edu, .edu.xx, .ac.xx) is accepted.
Generic email providers are always rejected.

Usage:
    result = validate_university_email("student@live.acibadem.edu.tr")
    # result = { "valid": True, "domain": "live.acibadem.edu.tr", ... }
"""

import re
from dataclasses import dataclass

# ── Blocked generic email domains ────────────────────────────

GENERIC_DOMAINS = frozenset({
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "live.com", "icloud.com", "aol.com", "protonmail.com",
    "zoho.com", "mail.com", "gmx.com", "yandex.com",
    "tutanota.com", "fastmail.com", "hey.com",
    "me.com", "msn.com", "qq.com", "163.com",
    "sina.com", "126.com", "yeah.net",
})

# ── Academic TLD patterns ────────────────────────────────────
# Compiled regexes that match the *suffix* of a domain.
# Any subdomain rooted under one of these suffixes is academic.
_ACADEMIC_SUFFIX_RE = re.compile(
    r"\.edu$"           # .edu (US)
    r"|\.edu\.[a-z]{2,3}$"  # .edu.tr, .edu.au, .edu.pk, …
    r"|\.ac\.[a-z]{2,3}$"   # .ac.uk, .ac.jp, .ac.kr, …
    r"|\.ac$"                # .ac (standalone)
)

# Known non-academic domains that accidentally match patterns above.
# e.g. "educa.com" does NOT end with .edu so it won't match, but guard
# against future edge cases here.
_FALSE_POSITIVE_DOMAINS = frozenset({
    # none yet — add if discovered
})

# Known valid university domains that don't follow standard academic TLDs.
# e.g. Turkish universities using .com.tr instead of .edu.tr
KNOWN_UNIVERSITY_DOMAINS: frozenset[str] = frozenset({
    "rumeli.com.tr",
})


@dataclass
class DomainValidationResult:
    valid: bool
    domain: str
    reason: str | None = None
    matched_pattern: str | None = None


def _has_academic_suffix(domain: str) -> bool:
    """Check if the domain ends with a recognized academic TLD."""
    return bool(_ACADEMIC_SUFFIX_RE.search(domain))


def _is_known_university_domain(domain: str) -> str | None:
    """Check if any suffix of the domain is in the known university list."""
    parts = domain.split(".")
    for i in range(len(parts) - 1):
        candidate = ".".join(parts[i:])
        if candidate in KNOWN_UNIVERSITY_DOMAINS:
            return candidate
    return None


def validate_university_email(email: str) -> DomainValidationResult:
    """
    Validate that an email address belongs to a recognized university domain.

    Strategy (in order):
      1. Basic format check
      2. Reject generic providers (gmail, outlook, …)
      3. Accept if domain has an academic TLD suffix (.edu, .edu.xx, .ac.xx)
      4. Accept if domain is a subdomain of a known university domain
      5. Reject everything else
    """
    email = email.lower().strip()

    if "@" not in email:
        return DomainValidationResult(
            valid=False,
            domain="",
            reason="Invalid email format",
        )

    parts = email.split("@")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return DomainValidationResult(
            valid=False,
            domain="",
            reason="Invalid email format",
        )

    _, domain = parts

    if domain in GENERIC_DOMAINS:
        return DomainValidationResult(
            valid=False,
            domain=domain,
            reason=f"'{domain}' is a generic email provider, not a university domain",
        )

    if domain in _FALSE_POSITIVE_DOMAINS:
        return DomainValidationResult(
            valid=False,
            domain=domain,
            reason=f"'{domain}' does not match any recognized university email pattern. Contact support if this is your university email.",
        )

    if _has_academic_suffix(domain):
        return DomainValidationResult(
            valid=True,
            domain=domain,
            matched_pattern="academic_tld",
        )

    known = _is_known_university_domain(domain)
    if known:
        return DomainValidationResult(
            valid=True,
            domain=domain,
            matched_pattern=f"known:{known}",
        )

    return DomainValidationResult(
        valid=False,
        domain=domain,
        reason=f"'{domain}' does not match any recognized university email pattern. Contact support if this is your university email.",
    )


def extract_base_domain(email: str) -> str:
    """
    Extract the base institutional domain from a university email.
    Examples:
      "student@cs.stanford.edu"           → "stanford.edu"
      "221201931@stu.rumeli.com.tr"        → "rumeli.com.tr"
      "user@live.acibadem.edu.tr"          → "acibadem.edu.tr"
      "user@mail.uni-berlin.de"            → "uni-berlin.de"
    """
    domain = email.split("@")[-1].lower()
    parts = domain.split(".")

    # For academic TLDs, find the .edu or .ac segment and take
    # one label before it as the institution name.
    for i, part in enumerate(parts):
        if part in ("edu", "ac") and i > 0:
            return ".".join(parts[i - 1:])

    # Fallback: keep last 2-3 parts
    if len(parts) > 3:
        return ".".join(parts[-3:])
    return domain


def is_student_subdomain(email: str) -> bool:
    """Check if the email uses a known student subdomain pattern."""
    domain = email.split("@")[-1].lower()
    student_prefixes = ("stu.", "student.", "students.", "ogr.", "ogrenci.")
    return any(domain.startswith(p) for p in student_prefixes)
