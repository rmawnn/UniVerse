from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.verification import (
    VerificationConfirmRequest,
    VerificationConfirmResponse,
    VerificationSendRequest,
    VerificationSendResponse,
)
from app.services import verification_service

router = APIRouter()


@router.post("/send", response_model=VerificationSendResponse)
async def send_verification_code(
    data: VerificationSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a verification code to the user's university email."""
    return await verification_service.send_verification_code(
        db, current_user, data.university_email,
    )


@router.post("/confirm", response_model=VerificationConfirmResponse)
async def confirm_verification_code(
    data: VerificationConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm a verification code and verify the student."""
    return await verification_service.confirm_verification_code(
        db, current_user, data.university_email, data.verification_code,
    )
