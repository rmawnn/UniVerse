from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_verified_user
from app.models.user import User
from app.services import block_service

router = APIRouter()


@router.post("/users/{user_id}/block", status_code=201)
async def block_user(
    user_id: UUID,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    return await block_service.block_user(db, current_user, user_id)


@router.delete("/users/{user_id}/block")
async def unblock_user(
    user_id: UUID,
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    return await block_service.unblock_user(db, current_user, user_id)


@router.get("/users/me/blocked")
async def get_blocked_users(
    current_user: User = Depends(require_verified_user),
    db: AsyncSession = Depends(get_db),
):
    return await block_service.get_blocked_users(db, current_user)
