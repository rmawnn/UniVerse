from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import RateLimiter
from app.models.user import User
from app.schemas.verification import (
    DocumentVerificationResponse,
    VerificationConfirmRequest,
    VerificationConfirmResponse,
    VerificationHistoryResponse,
    VerificationHistoryItem,
    VerificationSendRequest,
    VerificationSendResponse,
    VerificationStatusResponse,
)
from app.services import verification_service

router = APIRouter()


# ── Email verification ──────────────────────────────────────


@router.post("/email/send", response_model=VerificationSendResponse)
async def send_verification_code(
    data: VerificationSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=3, window_seconds=300, prefix="verify:send")),
):
    """Send a verification code to the user's university email. Rate limited: 3 per 5 min."""
    return await verification_service.send_verification_code(
        db, current_user, data.university_email,
    )


@router.post("/email/confirm", response_model=VerificationConfirmResponse)
async def confirm_verification_code(
    data: VerificationConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=10, window_seconds=300, prefix="verify:confirm")),
):
    """Confirm a verification code and verify the student. Rate limited: 10 per 5 min."""
    return await verification_service.confirm_verification_code(
        db, current_user, data.verification_id, data.code,
    )


# ── Document verification ───────────────────────────────────


@router.post("/document", response_model=DocumentVerificationResponse, status_code=201)
async def submit_document_verification(
    university_id: UUID = Form(...),
    document: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=5, window_seconds=3600, prefix="verify:doc")),
):
    """Upload a student document for verification. Rate limited: 5 per hour."""
    file_content = await document.read()
    return await verification_service.submit_document_verification(
        db, current_user, university_id,
        file_content=file_content,
        filename=document.filename or "document",
    )


@router.get("/document/{verification_id}")
async def get_document(
    verification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a verification document. Owner and admin only.

    With Supabase Storage: redirects to a time-limited signed URL.
    Without Supabase: serves the file directly from local filesystem.
    """
    file_path, content_type, signed_url = await verification_service.get_document_file(
        db, current_user, verification_id,
    )
    if signed_url:
        return RedirectResponse(url=signed_url)
    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=file_path.name,
    )


# ── Status ──────────────────────────────────────────────────


@router.get("/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current verification status for the authenticated user."""
    return await verification_service.get_verification_status(db, current_user)


# ── History ────────────────────────────────────────────────


@router.get("/history", response_model=VerificationHistoryResponse)
async def get_verification_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full verification attempt history for the authenticated user."""
    items = await verification_service.get_verification_history(db, current_user)
    return VerificationHistoryResponse(
        items=[VerificationHistoryItem(**item) for item in items],
        total_attempts=len(items),
    )


# ── Backwards compatibility ─────────────────────────────────
# Keep old /send and /confirm routes working (redirect to new paths)

@router.post("/send", response_model=VerificationSendResponse, include_in_schema=False)
async def send_verification_code_legacy(
    data: VerificationSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy route — use /email/send instead."""
    return await verification_service.send_verification_code(
        db, current_user, data.university_email,
    )


@router.post("/confirm", response_model=VerificationConfirmResponse, include_in_schema=False)
async def confirm_verification_code_legacy(
    data: VerificationConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Legacy route — use /email/confirm instead."""
    return await verification_service.confirm_verification_code(
        db, current_user, data.verification_id, data.code,
    )
