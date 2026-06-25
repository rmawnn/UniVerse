from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import RateLimiter
from app.models.user import User
from app.services import moderation_service
from app.utils.constants import ModerationAction, CommunityRole

router = APIRouter()


class ModerateRequest(BaseModel):
    action: str = Field(..., pattern=f"^({'|'.join(a.value for a in ModerationAction)})$")
    reason: str | None = None


class SetRoleRequest(BaseModel):
    role: str = Field(..., pattern=f"^({'|'.join(r.value for r in CommunityRole)})$")


@router.post("/communities/{community_id}/moderate/{user_id}")
async def moderate_user(
    community_id: UUID,
    user_id: UUID,
    data: ModerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rl=Depends(RateLimiter(max_calls=10, window_seconds=60, prefix="mod:action")),
):
    """Ban, mute, or kick a user from a community. Requires moderator or admin role."""
    return await moderation_service.moderate_user(
        db, community_id, user_id, current_user, data.action, data.reason,
    )


@router.post("/communities/{community_id}/role/{user_id}")
async def set_role(
    community_id: UUID,
    user_id: UUID,
    data: SetRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set a member's role. Admin only."""
    return await moderation_service.set_role(
        db, community_id, user_id, current_user, data.role,
    )


@router.delete("/communities/{community_id}/ban/{user_id}")
async def unban_user(
    community_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unban a user. Requires moderator or admin role."""
    return await moderation_service.unban_user(db, community_id, user_id, current_user)


@router.delete("/communities/{community_id}/mute/{user_id}")
async def unmute_user(
    community_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unmute a user. Requires moderator or admin role."""
    return await moderation_service.unmute_user(db, community_id, user_id, current_user)
