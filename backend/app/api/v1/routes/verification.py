from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.verification import (
    DocumentVerificationResponse,
    VerificationConfirmRequest,
    VerificationConfirmResponse,
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
):
    """Send a verification code to the user's university email."""
    return await verification_service.send_verification_code(
        db, current_user, data.university_email,
    )


@router.post("/email/confirm", response_model=VerificationConfirmResponse)
async def confirm_verification_code(
    data: VerificationConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm a verification code and verify the student."""
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
):
    """Upload a student document for manual admin verification."""
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
    """Download a verification document. Owner and admin only."""
    file_path, content_type = await verification_service.get_document_file(
        db, current_user, verification_id,
    )
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
