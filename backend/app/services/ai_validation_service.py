"""
AI validation service for student verification documents.

Applies heuristic checks to OCR-extracted data and file metadata to produce
a confidence score and a list of flags indicating potential issues.

Scoring breakdown:
  - university_name_match:  0.30  — Does OCR university match the selected university?
  - student_name_match:     0.25  — Does OCR name match the user's full_name?
  - student_number_found:   0.15  — Was a student number extracted?
  - image_quality:          0.15  — File size / resolution heuristics
  - format_validity:        0.10  — Expected document structure
  - expiration_valid:       0.05  — Card not expired (if date found)

Thresholds:
  - confidence >= 0.85 → auto-approve
  - confidence >= 0.50 → send to admin review (under_review)
  - confidence <  0.50 → mark suspicious

Flag types:
  - name_mismatch       — OCR name doesn't match user profile name
  - university_mismatch — OCR university doesn't match selected university
  - no_student_number   — No student number found
  - possibly_edited     — File metadata suggests editing (very small file, unusual ratio)
  - blurry_upload       — Very little text extracted (possible blurry/unreadable)
  - expired_card        — Expiration date is in the past
  - duplicate_file      — Same file hash already submitted
  - too_small_file      — File suspiciously small (< 10KB for image)
  - too_large_text      — Excessive text for a student ID (may be a different doc)
"""

import logging
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

# Thresholds
AUTO_APPROVE_THRESHOLD = 0.85
REVIEW_THRESHOLD = 0.50

# Score weights
WEIGHTS = {
    "university_name_match": 0.30,
    "student_name_match": 0.25,
    "student_number_found": 0.15,
    "image_quality": 0.15,
    "format_validity": 0.10,
    "expiration_valid": 0.05,
}


def _fuzzy_match(a: str, b: str) -> float:
    """Case-insensitive fuzzy similarity ratio between two strings."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _normalize_name(name: str) -> str:
    """Normalize a name for comparison: lowercase, strip titles, extra spaces."""
    name = name.lower().strip()
    # Remove common titles
    for title in ("mr", "ms", "mrs", "dr", "prof", "miss"):
        name = re.sub(rf"\b{title}\.?\s*", "", name)
    # Collapse whitespace
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _check_expiration(date_str: str) -> bool:
    """Check if a date string represents a future date. Returns True if valid."""
    if not date_str:
        return True  # No date = assume valid

    # Try common date formats
    for fmt in ("%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y", "%d-%m-%Y",
                "%m/%d/%y", "%d/%m/%y", "%Y-%m-%d", "%d.%m.%Y"):
        try:
            parsed = datetime.strptime(date_str.strip(), fmt)
            # If year is 2-digit and parsed as 19xx, fix it
            if parsed.year < 100:
                parsed = parsed.replace(year=parsed.year + 2000)
            return parsed > datetime.now()
        except ValueError:
            continue
    return True  # Can't parse = assume valid


def validate_document(
    ocr_data: dict,
    raw_text: str,
    user_full_name: str,
    expected_university_name: str,
    file_size_bytes: int,
    content_type: str,
    file_hash: str | None = None,
    existing_hashes: set[str] | None = None,
) -> dict:
    """
    Run AI validation heuristics on an OCR-processed document.

    Args:
        ocr_data: Parsed OCR fields (student_name, student_number, etc.)
        raw_text: Full OCR text output
        user_full_name: The user's registered full name
        expected_university_name: Name of the university the user selected
        file_size_bytes: Size of uploaded file in bytes
        content_type: MIME type of the file
        file_hash: SHA-256 hash of the file
        existing_hashes: Set of previously submitted file hashes for this user

    Returns:
        {
            "confidence": float,          # 0.0–1.0
            "flags": list[str],           # List of issue flags
            "details": dict,              # Per-check scores and notes
            "auto_decision": str,         # "approve" | "review" | "suspicious"
        }
    """
    flags: list[str] = []
    details: dict[str, dict] = {}
    scores: dict[str, float] = {}

    # ── 1. University name match ─────────────────────────────
    ocr_university = ocr_data.get("university_name") or ""
    uni_similarity = _fuzzy_match(ocr_university, expected_university_name)

    if uni_similarity >= 0.6:
        scores["university_name_match"] = 1.0
        details["university_name_match"] = {
            "score": 1.0,
            "ocr_value": ocr_university,
            "expected": expected_university_name,
            "similarity": round(uni_similarity, 3),
        }
    elif uni_similarity >= 0.3:
        scores["university_name_match"] = 0.5
        details["university_name_match"] = {
            "score": 0.5,
            "ocr_value": ocr_university,
            "expected": expected_university_name,
            "similarity": round(uni_similarity, 3),
            "note": "Partial match — may need review",
        }
    elif ocr_university:
        scores["university_name_match"] = 0.1
        flags.append("university_mismatch")
        details["university_name_match"] = {
            "score": 0.1,
            "ocr_value": ocr_university,
            "expected": expected_university_name,
            "similarity": round(uni_similarity, 3),
            "note": "University name does not match",
        }
    else:
        # No university found in OCR — partial penalty
        scores["university_name_match"] = 0.3
        details["university_name_match"] = {
            "score": 0.3,
            "note": "No university name detected in document",
        }

    # ── 2. Student name match ────────────────────────────────
    ocr_name = ocr_data.get("student_name") or ""
    name_similarity = _fuzzy_match(
        _normalize_name(ocr_name),
        _normalize_name(user_full_name),
    )

    if name_similarity >= 0.7:
        scores["student_name_match"] = 1.0
        details["student_name_match"] = {
            "score": 1.0,
            "ocr_value": ocr_name,
            "expected": user_full_name,
            "similarity": round(name_similarity, 3),
        }
    elif name_similarity >= 0.4:
        scores["student_name_match"] = 0.5
        details["student_name_match"] = {
            "score": 0.5,
            "ocr_value": ocr_name,
            "expected": user_full_name,
            "similarity": round(name_similarity, 3),
            "note": "Partial name match",
        }
    elif ocr_name:
        scores["student_name_match"] = 0.1
        flags.append("name_mismatch")
        details["student_name_match"] = {
            "score": 0.1,
            "ocr_value": ocr_name,
            "expected": user_full_name,
            "similarity": round(name_similarity, 3),
            "note": "Name on document does not match profile",
        }
    else:
        scores["student_name_match"] = 0.2
        details["student_name_match"] = {
            "score": 0.2,
            "note": "No student name detected in document",
        }

    # ── 3. Student number found ──────────────────────────────
    student_number = ocr_data.get("student_number")
    if student_number and len(student_number) >= 4:
        scores["student_number_found"] = 1.0
        details["student_number_found"] = {
            "score": 1.0,
            "value": student_number,
        }
    else:
        scores["student_number_found"] = 0.0
        flags.append("no_student_number")
        details["student_number_found"] = {
            "score": 0.0,
            "note": "No student number detected",
        }

    # ── 4. Image quality heuristics ──────────────────────────
    is_image = content_type in ("image/jpeg", "image/png", "image/jpg")
    text_length = len(raw_text.strip())

    if text_length < 10:
        scores["image_quality"] = 0.1
        flags.append("blurry_upload")
        details["image_quality"] = {
            "score": 0.1,
            "text_length": text_length,
            "note": "Very little text extracted — document may be blurry or unreadable",
        }
    elif text_length < 30:
        scores["image_quality"] = 0.4
        details["image_quality"] = {
            "score": 0.4,
            "text_length": text_length,
            "note": "Limited text extracted",
        }
    elif text_length > 2000:
        scores["image_quality"] = 0.7
        flags.append("too_large_text")
        details["image_quality"] = {
            "score": 0.7,
            "text_length": text_length,
            "note": "Excessive text for a student ID — may be a different document type",
        }
    else:
        scores["image_quality"] = 1.0
        details["image_quality"] = {
            "score": 1.0,
            "text_length": text_length,
        }

    # Check file size
    if is_image and file_size_bytes < 10_000:
        scores["image_quality"] = min(scores["image_quality"], 0.3)
        flags.append("too_small_file")
        details["image_quality"]["note"] = "File suspiciously small for an image"

    # ── 5. Format validity ───────────────────────────────────
    # Check if the text contains typical ID card keywords
    id_keywords = [
        "student", "university", "college", "enrollment", "faculty",
        "öğrenci", "üniversite", "fakülte",  # Turkish
        "id", "card", "valid", "name", "no", "number",
    ]
    keyword_hits = sum(1 for kw in id_keywords if kw in raw_text.lower())

    if keyword_hits >= 4:
        scores["format_validity"] = 1.0
        details["format_validity"] = {
            "score": 1.0,
            "keyword_hits": keyword_hits,
        }
    elif keyword_hits >= 2:
        scores["format_validity"] = 0.6
        details["format_validity"] = {
            "score": 0.6,
            "keyword_hits": keyword_hits,
            "note": "Few expected keywords found",
        }
    else:
        scores["format_validity"] = 0.2
        details["format_validity"] = {
            "score": 0.2,
            "keyword_hits": keyword_hits,
            "note": "Document doesn't appear to be a student ID",
        }

    # Check for editing software signatures
    edit_signatures = ["photoshop", "gimp", "illustrator", "canva", "figma"]
    if any(sig in raw_text.lower() for sig in edit_signatures):
        flags.append("possibly_edited")
        scores["format_validity"] = min(scores["format_validity"], 0.1)
        details["format_validity"]["note"] = "Possible editing software signature detected"

    # ── 6. Expiration check ──────────────────────────────────
    expiration = ocr_data.get("expiration_date")
    if expiration:
        if _check_expiration(expiration):
            scores["expiration_valid"] = 1.0
            details["expiration_valid"] = {
                "score": 1.0,
                "value": expiration,
            }
        else:
            scores["expiration_valid"] = 0.0
            flags.append("expired_card")
            details["expiration_valid"] = {
                "score": 0.0,
                "value": expiration,
                "note": "Card appears to be expired",
            }
    else:
        # No expiration date found — neutral
        scores["expiration_valid"] = 0.5
        details["expiration_valid"] = {
            "score": 0.5,
            "note": "No expiration date found",
        }

    # ── 7. Duplicate file check ──────────────────────────────
    if file_hash and existing_hashes and file_hash in existing_hashes:
        flags.append("duplicate_file")

    # ── Calculate weighted confidence ────────────────────────
    confidence = sum(
        scores.get(key, 0.0) * weight
        for key, weight in WEIGHTS.items()
    )
    confidence = round(min(1.0, max(0.0, confidence)), 3)

    # Determine auto-decision
    if "possibly_edited" in flags or "duplicate_file" in flags:
        auto_decision = "suspicious"
    elif confidence >= AUTO_APPROVE_THRESHOLD:
        auto_decision = "approve"
    elif confidence >= REVIEW_THRESHOLD:
        auto_decision = "review"
    else:
        auto_decision = "suspicious"

    return {
        "confidence": confidence,
        "flags": flags,
        "details": details,
        "auto_decision": auto_decision,
    }
