import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.admin import AdminUserResponse
from app.schemas.common import PaginatedResponse


async def list_users(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
) -> PaginatedResponse[AdminUserResponse]:
    repo = UserRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_all()
    users = await repo.list_all(skip=skip, limit=page_size)

    items = [
        AdminUserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            is_verified_student=u.is_verified_student,
            role=u.role,
            created_at=u.created_at,
        )
        for u in users
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def deactivate_user(
    db: AsyncSession,
    target_user_id: UUID,
    admin_user: User,
) -> AdminUserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(target_user_id)

    if not user:
        raise NotFound("User")

    if user.id == admin_user.id:
        raise BadRequest("Cannot deactivate yourself")

    await repo.update(user, is_active=False)

    return AdminUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified_student=user.is_verified_student,
        role=user.role,
        created_at=user.created_at,
    )


async def activate_user(
    db: AsyncSession,
    target_user_id: UUID,
) -> AdminUserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(target_user_id)

    if not user:
        raise NotFound("User")

    await repo.update(user, is_active=True)

    return AdminUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified_student=user.is_verified_student,
        role=user.role,
        created_at=user.created_at,
    )
