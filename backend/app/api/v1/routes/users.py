from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.user import (
    ChangePasswordRequest,
    UserResponse,
    UserSearchResponse,
    UserStatusResponse,
    UserUpdateRequest,
)
from app.services import user_service

router = APIRouter()


@router.get("/search", response_model=PaginatedResponse[UserSearchResponse])
async def search_users(
    q: str = Query(..., min_length=2, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users by username or full name. Excludes current user."""
    return await user_service.search_users(
        db, current_user, q, page=page, page_size=page_size,
    )


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Return the full profile of the currently authenticated user."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's editable profile fields."""
    return await user_service.update_profile(db, current_user, data)


@router.patch("/me/password", response_model=SuccessResponse)
async def change_my_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password. Requires current password."""
    await user_service.change_password(db, current_user, data)
    return SuccessResponse(message="Password updated successfully")


@router.get("/me/status", response_model=UserStatusResponse)
async def get_my_status(current_user: User = Depends(get_current_user)):
    """Lightweight check — returns auth status, role, and verification state."""
    return current_user
