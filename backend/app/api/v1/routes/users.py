from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.post import PostResponse
from app.schemas.user import (
    ChangePasswordRequest,
    FollowResponse,
    MyProfileResponse,
    PublicUserProfileResponse,
    UserInsightsResponse,
    UserResponse,
    UserSearchResponse,
    UserStatusResponse,
    UserUpdateRequest,
)
from app.services import follow_service, post_service, user_service

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


@router.get("/me", response_model=MyProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the full profile of the currently authenticated user with counts."""
    return await user_service.get_my_profile(db, current_user)


@router.patch("/me", response_model=MyProfileResponse)
async def update_my_profile(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's editable profile fields."""
    await user_service.update_profile(db, current_user, data)
    return await user_service.get_my_profile(db, current_user)


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


@router.get("/suggestions", response_model=list[UserSearchResponse])
async def get_follow_suggestions(
    limit: int = Query(10, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return users the current user might want to follow.

    Prioritises same-university and verified students.
    """
    return await user_service.get_follow_suggestions(
        db, current_user, limit=limit,
    )


@router.get("/me/insights", response_model=UserInsightsResponse)
async def get_my_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return simple activity insights for the authenticated user."""
    return await user_service.get_user_insights(db, current_user)


@router.get("/{user_id}", response_model=PublicUserProfileResponse)
async def get_user_profile(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """View another user's public profile. Requires authentication."""
    return await user_service.get_public_profile(db, user_id, current_user_id=current_user.id)


@router.post("/{user_id}/follow", response_model=FollowResponse)
async def follow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Follow a user."""
    return await follow_service.follow_user(db, current_user, user_id)


@router.delete("/{user_id}/follow", response_model=FollowResponse)
async def unfollow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unfollow a user."""
    return await follow_service.unfollow_user(db, current_user, user_id)


@router.get("/{user_id}/followers", response_model=PaginatedResponse[UserSearchResponse])
async def list_followers(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List users who follow the specified user."""
    return await follow_service.list_followers(
        db, user_id, page=page, page_size=page_size,
    )


@router.get("/{user_id}/following", response_model=PaginatedResponse[UserSearchResponse])
async def list_following(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List users the specified user follows."""
    return await follow_service.list_following(
        db, user_id, page=page, page_size=page_size,
    )


@router.get("/{user_id}/posts", response_model=PaginatedResponse[PostResponse])
async def list_user_posts(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    post_type: str | None = Query(None, pattern="^(text|image|short)$"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """List posts created by a specific user, newest first.

    Optionally filter by post_type: text, image, or short.
    """
    return await post_service.list_user_posts(
        db, user_id, page=page, page_size=page_size,
        post_type=post_type, current_user=current_user,
    )
