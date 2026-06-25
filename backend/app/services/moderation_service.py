from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.community import Community, CommunityMember
from app.models.community_moderation import CommunityModeration
from app.models.user import User
from app.utils.constants import CommunityRole, ModerationAction


ROLE_POWER = {
    CommunityRole.ADMIN.value: 3,
    CommunityRole.MODERATOR.value: 2,
    CommunityRole.MEMBER.value: 1,
}


async def _get_member(db: AsyncSession, community_id: UUID, user_id: UUID) -> CommunityMember | None:
    stmt = select(CommunityMember).where(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def _require_mod_power(
    db: AsyncSession, community_id: UUID, moderator_id: UUID, target_id: UUID,
) -> CommunityMember:
    mod = await _get_member(db, community_id, moderator_id)
    if not mod or ROLE_POWER.get(mod.role, 0) < 2:
        raise Forbidden("You must be a moderator or admin to perform this action")

    target = await _get_member(db, community_id, target_id)
    if target and ROLE_POWER.get(target.role, 0) >= ROLE_POWER.get(mod.role, 0):
        raise Forbidden("Cannot moderate a user with equal or higher role")
    return mod


async def moderate_user(
    db: AsyncSession,
    community_id: UUID,
    target_user_id: UUID,
    moderator: User,
    action: str,
    reason: str | None = None,
) -> dict:
    community = await db.get(Community, community_id)
    if not community:
        raise NotFound("Community")

    if moderator.id == target_user_id:
        raise BadRequest("Cannot moderate yourself")

    await _require_mod_power(db, community_id, moderator.id, target_user_id)

    if action == ModerationAction.KICK.value:
        member = await _get_member(db, community_id, target_user_id)
        if member:
            await db.delete(member)

    if action == ModerationAction.BAN.value:
        member = await _get_member(db, community_id, target_user_id)
        if member:
            await db.delete(member)

    mod_entry = CommunityModeration(
        community_id=community_id,
        user_id=target_user_id,
        action=action,
        reason=reason,
        moderator_id=moderator.id,
        is_active=action != ModerationAction.KICK.value,
    )
    db.add(mod_entry)
    await db.commit()

    return {"action": action, "user_id": str(target_user_id), "success": True}


async def set_role(
    db: AsyncSession,
    community_id: UUID,
    target_user_id: UUID,
    moderator: User,
    new_role: str,
) -> dict:
    community = await db.get(Community, community_id)
    if not community:
        raise NotFound("Community")

    mod = await _get_member(db, community_id, moderator.id)
    if not mod or mod.role != CommunityRole.ADMIN.value:
        raise Forbidden("Only admins can change roles")

    if moderator.id == target_user_id:
        raise BadRequest("Cannot change your own role")

    target = await _get_member(db, community_id, target_user_id)
    if not target:
        raise NotFound("User is not a member of this community")

    target.role = new_role
    await db.commit()

    return {"user_id": str(target_user_id), "role": new_role}


async def unban_user(
    db: AsyncSession,
    community_id: UUID,
    target_user_id: UUID,
    moderator: User,
) -> dict:
    await _require_mod_power(db, community_id, moderator.id, target_user_id)

    stmt = select(CommunityModeration).where(
        CommunityModeration.community_id == community_id,
        CommunityModeration.user_id == target_user_id,
        CommunityModeration.action == ModerationAction.BAN.value,
        CommunityModeration.is_active == True,
    )
    ban = (await db.execute(stmt)).scalar_one_or_none()
    if not ban:
        raise NotFound("No active ban found")

    ban.is_active = False
    await db.commit()
    return {"user_id": str(target_user_id), "unbanned": True}


async def unmute_user(
    db: AsyncSession,
    community_id: UUID,
    target_user_id: UUID,
    moderator: User,
) -> dict:
    await _require_mod_power(db, community_id, moderator.id, target_user_id)

    stmt = select(CommunityModeration).where(
        CommunityModeration.community_id == community_id,
        CommunityModeration.user_id == target_user_id,
        CommunityModeration.action == ModerationAction.MUTE.value,
        CommunityModeration.is_active == True,
    )
    mute = (await db.execute(stmt)).scalar_one_or_none()
    if not mute:
        raise NotFound("No active mute found")

    mute.is_active = False
    await db.commit()
    return {"user_id": str(target_user_id), "unmuted": True}


async def is_banned(db: AsyncSession, community_id: UUID, user_id: UUID) -> bool:
    stmt = select(CommunityModeration).where(
        CommunityModeration.community_id == community_id,
        CommunityModeration.user_id == user_id,
        CommunityModeration.action == ModerationAction.BAN.value,
        CommunityModeration.is_active == True,
    )
    return (await db.execute(stmt)).scalar_one_or_none() is not None


async def is_muted(db: AsyncSession, community_id: UUID, user_id: UUID) -> bool:
    stmt = select(CommunityModeration).where(
        CommunityModeration.community_id == community_id,
        CommunityModeration.user_id == user_id,
        CommunityModeration.action == ModerationAction.MUTE.value,
        CommunityModeration.is_active == True,
    )
    return (await db.execute(stmt)).scalar_one_or_none() is not None
