from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.admin import (
    AdminCommunityDetailResponse,
    AdminCommunityResponse,
    AdminPostDetailResponse,
    AdminPostResponse,
    AdminStatsResponse,
    AdminUserDetailResponse,
    AdminUserResponse,
    AdminVerificationResponse,
    ModerationQueueResponse,
    RecentActivityResponse,
    RejectRequest,
    RoleUpdateRequest,
)
from app.schemas.common import PaginatedResponse
from app.services import admin_service

router = APIRouter()


# ── Stats & Activity ────────────────────────────────────────


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_stats(db)


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_recent_activity(db)


@router.get("/moderation", response_model=ModerationQueueResponse)
async def get_moderation_queue(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_moderation_queue(db)


# ── Users ────────────────────────────────────────────────────


@router.get("/users", response_model=PaginatedResponse[AdminUserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    is_verified: bool | None = Query(None),
    role: str | None = Query(None),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.list_users(
        db, page=page, page_size=page_size,
        search=search, is_active=is_active, is_verified=is_verified, role=role,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_user_detail(
    user_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_user_detail(db, user_id)


@router.patch("/users/{user_id}/deactivate", response_model=AdminUserResponse)
async def deactivate_user(
    user_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.deactivate_user(db, user_id, admin_user)


@router.patch("/users/{user_id}/activate", response_model=AdminUserResponse)
async def activate_user(
    user_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.activate_user(db, user_id)


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
async def change_role(
    user_id: UUID,
    body: RoleUpdateRequest,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.change_role(db, user_id, body.role, admin_user)


@router.patch("/users/{user_id}/verify", response_model=AdminUserResponse)
async def verify_user_manually(
    user_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.verify_user_manually(db, user_id)


# ── Verifications ────────────────────────────────────────────


@router.get("/verifications", response_model=PaginatedResponse[AdminVerificationResponse])
async def list_verifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
    method: str | None = Query(None, pattern=r"^(email|document)$"),
    university_id: UUID | None = Query(None),
    search: str | None = Query(None, max_length=200),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.list_verifications(
        db, page=page, page_size=page_size,
        status=status, method=method, university_id=university_id, search=search,
    )


@router.get("/verifications/{verification_id}", response_model=AdminVerificationResponse)
async def get_verification_detail(
    verification_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_verification_detail(db, verification_id)


@router.patch("/verifications/{verification_id}/approve", response_model=AdminVerificationResponse)
async def approve_verification(
    verification_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.approve_verification(db, verification_id)


@router.patch("/verifications/{verification_id}/reject", response_model=AdminVerificationResponse)
async def reject_verification(
    verification_id: UUID,
    body: RejectRequest | None = None,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    reason = body.reason if body else None
    return await admin_service.reject_verification(db, verification_id, reason=reason)


# ── Communities ──────────────────────────────────────────────


@router.get("/communities", response_model=PaginatedResponse[AdminCommunityResponse])
async def list_communities(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.list_communities(db, page=page, page_size=page_size)


@router.get("/communities/{community_id}", response_model=AdminCommunityDetailResponse)
async def get_community_detail(
    community_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_community_detail(db, community_id)


@router.patch("/communities/{community_id}/delete", response_model=AdminCommunityResponse)
async def delete_community(
    community_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.delete_community(db, community_id)


@router.patch("/communities/{community_id}/restore", response_model=AdminCommunityResponse)
async def restore_community(
    community_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.restore_community(db, community_id)


# ── Posts ────────────────────────────────────────────────────


@router.get("/posts", response_model=PaginatedResponse[AdminPostResponse])
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.list_posts(db, page=page, page_size=page_size)


@router.get("/posts/{post_id}", response_model=AdminPostDetailResponse)
async def get_post_detail(
    post_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.get_post_detail(db, post_id)


@router.patch("/posts/{post_id}/hide", response_model=AdminPostResponse)
async def hide_post(
    post_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.hide_post(db, post_id)


@router.patch("/posts/{post_id}/restore", response_model=AdminPostResponse)
async def restore_post(
    post_id: UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.restore_post(db, post_id)
