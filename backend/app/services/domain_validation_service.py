"""
University email domain validation service.

Validates that an email belongs to a recognized university domain pattern.
Supports complex patterns like subdomains (stu.rumeli.com.tr) and rejects
generic email providers.

Usage:
    result = validate_university_email("221201931@stu.rumeli.com.tr")
    # result = { "valid": True, "domain": "stu.rumeli.com.tr", "reason": None }
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

# ── Configurable university domain patterns ──────────────────

# Each entry is a regex that should match valid university email domains.
# Patterns are tested against the FULL domain part of the email.
# Add new patterns here to support more universities.
UNIVERSITY_DOMAIN_PATTERNS: list[re.Pattern] = [
    # Standard .edu domains (US)
    re.compile(r"^[\w\-]+\.edu$"),
    # Subdomains of .edu
    re.compile(r"^[\w\-]+\.[\w\-]+\.edu$"),
    # International university patterns
    re.compile(r"^[\w\-]+\.edu\.\w{2,3}$"),            # .edu.tr, .edu.au, etc.
    re.compile(r"^[\w\-]+\.ac\.\w{2,3}$"),              # .ac.uk, .ac.jp, etc.
    re.compile(r"^[\w\-]+\.ac\.[\w\-]+\.\w{2,3}$"),     # sub.ac.uk patterns
    # Student subdomain patterns (e.g., stu.rumeli.com.tr, ogr.metu.edu.tr)
    re.compile(r"^stu\.[\w\-]+\.[\w\-]+\.\w{2,3}$"),
    re.compile(r"^student\.[\w\-]+\.[\w\-]+\.\w{2,3}$"),
    re.compile(r"^students\.[\w\-]+\.[\w\-]+\.\w{2,3}$"),
    re.compile(r"^ogr\.[\w\-]+\.[\w\-]+\.\w{2,3}$"),
    re.compile(r"^ogrenci\.[\w\-]+\.[\w\-]+\.\w{2,3}$"),
    re.compile(r"^stu\.[\w\-]+\.\w{2,4}$"),
    re.compile(r"^student\.[\w\-]+\.\w{2,4}$"),
    re.compile(r"^students\.[\w\-]+\.\w{2,4}$"),
    re.compile(r"^ogr\.[\w\-]+\.\w{2,4}$"),
    re.compile(r"^ogrenci\.[\w\-]+\.\w{2,4}$"),
    # Student subdomain with .edu infix (e.g., ogr.metu.edu.tr, stu.rumeli.edu.tr)
    re.compile(r"^(?:stu|student|students|ogr|ogrenci)\.[\w\-]+\.edu\.\w{2,3}$"),
    # European patterns
    re.compile(r"^[\w\-]+\.uni[\w\-]*\.[\w\-]+\.\w{2,3}$"),  # .uni-*.de
    re.compile(r"^[\w\-]+\.univ[\w\-]*\.\w{2,4}$"),
    # Generic institutional
    re.compile(r"^mail\.[\w\-]+\.edu[\.\w]*$"),
    re.compile(r"^[\w\-]+\.edu\.[\w\-]+\.\w{2,3}$"),
]

# Known valid university subdomains (exact match database)
# This supplements the regex patterns above for edge cases
KNOWN_UNIVERSITY_SUBDOMAINS: dict[str, str] = {
    # Turkish universities with stu./ogr. prefix
    "stu.rumeli.edu.tr": "Istanbul Rumeli University",
    "stu.rumeli.com.tr": "Istanbul Rumeli University",
    "stu.iku.edu.tr": "Istanbul Kultur University",
    "ogr.iu.edu.tr": "Istanbul University",
    "ogr.metu.edu.tr": "Middle East Technical University",
    "ogr.itu.edu.tr": "Istanbul Technical University",
    "ogr.boun.edu.tr": "Bogazici University",
    "ogr.hacettepe.edu.tr": "Hacettepe University",
    "ogr.gazi.edu.tr": "Gazi University",
    "ogr.ankara.edu.tr": "Ankara University",
    "stu.yeditepe.edu.tr": "Yeditepe University",
    "stu.medipol.edu.tr": "Istanbul Medipol University",
    # Add more as needed
}


@dataclass
class DomainValidationResult:
    valid: bool
    domain: str
    reason: str | None = None
    matched_pattern: str | None = None


def validate_university_email(email: str) -> DomainValidationResult:
    """
    Validate that an email address belongs to a recognized university domain.

    Rules:
      1. Must contain @ with a non-empty domain
      2. Must NOT be a generic email provider
      3. Must match a known university domain pattern OR be in the known list
      4. Configurable patterns support .edu, .ac.*, stu.*, student.*, etc.

    Returns a DomainValidationResult with validation outcome.
    """
    email = email.lower().strip()

    # Basic format check
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

    local_part, domain = parts

    # Reject generic providers
    if domain in GENERIC_DOMAINS:
        return DomainValidationResult(
            valid=False,
            domain=domain,
            reason=f"'{domain}' is a generic email provider, not a university domain",
        )

    # Check known university subdomains (exact match)
    if domain in KNOWN_UNIVERSITY_SUBDOMAINS:
        return DomainValidationResult(
            valid=True,
            domain=domain,
            matched_pattern=f"known:{domain}",
        )

    # Check against configurable regex patterns
    for pattern in UNIVERSITY_DOMAIN_PATTERNS:
        if pattern.match(domain):
            return DomainValidationResult(
                valid=True,
                domain=domain,
                matched_pattern=pattern.pattern,
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
      "student@cs.stanford.edu" → "stanford.edu"
      "221201931@stu.rumeli.com.tr" → "rumeli.com.tr"
      "user@mail.uni-berlin.de" → "uni-berlin.de"
    """
    domain = email.split("@")[-1].lower()

    # Remove known student/mail prefixes
    prefixes = ("stu.", "student.", "students.", "mail.", "ogr.", "ogrenci.")
    for prefix in prefixes:
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
            break

    # For domains with 4+ parts (e.g. cs.dept.uni.edu), keep last 3
    parts = domain.split(".")
    if len(parts) > 3:
        domain = ".".join(parts[-3:])

    return domain


def is_student_subdomain(email: str) -> bool:
    """Check if the email uses a known student subdomain pattern."""
    domain = email.split("@")[-1].lower()
    student_prefixes = ("stu.", "student.", "students.", "ogr.", "ogrenci.")
    return any(domain.startswith(p) for p in student_prefixes)
