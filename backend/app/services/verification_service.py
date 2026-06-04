import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.user import User
from app.models.verification_request import VerificationRequest
from app.repositories.university_repository import UniversityRepository
from app.repositories.user_repository import UserRepository
from app.repositories.verification_repository import VerificationRepository
from app.schemas.verification import (
    DocumentVerificationResponse,
    VerificationConfirmResponse,
    VerificationSendResponse,
    VerificationStatusResponse,
)
from app.services.domain_validation_service import (
    extract_base_domain,
    validate_university_email,
)
from app.utils.constants import VerificationStatus

logger = logging.getLogger(__name__)

VERIFICATION_CODE_LENGTH = 6
VERIFICATION_EXPIRY_MINUTES = 10


def _generate_code() -> str:
    """Generate a cryptographically random 6-digit numeric code."""
    return "".join(secrets.choice("0123456789") for _ in range(VERIFICATION_CODE_LENGTH))


def _hash_code(code: str) -> str:
    """Hash a verification code with SHA-256."""
    return hashlib.sha256(code.encode()).hexdigest()


def _hash_file(content: bytes) -> str:
    """SHA-256 hash of file content for duplicate detection."""
    return hashlib.sha256(content).hexdigest()


def _extract_domain(email: str) -> str:
    """Extract the domain part from an email address."""
    return email.split("@")[1].lower()


def _detect_content_type(filename: str) -> str:
    """Derive MIME type from filename extension."""
    ext = Path(filename).suffix.lower()
    mapping = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
    }
    return mapping.get(ext, "application/octet-stream")


# ── Email verification ──────────────────────────────────────


async def send_verification_code(
    db: AsyncSession,
    current_user: User,
    university_email: str,
) -> VerificationSendResponse:
    """
    Start an email verification attempt:
      1. Reject if already verified
      2. Validate email domain (reject generic providers, match patterns)
      3. Match email domain to a known university in DB
      4. Cancel any previous pending codes for this user
      5. Create a new verification request with a hashed 6-digit code
      6. In production, this is where you'd send the email
      7. In development, return the code in the response for testing
    """
    if current_user.is_verified_student:
        raise BadRequest("You are already a verified student")

    university_email = university_email.lower().strip()

    # Step 1: Domain validation (reject generic, validate pattern)
    domain_result = validate_university_email(university_email)
    if not domain_result.valid:
        raise BadRequest(domain_result.reason or "Invalid university email domain")

    # Step 2: Match to known university in DB
    domain = _extract_domain(university_email)
    uni_repo = UniversityRepository(db)

    # Try exact domain match first
    university = await uni_repo.get_by_domain(domain)

    # If not found, try base domain (handles stu.rumeli.com.tr → rumeli.com.tr)
    if not university:
        base_domain = extract_base_domain(university_email)
        if base_domain != domain:
            university = await uni_repo.get_by_domain(base_domain)

    if not university:
        raise NotFound(
            f"No university found for email domain '{domain}'. "
            "Make sure you are using your official university email."
        )

    ver_repo = VerificationRepository(db)
    await ver_repo.cancel_pending_for_user(current_user.id)

    # Count previous attempts
    attempt_count = await ver_repo.count_user_attempts(current_user.id)

    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES)

    request = VerificationRequest(
        user_id=current_user.id,
        university_id=university.id,
        verification_method="email",
        university_email=university_email,
        code_hash=_hash_code(code),
        status=VerificationStatus.PENDING.value,
        expires_at=expires_at,
        attempt_number=attempt_count + 1,
    )
    await ver_repo.create(request)

    # TODO: In production, send real email here via email provider

    return VerificationSendResponse(
        verification_id=request.id,
        message=f"Verification code sent to {university_email}",
        status=VerificationStatus.PENDING.value,
        expires_at=expires_at,
        debug_code=code if settings.is_development else None,
    )


async def confirm_verification_code(
    db: AsyncSession,
    current_user: User,
    verification_id: UUID,
    code: str,
) -> VerificationConfirmResponse:
    """
    Confirm a verification code:
      1. Reject if already verified
      2. Load the specific request by ID
      3. Reject if not owned by user or not pending
      4. Reject if expired
      5. Reject if code doesn't match hash
      6. Mark verified, update user
    """
    if current_user.is_verified_student:
        raise BadRequest("You are already a verified student")

    ver_repo = VerificationRepository(db)
    request = await ver_repo.get_by_id(verification_id)

    if not request:
        raise NotFound("Verification request not found")

    if request.user_id != current_user.id:
        raise Forbidden("This verification request does not belong to you")

    if request.status != VerificationStatus.PENDING.value:
        raise BadRequest("This verification request is no longer pending")

    if request.verification_method != "email":
        raise BadRequest("This is not an email verification request")

    # Check expiry
    now = datetime.now(timezone.utc)
    if request.expires_at and now > request.expires_at:
        request.status = VerificationStatus.EXPIRED.value
        await db.flush()
        raise BadRequest("Verification code has expired. Please request a new one.")

    # Check code hash
    if not secrets.compare_digest(request.code_hash or "", _hash_code(code)):
        raise BadRequest("Invalid verification code")

    # Mark request as verified
    await ver_repo.mark_verified(request)

    # Update the user — email is now verified + student is verified
    user_repo = UserRepository(db)
    await user_repo.update(
        current_user,
        email_verified=True,
        is_verified_student=True,
        university_id=request.university_id,
    )

    # Get university name for the response
    uni_repo = UniversityRepository(db)
    university = await uni_repo.get_by_id(request.university_id)

    return VerificationConfirmResponse(
        message="Student verification successful",
        status=VerificationStatus.VERIFIED.value,
        university_name=university.name,
    )


# ── Document verification ───────────────────────────────────


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MIN_FILE_SIZE = 1024  # 1KB — reject empty/trivial files


async def submit_document_verification(
    db: AsyncSession,
    current_user: User,
    university_id: UUID,
    file_content: bytes,
    filename: str,
) -> DocumentVerificationResponse:
    """
    Submit a document for AI-powered verification with admin review fallback.

    Pipeline:
      1. Validate file (type, size, not empty)
      2. Hash file for duplicate detection
      3. Run OCR pipeline to extract text
      4. Run AI validation to score the document
      5. Based on confidence:
         - >= 0.85 → auto-approve
         - >= 0.50 → send to admin review
         - <  0.50 → mark as suspicious
      6. Save document securely
      7. Create verification request with all metadata
    """
    if current_user.is_verified_student:
        raise BadRequest("You are already a verified student")

    # Validate university
    uni_repo = UniversityRepository(db)
    university = await uni_repo.get_by_id(university_id)
    if not university:
        raise NotFound("University not found")

    # Validate file
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequest(f"File type not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}")

    if len(file_content) > MAX_FILE_SIZE:
        raise BadRequest("File too large. Maximum size is 5MB.")

    if len(file_content) < MIN_FILE_SIZE:
        raise BadRequest("File is too small or empty.")

    content_type = _detect_content_type(filename)

    # Hash file for duplicate detection
    file_hash = _hash_file(file_content)

    # Check for duplicate submissions
    ver_repo = VerificationRepository(db)
    existing_hashes = await ver_repo.get_user_file_hashes(current_user.id)

    # Cancel any previous pending requests
    await ver_repo.cancel_pending_for_user(current_user.id)

    # Count previous attempts
    attempt_count = await ver_repo.count_user_attempts(current_user.id)

    # Rate limit: max 5 attempts per day
    if attempt_count >= 5:
        recent_count = await ver_repo.count_recent_attempts(
            current_user.id, hours=24
        )
        if recent_count >= 5:
            raise BadRequest(
                "Too many verification attempts. Please try again tomorrow."
            )

    # ── Run OCR pipeline ─────────────────────────────────
    try:
        from app.services.ocr_service import run_ocr_pipeline
        raw_text, ocr_data = await run_ocr_pipeline(file_content, content_type)
    except Exception as e:
        logger.error(f"OCR pipeline error: {e}")
        raw_text = ""
        ocr_data = {
            "student_name": None,
            "student_number": None,
            "university_name": None,
            "department": None,
            "expiration_date": None,
        }

    # ── Run AI validation ────────────────────────────────
    try:
        from app.services.ai_validation_service import validate_document
        ai_result = validate_document(
            ocr_data=ocr_data,
            raw_text=raw_text,
            user_full_name=current_user.full_name,
            expected_university_name=university.name,
            file_size_bytes=len(file_content),
            content_type=content_type,
            file_hash=file_hash,
            existing_hashes=existing_hashes,
        )
    except Exception as e:
        logger.error(f"AI validation error: {e}")
        ai_result = {
            "confidence": 0.0,
            "flags": ["validation_error"],
            "details": {"error": str(e)},
            "auto_decision": "review",
        }

    # Determine status based on AI decision
    auto_decision = ai_result.get("auto_decision", "review")
    if auto_decision == "approve":
        status = VerificationStatus.VERIFIED.value
    elif auto_decision == "suspicious":
        status = VerificationStatus.SUSPICIOUS.value
    else:
        status = VerificationStatus.UNDER_REVIEW.value

    # Save document securely (Supabase Storage or local fallback)
    from app.services import storage_service
    document_url = await storage_service.upload_verification_doc(
        data=file_content,
        filename=filename,
        user_id=str(current_user.id),
    )

    # Create verification request with full metadata
    request = VerificationRequest(
        user_id=current_user.id,
        university_id=university_id,
        verification_method="document",
        document_url=document_url,
        status=status,
        attempt_number=attempt_count + 1,
        # OCR data
        ocr_raw_text=raw_text[:10000] if raw_text else None,  # Truncate if huge
        ocr_extracted_data=ocr_data,
        # AI validation
        ai_confidence=ai_result.get("confidence"),
        ai_flags=ai_result.get("flags"),
        ai_validation_details=ai_result.get("details"),
        # File metadata
        file_size_bytes=len(file_content),
        file_content_type=content_type,
        file_hash=file_hash,
    )

    # If auto-approved, set verified timestamp
    if status == VerificationStatus.VERIFIED.value:
        request.verified_at = datetime.now(timezone.utc)

    await ver_repo.create(request)

    # If auto-approved, update user immediately
    if status == VerificationStatus.VERIFIED.value:
        user_repo = UserRepository(db)
        await user_repo.update(
            current_user,
            is_verified_student=True,
            university_id=university_id,
        )

    # Build response message
    confidence = ai_result.get("confidence", 0.0)
    if status == VerificationStatus.VERIFIED.value:
        message = "Your document has been automatically verified. Welcome to UniVerse!"
    elif status == VerificationStatus.SUSPICIOUS.value:
        message = "Your document needs additional review. An admin will review it shortly."
    else:
        message = "Your document has been submitted for review. This usually takes a few hours."

    return DocumentVerificationResponse(
        verification_id=request.id,
        message=message,
        status=status,
        ai_confidence=round(confidence, 2),
        ai_flags=ai_result.get("flags", []),
    )


async def get_document_file(
    db: AsyncSession,
    current_user: User,
    verification_id: UUID,
) -> tuple[Path | None, str, str | None]:
    """
    Return the file for a verification document.

    Returns (file_path, content_type, signed_url):
      - With Supabase: file_path is None, signed_url has a temporary URL
      - Without Supabase: file_path points to local file, signed_url is None

    Only the owner or an admin can access.
    """
    ver_repo = VerificationRepository(db)
    request = await ver_repo.get_by_id(verification_id)
    if not request:
        raise NotFound("Verification request not found")

    if not request.document_url:
        raise NotFound("No document attached to this verification request")

    is_admin = current_user.role == "admin"
    is_owner = request.user_id == current_user.id

    if not is_admin and not is_owner:
        raise Forbidden("You are not authorized to view this document")

    from app.core.config import settings
    from app.services import storage_service

    # Supabase Storage path (e.g. "verification-docs/user_id/file.pdf")
    if settings.supabase_configured and "/" in request.document_url:
        signed_url = await storage_service.get_signed_url(
            request.document_url, expires_in=3600,
        )
        # Guess content type from the stored path
        ext = Path(request.document_url).suffix.lower()
        ct_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                  ".png": "image/png", ".pdf": "application/pdf"}
        content_type = ct_map.get(ext, "application/octet-stream")
        return None, content_type, signed_url

    # Local filesystem fallback
    file_path = Path(__file__).resolve().parent.parent.parent / request.document_url
    if not file_path.exists():
        raise NotFound("Document file not found on server")

    ext = file_path.suffix.lower()
    content_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")

    return file_path, content_type, None


# ── Status ──────────────────────────────────────────────────


async def get_verification_status(
    db: AsyncSession,
    current_user: User,
) -> VerificationStatusResponse:
    """Return the current verification state for the authenticated user."""
    university_name: str | None = None
    if current_user.university_id:
        uni_repo = UniversityRepository(db)
        university = await uni_repo.get_by_id(current_user.university_id)
        if university:
            university_name = university.name

    ver_repo = VerificationRepository(db)
    latest = await ver_repo.get_latest_for_user(current_user.id)
    history = await ver_repo.get_user_history(current_user.id, limit=10)

    return VerificationStatusResponse(
        is_verified_student=current_user.is_verified_student,
        university_id=str(current_user.university_id) if current_user.university_id else None,
        university_name=university_name,
        verification_method=latest.verification_method if latest else None,
        verification_status=latest.status if latest else None,
        university_email=latest.university_email if latest else None,
        document_url=None,  # Never expose raw URL in status response
        rejection_reason=latest.rejection_reason if latest else None,
        verified_at=latest.verified_at if latest else None,
        ai_confidence=latest.ai_confidence if latest else None,
        ai_flags=latest.ai_flags if latest else None,
        attempt_count=len(history),
    )


# ── Verification history ────────────────────────────────────


async def get_verification_history(
    db: AsyncSession,
    current_user: User,
) -> list[dict]:
    """Return the full verification history for the authenticated user."""
    ver_repo = VerificationRepository(db)
    history = await ver_repo.get_user_history(current_user.id, limit=20)

    return [
        {
            "id": str(h.id),
            "method": h.verification_method,
            "status": h.status,
            "created_at": h.created_at.isoformat() if h.created_at else None,
            "verified_at": h.verified_at.isoformat() if h.verified_at else None,
            "rejection_reason": h.rejection_reason,
            "ai_confidence": h.ai_confidence,
            "ai_flags": h.ai_flags,
            "attempt_number": h.attempt_number,
        }
        for h in history
    ]
