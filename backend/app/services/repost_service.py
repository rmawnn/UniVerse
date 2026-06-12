from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.user import User
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_repository import PostRepository
from app.repositories.repost_repository import RepostRepository
from app.schemas.repost import RepostToggleResponse


async def toggle_repost(
    db: AsyncSession,
    post_id: UUID,
    current_user: User,
) -> RepostToggleResponse:
    """
    Toggle a repost on a post:
      - If the user hasn't reposted it -> create repost
      - If the user already reposted it -> remove repost
    """
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise NotFound("Post")

    if post.author_id == current_user.id:
        raise BadRequest("You cannot repost your own post")

    community_repo = CommunityRepository(db)
    if not await community_repo.is_member(post.community_id, current_user.id):
        raise Forbidden("You must be a member of the community to repost")

    repost_repo = RepostRepository(db)
    existing = await repost_repo.get(post_id, current_user.id)

    if existing:
        await repost_repo.delete(post_id, current_user.id)
        reposted = False
    else:
        await repost_repo.create(post_id, current_user.id)
        reposted = True

    count = await repost_repo.count_by_post(post_id)
    return RepostToggleResponse(reposted=reposted, repost_count=count)
