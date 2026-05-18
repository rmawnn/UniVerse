import math
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, NotFound
from app.models.comment import Comment
from app.models.community import Community, CommunityMember
from app.models.message import Message
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.user import User
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_repository import PostRepository
from app.repositories.university_repository import UniversityRepository
from app.repositories.user_repository import UserRepository
from app.repositories.verification_repository import VerificationRepository
from app.schemas.admin import (
    AdminCommunityDetailResponse,
    AdminCommunityResponse,
    AdminPostDetailResponse,
    AdminPostResponse,
    AdminStatsResponse,
    AdminUserDetailResponse,
    AdminUserResponse,
    AdminVerificationResponse,
    RecentActivityResponse,
)
from app.schemas.common import PaginatedResponse
from app.utils.constants import UserRole, VerificationStatus


def _user_response(u: User) -> AdminUserResponse:
    return AdminUserResponse(
        id=u.id,
        username=u.username,
        email=u.email,
        full_name=u.full_name,
        is_active=u.is_active,
        is_verified_student=u.is_verified_student,
        role=u.role,
        university_id=u.university_id,
        created_at=u.created_at,
    )


def _verification_response(req, user, university) -> AdminVerificationResponse:
    # For document verifications, build a protected URL (not the raw file path)
    doc_url = None
    if req.document_url:
        doc_url = f"/api/v1/verification/document/{req.id}"

    return AdminVerificationResponse(
        id=req.id,
        user_id=req.user_id,
        username=user.username if user else "deleted",
        full_name=user.full_name if user else "deleted",
        verification_method=req.verification_method,
        university_email=req.university_email,
        document_url=doc_url,
        university_id=req.university_id,
        university_name=university.name if university else None,
        status=req.status,
        rejection_reason=req.rejection_reason,
        created_at=req.created_at,
        expires_at=req.expires_at,
        verified_at=req.verified_at,
    )


# ── Stats & Activity ────────────────────────────────────────


async def get_stats(db: AsyncSession) -> AdminStatsResponse:
    total_users = (await db.execute(
        select(func.count()).select_from(User)
    )).scalar_one()
    active_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)  # noqa: E712
    )).scalar_one()
    verified_students = (await db.execute(
        select(func.count()).select_from(User).where(User.is_verified_student == True)  # noqa: E712
    )).scalar_one()

    ver_repo = VerificationRepository(db)
    pending_verifications = await ver_repo.count_all(status=VerificationStatus.PENDING.value)

    total_communities = (await db.execute(
        select(func.count()).select_from(Community)
    )).scalar_one()
    active_communities = (await db.execute(
        select(func.count()).select_from(Community).where(Community.is_deleted == False)  # noqa: E712
    )).scalar_one()

    total_posts = (await db.execute(
        select(func.count()).select_from(Post)
    )).scalar_one()
    hidden_posts = (await db.execute(
        select(func.count()).select_from(Post).where(Post.is_deleted == True)  # noqa: E712
    )).scalar_one()

    total_messages = (await db.execute(
        select(func.count()).select_from(Message)
    )).scalar_one()

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        verified_students=verified_students,
        pending_verifications=pending_verifications,
        total_communities=total_communities,
        active_communities=active_communities,
        total_posts=total_posts,
        hidden_posts=hidden_posts,
        total_messages=total_messages,
    )


async def get_recent_activity(db: AsyncSession) -> RecentActivityResponse:
    users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    latest_users = [
        {"id": str(u.id), "username": u.username, "email": u.email,
         "created_at": u.created_at.isoformat()}
        for u in users_result.scalars().all()
    ]

    from app.models.verification_request import VerificationRequest
    ver_result = await db.execute(
        select(VerificationRequest).order_by(VerificationRequest.created_at.desc()).limit(5)
    )
    user_repo = UserRepository(db)
    latest_verifications = []
    for v in ver_result.scalars().all():
        user = await user_repo.get_by_id(v.user_id)
        latest_verifications.append({
            "id": str(v.id), "username": user.username if user else "deleted",
            "university_email": v.university_email, "status": v.status,
            "created_at": v.created_at.isoformat(),
        })

    posts_result = await db.execute(
        select(Post).order_by(Post.created_at.desc()).limit(5)
    )
    latest_posts = []
    for p in posts_result.scalars().all():
        author = await user_repo.get_by_id(p.author_id)
        comm_r = await db.execute(select(Community).where(Community.id == p.community_id))
        comm = comm_r.scalar_one_or_none()
        latest_posts.append({
            "id": str(p.id), "author_username": author.username if author else "deleted",
            "community_name": comm.name if comm else "deleted",
            "content_preview": (p.content or "")[:80],
            "is_deleted": p.is_deleted, "created_at": p.created_at.isoformat(),
        })

    comm_result = await db.execute(
        select(Community).order_by(Community.created_at.desc()).limit(5)
    )
    latest_communities = [
        {"id": str(c.id), "name": c.name, "is_deleted": c.is_deleted,
         "created_at": c.created_at.isoformat()}
        for c in comm_result.scalars().all()
    ]

    return RecentActivityResponse(
        latest_users=latest_users,
        latest_verifications=latest_verifications,
        latest_posts=latest_posts,
        latest_communities=latest_communities,
    )


# ── Users ────────────────────────────────────────────────────


async def list_users(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    is_active: bool | None = None,
    is_verified: bool | None = None,
    role: str | None = None,
) -> PaginatedResponse[AdminUserResponse]:
    repo = UserRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_all_filtered(
        search=search, is_active=is_active, is_verified=is_verified, role=role,
    )
    users = await repo.list_all_filtered(
        search=search, is_active=is_active, is_verified=is_verified, role=role,
        skip=skip, limit=page_size,
    )

    return PaginatedResponse(
        items=[_user_response(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def get_user_detail(
    db: AsyncSession,
    user_id: UUID,
) -> AdminUserDetailResponse:
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise NotFound("User")

    uni_repo = UniversityRepository(db)
    university_name = None
    if user.university_id:
        uni = await uni_repo.get_by_id(user.university_id)
        if uni:
            university_name = uni.name

    comm_repo = CommunityRepository(db)
    communities = await comm_repo.list_by_user(user_id)
    comm_list = [
        {"id": str(c.id), "name": c.name}
        for c in communities
    ]

    post_repo = PostRepository(db)
    posts = await post_repo.list_by_author(user_id, skip=0, limit=10)
    post_list = [
        {"id": str(p.id), "content_preview": (p.content or "")[:80],
         "is_deleted": p.is_deleted, "created_at": p.created_at.isoformat()}
        for p in posts
    ]

    return AdminUserDetailResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified_student=user.is_verified_student,
        role=user.role,
        university_id=user.university_id,
        university_name=university_name,
        bio=user.bio,
        department=user.department,
        academic_year=user.academic_year,
        profile_image_url=user.profile_image_url,
        communities=comm_list,
        recent_posts=post_list,
        created_at=user.created_at,
    )


async def deactivate_user(
    db: AsyncSession, target_user_id: UUID, admin_user: User,
) -> AdminUserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(target_user_id)
    if not user:
        raise NotFound("User")
    if user.id == admin_user.id:
        raise BadRequest("Cannot deactivate yourself")
    await repo.update(user, is_active=False)
    return _user_response(user)


async def activate_user(db: AsyncSession, target_user_id: UUID) -> AdminUserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(target_user_id)
    if not user:
        raise NotFound("User")
    await repo.update(user, is_active=True)
    return _user_response(user)


async def change_role(
    db: AsyncSession, target_user_id: UUID, new_role: str, admin_user: User,
) -> AdminUserResponse:
    valid_roles = {r.value for r in UserRole}
    if new_role not in valid_roles:
        raise BadRequest(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    repo = UserRepository(db)
    user = await repo.get_by_id(target_user_id)
    if not user:
        raise NotFound("User")
    if user.id == admin_user.id and new_role != UserRole.ADMIN.value:
        raise BadRequest("Cannot remove your own admin role")
    await repo.update(user, role=new_role)
    return _user_response(user)


async def verify_user_manually(
    db: AsyncSession, target_user_id: UUID,
) -> AdminUserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(target_user_id)
    if not user:
        raise NotFound("User")
    if user.is_verified_student:
        raise BadRequest("User is already verified")
    await repo.update(user, is_verified_student=True)
    return _user_response(user)


# ── Verifications ────────────────────────────────────────────


async def list_verifications(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    status: str | None = None,
    method: str | None = None,
    university_id: UUID | None = None,
    search: str | None = None,
) -> PaginatedResponse[AdminVerificationResponse]:
    ver_repo = VerificationRepository(db)
    user_repo = UserRepository(db)
    uni_repo = UniversityRepository(db)
    skip = (page - 1) * page_size

    filters = dict(status=status, method=method, university_id=university_id, search=search)
    total = await ver_repo.count_all(**filters)
    requests = await ver_repo.list_all(**filters, skip=skip, limit=page_size)

    items = []
    for req in requests:
        user = await user_repo.get_by_id(req.user_id)
        university = await uni_repo.get_by_id(req.university_id)
        items.append(_verification_response(req, user, university))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def get_verification_detail(
    db: AsyncSession, verification_id: UUID,
) -> AdminVerificationResponse:
    ver_repo = VerificationRepository(db)
    user_repo = UserRepository(db)
    uni_repo = UniversityRepository(db)

    req = await ver_repo.get_by_id(verification_id)
    if not req:
        raise NotFound("Verification request")

    user = await user_repo.get_by_id(req.user_id)
    university = await uni_repo.get_by_id(req.university_id)
    return _verification_response(req, user, university)


async def approve_verification(
    db: AsyncSession, verification_id: UUID,
) -> AdminVerificationResponse:
    ver_repo = VerificationRepository(db)
    user_repo = UserRepository(db)
    uni_repo = UniversityRepository(db)

    req = await ver_repo.get_by_id(verification_id)
    if not req:
        raise NotFound("Verification request")
    if req.status != VerificationStatus.PENDING.value:
        raise BadRequest(f"Cannot approve a request with status '{req.status}'")

    await ver_repo.mark_verified(req)
    user = await user_repo.get_by_id(req.user_id)
    if user:
        await user_repo.update(user, is_verified_student=True, university_id=req.university_id)
    university = await uni_repo.get_by_id(req.university_id)
    return _verification_response(req, user, university)


async def reject_verification(
    db: AsyncSession, verification_id: UUID, reason: str | None = None,
) -> AdminVerificationResponse:
    ver_repo = VerificationRepository(db)
    user_repo = UserRepository(db)
    uni_repo = UniversityRepository(db)

    req = await ver_repo.get_by_id(verification_id)
    if not req:
        raise NotFound("Verification request")
    if req.status != VerificationStatus.PENDING.value:
        raise BadRequest(f"Cannot reject a request with status '{req.status}'")

    await ver_repo.mark_rejected(req, reason=reason)
    user = await user_repo.get_by_id(req.user_id)
    university = await uni_repo.get_by_id(req.university_id)
    return _verification_response(req, user, university)


# ── Communities ──────────────────────────────────────────────


async def list_communities(
    db: AsyncSession, *, page: int = 1, page_size: int = 50,
) -> PaginatedResponse[AdminCommunityResponse]:
    repo = CommunityRepository(db)
    skip = (page - 1) * page_size

    total = await repo.count_all_admin()
    communities = await repo.list_all_admin(skip=skip, limit=page_size)
    comm_ids = [c.id for c in communities]
    member_counts = await repo.member_counts_batch(comm_ids)

    items = [
        AdminCommunityResponse(
            id=c.id, name=c.name, description=c.description,
            university_id=c.university_id,
            member_count=member_counts.get(c.id, 0),
            is_deleted=c.is_deleted, created_at=c.created_at,
        )
        for c in communities
    ]

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def get_community_detail(
    db: AsyncSession, community_id: UUID,
) -> AdminCommunityDetailResponse:
    stmt = select(Community).where(Community.id == community_id)
    res = await db.execute(stmt)
    community = res.scalar_one_or_none()
    if not community:
        raise NotFound("Community")

    repo = CommunityRepository(db)
    user_repo = UserRepository(db)
    member_count = await repo.member_count(community_id)

    creator = await user_repo.get_by_id(community.created_by)

    members_raw = await repo.list_members(community_id, skip=0, limit=20)
    members = [
        {"user_id": str(m.user_id), "username": u.username,
         "full_name": u.full_name, "role": m.role}
        for m, u in members_raw
    ]

    post_repo = PostRepository(db)
    posts = await post_repo.list_all_admin(skip=0, limit=10)
    comm_posts = [p for p in posts if p.community_id == community_id][:5]
    recent_posts = []
    for p in comm_posts:
        author = await user_repo.get_by_id(p.author_id)
        recent_posts.append({
            "id": str(p.id), "author_username": author.username if author else "deleted",
            "content_preview": (p.content or "")[:80],
            "is_deleted": p.is_deleted, "created_at": p.created_at.isoformat(),
        })

    return AdminCommunityDetailResponse(
        id=community.id, name=community.name, description=community.description,
        university_id=community.university_id, member_count=member_count,
        is_deleted=community.is_deleted, created_at=community.created_at,
        created_by_username=creator.username if creator else None,
        members=members, recent_posts=recent_posts,
    )


async def delete_community(db: AsyncSession, community_id: UUID) -> AdminCommunityResponse:
    repo = CommunityRepository(db)
    stmt = select(Community).where(Community.id == community_id)
    res = await db.execute(stmt)
    community = res.scalar_one_or_none()
    if not community:
        raise NotFound("Community")
    if community.is_deleted:
        raise BadRequest("Community is already deleted")
    await repo.soft_delete(community)
    mc = await repo.member_count(community_id)
    return AdminCommunityResponse(
        id=community.id, name=community.name, description=community.description,
        university_id=community.university_id, member_count=mc,
        is_deleted=community.is_deleted, created_at=community.created_at,
    )


async def restore_community(db: AsyncSession, community_id: UUID) -> AdminCommunityResponse:
    stmt = select(Community).where(Community.id == community_id)
    res = await db.execute(stmt)
    community = res.scalar_one_or_none()
    if not community:
        raise NotFound("Community")
    if not community.is_deleted:
        raise BadRequest("Community is not deleted")
    community.is_deleted = False
    await db.flush()
    await db.refresh(community)
    repo = CommunityRepository(db)
    mc = await repo.member_count(community_id)
    return AdminCommunityResponse(
        id=community.id, name=community.name, description=community.description,
        university_id=community.university_id, member_count=mc,
        is_deleted=community.is_deleted, created_at=community.created_at,
    )


# ── Posts ────────────────────────────────────────────────────


async def list_posts(
    db: AsyncSession, *, page: int = 1, page_size: int = 50,
) -> PaginatedResponse[AdminPostResponse]:
    post_repo = PostRepository(db)
    user_repo = UserRepository(db)
    skip = (page - 1) * page_size

    total = await post_repo.count_all_admin()
    posts = await post_repo.list_all_admin(skip=skip, limit=page_size)

    items = []
    for p in posts:
        author = await user_repo.get_by_id(p.author_id)
        stmt = select(Community).where(Community.id == p.community_id)
        res = await db.execute(stmt)
        community = res.scalar_one_or_none()
        items.append(AdminPostResponse(
            id=p.id,
            author_username=author.username if author else "deleted",
            author_full_name=author.full_name if author else "deleted",
            community_id=p.community_id,
            community_name=community.name if community else "deleted",
            content_preview=p.content[:120] if p.content else "",
            image_url=p.image_url, is_deleted=p.is_deleted, created_at=p.created_at,
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def get_post_detail(db: AsyncSession, post_id: UUID) -> AdminPostDetailResponse:
    post_repo = PostRepository(db)
    user_repo = UserRepository(db)

    post = await post_repo.get_by_id_admin(post_id)
    if not post:
        raise NotFound("Post")

    author = await user_repo.get_by_id(post.author_id)
    stmt = select(Community).where(Community.id == post.community_id)
    res = await db.execute(stmt)
    community = res.scalar_one_or_none()

    like_count = (await db.execute(
        select(func.count()).select_from(PostLike).where(PostLike.post_id == post_id)
    )).scalar_one()

    comments_stmt = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
        .limit(20)
    )
    comments_result = await db.execute(comments_stmt)
    comments = []
    for c in comments_result.scalars().all():
        c_author = await user_repo.get_by_id(c.author_id)
        comments.append({
            "id": str(c.id),
            "author_username": c_author.username if c_author else "deleted",
            "content": c.content,
            "is_deleted": c.is_deleted,
            "created_at": c.created_at.isoformat(),
        })

    return AdminPostDetailResponse(
        id=post.id,
        author_username=author.username if author else "deleted",
        author_full_name=author.full_name if author else "deleted",
        community_id=post.community_id,
        community_name=community.name if community else "deleted",
        content_preview=post.content[:120] if post.content else "",
        content=post.content or "",
        image_url=post.image_url,
        is_deleted=post.is_deleted,
        created_at=post.created_at,
        like_count=like_count,
        comment_count=len(comments),
        comments=comments,
    )


async def hide_post(db: AsyncSession, post_id: UUID) -> AdminPostResponse:
    post_repo = PostRepository(db)
    post = await post_repo.get_by_id_admin(post_id)
    if not post:
        raise NotFound("Post")
    await post_repo.set_deleted(post, True)
    return await _post_summary(db, post)


async def restore_post(db: AsyncSession, post_id: UUID) -> AdminPostResponse:
    post_repo = PostRepository(db)
    post = await post_repo.get_by_id_admin(post_id)
    if not post:
        raise NotFound("Post")
    await post_repo.set_deleted(post, False)
    return await _post_summary(db, post)


async def _post_summary(db: AsyncSession, p) -> AdminPostResponse:
    user_repo = UserRepository(db)
    author = await user_repo.get_by_id(p.author_id)
    stmt = select(Community).where(Community.id == p.community_id)
    res = await db.execute(stmt)
    community = res.scalar_one_or_none()
    return AdminPostResponse(
        id=p.id,
        author_username=author.username if author else "deleted",
        author_full_name=author.full_name if author else "deleted",
        community_id=p.community_id,
        community_name=community.name if community else "deleted",
        content_preview=p.content[:120] if p.content else "",
        image_url=p.image_url, is_deleted=p.is_deleted, created_at=p.created_at,
    )
