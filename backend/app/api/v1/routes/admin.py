from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.admin import AdminUserResponse
from app.schemas.common import PaginatedResponse
from app.services import admin_service

router = APIRouter()


@router.get("/users", response_model=PaginatedResponse[AdminUserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await admin_service.list_users(db, page=page, page_size=page_size)


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
