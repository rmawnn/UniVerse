import hashlib
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
from app.utils.constants import VerificationStatus

VERIFICATION_CODE_LENGTH = 6
VERIFICATION_EXPIRY_MINUTES = 10

# Protected upload directory (NOT the public /uploads)
VERIFICATION_DOCS_DIR = Path(__file__).resolve().parent.parent.parent / "verification_docs"


def _generate_code() -> str:
    """Generate a cryptographically random 6-digit numeric code."""
    return "".join(secrets.choice("0123456789") for _ in range(VERIFICATION_CODE_LENGTH))


def _hash_code(code: str) -> str:
    """Hash a verification code with SHA-256."""
    return hashlib.sha256(code.encode()).hexdigest()


def _extract_domain(email: str) -> str:
    """Extract the domain part from an email address."""
    return email.split("@")[1].lower()


# ── Email verification ──────────────────────────────────────


async def send_verification_code(
    db: AsyncSession,
    current_user: User,
    university_email: str,
) -> VerificationSendResponse:
    """
    Start an email verification attempt:
      1. Reject if already verified
      2. Match email domain to a known university
      3. Cancel any previous pending codes for this user
      4. Create a new verification request with a hashed 6-digit code
      5. In production, this is where you'd send the email
      6. In development, return the code in the response for testing
    """
    if current_user.is_verified_student:
        raise BadRequest("You are already a verified student")

    university_email = university_email.lower().strip()
    domain = _extract_domain(university_email)

    uni_repo = UniversityRepository(db)
    university = await uni_repo.get_by_domain(domain)
    if not university:
        raise NotFound(
            f"No university found for email domain '{domain}'. "
            "Make sure you are using your official university email."
        )

    ver_repo = VerificationRepository(db)
    await ver_repo.cancel_pending_for_user(current_user.id)

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

    # Update the user
    user_repo = UserRepository(db)
    await user_repo.update(
        current_user,
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


async def submit_document_verification(
    db: AsyncSession,
    current_user: User,
    university_id: UUID,
    file_content: bytes,
    filename: str,
) -> DocumentVerificationResponse:
    """
    Submit a document for manual admin verification.
      1. Reject if already verified
      2. Validate university exists
      3. Validate file type and size
      4. Cancel any previous pending requests
      5. Save document to protected directory
      6. Create pending verification request
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

    if len(file_content) == 0:
        raise BadRequest("File is empty")

    # Cancel any previous pending requests
    ver_repo = VerificationRepository(db)
    await ver_repo.cancel_pending_for_user(current_user.id)

    # Save document securely
    VERIFICATION_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = f"{current_user.id}_{secrets.token_hex(8)}{ext}"
    doc_path = VERIFICATION_DOCS_DIR / safe_filename
    doc_path.write_bytes(file_content)

    # Store the relative path (not the full system path)
    document_url = f"verification_docs/{safe_filename}"

    request = VerificationRequest(
        user_id=current_user.id,
        university_id=university_id,
        verification_method="document",
        document_url=document_url,
        status=VerificationStatus.PENDING.value,
    )
    await ver_repo.create(request)

    return DocumentVerificationResponse(
        verification_id=request.id,
        message="Your document has been submitted and is waiting for admin review.",
        status=VerificationStatus.PENDING.value,
    )


async def get_document_file(
    db: AsyncSession,
    current_user: User,
    verification_id: UUID,
) -> tuple[Path, str]:
    """
    Return the file path and content-type for a verification document.
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

    return file_path, content_type


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
    )
