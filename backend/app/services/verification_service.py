import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequest, NotFound
from app.models.user import User
from app.models.verification_request import VerificationRequest
from app.repositories.university_repository import UniversityRepository
from app.repositories.user_repository import UserRepository
from app.repositories.verification_repository import VerificationRepository
from app.schemas.verification import (
    VerificationConfirmResponse,
    VerificationSendResponse,
    VerificationStatusResponse,
)
from app.utils.constants import VerificationStatus

VERIFICATION_CODE_LENGTH = 6
VERIFICATION_EXPIRY_MINUTES = 10


def _generate_code() -> str:
    """Generate a cryptographically random 6-digit numeric code."""
    return "".join(secrets.choice("0123456789") for _ in range(VERIFICATION_CODE_LENGTH))


def _extract_domain(email: str) -> str:
    """Extract the domain part from an email address."""
    return email.split("@")[1].lower()


async def send_verification_code(
    db: AsyncSession,
    current_user: User,
    university_email: str,
) -> VerificationSendResponse:
    """
    Start a verification attempt:
      1. Reject if already verified
      2. Match email domain to a known university
      3. Cancel any previous pending codes for this user
      4. Create a new verification request with a 6-digit code
      5. In production, this is where you'd send the email
      6. In development, return the code in the response for testing
    """
    if current_user.is_verified_student:
        raise BadRequest("You are already a verified student")

    # Normalize and extract domain
    university_email = university_email.lower().strip()
    domain = _extract_domain(university_email)

    # Match domain to university
    uni_repo = UniversityRepository(db)
    university = await uni_repo.get_by_domain(domain)
    if not university:
        raise NotFound(
            f"No university found for email domain '{domain}'. "
            "Make sure you are using your official university email."
        )

    # Cancel any previous pending requests for this user
    ver_repo = VerificationRepository(db)
    await ver_repo.cancel_pending_for_user(current_user.id)

    # Create new verification request
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES)

    request = VerificationRequest(
        user_id=current_user.id,
        university_id=university.id,
        university_email=university_email,
        verification_code=code,
        status=VerificationStatus.PENDING.value,
        expires_at=expires_at,
    )
    await ver_repo.create(request)

    # TODO: In production, send real email here via email provider
    # For MVP, the code is returned in the response in dev mode only

    return VerificationSendResponse(
        message=f"Verification code sent to {university_email}",
        status=VerificationStatus.PENDING.value,
        expires_at=expires_at,
        debug_code=code if settings.is_development else None,
    )


async def confirm_verification_code(
    db: AsyncSession,
    current_user: User,
    university_email: str,
    verification_code: str,
) -> VerificationConfirmResponse:
    """
    Confirm a verification code:
      1. Reject if already verified
      2. Find the latest pending request for this user + email
      3. Reject if expired
      4. Reject if code doesn't match
      5. Mark request as verified
      6. Update user: is_verified_student=True, university_id=matched
    """
    if current_user.is_verified_student:
        raise BadRequest("You are already a verified student")

    university_email = university_email.lower().strip()

    # Find pending request
    ver_repo = VerificationRepository(db)
    request = await ver_repo.get_latest_pending(current_user.id, university_email)

    if not request:
        raise NotFound("No pending verification request found for this email")

    # Check expiry
    now = datetime.now(timezone.utc)
    if now > request.expires_at:
        request.status = VerificationStatus.EXPIRED.value
        await db.flush()
        raise BadRequest("Verification code has expired. Please request a new one.")

    # Check code
    if not secrets.compare_digest(request.verification_code, verification_code):
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
        university_email=latest.university_email if latest else None,
        verification_status=latest.status if latest else None,
        verified_at=latest.verified_at if latest else None,
    )
